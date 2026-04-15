import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { formatRupiah } from '@/lib/apk-premium';
import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getNeonClient } from '@/lib/neon-clients';

export type CoreWalletProfile = {
  registered: boolean;
  loggedIn: boolean;
  name: string;
  username: string;
  contact: string;
  balance: number;
};

export type CoreHistoryEntry = {
  id: string;
  kind: 'order' | 'deposit';
  title: string;
  subjectName: string;
  amountLabel: string;
  statusLabel: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
  createdLabel: string;
  detail: string;
  methodLabel: string;
  reference: string;
};

export type CoreWalletBundle = {
  account: CoreWalletProfile;
  history: CoreHistoryEntry[];
};

type WalletRow = {
  display_name: string | null;
  username: string | null;
  contact: string | null;
  password_hash: string | null;
  pin_hash: string | null;
  balance: number | null;
};

type HistoryRow = {
  id: number;
  kind: 'order' | 'deposit';
  title: string;
  subject_name: string;
  amount: number;
  status_label: string;
  status: 'pending' | 'success' | 'failed';
  detail: string;
  method_label: string;
  reference: string;
  created_at: string;
};

function isCoreConfigured() {
  return getAppDataSourceConfig().core.databaseConfigured;
}

function normalizeUsername(value: string) {
  return String(value || '').trim().toLowerCase();
}

function validateUsername(username: string) {
  return /^[a-z0-9._-]{4,24}$/.test(username);
}

function hashLegacyPin(pin: string) {
  return createHash('sha256').update(pin).digest('hex');
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password: string, storedHash: string) {
  const normalized = String(storedHash || '').trim();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith('scrypt$')) {
    const parts = normalized.split('$');
    if (parts.length !== 3) {
      return false;
    }
    const [, salt, stored] = parts;
    const storedBuffer = Buffer.from(stored, 'hex');
    const derivedBuffer = scryptSync(password, salt, storedBuffer.length);
    return storedBuffer.length === derivedBuffer.length && timingSafeEqual(storedBuffer, derivedBuffer);
  }

  return normalized === hashLegacyPin(password);
}

