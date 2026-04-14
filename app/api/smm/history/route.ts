import { NextResponse } from 'next/server';
import { getSmmOrderHistory } from '@/lib/smm-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || 40);
    const items = await getSmmOrderHistory(limit);

    return NextResponse.json({
      status: true,
      data: {
        count: items.length,
        items,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Riwayat social media belum bisa dimuat.',
        },
      },
      { status: 500 },
    );
  }
}
