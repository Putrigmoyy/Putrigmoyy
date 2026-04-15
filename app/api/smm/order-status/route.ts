import { NextResponse } from 'next/server';
import { getSmmCheckoutOrderStatus, getSmmPaymentGatewayStatus } from '@/lib/smm-checkout';

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

    const status = await getSmmCheckoutOrderStatus(orderCode);
    return NextResponse.json({
      status: true,
      data: status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          gateway: getSmmPaymentGatewayStatus(),
          msg: error instanceof Error ? error.message : 'Status order sosial media belum bisa dimuat.',
        },
      },
      { status: 400 },
    );
  }
}
