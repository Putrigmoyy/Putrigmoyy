import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getNeonClient } from '@/lib/neon-clients';
import { formatRupiah } from '@/lib/apk-premium';
import { getApkPremiumProductById } from '@/lib/apk-premium-store';
import { recordCoreOrderHistory, refundCoreWalletBalanceOrder, spendCoreWalletBalanceForOrder, updateCoreOrderHistoryStatusByReference } from '@/lib/core-store';
import { createMidtransQrisCharge, getMidtransPublicConfig, getMidtransTransactionStatus, isMidtransConfigured } from '@/lib/midtrans';

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
  qris?: {
    transactionId: string;
    qrUrl: string;
    qrString: string;
    deeplinkUrl: string;
    expiryTime: string;
  } | null;
};

type ApkOrderStatusSnapshot = {
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: 'midtrans' | 'balance';
  totalPrice: number;
  totalPriceLabel: string;
  qris: {
    transactionId: string;
    qrUrl: string;
    qrString: string;
    deeplinkUrl: string;
    expiryTime: string;
  } | null;
  nextStep: string;
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
  let midtransCharge:
    | Awaited<ReturnType<typeof createMidtransQrisCharge>>
    | null = null;
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
    if (usingBalance || isMidtransConfigured()) {
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
    if (!usingBalance) {
      if (!isMidtransConfigured()) {
        throw new Error('MIDTRANS_SERVER_KEY belum diisi. QRIS website belum aktif.');
      }
      midtransCharge = await createMidtransQrisCharge({
        orderId: result.orderCode,
        grossAmount: result.totalPrice,
        customerName: result.customerName,
        customerContact: result.customerContact,
      });
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

    await sql`
      create table if not exists apk_order_payments (
        order_code text primary key references apk_orders(order_code) on delete cascade,
        provider text not null default 'midtrans',
        provider_order_id text not null,
        transaction_id text not null default '',
        payment_method text not null default 'midtrans',
        transaction_status text not null default 'pending',
        fraud_status text not null default '',
        gross_amount integer not null default 0,
        expiry_time timestamptz,
        qr_url text not null default '',
        qr_string text not null default '',
        deeplink_url text not null default '',
        raw_response jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;

    if (!usingBalance && midtransCharge) {
      await sql`
        insert into apk_order_payments (
          order_code,
          provider,
          provider_order_id,
          transaction_id,
          payment_method,
          transaction_status,
          fraud_status,
          gross_amount,
          expiry_time,
          qr_url,
          qr_string,
          deeplink_url,
          raw_response,
          updated_at
        ) values (
          ${result.orderCode},
          ${'midtrans'},
          ${midtransCharge.orderId || result.orderCode},
          ${midtransCharge.transactionId},
          ${'midtrans'},
          ${midtransCharge.transactionStatus},
          ${midtransCharge.fraudStatus},
          ${result.totalPrice},
          ${midtransCharge.expiryTime || null},
          ${midtransCharge.qrUrl},
          ${midtransCharge.qrString},
          ${midtransCharge.deeplinkUrl},
          ${JSON.stringify(midtransCharge.raw)}::jsonb,
          now()
        )
        on conflict (order_code) do update
        set
          transaction_id = excluded.transaction_id,
          transaction_status = excluded.transaction_status,
          fraud_status = excluded.fraud_status,
          gross_amount = excluded.gross_amount,
          expiry_time = excluded.expiry_time,
          qr_url = excluded.qr_url,
          qr_string = excluded.qr_string,
          deeplink_url = excluded.deeplink_url,
          raw_response = excluded.raw_response,
          updated_at = now()
      `;
    }

    const payload = JSON.stringify({
      kind: usingBalance ? 'apk-premium-order-paid-balance' : 'apk-premium-order-qris-created',
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
      qrisReady: !usingBalance,
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
        ${usingBalance ? 'order-paid-balance' : 'order-qris-created'},
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
      qris: usingBalance || !midtransCharge
        ? null
        : {
            transactionId: midtransCharge.transactionId,
            qrUrl: midtransCharge.qrUrl,
            qrString: midtransCharge.qrString,
            deeplinkUrl: midtransCharge.deeplinkUrl,
            expiryTime: midtransCharge.expiryTime,
          },
      nextStep: usingBalance
        ? 'Pembayaran saldo berhasil. Owner akan menerima notifikasi fulfillment order ini.'
        : 'QRIS siap ditampilkan langsung di website.',
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
    qris: null,
    nextStep: 'Hubungkan DATABASE_URL_APK dan ubah APK_PREMIUM_DATA_SOURCE=neon agar order website tersimpan penuh.',
  };
}

type OrderRow = {
  order_code: string;
  order_status: string;
  payment_status: string;
  total_price: number;
};

type PaymentRow = {
  transaction_id: string;
  qr_url: string;
  qr_string: string;
  deeplink_url: string;
  expiry_time: string | null;
  transaction_status: string;
};

async function restoreReservedInventory(orderCode: string) {
  const sql = getNeonClient('apk');
  const rows = (await sql`
    select product_id, variant_id, quantity
    from apk_orders
    where order_code = ${orderCode}
    limit 1
  `) as Array<{ product_id: string; variant_id: string; quantity: number }>;
  const row = rows[0];
  if (!row) return;
  const quantity = Math.max(0, Number(row.quantity || 0));
  if (quantity <= 0) return;

  await sql`
    update apk_product_variants
    set
      stock = stock + ${quantity},
      updated_at = now()
    where id = ${row.variant_id}
  `;
  await sql`
    update apk_products
    set
      stock = stock + ${quantity},
      updated_at = now()
    where id = ${row.product_id}
  `;
}

export async function getApkPremiumOrderStatus(orderCode: string): Promise<ApkOrderStatusSnapshot> {
  const config = getAppDataSourceConfig();
  if (!(config.apk.mode === 'neon' && config.apk.databaseConfigured)) {
    throw new Error('DATABASE_URL_APK belum aktif.');
  }

  const normalizedOrderCode = String(orderCode || '').trim();
  if (!normalizedOrderCode) {
    throw new Error('Order code wajib diisi.');
  }

  const sql = getNeonClient('apk');
  await sql`
    create table if not exists apk_order_payments (
      order_code text primary key references apk_orders(order_code) on delete cascade,
      provider text not null default 'midtrans',
      provider_order_id text not null,
      transaction_id text not null default '',
      payment_method text not null default 'midtrans',
      transaction_status text not null default 'pending',
      fraud_status text not null default '',
      gross_amount integer not null default 0,
      expiry_time timestamptz,
      qr_url text not null default '',
      qr_string text not null default '',
      deeplink_url text not null default '',
      raw_response jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  const orderRows = (await sql`
    select order_code, order_status, payment_status, total_price
    from apk_orders
    where order_code = ${normalizedOrderCode}
    limit 1
  `) as OrderRow[];
  const order = orderRows[0];
  if (!order) {
    throw new Error('Order Apprem tidak ditemukan.');
  }

  const paymentRows = (await sql`
    select
      transaction_id,
      qr_url,
      qr_string,
      deeplink_url,
      expiry_time,
      transaction_status
    from apk_order_payments
    where order_code = ${normalizedOrderCode}
    limit 1
  `) as PaymentRow[];
  const payment = paymentRows[0] || null;

  if (payment && order.payment_status === 'awaiting-payment' && isMidtransConfigured()) {
    const status = await getMidtransTransactionStatus(normalizedOrderCode);
    const normalizedStatus = String(status.transactionStatus || '').toLowerCase();
    await sql`
      update apk_order_payments
      set
        transaction_status = ${normalizedStatus},
        fraud_status = ${status.fraudStatus},
        expiry_time = ${status.expiryTime || null},
        qr_url = ${status.qrUrl || payment.qr_url || ''},
        qr_string = ${status.qrString || payment.qr_string || ''},
        deeplink_url = ${status.deeplinkUrl || payment.deeplink_url || ''},
        raw_response = ${JSON.stringify(status.raw)}::jsonb,
        updated_at = now()
      where order_code = ${normalizedOrderCode}
    `;

    if (normalizedStatus === 'settlement' || normalizedStatus === 'capture') {
      await sql`
        update apk_orders
        set
          order_status = ${'paid'},
          payment_status = ${'paid'},
          updated_at = now()
        where order_code = ${normalizedOrderCode}
      `;
      await sql`
        insert into owner_notification_queue (
          source,
          event_type,
          order_code,
          payload,
          queue_status
        ) values (
          ${'apk-premium'},
          ${'order-paid-midtrans'},
          ${normalizedOrderCode},
          ${JSON.stringify({
            kind: 'apk-premium-order-paid-midtrans',
            orderCode: normalizedOrderCode,
            paymentMethod: 'midtrans',
            totalPrice: Number(order.total_price || 0),
          })}::jsonb,
          ${'pending'}
        )
      `;
      await updateCoreOrderHistoryStatusByReference({
        reference: normalizedOrderCode,
        statusLabel: 'Berhasil',
        status: 'success',
        methodLabel: 'QRIS Midtrans',
        detailAppend: 'Pembayaran QRIS Midtrans berhasil dikonfirmasi.',
      });
      order.order_status = 'paid';
      order.payment_status = 'paid';
    } else if (normalizedStatus === 'expire' || normalizedStatus === 'cancel' || normalizedStatus === 'deny') {
      await restoreReservedInventory(normalizedOrderCode);
      await sql`
        update apk_orders
        set
          order_status = ${normalizedStatus === 'expire' ? 'expired' : 'failed'},
          payment_status = ${normalizedStatus},
          updated_at = now()
        where order_code = ${normalizedOrderCode}
      `;
      await updateCoreOrderHistoryStatusByReference({
        reference: normalizedOrderCode,
        statusLabel: normalizedStatus === 'expire' ? 'Expired' : 'Gagal',
        status: 'failed',
        methodLabel: 'QRIS Midtrans',
        detailAppend:
          normalizedStatus === 'expire'
            ? 'Pembayaran QRIS Midtrans expired dan stok dikembalikan.'
            : 'Pembayaran QRIS Midtrans tidak berhasil dan stok dikembalikan.',
      });
      order.order_status = normalizedStatus === 'expire' ? 'expired' : 'failed';
      order.payment_status = normalizedStatus;
    }
  }

  const refreshedPaymentRows = (await sql`
    select
      transaction_id,
      qr_url,
      qr_string,
      deeplink_url,
      expiry_time,
      transaction_status
    from apk_order_payments
    where order_code = ${normalizedOrderCode}
    limit 1
  `) as PaymentRow[];
  const refreshedPayment = refreshedPaymentRows[0] || payment;

  return {
    orderCode: normalizedOrderCode,
    orderStatus: order.order_status,
    paymentStatus: order.payment_status,
    paymentMethod: 'midtrans',
    totalPrice: Math.max(0, Number(order.total_price || 0)),
    totalPriceLabel: formatRupiah(Math.max(0, Number(order.total_price || 0))),
    qris: refreshedPayment
      ? {
          transactionId: String(refreshedPayment.transaction_id || '').trim(),
          qrUrl: String(refreshedPayment.qr_url || '').trim(),
          qrString: String(refreshedPayment.qr_string || '').trim(),
          deeplinkUrl: String(refreshedPayment.deeplink_url || '').trim(),
          expiryTime: String(refreshedPayment.expiry_time || '').trim(),
        }
      : null,
    nextStep:
      order.payment_status === 'paid'
        ? 'Pembayaran berhasil dan order siap diteruskan ke owner.'
        : order.payment_status === 'expire' || order.payment_status === 'cancel' || order.payment_status === 'deny'
          ? 'Pembayaran tidak aktif lagi. Silakan buat order baru.'
          : 'QRIS masih aktif. Silakan selesaikan pembayaran.',
  };
}

export function getApkPremiumPaymentGatewayStatus() {
  const midtrans = getMidtransPublicConfig();
  return {
    midtrans,
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
