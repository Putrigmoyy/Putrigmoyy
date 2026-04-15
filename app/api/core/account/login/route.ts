import { NextResponse } from 'next/server';
import { loginCoreWalletAccount } from '@/lib/core-store';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      contact?: string;
      pin?: string;
    };

    const bundle = await loginCoreWalletAccount({
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
          msg: error instanceof Error ? error.message : 'Gagal login akun.',
        },
      },
      { status: 400 },
    );
  }
}
