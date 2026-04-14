import { NextResponse } from 'next/server';
import type { PusatPanelService } from '@/lib/pusatpanel';
import { normalizePusatPanelService, requestPusatPanel } from '@/lib/pusatpanel';
import { syncSmmServicesCache } from '@/lib/smm-store';

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

    if (response.status && Array.isArray(response.data)) {
      try {
        await syncSmmServicesCache(response.data.map((service) => normalizePusatPanelService(service as PusatPanelService)));
      } catch {
        // ignore cache sync failure
      }
    }

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
