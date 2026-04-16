import { NextResponse } from 'next/server';
import type { PusatPanelService } from '@/lib/pusatpanel';
import { isBlockedPusatPanelService, normalizePusatPanelService, requestPusatPanel } from '@/lib/pusatpanel';
import { getCachedSmmServices, syncSmmServicesCache } from '@/lib/smm-store';

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
      const filteredServices = response.data.filter((service) => !isBlockedPusatPanelService(service as PusatPanelService));
      try {
        await syncSmmServicesCache(filteredServices.map((service) => normalizePusatPanelService(service as PusatPanelService)));
      } catch {
        // ignore cache sync failure
      }
      return NextResponse.json({
        ...response,
        data: filteredServices,
      });
    }

    const cachedServices = await getCachedSmmServices();
    if (cachedServices.length) {
      return NextResponse.json({
        status: true,
        data: cachedServices,
        source: 'cache-fallback',
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    try {
      const cachedServices = await getCachedSmmServices();
      if (cachedServices.length) {
        return NextResponse.json({
          status: true,
          data: cachedServices,
          source: 'cache-fallback',
        });
      }
    } catch {
      // ignore cache fallback error
    }

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
