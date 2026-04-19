import type {
  TempMailEmailDetail,
  TempMailEmailSummary,
  TempMailInboxSummary,
  TempMailStoredAttachment,
} from '@/lib/temp-mail-types';

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function cleanUrl(value: string | undefined) {
  return clean(value).replace(/\/+$/, '');
}

function lower(value: unknown) {
  return clean(value).toLowerCase();
}

function pickString(source: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!source) {
    return '';
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function pickArray<T>(source: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!source) {
    return [] as T[];
  }

  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [] as T[];
}

function pickObject(source: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return null;
}

function pickDateIso(source: Record<string, unknown> | null | undefined, keys: string[]) {
  const raw = pickString(source, keys);
  if (!raw) {
    return '';
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString();
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippetFromBodies(textBody: string, htmlBody: string) {
  const source = textBody || (htmlBody ? stripHtml(htmlBody) : '');
  return source.slice(0, 220);
}

function normalizeHeaders(source: Record<string, unknown> | null | undefined) {
  const headers = pickObject(source, ['headers', 'headerMap', 'rawHeaders']);
  if (!headers) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([key, value]) => [key, String(value)]),
  );
}

function normalizeAttachments(source: Record<string, unknown> | null | undefined) {
  const files = pickArray<Record<string, unknown>>(source, ['attachments', 'files']);
  return files.map((file) => ({
    filename: pickString(file, ['filename', 'name']) || null,
    mimeType: pickString(file, ['mimeType', 'contentType', 'type']) || null,
    disposition: lower(file.disposition) === 'inline' ? 'inline' : 'attachment',
    contentId: pickString(file, ['contentId', 'cid']) || null,
    size: Number(file.size || file.bytes || 0) || null,
  })) as TempMailStoredAttachment[];
}

function normalizeEmailAddress(address: string) {
  return lower(address).replace(/^mailto:/, '');
}

function localPartFromAddress(address: string) {
  return normalizeEmailAddress(address).split('@')[0] || '';
}

function domainFromAddress(address: string) {
  return normalizeEmailAddress(address).split('@')[1] || '';
}

export function getExternalProviderMode() {
  const raw = lower(process.env.TEMP_MAIL_PROVIDER_MODE || process.env.NEXT_PUBLIC_TEMP_MAIL_PROVIDER_MODE || '');
  return raw === 'external' ? 'external' : 'local';
}

export function getExternalProviderBaseUrl() {
  return cleanUrl(process.env.TEMP_MAIL_EXTERNAL_BASE_URL) || 'https://mail.exmoca.shop';
}

export function getExternalProviderDefaultDomain() {
  return lower(process.env.TEMP_MAIL_EXTERNAL_DEFAULT_DOMAIN || process.env.NEXT_PUBLIC_TEMP_MAIL_EXTERNAL_DEFAULT_DOMAIN || 'ysweb.biz.id');
}

export function getExternalProviderLabel() {
  return clean(process.env.TEMP_MAIL_EXTERNAL_PROVIDER_NAME || 'YS Mail');
}

export async function fetchExternalRetention() {
  const response = await fetch(`${getExternalProviderBaseUrl()}/api/retention`, {
    headers: {
      accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => ({}))) as {
    seconds?: number;
    updatedAt?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || 'Gagal membaca retention provider eksternal.');
  }

  const seconds = Number(payload.seconds || 0);
  return {
    seconds,
    hours: seconds > 0 ? Math.max(1, Math.round(seconds / 3600)) : 24,
    updatedAt: payload.updatedAt || null,
  };
}

