import { NextResponse } from 'next/server';
import { isOwnerBridgeConfigured, pollOwnerNotifications, verifyOwnerToken } from '@/lib/apk-premium-orders';

export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || 20);
    const notifications = await pollOwnerNotifications(limit);

    return NextResponse.json({
      status: true,
      data: {
        count: notifications.length,
        items: notifications,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal mengambil notifikasi owner.',
        },
      },
      { status: 500 },
    );
  }
}
