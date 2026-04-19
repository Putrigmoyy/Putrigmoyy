import { fetchExternalRetention } from '@/lib/temp-mail-external';
import { tempMailCorsJson, tempMailCorsOptions } from '@/lib/temp-mail-cors';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return tempMailCorsOptions();
}

export async function GET() {
  try {
    const retention = await fetchExternalRetention();
    return tempMailCorsJson(retention);
  } catch (error) {
    return tempMailCorsJson(
      {
        error: error instanceof Error ? error.message : 'Gagal membaca retention provider eksternal.',
      },
      { status: 502 },
    );
  }
}
