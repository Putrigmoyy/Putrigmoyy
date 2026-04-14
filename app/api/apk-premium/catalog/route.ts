import { NextResponse } from 'next/server';
import { getApkPremiumCatalog } from '@/lib/apk-premium-store';

export async function GET() {
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
          msg: error instanceof Error ? error.message : 'Gagal mengambil katalog APK premium.',
        },
      },
      { status: 500 },
    );
  }
}
