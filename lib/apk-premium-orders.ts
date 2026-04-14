import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getNeonClient } from '@/lib/neon-clients';
import { formatRupiah } from '@/lib/apk-premium';
import { getApkPremiumProductById } from '@/lib/apk-premium-store';
import { recordCoreOrderHistory, refundCoreWalletBalanceOrder, spendCoreWalletBalanceForOrder } from '@/lib/core-store';

type CheckoutInput = {
  productId: string;
  variantId: string;
  quantity: number;
  customerName: string;
  customerContact: string;
  accountContact?: string;
  paymentMethod?: 'midtrans' | 'balance';
  note?: string;
};

type ApkCheckoutBase = {
  orderCode: string;
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle: string;
  quantity: number;
  unitPrice: number;
  unitPriceLabel: string;
  totalPrice: number;
  totalPriceLabel: string;
  paymentStatus: 'awaiting-payment' | 'paid';
  dataSource: 'local-preview' | 'neon';
};

export type ApkCheckoutPreview = ApkCheckoutBase & {
  orderStatus: 'draft';
};

export type ApkSubmittedOrder = ApkCheckoutBase & {
  orderStatus: 'pending' | 'paid';
  queueCreated: boolean;
  syncReady: boolean;
  nextStep: string;
  paymentMethod: 'midtrans' | 'balance';
};

function createOrderCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `APK-${y}${m}${d}-${random}`;
}

async function buildCheckoutCore(input: CheckoutInput) {
  const product = await getApkPremiumProductById(input.productId);
  if (!product) {
    throw new Error('Produk APK premium tidak ditemukan.');
  }

  const variant = product.variants.find((item) => item.id === input.variantId);
  if (!variant) {
    throw new Error('Varian produk tidak ditemukan.');
  }

  const quantity = Number(input.quantity || 0);
  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new Error('Jumlah order minimal 1.');
  }

  if (variant.stock > 0 && quantity > variant.stock) {
    throw new Error('Jumlah order melebihi stock varian yang tersedia.');
  }

  const customerName = String(input.customerName || '').trim();
  const customerContact = String(input.customerContact || '').trim();
  const accountContact = String(input.accountContact || '').trim();
  const paymentMethod: 'midtrans' | 'balance' = input.paymentMethod === 'balance' ? 'balance' : 'midtrans';
  const note = String(input.note || '').trim();

  if (!customerName) {
    throw new Error('Nama customer wajib diisi.');
  }
  if (!customerContact) {
    throw new Error('Kontak customer wajib diisi.');
  }

  const unitPrice = variant.price;
  const totalPrice = unitPrice * quantity;
  const orderCode = createOrderCode();

  return {
    orderCode,
    product,
    variant,
    quantity,
    customerName,
    customerContact,
    accountContact,
    paymentMethod,
    note,
    unitPrice,
    totalPrice,
  };
}

export async function buildApkPremiumCheckoutPreview(input: CheckoutInput): Promise<ApkCheckoutPreview> {
  const result = await buildCheckoutCore(input);
  const config = getAppDataSourceConfig();

  return {
    orderCode: result.orderCode,
    productId: result.product.id,
    productTitle: result.product.title,
    variantId: result.variant.id,
    variantTitle: result.variant.title,
    quantity: result.quantity,
    unitPrice: result.unitPrice,
    unitPriceLabel: formatRupiah(result.unitPrice),
    totalPrice: result.totalPrice,
    totalPriceLabel: formatRupiah(result.totalPrice),
    paymentStatus: 'awaiting-payment',
    orderStatus: 'draft',
    dataSource: config.apk.mode === 'neon' && config.apk.databaseConfigured ? 'neon' : 'local-preview',
  };
}

