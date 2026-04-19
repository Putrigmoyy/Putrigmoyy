import { clearTempMailInboxMessages, getTempMailConfigSnapshot } from '@/lib/temp-mail';
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
    const result = await clearTempMailInboxMessages(inboxId);
    return tempMailCorsJson(result);
  } catch (error) {
    return tempMailCorsJson(
      {
        error: error instanceof Error ? error.message : 'Gagal membersihkan isi inbox temp mail.',
      },
      { status: 400 },
    );
  }
}
