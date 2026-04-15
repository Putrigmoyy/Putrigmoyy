import { NextResponse } from 'next/server';
import { updateCoreWalletAccount } from '@/lib/core-store';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      currentUsername?: string;
      newUsername?: string;
      newPassword?: string;
    };

    const bundle = await updateCoreWalletAccount({
      currentUsername: String(body.currentUsername || ''),
      newUsername: String(body.newUsername || ''),
      newPassword: String(body.newPassword || ''),
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
          msg: error instanceof Error ? error.message : 'Gagal memperbarui profil akun.',
        },
      },
      { status: 400 },
    );
  }
}
