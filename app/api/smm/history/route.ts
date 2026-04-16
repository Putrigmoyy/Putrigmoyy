import { NextResponse } from 'next/server';
import { getSmmCheckoutOrderStatus } from '@/lib/smm-checkout';
import { fetchPusatPanelOrderStatus } from '@/lib/pusatpanel';
import { getSmmOrderHistory, updateSmmOrderStatus } from '@/lib/smm-store';

const MAX_SYNC_ITEMS = 8;
const SYNC_COOLDOWN_MS = 20_000;
const PROVIDER_LIVE_BATCH_SIZE = 6;

type HistoryItem = Awaited<ReturnType<typeof getSmmOrderHistory>>[number];
type HistoryResponseItem = HistoryItem & {
  startCount: number | null;
  remains: number | null;
  statusSource: 'provider-live' | 'local';
};

function isTerminalStatus(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  return (
    normalized.includes('success') ||
    normalized.includes('complete') ||
    normalized.includes('completed') ||
    normalized.includes('cancel') ||
    normalized.includes('error') ||
    normalized.includes('fail') ||
    normalized.includes('partial') ||
    normalized.includes('expired')
  );
}

function isFailureProviderStatus(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  return (
    normalized.includes('error') ||
    normalized.includes('fail') ||
    normalized.includes('cancel') ||
    normalized.includes('deny')
  );
}

function shouldSyncCheckoutItem(item: HistoryItem) {
  if (!item?.orderCode || item.paymentMethod !== 'midtrans') {
    return false;
  }

  const updatedAtMs = new Date(item.updatedAt).getTime();
  if (!Number.isFinite(updatedAtMs)) {
    return true;
  }

  return Date.now() - updatedAtMs >= SYNC_COOLDOWN_MS;
}

async function syncVisibleCheckoutStatuses(items: HistoryItem[]) {
  const candidates = items.filter(shouldSyncCheckoutItem).slice(0, MAX_SYNC_ITEMS);
  if (!candidates.length) {
    return false;
  }

  let hasUpdates = false;
  for (const item of candidates) {
    try {
      await getSmmCheckoutOrderStatus(item.orderCode);
      hasUpdates = true;
    } catch {
      // keep local history readable even if checkout status sync fails
    }
  }

  return hasUpdates;
}

async function buildLiveProviderHistory(items: HistoryItem[]): Promise<HistoryResponseItem[]> {
  if (!items.length) {
    return [];
  }

  const snapshots = new Map<string, Awaited<ReturnType<typeof fetchPusatPanelOrderStatus>>>();
  const candidates = items.filter((item) => {
    const providerOrderId = String(item.providerOrderId || '').trim();
    if (!providerOrderId) {
      return false;
    }

    const updatedAtMs = new Date(item.updatedAt).getTime();
    if (!Number.isFinite(updatedAtMs)) {
      return true;
    }

    return !isTerminalStatus(item.orderStatus) || Date.now() - updatedAtMs >= SYNC_COOLDOWN_MS;
  });

  for (let index = 0; index < candidates.length; index += PROVIDER_LIVE_BATCH_SIZE) {
    const batch = candidates.slice(index, index + PROVIDER_LIVE_BATCH_SIZE);
    await Promise.all(
      batch.map(async (item) => {
        const providerOrderId = String(item.providerOrderId || '').trim();
        if (!providerOrderId) {
          return;
        }

        try {
          const snapshot = await fetchPusatPanelOrderStatus(providerOrderId);
          snapshots.set(providerOrderId, snapshot);

          if (isFailureProviderStatus(snapshot.status) && snapshot.status !== item.orderStatus) {
            await updateSmmOrderStatus(providerOrderId, snapshot.status);
          }
        } catch {
          // keep local history visible if provider live check fails
        }
      }),
    );
  }

  return items.map((item) => {
    const providerOrderId = String(item.providerOrderId || '').trim();
    const snapshot = providerOrderId ? snapshots.get(providerOrderId) : null;
    if (!snapshot) {
      return {
        ...item,
        startCount: null,
        remains: null,
        statusSource: 'local',
      };
    }

    return {
      ...item,
      orderStatus: snapshot.status || item.orderStatus,
      paymentStatus:
        isFailureProviderStatus(snapshot.status) && String(item.paymentStatus || '').trim().toLowerCase() === 'paid'
          ? 'refunded'
          : item.paymentStatus,
      startCount: snapshot.startCount,
      remains: snapshot.remains,
      statusSource: 'provider-live',
    };
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || 40);
    const contact = String(searchParams.get('contact') || '').trim();
    const sync = searchParams.get('sync') !== '0';
    const providerOnly = !contact && searchParams.get('providerOnly') !== '0';
    let items = await getSmmOrderHistory(limit, {
      accountContact: contact,
      providerOnly,
    });

    if (sync && items.length && contact) {
      const updatedCheckout = await syncVisibleCheckoutStatuses(items);
      if (updatedCheckout) {
        items = await getSmmOrderHistory(limit, {
          accountContact: contact,
          providerOnly,
        });
      }
    }

    const liveItems = await buildLiveProviderHistory(items);

    return NextResponse.json({
      status: true,
      data: {
        count: liveItems.length,
        items: liveItems,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Riwayat social media belum bisa dimuat.',
        },
      },
      { status: 500 },
    );
  }
}
