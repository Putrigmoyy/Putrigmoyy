import { createHash } from 'node:crypto';
import PostalMime, { type Address, type Email } from 'postal-mime';
import type { TempMailStoredAttachment } from '@/lib/temp-mail-types';

type TempMailInboundJsonPayload = {
  raw?: string;
  envelope?: {
    from?: string;
    to?: string;
  };
  headers?: Record<string, string>;
  from?: string;
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  messageId?: string;
  receivedAt?: string;
  attachments?: TempMailStoredAttachment[];
};

export type ParsedTempMailInbound = {
  fingerprint: string;
  fromName: string | null;
  fromAddress: string;
  toAddress: string;
  subject: string;
  messageId: string | null;
  textBody: string | null;
  htmlBody: string | null;
  snippet: string;
  headers: Record<string, string> | null;
  attachments: TempMailStoredAttachment[];
  receivedAt: Date;
};

function flattenAddresses(input?: Address | Address[] | null) {
  if (!input) {
    return [] as Array<{ name: string | null; address: string }>;
  }

  const values = Array.isArray(input) ? input : [input];
  const result: Array<{ name: string | null; address: string }> = [];

  for (const value of values) {
    if ('group' in value && value.group) {
      for (const mailbox of value.group) {
        if (mailbox.address) {
          result.push({
            name: mailbox.name || null,
            address: mailbox.address.toLowerCase(),
          });
        }
      }
      continue;
    }

    if ('address' in value && value.address) {
      result.push({
        name: value.name || null,
        address: value.address.toLowerCase(),
      });
    }
  }

  return result;
}

function cleanAddress(value?: string | null) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/<([^>]+)>/);

  return (match?.[1] ?? trimmed).replace(/^mailto:/, '');
}

function parseDate(value?: string | null) {
  const parsed = value ? new Date(value) : new Date();

  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
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

function createSnippet(textBody: string | null, htmlBody: string | null) {
  const source = textBody?.trim() || (htmlBody ? stripHtml(htmlBody) : '');
  return source.slice(0, 220);
}

function attachmentSize(content: ArrayBuffer | Uint8Array | string) {
  if (typeof content === 'string') {
    return content.length;
  }

  if (content instanceof Uint8Array) {
    return content.byteLength;
  }

  return content.byteLength;
}

function normalizeHeaders(parsed: Email | null, fallback?: Record<string, string>) {
  if (parsed?.headers?.length) {
    const headers: Record<string, string> = {};

    for (const header of parsed.headers) {
      headers[header.originalKey] = header.value;
    }

    return headers;
  }

  return fallback && Object.keys(fallback).length > 0 ? fallback : null;
}

function createFingerprint(input: {
  messageId: string | null;
  fromAddress: string;
  toAddress: string;
  subject: string;
  snippet: string;
  receivedAt: Date;
}) {
  return createHash('sha256')
    .update(
      [
        input.messageId ?? '',
        input.fromAddress,
        input.toAddress,
        input.subject,
        input.snippet,
        input.receivedAt.toISOString(),
      ].join('||'),
    )
    .digest('hex');
}

export async function parseTempMailInboundRequest(request: Request): Promise<ParsedTempMailInbound> {
  const contentType = request.headers.get('content-type') ?? '';

  let parsed: Email | null = null;
  let payload: TempMailInboundJsonPayload = {};
  let raw: string | undefined;

  if (contentType.includes('application/json')) {
    payload = (await request.json()) as TempMailInboundJsonPayload;
    raw = typeof payload.raw === 'string' && payload.raw.trim() ? payload.raw : undefined;
  } else if (
    contentType.includes('message/rfc822') ||
    contentType.includes('text/plain') ||
    contentType === ''
  ) {
    raw = await request.text();
  } else {
    throw new Error('Format inbound tidak didukung. Gunakan application/json atau message/rfc822.');
  }

  if (raw) {
    parsed = await PostalMime.parse(raw);
  }

  const parsedFrom = flattenAddresses(parsed?.from)[0];
  const parsedTo = flattenAddresses(parsed?.to)[0];
  const fromAddress = parsedFrom?.address || cleanAddress(payload.envelope?.from) || cleanAddress(payload.from);
  const toAddress = parsedTo?.address || cleanAddress(payload.envelope?.to) || cleanAddress(payload.to);

  if (!fromAddress || !toAddress) {
    throw new Error('Payload inbound wajib memiliki alamat pengirim dan penerima.');
  }

  const textBody = parsed?.text?.trim() || payload.text?.trim() || null;
  const htmlBody = parsed?.html?.trim() || payload.html?.trim() || null;
  const subject = parsed?.subject?.trim() || payload.subject?.trim() || 'Tanpa subjek';
  const messageId = String(parsed?.messageId || payload.messageId || '').trim() || null;
  const receivedAt = parseDate(payload.receivedAt || parsed?.date || null);
  const attachments =
    parsed?.attachments?.map((attachment) => ({
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      disposition: attachment.disposition,
      contentId: attachment.contentId ?? null,
      size: attachmentSize(attachment.content),
    })) ??
    payload.attachments ??
    [];

  const snippet = createSnippet(textBody, htmlBody);
  const headers = normalizeHeaders(parsed, payload.headers);
  const fingerprint = createFingerprint({
    messageId,
    fromAddress,
    toAddress,
    subject,
    snippet,
    receivedAt,
  });

  return {
    fingerprint,
    fromName: parsedFrom?.name || null,
    fromAddress,
    toAddress,
    subject,
    messageId,
    textBody,
    htmlBody,
    snippet,
    headers,
    attachments,
    receivedAt,
  };
}