function formatHistoryDate(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveAccountKey(row?: WalletRow | null) {
  return normalizeUsername(row?.username || row?.contact || '');
}

function mapWalletRow(row?: WalletRow | null, loggedIn = false): CoreWalletProfile {
  if (!row) {
    return {
      registered: false,
      loggedIn: false,
      name: '',
      username: '',
      contact: '',
      balance: 0,
    };
  }

  const username = resolveAccountKey(row);
  return {
    registered: true,
    loggedIn,
    name: String(row.display_name || '').trim(),
    username,
    contact: username,
    balance: Number(row.balance || 0),
  };
}

function mapHistoryRow(row: HistoryRow): CoreHistoryEntry {
  return {
    id: `${row.kind}-${row.id}`,
    kind: row.kind,
    title: row.title,
    subjectName: row.subject_name,
    amountLabel: `Rp ${formatRupiah(Number(row.amount || 0))}`,
    statusLabel: row.status_label,
    status: row.status,
    createdAt: row.created_at,
    createdLabel: formatHistoryDate(row.created_at),
    detail: row.detail,
    methodLabel: row.method_label,
    reference: row.reference,
  };
}

async function ensureCoreTables() {
  const sql = getNeonClient('core');
  await sql`
    create table if not exists core_wallet_accounts (
      id bigserial primary key,
      display_name text not null default '',
      username text not null default '',
      contact text not null default '',
      password_hash text not null default '',
      pin_hash text not null default '',
      balance integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists core_transaction_history (
      id bigserial primary key,
      account_contact text not null default '',
      kind text not null default 'order',
      title text not null default '',
      subject_name text not null default '',
      amount integer not null default 0,
      status_label text not null default 'Pending',
      status text not null default 'pending',
      detail text not null default '',
      method_label text not null default '',
      reference text not null default '',
      created_at timestamptz not null default now()
    )
  `;
  await sql`alter table core_wallet_accounts add column if not exists username text not null default ''`;
  await sql`alter table core_wallet_accounts add column if not exists password_hash text not null default ''`;
  await sql`alter table core_wallet_accounts add column if not exists contact text not null default ''`;
  await sql`alter table core_wallet_accounts add column if not exists pin_hash text not null default ''`;
  await sql`alter table core_wallet_accounts add column if not exists balance integer not null default 0`;
  await sql`update core_wallet_accounts set username = lower(trim(contact)) where username = '' and contact <> ''`;
  await sql`update core_wallet_accounts set contact = username where contact = '' and username <> ''`;
  await sql`create unique index if not exists core_wallet_accounts_username_idx on core_wallet_accounts(username) where username <> ''`;
  await sql`create index if not exists core_transaction_history_account_idx on core_transaction_history(account_contact)`;
}

async function getWalletRow(identifier: string) {
  await ensureCoreTables();
  const lookup = normalizeUsername(identifier);
  if (!lookup) {
    return null;
  }

  const sql = getNeonClient('core');
  const rows = (await sql`
    select
      display_name,
      username,
      contact,
      password_hash,
      pin_hash,
      balance
    from core_wallet_accounts
    where lower(username) = ${lookup}
      or lower(contact) = ${lookup}
    limit 1
  `) as WalletRow[];
  return rows[0] || null;
}

export async function getCoreWalletBundle(identifier: string, loggedIn = true): Promise<CoreWalletBundle | null> {
  if (!isCoreConfigured()) {
    return null;
  }

  const normalizedIdentifier = normalizeUsername(identifier);
  if (!normalizedIdentifier) {
    return null;
  }

  const row = await getWalletRow(normalizedIdentifier);
  if (!row) {
    return null;
  }

  const sql = getNeonClient('core');
  const accountKey = resolveAccountKey(row);
  const legacyContact = normalizeUsername(row.contact || '');
  const historyRows = (await sql`
    select
      id,
      kind,
      title,
      subject_name,
      amount,
      status_label,
      status,
      detail,
      method_label,
      reference,
      created_at
    from core_transaction_history
    where account_contact = ${accountKey}
      or (${legacyContact} <> '' and account_contact = ${legacyContact})
    order by created_at desc
    limit 60
  `) as HistoryRow[];

  return {
    account: mapWalletRow(row, loggedIn),
    history: historyRows.map(mapHistoryRow),
  };
}

export async function registerCoreWalletAccount(input: { name: string; username: string; password: string }) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  const name = String(input.name || '').trim();
  const username = normalizeUsername(input.username);
  const password = String(input.password || '').trim();

  if (!name || !username || !password) {
    throw new Error('Nama, username, dan password wajib diisi.');
  }
  if (!validateUsername(username)) {
    throw new Error('Username hanya boleh 4-24 karakter, huruf kecil, angka, titik, garis bawah, atau strip.');
  }
  if (password.length < 6) {
    throw new Error('Password minimal 6 karakter.');
  }

  const existing = await getWalletRow(username);
  if (existing) {
    throw new Error('Username ini sudah terdaftar. Silakan login.');
  }

  const sql = getNeonClient('core');
  await sql`
    insert into core_wallet_accounts (
      display_name,
      username,
      contact,
      password_hash,
      pin_hash
    ) values (
      ${name},
      ${username},
      ${username},
      ${hashPassword(password)},
      ${''}
    )
  `;

  const bundle = await getCoreWalletBundle(username, true);
  if (!bundle) {
    throw new Error('Akun berhasil dibuat, tetapi data akun belum bisa dimuat.');
  }
  return bundle;
}

export async function loginCoreWalletAccount(input: { username: string; password: string }) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  const username = normalizeUsername(input.username);
  const password = String(input.password || '').trim();
  if (!username || !password) {
    throw new Error('Username dan password wajib diisi.');
  }

  const row = await getWalletRow(username);
  if (!row) {
    throw new Error('Akun belum terdaftar.');
  }

  const validPassword =
    verifyPassword(password, String(row.password_hash || '').trim()) ||
    String(row.pin_hash || '').trim() === hashLegacyPin(password);
  if (!validPassword) {
    throw new Error('Username atau password tidak cocok.');
  }

  const normalizedUsername = resolveAccountKey(row) || username;
  const sql = getNeonClient('core');
  await sql`
    update core_wallet_accounts
    set
      username = ${normalizedUsername},
      contact = case when contact = '' then ${normalizedUsername} else contact end,
      password_hash = case
        when password_hash = '' then ${hashPassword(password)}
        else password_hash
      end,
      updated_at = now()
    where lower(username) = ${normalizedUsername}
      or lower(contact) = ${normalizedUsername}
  `;

  const bundle = await getCoreWalletBundle(normalizedUsername, true);
  if (!bundle) {
    throw new Error('Akun ditemukan, tetapi data belum bisa dimuat.');
  }
  return bundle;
}

