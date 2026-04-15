import { NextRequest, NextResponse } from 'next/server';
import { getCoreWalletBundle } from '@/lib/core-store';

export async function GET(request: NextRequest) {
  try {
    const username =
      request.nextUrl.searchParams.get('username') ||
      request.nextUrl.searchParams.get('contact') ||
      request.nextUrl.searchParams.get('account') ||
      '';
    const bundle = await getCoreWalletBundle(username, true);

    if (!bundle) {
      return NextResponse.json(
        {
          status: false,
          data: {
            msg: 'Akun belum ditemukan.',
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: true,
      data: bundle,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal memuat akun.',
        },
      },
      { status: 500 },
    );
  }
}