async function submitOrderToNeon(input: CheckoutInput): Promise<ApkSubmittedOrder> {
  const sql = getNeonClient('apk');
  const result = await buildCheckoutCore(input);
  const usingBalance = result.paymentMethod === 'balance';
  const detailText = `Varian: ${result.variant.title}\nJumlah: ${result.quantity}\nKontak: ${result.customerContact || '-'}\nCatatan: ${result.note || '-'}`;

  let balanceDebited = false;
  let inventoryAdjusted = false;
  let orderInserted = false;
  if (usingBalance) {
    if (!result.accountContact) {
      throw new Error('Login akun dulu untuk memakai saldo akun.');
    }
    await spendCoreWalletBalanceForOrder({
      accountContact: result.accountContact,
      amount: result.totalPrice,
      subjectName: result.customerName,
      title: `${result.product.title} - ${result.variant.title}`,
      detail: detailText,
      reference: result.orderCode,
    });
    balanceDebited = true;
  }

  try {
    if (usingBalance) {
      const variantRows = (await sql`
        update apk_product_variants
        set
          stock = stock - ${result.quantity},
          updated_at = now()
        where id = ${result.variant.id}
          and stock >= ${result.quantity}
        returning stock
      `) as Array<{ stock?: number }>;

      if (!variantRows[0]) {
        throw new Error('Stock varian berubah atau sudah habis. Coba sinkronkan lalu ulangi order.');
      }
      inventoryAdjusted = true;

      await sql`
        update apk_products
        set
          stock = greatest(stock - ${result.quantity}, 0),
          sold = sold + ${result.quantity},
          updated_at = now()
        where id = ${result.product.id}
      `;
    }

    await sql`
      insert into apk_orders (
        order_code,
        product_id,
        product_title,
        variant_id,
        variant_title,
        customer_name,
        customer_contact,
        quantity,
        unit_price,
        total_price,
        order_note,
        order_status,
        payment_status
      ) values (
        ${result.orderCode},
        ${result.product.id},
        ${result.product.title},
        ${result.variant.id},
        ${result.variant.title},
        ${result.customerName},
        ${result.customerContact},
        ${result.quantity},
        ${result.unitPrice},
        ${result.totalPrice},
        ${result.note},
        ${usingBalance ? 'paid' : 'pending'},
        ${usingBalance ? 'paid' : 'awaiting-payment'}
      )
    `;
    orderInserted = true;

    const payload = JSON.stringify({
      kind: usingBalance ? 'apk-premium-order-paid-balance' : 'apk-premium-order-created',
      orderCode: result.orderCode,
      productId: result.product.id,
      productTitle: result.product.title,
      variantId: result.variant.id,
      variantTitle: result.variant.title,
      quantity: result.quantity,
      totalPrice: result.totalPrice,
      customerName: result.customerName,
      customerContact: result.customerContact,
      paymentMethod: result.paymentMethod,
      balancePaid: usingBalance,
    });

    await sql`
      insert into owner_notification_queue (
        source,
        event_type,
        order_code,
        payload,
        queue_status
      ) values (
        ${'apk-premium'},
        ${usingBalance ? 'order-paid-balance' : 'order-created'},
        ${result.orderCode},
        ${payload}::jsonb,
        ${'pending'}
      )
    `;

    if (!usingBalance) {
      await recordCoreOrderHistory({
        accountContact: result.accountContact,
        subjectName: result.customerName,
        title: `${result.product.title} - ${result.variant.title}`,
        amount: result.totalPrice,
        detail: detailText,
        methodLabel: 'Order aplikasi premium',
        reference: result.orderCode,
      });
    }

    return {
      orderCode: result.orderCode,
      productId: result.product.id,
      productTitle: result.product.title,
      variantId: result.variant.id,
      variantTitle: result.variant.title,
      quantity: result.quantity,
      unitPrice: result.unitPrice,
      unitPriceLabel: formatRupiah(result.unitPrice),
      totalPrice: result.totalPrice,
      totalPriceLabel: formatRupiah(result.totalPrice),
      paymentStatus: usingBalance ? 'paid' : 'awaiting-payment',
      orderStatus: usingBalance ? 'paid' : 'pending',
      dataSource: 'neon',
      queueCreated: true,
      syncReady: true,
      paymentMethod: result.paymentMethod,
      nextStep: usingBalance
        ? 'Pembayaran saldo berhasil. Owner akan menerima notifikasi fulfillment order ini.'
        : 'Lanjut sambungkan checkout Midtrans website untuk order ini.',
    };
  } catch (error) {
    if (orderInserted) {
      await sql`
        update apk_orders
        set
          order_status = ${'failed'},
          payment_status = ${usingBalance ? 'refunded' : 'failed'},
          order_note = ${`${result.note || ''}\n[system] ${error instanceof Error ? error.message : 'Order APK gagal.'}`.trim()},
          updated_at = now()
        where order_code = ${result.orderCode}
      `;
    }
    if (inventoryAdjusted) {
      await sql`
        update apk_product_variants
        set
          stock = stock + ${result.quantity},
          updated_at = now()
        where id = ${result.variant.id}
      `;
      await sql`
        update apk_products
        set
          stock = stock + ${result.quantity},
          sold = greatest(sold - ${result.quantity}, 0),
          updated_at = now()
        where id = ${result.product.id}
      `;
    }
    if (balanceDebited) {
      await refundCoreWalletBalanceOrder({
        accountContact: result.accountContact,
        amount: result.totalPrice,
        subjectName: result.customerName,
        reference: result.orderCode,
        reason: error instanceof Error ? error.message : 'Order APK gagal setelah saldo dipotong.',
      });
    }
    throw error;
  }
}

