import { NextRequest, NextResponse } from 'next/server';
import {
  deleteAdminApkAccount,
  deleteAdminUser,
  getAdminApkAccounts,
  getAdminPortalSnapshot,
  saveAdminApkAccountEdit,
  saveAdminApkPricing,
  saveAdminApkAccounts,
  saveAdminApkCreateVariant,
  saveAdminApkProductEdit,
  saveAdminApkProduct,
  saveAdminApkVariant,
  saveAdminMinimumDeposit,
  saveAdminSmmPricing,
  saveAdminUser,
  verifyAdminPortalSecret,
} from '@/lib/admin-portal';

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

    if (action === 'save-apk-pricing') {
      const pricing = await saveAdminApkPricing({
        adminFee: Number(body.adminFee || 0),
      });
      const snapshot = await getAdminPortalSnapshot();
      return NextResponse.json({
        status: true,
        data: {
          msg: 'Fee admin aplikasi premium berhasil disimpan.',
          pricing,
          snapshot,
        },
      });
    }

    if (action === 'save-minimum-deposit') {
      const minimumDeposit = await saveAdminMinimumDeposit({
        minimumDeposit: Number(body.minimumDeposit || 0),
      });
      const snapshot = await getAdminPortalSnapshot();
      return NextResponse.json({
        status: true,
        data: {
          msg: 'Minimal deposit berhasil disimpan.',
          minimumDeposit,
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

    if (action === 'delete-user') {
      const deleted = await deleteAdminUser({
        currentUsername: String(body.currentUsername || '').trim(),
      });
      const snapshot = await getAdminPortalSnapshot();
      return NextResponse.json({
        status: true,
        data: {
          msg: 'Akun user berhasil dihapus.',
          deleted,
          snapshot,
        },
      });
    }

    if (action === 'save-apk-product') {
      const product = await saveAdminApkProductEdit({
        productId: String(body.productId || '').trim(),
        title: String(body.title || '').trim(),
        subtitle: String(body.subtitle || '').trim(),
        category: String(body.category || '').trim(),
        delivery: String(body.delivery || '').trim(),
        note: String(body.note || '').trim(),
        guarantee: String(body.guarantee || '').trim(),
        imageUrl: String(body.imageUrl || '').trim(),
      });
      const snapshot = await getAdminPortalSnapshot();
      return NextResponse.json({
        status: true,
        data: {
          msg: 'Produk App Premium berhasil diperbarui.',
          product,
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

    if (action === 'create-apk-product') {
      const product = await saveAdminApkProduct({
        title: String(body.title || '').trim(),
        subtitle: String(body.subtitle || '').trim(),
        category: String(body.category || '').trim(),
        delivery: String(body.delivery || '').trim(),
        note: String(body.note || '').trim(),
        guarantee: String(body.guarantee || '').trim(),
        imageUrl: String(body.imageUrl || '').trim(),
      });
      const snapshot = await getAdminPortalSnapshot();
      return NextResponse.json({
        status: true,
        data: {
          msg: 'Produk App Premium berhasil ditambahkan.',
          product,
          snapshot,
        },
      });
    }

    if (action === 'create-apk-variant') {
      const variant = await saveAdminApkCreateVariant({
        productId: String(body.productId || '').trim(),
        variantTitle: String(body.variantTitle || '').trim(),
        duration: String(body.duration || '').trim(),
        price: Number(body.price || 0),
        badge: String(body.badge || '').trim(),
      });
      const snapshot = await getAdminPortalSnapshot();
      return NextResponse.json({
        status: true,
        data: {
          msg: 'Varian App Premium berhasil ditambahkan.',
          variant,
          snapshot,
        },
      });
    }

    if (action === 'add-apk-account-data') {
      const rawEntries = String(body.accountBatch || '')
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);
      const accountStock = await saveAdminApkAccounts({
        variantId: String(body.variantId || '').trim(),
        entries: rawEntries,
        adminNote: String(body.adminNote || '').trim(),
      });
      const snapshot = await getAdminPortalSnapshot();
      return NextResponse.json({
        status: true,
        data: {
          msg: 'Data akun berhasil ditambahkan ke stok App Premium.',
          accountStock,
          snapshot,
        },
      });
    }

    if (action === 'get-apk-accounts') {
      const accounts = await getAdminApkAccounts({
        variantId: String(body.variantId || '').trim(),
      });
      return NextResponse.json({
        status: true,
        data: {
          accounts,
        },
      });
    }

    if (action === 'save-apk-account') {
      const account = await saveAdminApkAccountEdit({
        accountId: Number(body.accountId || 0),
        accountData: String(body.accountData || '').trim(),
        adminNote: String(body.adminNote || '').trim(),
        variantId: String(body.variantId || '').trim(),
      });
      const snapshot = await getAdminPortalSnapshot();
      return NextResponse.json({
        status: true,
        data: {
          msg: 'Data akun premium berhasil diperbarui.',
          account,
          snapshot,
        },
      });
    }

    if (action === 'delete-apk-account') {
      const deleted = await deleteAdminApkAccount({
        accountId: Number(body.accountId || 0),
      });
      const snapshot = await getAdminPortalSnapshot();
      return NextResponse.json({
        status: true,
        data: {
          msg: 'Data akun premium berhasil dihapus.',
          deleted,
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
