import { NextResponse } from 'next/server';
import { submitApkPremiumOrder } from '@/lib/apk-premium-orders';

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

    const order = await submitApkPremiumOrder({
      productId: String(body.productId || ''),
      variantId: String(body.variantId || ''),
      quantity: Number(body.quantity || 0),
      customerName: String(body.customerName || ''),
      customerContact: String(body.customerContact || ''),
      note: String(body.note || ''),
    });

    return NextResponse.json({
      status: true,
      data: order,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal membuat order APK premium.',
        },
      },
      { status: 400 },
    );
  }
}