export async function fetchExternalInbox(address: string) {
  const response = await fetch(
    `${getExternalProviderBaseUrl()}/api/inbox?address=${encodeURIComponent(normalizeEmailAddress(address))}`,
    {
      headers: {
        accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    emails?: unknown[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || 'Gagal membaca inbox provider eksternal.');
  }

  return {
    emails: Array.isArray(payload.emails) ? payload.emails : [],
  };
}

export async function fetchExternalDownload(address: string, emailId: string, type = 'email') {
  const response = await fetch(
    `${getExternalProviderBaseUrl()}/api/download?address=${encodeURIComponent(
      normalizeEmailAddress(address),
    )}&emailId=${encodeURIComponent(emailId)}&type=${encodeURIComponent(type)}`,
    {
      headers: {
        accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
      },
      cache: 'no-store',
    },
  );

  const contentType = lower(response.headers.get('content-type'));
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => ({})) : await response.text();

  if (!response.ok) {
    if (isJson && payload && typeof payload === 'object' && 'error' in payload) {
      throw new Error(String((payload as { error?: string }).error || 'Gagal membaca detail email eksternal.'));
    }

    throw new Error('Gagal membaca detail email eksternal.');
  }

  return payload;
}

export function buildExternalInboxSummary(address: string, overrides?: Partial<TempMailInboxSummary>): TempMailInboxSummary {
  const normalizedAddress = normalizeEmailAddress(address);
  const localPart = localPartFromAddress(normalizedAddress);
  const domain = domainFromAddress(normalizedAddress);

  return {
    id: normalizedAddress,
    localPart,
    domain,
    emailAddress: normalizedAddress,
    createdAt: overrides?.createdAt || new Date().toISOString(),
    messageCount: overrides?.messageCount || 0,
    latestReceivedAt: overrides?.latestReceivedAt || null,
  };
}

export function normalizeExternalEmailSummary(address: string, email: unknown, index: number): TempMailEmailSummary {
  const source = email && typeof email === 'object' ? (email as Record<string, unknown>) : {};
  const htmlBody = pickString(source, ['htmlBody', 'html', 'bodyHtml', 'contentHtml']);
  const textBody = pickString(source, ['textBody', 'text', 'bodyText', 'contentText', 'body']);
  const subject = pickString(source, ['subject', 'title']) || `Pesan ${index + 1}`;
  const fromAddress =
    normalizeEmailAddress(pickString(source, ['fromAddress', 'from', 'sender', 'fromEmail'])) || 'unknown@sender';
  const receivedAt =
    pickDateIso(source, ['receivedAt', 'createdAt', 'date', 'sentAt', 'timestamp']) || new Date().toISOString();
  const attachments = normalizeAttachments(source);
  const id =
    pickString(source, ['id', 'emailId', 'uuid', 'messageId']) ||
    `${normalizeEmailAddress(address)}-${receivedAt}-${index}`;

  return {
    id,
    subject,
    fromName: pickString(source, ['fromName', 'senderName']) || null,
    fromAddress,
    toAddress: normalizeEmailAddress(address),
    snippet:
      pickString(source, ['snippet', 'preview', 'textPreview', 'summary']) ||
      snippetFromBodies(textBody, htmlBody) ||
      'Email masuk tanpa ringkasan.',
    receivedAt,
    attachmentCount: attachments.length || Number(source.attachmentCount || 0) || 0,
    hasHtml: Boolean(htmlBody),
    hasText: Boolean(textBody),
  };
}

export function normalizeExternalEmailDetail(address: string, emailId: string, payload: unknown): TempMailEmailDetail {
  const source =
    payload && typeof payload === 'object'
      ? (pickObject(payload as Record<string, unknown>, ['email', 'data', 'message']) ||
          (payload as Record<string, unknown>))
      : {};

  const summary = normalizeExternalEmailSummary(address, { ...(source as Record<string, unknown>), id: emailId }, 0);
  const textBody =
    pickString(source, ['textBody', 'text', 'bodyText', 'contentText', 'body']) ||
    (typeof payload === 'string' ? payload : '');
  const htmlBody = pickString(source, ['htmlBody', 'html', 'bodyHtml', 'contentHtml']);

  return {
    ...summary,
    messageId: pickString(source, ['messageId', 'id', 'emailId']) || emailId || null,
    htmlBody: htmlBody || null,
    textBody: textBody || null,
    headers: normalizeHeaders(source),
    attachments: normalizeAttachments(source),
  };
}
