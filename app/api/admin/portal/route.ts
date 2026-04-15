import { NextRequest, NextResponse } from 'next/server';
import { getAdminPortalSnapshot, saveAdminApkVariant, saveAdminSmmPricing, saveAdminUser, verifyAdminPortalSecret } from '@/lib/admin-portal';

function resolveRequestSecret(request: NextRequest) {
  const headerSecret = request.headers.get('x-admin-secret');
  const querySecret = request.nextUrl.searchParams.get('k');
  return String(headerSecret || querySecret || '').trim();
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      status: false,
      data: {
        msg: 'Akses admin tidak valid.',
      },
    },
    { status: 401 },
  );
}

export async function GET(request: NextRequest) {
  if (!verifyAdminPortalSecret(resolveRequestSecret(request))) {
    return unauthorizedResponse();
  }

  try {
    const snapshot = await getAdminPortalSnapshot();
    return NextResponse.json({
      status: true,
      data: snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Data admin belum bisa dimuat.',
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminPortalSecret(resolveRequestSecret(request))) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || '').trim();

    if (action === 'save-smm-pricing') {
      const pricing = await saveAdminSmmPricing({
        profitPercent: Number(body.profitPercent || 0),
      });
      const snapshot = await getAdminPortalSnapshot();
      return NextResponse.json({
        status: true,
        data: {
          msg: 'Persentase keuntungan sosial media berhasil disimpan.',
          pricing,
          snapshot,
        },
      });
    }

    if (action === 'save-user') {
      const user = await saveAdminUser({
        currentUsername: String(body.currentUsername || '').trim(),
        displayName: String(body.displayName || '').trim(),
        nextUsername: String(body.nextUsername || '').trim(),
        newPassword: String(body.newPassword || '').trim(),
        balanceDelta: Number(body.balanceDelta || 0),
      });
      const snapshot = await getAdminPortalSnapshot();
      return NextResponse.json({
        status: true,
        data: {
          msg: 'Data user berhasil diperbarui.',
          user,
          snapshot,
        },
      });
    }

    if (action === 'save-apk-variant') {
      const variant = await saveAdminApkVariant({
        variantId: String(body.variantId || '').trim(),
        variantTitle: String(body.variantTitle || '').trim(),
        duration: String(body.duration || '').trim(),
        price: Number(body.price || 0),
        stockDelta: Number(body.stockDelta || 0),
        badge: String(body.badge || '').trim(),
      });
      const snapshot = await getAdminPortalSnapshot();
      return NextResponse.json({
        status: true,
        data: {
          msg: 'Variant App Premium berhasil diperbarui.',
          variant,
          snapshot,
        },
      });
    }

    return NextResponse.json(
      {
        status: false,
        data: {
          msg: 'Aksi admin tidak dikenali.',
        },
      },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        data: {
          msg: error instanceof Error ? error.message : 'Aksi admin gagal diproses.',
        },
      },
      { status: 400 },
    );
  }
}
