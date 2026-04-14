import { NextResponse } from 'next/server';
import { buildApkPremiumCheckoutPreview } from '@/lib/apk-premium-orders';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      productId?: string;
      variantId?: string;
      quantity?: number | string;
      customerName?: string;
      customerContact?: string;
      note?: string;
    };

    const preview = await buildApkPremiumCheckoutPreview({
      productId: String(body.productId || ''),
      variantId: String(body.variantId || ''),
      quantity: Number(body.quantity || 0),
      customerName: String(body.customerName || ''),
      customerContact: String(body.customerContact || ''),
      note: String(body.note || ''),
    });

    return NextResponse.json({
      status: true,
      data: preview,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal membuat preview checkout APK premium.',
        },
      },
      { status: 400 },
    );
  }
}
