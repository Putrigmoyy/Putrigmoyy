import { NextRequest, NextResponse } from 'next/server';
import { getCoreDepositStatus } from '@/lib/core-store';

export async function GET(request: NextRequest) {
  try {
    const reference = request.nextUrl.searchParams.get('reference') || '';
    const result = await getCoreDepositStatus(reference);

    return NextResponse.json({
      status: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Status deposit belum bisa dimuat.',
        },
      },
      { status: 400 },
    );
  }
}
