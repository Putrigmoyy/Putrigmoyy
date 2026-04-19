import {
  getTempMailConfigSnapshot,
  isTempMailCronAuthorized,
  purgeExpiredTempMailMessages,
} from '@/lib/temp-mail';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const config = getTempMailConfigSnapshot();
  if (!config.coreReady) {
    return Response.json(
      {
        error: 'Konfigurasi temp mail belum lengkap.',
      },
      { status: 503 },
    );
  }

  if (!config.setupChecklist.cronSecret) {
    return Response.json(
      {
        error: 'CRON_SECRET belum diatur.',
      },
      { status: 503 },
    );
  }

  if (!isTempMailCronAuthorized(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const deletedCount = await purgeExpiredTempMailMessages();
  return Response.json({
    ok: true,
    deletedCount,
  });
}
