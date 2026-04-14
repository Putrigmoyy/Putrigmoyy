import { NextResponse } from 'next/server';
import { requestPusatPanel } from '@/lib/pusatpanel';

export async function POST() {
  try {
    const response = await requestPusatPanel<{
      email: string;
      username: string;
      full_name: string;
      balance: string;
    }>({
      action: 'profile',
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal mengambil profil provider.',
        },
      },
      { status: 500 },
    );
  }
}