type CoreHistoryInsert = {
  accountContact: string;
  kind: 'order' | 'deposit';
  title: string;
  subjectName: string;
  amount: number;
  statusLabel: string;
  status: 'pending' | 'success' | 'failed';
  detail: string;
  methodLabel: string;
  reference: string;
};

async function insertCoreHistory(entry: CoreHistoryInsert) {
  await ensureCoreTables();
  const sql = getNeonClient('core');
  await sql`
    insert into core_transaction_history (
      account_contact,
      kind,
      title,
      subject_name,
      amount,
      status_label,
      status,
      detail,
      method_label,
      reference
    ) values (
      ${normalizeUsername(entry.accountContact)},
      ${entry.kind},
      ${entry.title},
      ${entry.subjectName},
      ${Math.max(0, Number(entry.amount || 0))},
      ${entry.statusLabel},
      ${entry.status},
      ${entry.detail},
      ${entry.methodLabel},
      ${entry.reference}
    )
  `;
}

export async function submitCoreDeposit(input: {
  accountContact: string;
  amount: number;
  method: 'midtrans' | 'balance';
}) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  const accountContact = normalizeUsername(input.accountContact);
  const amount = Math.max(0, Number(input.amount || 0));
  const method = input.method;

  if (!accountContact) {
    throw new Error('Username akun wajib diisi.');
  }
  if (amount <= 0) {
    throw new Error('Jumlah deposit belum valid.');
  }

  const row = await getWalletRow(accountContact);
  if (!row) {
    throw new Error('Akun belum ditemukan. Silakan daftar atau login dulu.');
  }

  const sql = getNeonClient('core');
  if (method === 'balance') {
    if (Number(row.balance || 0) < amount) {
      throw new Error('Saldo akun belum cukup untuk nominal ini.');
    }

    await sql`
      update core_wallet_accounts
      set
        balance = balance - ${amount},
        updated_at = now()
      where lower(username) = ${accountContact}
        or lower(contact) = ${accountContact}
    `;

    await insertCoreHistory({
      accountContact,
      kind: 'deposit',
      title: 'Pembayaran dengan saldo akun',
      subjectName: String(row.display_name || '').trim() || accountContact,
      amount,
      statusLabel: 'Berhasil',
      status: 'success',
      detail: `Metode: Saldo akun\nUsername: ${accountContact}\nSaldo terpakai: Rp ${formatRupiah(amount)}`,
      methodLabel: 'Saldo akun',
      reference: `SALDO-${Date.now().toString().slice(-6)}`,
    });
  } else {
    await insertCoreHistory({
      accountContact,
      kind: 'deposit',
      title: 'Deposit via QRIS Midtrans',
      subjectName: String(row.display_name || '').trim() || accountContact,
      amount,
      statusLabel: 'Menunggu pembayaran',
      status: 'pending',
      detail: `Metode: QRIS Midtrans\nUsername: ${accountContact}\nNominal: Rp ${formatRupiah(amount)}`,
      methodLabel: 'QRIS Midtrans',
      reference: `DPS-${Date.now().toString().slice(-6)}`,
    });
  }

  const bundle = await getCoreWalletBundle(accountContact, true);
  if (!bundle) {
    throw new Error('Transaksi tersimpan, tetapi bundle akun belum bisa dimuat.');
  }

  return {
    bundle,
    method,
    amount,
  };
}

export async function recordCoreOrderHistory(input: {
  accountContact: string;
  subjectName: string;
  title: string;
  amount: number;
  detail: string;
  methodLabel: string;
  reference: string;
}) {
  if (!isCoreConfigured()) {
    return;
  }

  const accountContact = normalizeUsername(input.accountContact);
  if (!accountContact) {
    return;
  }

  const row = await getWalletRow(accountContact);
  if (!row) {
    return;
  }

  await insertCoreHistory({
    accountContact,
    kind: 'order',
    title: input.title,
    subjectName: String(input.subjectName || '').trim() || String(row.display_name || '').trim() || accountContact,
    amount: Math.max(0, Number(input.amount || 0)),
    statusLabel: 'Menunggu pembayaran',
    status: 'pending',
    detail: input.detail,
    methodLabel: input.methodLabel,
    reference: input.reference,
  });
}

