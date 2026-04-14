import { NextRequest, NextResponse } from 'next/server';
import { requestPusatPanel } from '@/lib/pusatpanel';

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
