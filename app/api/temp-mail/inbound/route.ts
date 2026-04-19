import {
  getTempMailConfigSnapshot,
  ingestTempMailInbound,
  isTempMailInboundAuthorized,
} from '@/lib/temp-mail';
import { parseTempMailInboundRequest } from '@/lib/temp-mail-parser';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const config = getTempMailConfigSnapshot();
  if (!config.coreReady) {
    return Response.json(
      {
        error: 'Konfigurasi temp mail belum lengkap. Database dan domain wajib diatur.',
      },
      { status: 503 },
    );
  }

  if (!config.setupChecklist.inboundSecret) {
    return Response.json(
      {
        error: 'TEMP_MAIL_INBOUND_SECRET belum diatur.',
      },
      { status: 503 },
    );
  }

  if (!isTempMailInboundAuthorized(request)) {
    return Response.json(
      {
        error: 'Webhook inbound temp mail tidak sah.',
      },
      { status: 401 },
    );
  }

  try {
    const parsed = await parseTempMailInboundRequest(request);
    const result = await ingestTempMailInbound(parsed);
    return Response.json(result, {
      status: result.stored || result.duplicate ? 200 : 202,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Gagal memproses email inbound temp mail.',
      },
      { status: 400 },
    );
  }
}
