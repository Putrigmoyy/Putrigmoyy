import { NextResponse } from 'next/server';
import { requestPusatPanel } from '@/lib/pusatpanel';

export async function POST() {
  try {
    const response = await requestPusatPanel<Array<{
      id: number | string;
      name: string;
      price: number;
      min: number;
      max: number;
      note: string;
      category: string;
    }>>({
      action: 'services',
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal mengambil layanan provider.',
        },
      },
      { status: 500 },
    );
  }
}
