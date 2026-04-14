import { NextResponse } from 'next/server';
import { acknowledgeOwnerNotifications, isOwnerBridgeConfigured, verifyOwnerToken } from '@/lib/apk-premium-orders';

export async function POST(request: Request) {
  const ownerToken = request.headers.get('x-owner-token');
  if (!verifyOwnerToken(ownerToken)) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: isOwnerBridgeConfigured() ? 'Owner token tidak valid.' : 'OWNER_APP_TOKEN belum diatur.',
        },
      },
      { status: 401 },
    );
  }

  try {
    const body = await request.json() as {
      queueIds?: Array<number | string>;
    };
    const queueIds = Array.isArray(body.queueIds) ? body.queueIds.map((item) => Number(item)) : [];
    const result = await acknowledgeOwnerNotifications(queueIds);

    return NextResponse.json({
      status: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal acknowledge notifikasi owner.',
        },
      },
      { status: 400 },
    );
  }
}
