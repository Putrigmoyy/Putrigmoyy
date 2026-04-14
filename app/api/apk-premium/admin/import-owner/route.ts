import { NextResponse } from 'next/server';
import { importOwnerCatalogToApkNeon, type OwnerCatalogPayload } from '@/lib/apk-premium-admin';
import { isOwnerBridgeConfigured, verifyOwnerToken } from '@/lib/apk-premium-orders';

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
    const body = (await request.json()) as {
      catalog?: OwnerCatalogPayload;
      updatedAt?: string;
      categories?: string[];
      products?: OwnerCatalogPayload['products'];
    };

    const catalog = body.catalog && typeof body.catalog === 'object'
      ? body.catalog
      : {
          updatedAt: body.updatedAt,
          categories: body.categories,
          products: body.products,
        };

    const result = await importOwnerCatalogToApkNeon(catalog);
    return NextResponse.json({
      status: true,
      data: {
        msg: 'Katalog owner berhasil diimpor ke Apprem website.',
        catalog: result,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal mengimpor katalog owner.',
        },
      },
      { status: 400 },
    );
  }
}
