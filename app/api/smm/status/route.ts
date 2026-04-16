import { NextRequest, NextResponse } from 'next/server';
import { fetchPusatPanelOrderStatus } from '@/lib/pusatpanel';
import { updateSmmOrderStatus } from '@/lib/smm-store';

function isFailureProviderStatus(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  return (
    normalized.includes('error') ||
    normalized.includes('fail') ||
    normalized.includes('cancel') ||
    normalized.includes('deny')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id || '').trim();

    if (!id) {
      return NextResponse.json({ status: false, data: { msg: 'ID order wajib diisi.' } }, { status: 400 });
    }

    const response = await fetchPusatPanelOrderStatus(id);

    if (isFailureProviderStatus(response.status)) {
      await updateSmmOrderStatus(id, response.status);
    }

    return NextResponse.json({
      status: true,
      data: {
        status: response.status,
        start_count: response.startCount,
        remains: response.remains,
        source: 'provider-live',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Gagal mengambil status order.',
        },
      },
      { status: 500 },
    );
  }
}
