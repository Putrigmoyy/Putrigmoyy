import { NextResponse } from 'next/server';
import { getApkPremiumCatalog } from '@/lib/apk-premium-store';
import { isOwnerBridgeConfigured, verifyOwnerToken } from '@/lib/apk-premium-orders';

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
    const catalog = await getApkPremiumCatalog();
    return NextResponse.json({
      status: true,
      data: catalog,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal memuat katalog admin Apprem.',
        },
      },
      { status: 500 },
    );
  }
}
