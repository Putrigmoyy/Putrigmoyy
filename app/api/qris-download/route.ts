import { NextRequest, NextResponse } from 'next/server';

function resolveFilename(rawFilename: string) {
  const normalized = String(rawFilename || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'qris-payment.png';
}

export async function GET(request: NextRequest) {
  try {
    const rawUrl = String(request.nextUrl.searchParams.get('url') || '').trim();
    const rawFilename = String(request.nextUrl.searchParams.get('filename') || '').trim();

    if (!rawUrl) {
      return NextResponse.json(
        {
          status: false,
          data: {
            msg: 'URL QRIS wajib diisi.',
          },
        },
        { status: 400 },
      );
    }

    const targetUrl = new URL(rawUrl);
    if (!['https:', 'http:'].includes(targetUrl.protocol)) {
      return NextResponse.json(
        {
          status: false,
          data: {
            msg: 'URL QRIS tidak valid.',
          },
        },
        { status: 400 },
      );
    }

    const upstream = await fetch(targetUrl.toString(), {
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          status: false,
          data: {
            msg: `Gambar QRIS belum bisa diunduh (${upstream.status}).`,
          },
        },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    const extension =
      contentType.includes('jpeg') || contentType.includes('jpg')
        ? 'jpg'
        : contentType.includes('webp')
          ? 'webp'
          : contentType.includes('svg')
            ? 'svg'
            : 'png';
    const filename = resolveFilename(rawFilename || `qris-payment.${extension}`);
    const arrayBuffer = await upstream.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'content-type': contentType,
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gambar QRIS belum bisa diunduh.',
        },
      },
      { status: 500 },
    );
  }
}
