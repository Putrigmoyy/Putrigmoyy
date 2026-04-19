import { getTempMailConfigSnapshot, createTempMailInbox, listTempMailInboxes } from '@/lib/temp-mail';
import { tempMailCorsJson, tempMailCorsOptions } from '@/lib/temp-mail-cors';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return tempMailCorsOptions();
}

export async function GET() {
  const config = getTempMailConfigSnapshot();
  if (!config.coreReady) {
    return tempMailCorsJson(
      {
        error: 'Lengkapi TEMP_MAIL_DATABASE_URL/DATABASE_URL_CORE dan TEMP_MAIL_DOMAINS terlebih dahulu.',
        config,
        inboxes: [],
      },
      { status: 503 },
    );
  }

  try {
    const inboxes = await listTempMailInboxes();
    return tempMailCorsJson({
      config,
      inboxes,
    });
  } catch (error) {
    return tempMailCorsJson(
      {
        error: error instanceof Error ? error.message : 'Gagal memuat daftar inbox temp mail.',
        config,
        inboxes: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const config = getTempMailConfigSnapshot();
  if (!config.coreReady) {
    return tempMailCorsJson(
      {
        error: 'Konfigurasi temp mail belum lengkap.',
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      localPart?: string;
      domain?: string;
    };

    const inbox = await createTempMailInbox({
      localPart: body.localPart,
      domain: body.domain,
    });

    return tempMailCorsJson({ inbox }, { status: 201 });
  } catch (error) {
    return tempMailCorsJson(
      {
        error: error instanceof Error ? error.message : 'Gagal membuat inbox temp mail.',
      },
      { status: 400 },
    );
  }
}
