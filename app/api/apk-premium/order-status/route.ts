import { NextResponse } from 'next/server';
import { getApkPremiumOrderStatus, getApkPremiumPaymentGatewayStatus } from '@/lib/apk-premium-orders';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderCode = String(searchParams.get('orderCode') || '').trim();
    if (!orderCode) {
      return NextResponse.json(
        {
          status: false,
          data: {
            msg: 'Order code wajib diisi.',
          },
        },
        { status: 400 },
      );
    }

    const status = await getApkPremiumOrderStatus(orderCode);
    return NextResponse.json({
      status: true,
      data: status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          gateway: getApkPremiumPaymentGatewayStatus(),
          msg: error instanceof Error ? error.message : 'Status order belum bisa dimuat.',
        },
      },
      { status: 400 },
    );
  }
}
