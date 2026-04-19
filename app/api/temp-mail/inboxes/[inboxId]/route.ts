import { deleteTempMailInbox, getTempMailConfigSnapshot, getTempMailInboxDetail } from '@/lib/temp-mail';
import { tempMailCorsJson, tempMailCorsOptions } from '@/lib/temp-mail-cors';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    inboxId: string;
  }>;
};

export function OPTIONS() {
  return tempMailCorsOptions();
}

export async function GET(request: Request, context: RouteContext) {
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
    const { inboxId } = await context.params;
    const url = new URL(request.url);
    const messageId = url.searchParams.get('messageId');
    const detail = await getTempMailInboxDetail(inboxId, messageId);

    if (!detail) {
      return tempMailCorsJson(
        {
          error: 'Inbox tidak ditemukan.',
        },
        { status: 404 },
      );
    }

    return tempMailCorsJson(detail);
  } catch (error) {
    return tempMailCorsJson(
      {
        error: error instanceof Error ? error.message : 'Gagal memuat detail inbox.',
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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
    const { inboxId } = await context.params;
    const inbox = await deleteTempMailInbox(inboxId);
    return tempMailCorsJson({ inbox });
  } catch (error) {
    return tempMailCorsJson(
      {
        error: error instanceof Error ? error.message : 'Gagal menghapus inbox temp mail.',
      },
      { status: 400 },
    );
  }
}