export async function submitApkPremiumOrder(input: CheckoutInput): Promise<ApkSubmittedOrder> {
  const config = getAppDataSourceConfig();
  if (config.apk.mode === 'neon' && config.apk.databaseConfigured) {
    return submitOrderToNeon(input);
  }

  const preview = await buildApkPremiumCheckoutPreview(input);
  return {
    ...preview,
    orderStatus: 'pending',
    queueCreated: false,
    syncReady: false,
    paymentMethod: input.paymentMethod === 'balance' ? 'balance' : 'midtrans',
    nextStep: 'Hubungkan DATABASE_URL_APK dan ubah APK_PREMIUM_DATA_SOURCE=neon agar order website tersimpan penuh.',
  };
}

type NotificationRow = {
  id: number;
  source: string;
  event_type: string;
  order_code: string | null;
  payload: unknown;
  queue_status: string;
  created_at: string;
};

export type OwnerNotificationItem = {
  queueId: number;
  source: string;
  eventType: string;
  orderCode: string | null;
  payload: unknown;
  createdAt: string;
};

function getOwnerToken() {
  return String(process.env.OWNER_APP_TOKEN || '').trim();
}

export function verifyOwnerToken(token: string | null | undefined) {
  const expected = getOwnerToken();
  return Boolean(expected && token && token === expected);
}

export function isOwnerBridgeConfigured() {
  return Boolean(getOwnerToken());
}

export async function pollOwnerNotifications(limit = 20): Promise<OwnerNotificationItem[]> {
  const config = getAppDataSourceConfig();
  if (!(config.apk.mode === 'neon' && config.apk.databaseConfigured)) {
    return [];
  }

  const sql = getNeonClient('apk');
  const rows = (await sql`
    select
      id,
      source,
      event_type,
      order_code,
      payload,
      queue_status,
      created_at
    from owner_notification_queue
    where queue_status = 'pending'
    order by created_at asc
    limit ${Math.max(1, Math.min(limit, 100))}
  `) as NotificationRow[];

  return rows.map((row) => ({
    queueId: Number(row.id),
    source: row.source,
    eventType: row.event_type,
    orderCode: row.order_code,
    payload: row.payload,
    createdAt: row.created_at,
  }));
}

export async function acknowledgeOwnerNotifications(queueIds: number[]) {
  const config = getAppDataSourceConfig();
  if (!(config.apk.mode === 'neon' && config.apk.databaseConfigured)) {
    return { updated: 0 };
  }

  const sanitizedIds = Array.from(new Set(queueIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)));
  if (sanitizedIds.length === 0) {
    return { updated: 0 };
  }

  const sql = getNeonClient('apk');
  await sql`
    update owner_notification_queue
    set
      queue_status = 'acknowledged',
      acknowledged_at = now()
    where id = any(${sanitizedIds})
  `;

  return { updated: sanitizedIds.length };
}
