import { NextRequest, NextResponse } from 'next/server';
import { requestPusatPanel } from '@/lib/pusatpanel';
import { updateSmmOrderStatus } from '@/lib/smm-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = String(body.id || '').trim();

    if (!id) {
      return NextResponse.json({ status: false, data: { msg: 'ID order wajib diisi.' } }, { status: 400 });
    }

    const response = await requestPusatPanel<{
      status: string;
      start_count: number;
      remains: number;
    }>({
      action: 'status',
      id,
    });

    if (response.status && response.data && 'status' in response.data && response.data.status) {
      await updateSmmOrderStatus(id, String(response.data.status));
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal mengambil status order.',
        },
      },
      { status: 500 },
    );
  }
}
