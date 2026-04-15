import { NextRequest, NextResponse } from 'next/server';
import { getSmmPaymentGatewayStatus, submitSmmCheckoutOrder } from '@/lib/smm-checkout';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const comments = Array.isArray(body.komen)
      ? body.komen.map((item) => String(item || '').trim()).filter(Boolean).join('\n')
      : String(body.komen || '').trim();

    const quantityValue = String(body.quantity || '').trim();
    const quantity = quantityValue ? Math.max(0, Number(quantityValue || 0)) : null;

    const result = await submitSmmCheckoutOrder({
      accountContact: String(body.accountContact || '').trim(),
      customerName: String(body.customerName || '').trim(),
      service: String(body.service || '').trim(),
      serviceName: String(body.serviceName || '').trim(),
      category: String(body.category || '').trim(),
      data: String(body.data || '').trim(),
      quantity,
      unitPrice: Number(body.unitPrice || 0),
      totalPrice: Number(body.totalPrice || 0),
      username: String(body.username || '').trim(),
      comments,
    });

    return NextResponse.json({
      status: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          gateway: getSmmPaymentGatewayStatus(),
          msg: error instanceof Error ? error.message : 'Checkout sosial media belum bisa dibuat.',
        },
      },
      { status: 400 },
    );
  }
}
