import { NextResponse } from 'next/server';
import { submitCoreDeposit } from '@/lib/core-store';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      accountContact?: string;
      amount?: number | string;
    };

    const result = await submitCoreDeposit({
      accountContact: String(body.accountContact || ''),
      amount: Number(body.amount || 0),
      method: 'midtrans',
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
          msg: error instanceof Error ? error.message : 'Gagal memproses deposit.',
        },
      },
      { status: 400 },
    );
  }
}
