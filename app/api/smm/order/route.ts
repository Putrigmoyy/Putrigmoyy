import { NextRequest, NextResponse } from 'next/server';
import { requestPusatPanel } from '@/lib/pusatpanel';
import { saveSmmOrder } from '@/lib/smm-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const service = String(body.service || '').trim();
    const accountContact = String(body.accountContact || '').trim();
    const data = String(body.data || '').trim();
    const quantity = String(body.quantity || '').trim();
    const unitPrice = Number(body.unitPrice || 0);
    const totalPrice = Number(body.totalPrice || 0);
    const username = String(body.username || '').trim();
    const serviceName = String(body.serviceName || '').trim();
    const category = String(body.category || '').trim();
    const komen = Array.isArray(body.komen)
      ? body.komen.map((item) => String(item || '').trim()).filter(Boolean).join('\n')
      : String(body.komen || '').trim();

    if (!service) {
      return NextResponse.json({ status: false, data: { msg: 'Service wajib diisi.' } }, { status: 400 });
    }

    const payload: Record<string, string> = {
      action: 'order',
      service,
    };

    if (data) payload.data = data;
    if (quantity) payload.quantity = quantity;
    if (username) payload.username = username;
    if (komen) payload.komen = komen;

    const response = await requestPusatPanel<{ id: string }>({
      ...payload,
    });

    if (response.status && response.data && 'id' in response.data && response.data.id) {
      await saveSmmOrder({
        providerOrderId: String(response.data.id),
        accountContact,
        serviceId: service,
        serviceName: serviceName || service,
        category,
        targetData: data,
        quantity: quantity ? Number(quantity) : null,
        unitPrice,
        totalPrice,
        username,
        comments: komen,
        orderStatus: 'pending',
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal membuat order provider.',
        },
      },
      { status: 500 },
    );
  }
}
