import { fetchExternalDownload, normalizeExternalEmailDetail } from '@/lib/temp-mail-external';
import { tempMailCorsJson, tempMailCorsOptions } from '@/lib/temp-mail-cors';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return tempMailCorsOptions();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = String(url.searchParams.get('address') || '').trim();
  const emailId = String(url.searchParams.get('emailId') || '').trim();
  const type = String(url.searchParams.get('type') || 'email').trim();

  if (!address || !emailId) {
    return tempMailCorsJson(
      {
        error: 'Parameter address dan emailId wajib diisi.',
      },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchExternalDownload(address, emailId, type);
    const detail = normalizeExternalEmailDetail(address, emailId, payload);
    return tempMailCorsJson({
      detail,
    });
  } catch (error) {
    return tempMailCorsJson(
      {
        error: error instanceof Error ? error.message : 'Gagal membaca detail email provider eksternal.',
      },
      { status: 502 },
    );
  }
}
