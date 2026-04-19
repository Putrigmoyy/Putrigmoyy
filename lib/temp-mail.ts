import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { getAppDataSourceConfig } from '@/lib/data-sources';
import type {
  TempMailConfigSnapshot,
  TempMailEmailDetail,
  TempMailEmailSummary,
  TempMailInboxDetailPayload,
  TempMailInboxSummary,
  TempMailStoredAttachment,
} from '@/lib/temp-mail-types';
import type { ParsedTempMailInbound } from '@/lib/temp-mail-parser';

type NeonClient = ReturnType<typeof neon>;

type TempMailInboxRow = {
  id: string;
  local_part: string;
  domain: string;
  email_address: string;
  created_at: string | Date;
  message_count?: number | string | null;
  latest_received_at?: string | Date | null;
};

type TempMailMessageRow = {
  id: string;
  inbox_id: string;
  fingerprint: string;
  message_id: string | null;
  from_name: string | null;
  from_address: string;
  to_address: string;
  subject: string;
  text_body: string | null;
  html_body: string | null;
  snippet: string;
  headers: Record<string, string> | null;
  attachments: TempMailStoredAttachment[] | null;
  received_at: string | Date;
};

const TEMP_MAIL_RETENTION_HOURS = 24;
const TEMP_MAIL_RETENTION_MS = TEMP_MAIL_RETENTION_HOURS * 60 * 60 * 1000;

let tempMailClient: NeonClient | null = null;
let ensureTempMailTablesPromise: Promise<void> | null = null;

function clean(value: string | undefined) {
  return String(value || '').trim();
}

function normalizePrivateKey(value: string | undefined) {
  return clean(value).replace(/^\/+/, '').replace(/\/+$/, '');
}

function normalizeLocalPart(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._-]/g, '');
}

function assertLocalPart(value: string) {
  const normalized = normalizeLocalPart(value);
  if (!normalized) {
    throw new Error('Alias email wajib diisi.');
  }

  if (normalized.length < 3 || normalized.length > 40) {
    throw new Error('Alias email harus 3 sampai 40 karakter.');
  }

  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(normalized)) {
    throw new Error('Alias email hanya boleh huruf kecil, angka, titik, garis bawah, atau strip.');
  }

  return normalized;
}

function getPrimaryTempMailUrl() {
  return clean(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '');
}

function getTempMailDatabaseUrl() {
  return clean(process.env.TEMP_MAIL_DATABASE_URL) || getAppDataSourceConfig().core.databaseUrl;
}

function getTempMailClient() {
  const databaseUrl = getTempMailDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('TEMP_MAIL_DATABASE_URL atau DATABASE_URL_CORE belum diisi.');
  }

  if (!tempMailClient) {
    tempMailClient = neon(databaseUrl);
  }

  return tempMailClient;
}

