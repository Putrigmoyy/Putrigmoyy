import { fetchExternalInbox, normalizeExternalEmailSummary } from '@/lib/temp-mail-external';
import { tempMailCorsJson, tempMailCorsOptions } from '@/lib/temp-mail-cors';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return tempMailCorsOptions();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = String(url.searchParams.get('address') || '').trim();

  if (!address) {
    return tempMailCorsJson(
      {
        error: 'Parameter address wajib diisi.',
      },
      { status: 400 },
    );
  }

  try {
    const inbox = await fetchExternalInbox(address);
    return tempMailCorsJson({
      emails: inbox.emails.map((email, index) => normalizeExternalEmailSummary(address, email, index)),
    });
  } catch (error) {
    return tempMailCorsJson(
      {
        error: error instanceof Error ? error.message : 'Gagal membaca inbox provider eksternal.',
      },
      { status: 502 },
    );
  }
}
