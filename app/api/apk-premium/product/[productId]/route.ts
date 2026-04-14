import { NextResponse } from 'next/server';
import { getApkPremiumProductById } from '@/lib/apk-premium-store';

type Context = {
  params: Promise<{
    productId: string;
  }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { productId } = await context.params;
    const product = await getApkPremiumProductById(productId);

    if (!product) {
      return NextResponse.json(
        {
          status: false,
          data: {
            msg: 'Produk APK premium tidak ditemukan.',
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: true,
      data: product,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal mengambil detail produk APK premium.',
        },
      },
      { status: 500 },
    );
  }
}
