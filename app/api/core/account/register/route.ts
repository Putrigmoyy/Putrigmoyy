import { NextResponse } from 'next/server';
import { registerCoreWalletAccount } from '@/lib/core-store';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      username?: string;
      password?: string;
      contact?: string;
      pin?: string;
    };

    const bundle = await registerCoreWalletAccount({
      name: String(body.name || ''),
      username: String(body.username || body.contact || ''),
      password: String(body.password || body.pin || ''),
    });

    return NextResponse.json({
      status: true,
      data: bundle,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal membuat akun.',
        },
      },
      { status: 400 },
    );
  }
}