export function getTempMailDomains() {
  const raw = clean(process.env.TEMP_MAIL_DOMAINS) || clean(process.env.MAIL_DOMAINS);
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function getTempMailPrivateKey() {
  return normalizePrivateKey(process.env.TEMP_MAIL_PRIVATE_KEY);
}

export function getTempMailInboundSecret() {
  return clean(process.env.TEMP_MAIL_INBOUND_SECRET) || clean(process.env.INBOUND_SECRET);
}

export function getTempMailCronSecret() {
  return clean(process.env.CRON_SECRET);
}

export function getTempMailAccessPath() {
  const privateKey = getTempMailPrivateKey();
  if (!privateKey) {
    return '';
  }

  const siteUrl = getPrimaryTempMailUrl();
  if (!siteUrl) {
    return `/temp-mail/${privateKey}`;
  }

  return `${siteUrl.replace(/\/+$/, '')}/temp-mail/${privateKey}`;
}

export function getTempMailConfigSnapshot(): TempMailConfigSnapshot {
  const domains = getTempMailDomains();
  const setupChecklist = {
    database: Boolean(getTempMailDatabaseUrl()),
    domains: domains.length > 0,
    inboundSecret: Boolean(getTempMailInboundSecret()),
    cronSecret: Boolean(getTempMailCronSecret()),
  };

  return {
    primaryDomain: domains[0] ?? '',
    domains,
    retentionHours: TEMP_MAIL_RETENTION_HOURS,
    coreReady: setupChecklist.database && setupChecklist.domains,
    operationalReady:
      setupChecklist.database &&
      setupChecklist.domains &&
      setupChecklist.inboundSecret,
    privateModeEnabled: Boolean(getTempMailPrivateKey()),
    setupChecklist,
  };
}

function assertAllowedDomain(domain: string) {
  const normalized = String(domain || '').trim().toLowerCase();
  if (!normalized) {
    throw new Error('Domain inbox belum dipilih.');
  }

  const domains = getTempMailDomains();
  if (!domains.includes(normalized)) {
    throw new Error('Domain inbox tidak termasuk TEMP_MAIL_DOMAINS.');
  }

  return normalized;
}

function buildEmailAddress(localPart: string, domain: string) {
  return `${localPart}@${domain}`.toLowerCase();
}

function toIso(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function generateRandomLocalPart() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let value = 'putri';
  for (let index = 0; index < 7; index += 1) {
    value += characters[Math.floor(Math.random() * characters.length)];
  }
  return value;
}

function serializeInbox(row: TempMailInboxRow): TempMailInboxSummary {
  return {
    id: row.id,
    localPart: row.local_part,
    domain: row.domain,
    emailAddress: row.email_address,
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    messageCount: Math.max(0, Number(row.message_count || 0)),
    latestReceivedAt: toIso(row.latest_received_at),
  };
}

function serializeEmailSummary(row: TempMailMessageRow): TempMailEmailSummary {
  return {
    id: row.id,
    subject: row.subject,
    fromName: row.from_name,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    snippet: row.snippet,
    receivedAt: toIso(row.received_at) || new Date().toISOString(),
    attachmentCount: Array.isArray(row.attachments) ? row.attachments.length : 0,
    hasHtml: Boolean(row.html_body),
    hasText: Boolean(row.text_body),
  };
}

function serializeEmailDetail(row: TempMailMessageRow): TempMailEmailDetail {
  return {
    ...serializeEmailSummary(row),
    messageId: row.message_id,
    htmlBody: row.html_body,
    textBody: row.text_body,
    headers: row.headers || null,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
  };
}

export async function ensureTempMailTables() {
  if (ensureTempMailTablesPromise) {
    return ensureTempMailTablesPromise;
  }

  ensureTempMailTablesPromise = (async () => {
    const sql = getTempMailClient();
    await sql`
      create table if not exists temp_mail_inboxes (
        id text primary key,
        local_part text not null,
        domain text not null,
        email_address text not null unique,
        created_at timestamptz not null default now()
      )
    `;
    await sql`
      create table if not exists temp_mail_messages (
        id text primary key,
        inbox_id text not null references temp_mail_inboxes(id) on delete cascade,
        fingerprint text not null unique,
        message_id text,
        from_name text,
        from_address text not null,
        to_address text not null,
        subject text not null default 'Tanpa subjek',
        text_body text,
        html_body text,
        snippet text not null default '',
        headers jsonb,
        attachments jsonb not null default '[]'::jsonb,
        received_at timestamptz not null default now(),
        created_at timestamptz not null default now()
      )
    `;
    await sql`
      create index if not exists temp_mail_inboxes_created_idx
      on temp_mail_inboxes(created_at desc)
    `;
    await sql`
      create index if not exists temp_mail_messages_inbox_received_idx
      on temp_mail_messages(inbox_id, received_at desc)
    `;
    await sql`
      create index if not exists temp_mail_messages_to_address_idx
      on temp_mail_messages(to_address, received_at desc)
    `;
  })();

  try {
    await ensureTempMailTablesPromise;
  } catch (error) {
    ensureTempMailTablesPromise = null;
    throw error;
  }
}

export async function purgeExpiredTempMailMessages() {
  await ensureTempMailTables();
  const sql = getTempMailClient();
  const cutoff = new Date(Date.now() - TEMP_MAIL_RETENTION_MS).toISOString();
  const rows = (await sql`
    delete from temp_mail_messages
    where received_at < ${cutoff}
    returning id
  `) as Array<{ id?: string }>;

  return rows.length;
}

export async function listTempMailInboxes() {
  await ensureTempMailTables();
  await purgeExpiredTempMailMessages();

  const sql = getTempMailClient();
  const rows = (await sql`
    select
      inbox.id,
      inbox.local_part,
      inbox.domain,
      inbox.email_address,
      inbox.created_at,
      coalesce(stats.message_count, 0) as message_count,
      stats.latest_received_at
    from temp_mail_inboxes inbox
    left join (
      select
        inbox_id,
        count(*)::int as message_count,
        max(received_at) as latest_received_at
      from temp_mail_messages
      group by inbox_id
    ) as stats on stats.inbox_id = inbox.id
    order by coalesce(stats.latest_received_at, inbox.created_at) desc, inbox.created_at desc
  `) as TempMailInboxRow[];

  return rows.map(serializeInbox);
}

async function selectInboxByEmailAddress(emailAddress: string) {
  await ensureTempMailTables();
  const sql = getTempMailClient();
  const rows = (await sql`
    select
      id,
      local_part,
      domain,
      email_address,
      created_at
    from temp_mail_inboxes
    where lower(email_address) = ${emailAddress.toLowerCase()}
    limit 1
  `) as TempMailInboxRow[];

  return rows[0] || null;
}

export async function createTempMailInbox(input?: {
  localPart?: string;
  domain?: string;
}) {
  await ensureTempMailTables();
  const sql = getTempMailClient();
  const domain = assertAllowedDomain(input?.domain || getTempMailDomains()[0] || '');

  const insertInbox = async (requestedLocalPart: string) => {
    const localPart = assertLocalPart(requestedLocalPart);
    const emailAddress = buildEmailAddress(localPart, domain);
    const rows = (await sql`
      insert into temp_mail_inboxes (
        id,
        local_part,
        domain,
        email_address
      ) values (
        ${randomUUID()},
        ${localPart},
        ${domain},
        ${emailAddress}
      )
      on conflict (email_address) do nothing
      returning
        id,
        local_part,
        domain,
        email_address,
        created_at
    `) as TempMailInboxRow[];

    return rows[0] || null;
  };

  if (clean(input?.localPart)) {
    const created = await insertInbox(String(input?.localPart || ''));
    if (!created) {
      throw new Error('Alias email tersebut sudah dipakai.');
    }
    return serializeInbox(created);
  }

  for (let attempt = 0; attempt < 15; attempt += 1) {
    const created = await insertInbox(generateRandomLocalPart());
    if (created) {
      return serializeInbox(created);
    }
  }

  throw new Error('Gagal membuat inbox otomatis yang unik. Coba ulang lagi.');
}

export async function getTempMailInboxDetail(
  inboxId: string,
  selectedMessageId?: string | null,
): Promise<TempMailInboxDetailPayload | null> {
  await ensureTempMailTables();
  await purgeExpiredTempMailMessages();

  const sql = getTempMailClient();
  const inboxRows = (await sql`
    select
      inbox.id,
      inbox.local_part,
      inbox.domain,
      inbox.email_address,
      inbox.created_at,
      coalesce(count(message.id), 0)::int as message_count,
      max(message.received_at) as latest_received_at
    from temp_mail_inboxes inbox
    left join temp_mail_messages message on message.inbox_id = inbox.id
    where inbox.id = ${inboxId}
    group by inbox.id, inbox.local_part, inbox.domain, inbox.email_address, inbox.created_at
    limit 1
  `) as TempMailInboxRow[];

  const inbox = inboxRows[0];
  if (!inbox) {
    return null;
  }

  const messageRows = (await sql`
    select
      id,
      inbox_id,
      fingerprint,
      message_id,
      from_name,
      from_address,
      to_address,
      subject,
      text_body,
      html_body,
      snippet,
      headers,
      attachments,
      received_at
    from temp_mail_messages
    where inbox_id = ${inboxId}
    order by received_at desc
  `) as TempMailMessageRow[];

  const selectedRow =
    (selectedMessageId ? messageRows.find((row) => row.id === selectedMessageId) : null) ||
    messageRows[0] ||
    null;

  return {
    inbox: serializeInbox(inbox),
    emails: messageRows.map(serializeEmailSummary),
    selectedEmail: selectedRow ? serializeEmailDetail(selectedRow) : null,
  };
}

export async function clearTempMailInboxMessages(inboxId: string) {
  await ensureTempMailTables();
  const sql = getTempMailClient();
  const rows = (await sql`
    delete from temp_mail_messages
    where inbox_id = ${inboxId}
    returning id
  `) as Array<{ id?: string }>;

  return {
    deletedCount: rows.length,
  };
}

export async function deleteTempMailInbox(inboxId: string) {
  await ensureTempMailTables();
  const sql = getTempMailClient();
  const rows = (await sql`
    delete from temp_mail_inboxes
    where id = ${inboxId}
    returning
      id,
      local_part,
      domain,
      email_address,
      created_at
  `) as TempMailInboxRow[];

  if (!rows[0]) {
    throw new Error('Inbox tidak ditemukan.');
  }

  return serializeInbox(rows[0]);
}

async function findOrCreateTempMailInboxByAddress(emailAddress: string) {
  const normalizedAddress = String(emailAddress || '').trim().toLowerCase();
  const [localPart = '', domain = ''] = normalizedAddress.split('@');
  const normalizedLocalPart = assertLocalPart(localPart);
  const normalizedDomain = assertAllowedDomain(domain);
  const normalizedEmailAddress = buildEmailAddress(normalizedLocalPart, normalizedDomain);

  const existing = await selectInboxByEmailAddress(normalizedEmailAddress);
  if (existing) {
    return existing;
  }

  const created = await createTempMailInbox({
    localPart: normalizedLocalPart,
    domain: normalizedDomain,
  });

  const selected = await selectInboxByEmailAddress(created.emailAddress);
  if (!selected) {
    throw new Error('Gagal menemukan inbox temp mail yang baru dibuat.');
  }

  return selected;
}

export async function ingestTempMailInbound(parsed: ParsedTempMailInbound) {
  await ensureTempMailTables();
  await purgeExpiredTempMailMessages();

  const normalizedRecipient = String(parsed.toAddress || '').trim().toLowerCase();
  const parts = normalizedRecipient.split('@');
  if (parts.length !== 2) {
    return {
      stored: false,
      duplicate: false,
      reason: 'wrong_domain' as const,
    };
  }

  try {
    assertAllowedDomain(parts[1] || '');
  } catch {
    return {
      stored: false,
      duplicate: false,
      reason: 'wrong_domain' as const,
    };
  }

  const inbox = await findOrCreateTempMailInboxByAddress(normalizedRecipient);
  const sql = getTempMailClient();
  const messageId = randomUUID();
  const headersJson = parsed.headers ? JSON.stringify(parsed.headers) : null;
  const attachmentsJson = JSON.stringify(parsed.attachments || []);
  const rows = (await sql`
    insert into temp_mail_messages (
      id,
      inbox_id,
      fingerprint,
      message_id,
      from_name,
      from_address,
      to_address,
      subject,
      text_body,
      html_body,
      snippet,
      headers,
      attachments,
      received_at
    ) values (
      ${messageId},
      ${inbox.id},
      ${parsed.fingerprint},
      ${parsed.messageId},
      ${parsed.fromName},
      ${parsed.fromAddress},
      ${normalizedRecipient},
      ${parsed.subject},
      ${parsed.textBody},
      ${parsed.htmlBody},
      ${parsed.snippet},
      ${headersJson}::jsonb,
      ${attachmentsJson}::jsonb,
      ${parsed.receivedAt.toISOString()}
    )
    on conflict (fingerprint) do nothing
    returning id
  `) as Array<{ id?: string }>;

  return {
    stored: Boolean(rows[0]),
    duplicate: !rows[0],
    reason: 'ok' as const,
    inbox: inbox.email_address,
  };
}

export function isTempMailInboundAuthorized(request: Request) {
  const inboundSecret = getTempMailInboundSecret();
  if (!inboundSecret) {
    return false;
  }

  const authorization = request.headers.get('authorization');
  const headerSecret = request.headers.get('x-inbound-secret');
  return authorization === `Bearer ${inboundSecret}` || headerSecret === inboundSecret;
}

export function isTempMailCronAuthorized(request: Request) {
  const cronSecret = getTempMailCronSecret();
  if (!cronSecret) {
    return false;
  }

  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}
