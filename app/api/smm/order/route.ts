import { NextRequest, NextResponse } from 'next/server';
import { requestPusatPanel } from '@/lib/pusatpanel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const service = String(body.service || '').trim();
    const data = String(body.data || '').trim();
    const quantity = String(body.quantity || '').trim();
    const username = String(body.username || '').trim();
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
