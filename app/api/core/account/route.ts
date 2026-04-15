import { NextRequest, NextResponse } from 'next/server';
import { getApkPremiumOrderStatus } from '@/lib/apk-premium-orders';
import { getCoreDepositStatus, getCoreWalletBundle } from '@/lib/core-store';
import { getSmmCheckoutOrderStatus } from '@/lib/smm-checkout';

async function syncPendingWebsiteOrders(username: string) {
  const bundle = await getCoreWalletBundle(username, true);
  if (!bundle) {
    return null;
  }

  const pendingOrders = bundle.history
    .filter((entry) => entry.kind === 'order' && entry.status === 'pending' && entry.reference)
    .slice(0, 6);
  const pendingDeposits = bundle.history
    .filter((entry) => entry.kind === 'deposit' && entry.status === 'pending' && entry.reference)
    .slice(0, 6);

  if (!pendingOrders.length && !pendingDeposits.length) {
    return bundle;
  }

  await Promise.all(
    [...pendingOrders, ...pendingDeposits].map(async (entry) => {
      try {
        if (entry.kind === 'deposit') {
          await getCoreDepositStatus(entry.reference);
          return;
        }

        if (entry.reference.startsWith('SMM')) {
          await getSmmCheckoutOrderStatus(entry.reference);
          return;
        }

        if (entry.reference.startsWith('APK')) {
          await getApkPremiumOrderStatus(entry.reference);
        }
      } catch {
        // keep account endpoint responsive even if one order status cannot be refreshed
      }
    }),
  );

  return getCoreWalletBundle(username, true);
}

export async function GET(request: NextRequest) {
  try {
    const username =
      request.nextUrl.searchParams.get('username') ||
      request.nextUrl.searchParams.get('contact') ||
      request.nextUrl.searchParams.get('account') ||
      '';
    const bundle = await syncPendingWebsiteOrders(username);

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
