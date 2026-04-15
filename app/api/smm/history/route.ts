import { NextResponse } from 'next/server';
import { requestPusatPanel } from '@/lib/pusatpanel';
import { getSmmOrderHistory, updateSmmOrderStatus } from '@/lib/smm-store';

const MAX_SYNC_ITEMS = 8;
const SYNC_COOLDOWN_MS = 20_000;

type HistoryItem = Awaited<ReturnType<typeof getSmmOrderHistory>>[number];

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

function shouldSyncHistoryItem(item: HistoryItem) {
  if (!item?.providerOrderId) {
    return false;
  }
  if (isTerminalStatus(item.orderStatus)) {
    return false;
  }

  const updatedAtMs = new Date(item.updatedAt).getTime();
  if (!Number.isFinite(updatedAtMs)) {
    return true;
  }

  return Date.now() - updatedAtMs >= SYNC_COOLDOWN_MS;
}

async function syncVisibleOrderStatuses(items: HistoryItem[]) {
  const candidates = items.filter(shouldSyncHistoryItem).slice(0, MAX_SYNC_ITEMS);
  if (!candidates.length) {
    return false;
  }

  let hasUpdates = false;
  for (const item of candidates) {
    try {
      const response = await requestPusatPanel<{
        status: string;
        start_count?: number;
        remains?: number;
      }>({
        action: 'status',
        id: item.providerOrderId,
      });

      if (response.status && response.data && 'status' in response.data && response.data.status) {
        await updateSmmOrderStatus(item.providerOrderId, String(response.data.status));
        hasUpdates = true;
      }
    } catch {
      // keep current local status if provider check fails
    }
  }

  return hasUpdates;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || 40);
    const contact = String(searchParams.get('contact') || '').trim();
    const sync = searchParams.get('sync') !== '0';
    let items = await getSmmOrderHistory(limit, {
      accountContact: contact,
    });

    if (sync && items.length) {
      const updated = await syncVisibleOrderStatuses(items);
      if (updated) {
        items = await getSmmOrderHistory(limit, {
          accountContact: contact,
        });
      }
    }

    return NextResponse.json({
      status: true,
      data: {
        count: items.length,
        items,
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
