import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getNeonClient } from '@/lib/neon-clients';
import { formatRupiah } from '@/lib/apk-premium';
import { getApkPremiumProductById } from '@/lib/apk-premium-store';

type CheckoutInput = {
  productId: string;
  variantId: string;
  quantity: number;
  customerName: string;
  customerContact: string;
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
  paymentStatus: 'awaiting-payment';
  dataSource: 'local-preview' | 'neon';
};

export type ApkCheckoutPreview = ApkCheckoutBase & {
  orderStatus: 'draft';
};

export type ApkSubmittedOrder = ApkCheckoutBase & {
  orderStatus: 'pending';
  queueCreated: boolean;
  syncReady: boolean;
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
      ${'pending'},
      ${'awaiting-payment'}
    )
  `;

  const payload = JSON.stringify({
    kind: 'apk-premium-order-created',
    orderCode: result.orderCode,
    productId: result.product.id,
    productTitle: result.product.title,
    variantId: result.variant.id,
    variantTitle: result.variant.title,
    quantity: result.quantity,
    totalPrice: result.totalPrice,
    customerName: result.customerName,
    customerContact: result.customerContact,
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
      ${'order-created'},
      ${result.orderCode},
      ${payload}::jsonb,
      ${'pending'}
    )
  `;

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
    orderStatus: 'pending',
    dataSource: 'neon',
    queueCreated: true,
    syncReady: true,
    nextStep: 'Lanjut sambungkan checkout Midtrans website untuk order ini.',
  };
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