export async function updateCoreOrderHistoryStatusByReference(input: {
  reference: string;
  statusLabel: string;
  status: 'pending' | 'success' | 'failed';
  methodLabel?: string;
  detailAppend?: string;
}) {
  if (!isCoreConfigured()) {
    return;
  }

  const reference = String(input.reference || '').trim();
  if (!reference) {
    return;
  }

  const statusLabel = String(input.statusLabel || '').trim() || 'Pending';
  const methodLabel = String(input.methodLabel || '').trim();
  const detailAppend = String(input.detailAppend || '').trim();

  await ensureCoreTables();
  const sql = getNeonClient('core');
  const rows = (await sql`
    select id, detail, method_label
    from core_transaction_history
    where reference = ${reference}
      and kind = 'order'
  `) as Array<{
    id: number;
    detail: string | null;
    method_label: string | null;
  }>;

  for (const row of rows) {
    const currentDetail = String(row.detail || '');
    const nextDetail =
      detailAppend && !currentDetail.includes(detailAppend)
        ? currentDetail
          ? `${currentDetail}\n${detailAppend}`
          : detailAppend
        : currentDetail;

    await sql`
      update core_transaction_history
      set
        status_label = ${statusLabel},
        status = ${input.status},
        method_label = ${methodLabel || String(row.method_label || '')},
        detail = ${nextDetail}
      where id = ${row.id}
    `;
  }
}

export async function spendCoreWalletBalanceForOrder(input: {
  accountContact: string;
  amount: number;
  subjectName: string;
  title: string;
  detail: string;
  reference: string;
}) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  const accountContact = normalizeUsername(input.accountContact);
  const amount = Math.max(0, Number(input.amount || 0));
  if (!accountContact) {
    throw new Error('Username akun wajib diisi untuk pembayaran saldo.');
  }
  if (amount <= 0) {
    throw new Error('Nominal pembayaran saldo belum valid.');
  }

  const row = await getWalletRow(accountContact);
  if (!row) {
    throw new Error('Akun saldo belum ditemukan. Silakan login dulu.');
  }
  if (Number(row.balance || 0) < amount) {
    throw new Error('Saldo akun belum cukup untuk menyelesaikan order ini.');
  }

  const sql = getNeonClient('core');
  const updatedRows = (await sql`
    update core_wallet_accounts
    set
      balance = balance - ${amount},
      updated_at = now()
    where (lower(username) = ${accountContact} or lower(contact) = ${accountContact})
      and balance >= ${amount}
    returning balance
  `) as Array<{ balance?: number }>;

  if (!updatedRows[0]) {
    throw new Error('Saldo akun berubah. Coba ulangi pembayaran ini.');
  }

  await insertCoreHistory({
    accountContact,
    kind: 'order',
    title: input.title,
    subjectName: String(input.subjectName || '').trim() || String(row.display_name || '').trim() || accountContact,
    amount,
    statusLabel: 'Berhasil',
    status: 'success',
    detail: input.detail,
    methodLabel: 'Saldo akun',
    reference: input.reference,
  });

  const bundle = await getCoreWalletBundle(accountContact, true);
  return {
    balanceAfter: Math.max(0, Number(updatedRows[0].balance || 0)),
    bundle,
  };
}

export async function refundCoreWalletBalanceOrder(input: {
  accountContact: string;
  amount: number;
  subjectName: string;
  reference: string;
  reason: string;
}) {
  if (!isCoreConfigured()) {
    return;
  }

  const accountContact = normalizeUsername(input.accountContact);
  const amount = Math.max(0, Number(input.amount || 0));
  if (!accountContact || amount <= 0) {
    return;
  }

  const row = await getWalletRow(accountContact);
  if (!row) {
    return;
  }

  const sql = getNeonClient('core');
  await sql`
    update core_wallet_accounts
    set
      balance = balance + ${amount},
      updated_at = now()
    where lower(username) = ${accountContact}
      or lower(contact) = ${accountContact}
  `;

  await insertCoreHistory({
    accountContact,
    kind: 'deposit',
    title: 'Refund saldo order website',
    subjectName: String(input.subjectName || '').trim() || String(row.display_name || '').trim() || accountContact,
    amount,
    statusLabel: 'Dikembalikan',
    status: 'success',
    detail: `Refund otomatis untuk order ${input.reference}\nAlasan: ${String(input.reason || '').trim() || '-'}`,
    methodLabel: 'Refund saldo akun',
    reference: `${input.reference}-REFUND`,
  });
}
