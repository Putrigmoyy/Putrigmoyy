import { randomUUID } from 'node:crypto';
import { formatRupiah } from '@/lib/apk-premium';
import { getAppDataSourceConfig } from '@/lib/data-sources';
import {
  getCoreWalletBundle,
  recordCoreOrderHistory,
  refundCoreWalletBalanceOrder,
  spendCoreWalletBalanceForOrder,
  updateCoreOrderHistoryStatusByReference,
} from '@/lib/core-store';
import { createMidtransQrisCharge, getMidtransPublicConfig, getMidtransTransactionStatus, isMidtransConfigured } from '@/lib/midtrans';
import { getNeonClient } from '@/lib/neon-clients';
import { fetchPusatPanelServices, requestPusatPanel } from '@/lib/pusatpanel';
import { ensureSmmTables, markSmmOrderAsFailedAndRefund } from '@/lib/smm-store';

type CheckoutInput = {
  accountContact?: string;
  customerName?: string;
  service: string;
  serviceName: string;
  category: string;
  data: string;
  quantity: number | null;
  unitPrice: number;
  totalPrice: number;
  username?: string;
  comments?: string;
};

type SmmOrderRow = {
  order_code: string;
  provider_order_id: string | null;
  account_contact: string | null;
  service_id: string;
  service_name: string;
  category: string;
  target_data: string;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  username: string | null;
  comments: string | null;
  order_status: string;
  payment_status: string;
  payment_method: string;
};

type SmmPaymentRow = {
  transaction_id: string | null;
  qr_url: string | null;
  qr_string: string | null;
  deeplink_url: string | null;
  expiry_time: string | null;
  transaction_status: string | null;
};

export type SmmCheckoutSnapshot = {
  orderCode: string;
  providerOrderId: string;
  serviceId: string;
  serviceName: string;
  category: string;
  targetData: string;
  quantity: number | null;
  unitPrice: number;
  unitPriceLabel: string;
  totalPrice: number;
  totalPriceLabel: string;
  paymentStatus: string;
  orderStatus: string;
  paymentMethod: 'midtrans' | 'balance';
  fallbackNotice: string;
  nextStep: string;
  qris: {
    transactionId: string;
    qrUrl: string;
    qrString: string;
    deeplinkUrl: string;
    expiryTime: string;
  } | null;
};

function isSmmCheckoutReady() {
  const config = getAppDataSourceConfig();
  return config.smm.databaseConfigured;
}

function createSmmOrderCode() {
  const stamp = Date.now().toString().slice(-7);
  const suffix = randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase();
  return `SMM${stamp}${suffix}`;
}

function normalizePaidStatus(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'settlement' || normalized === 'capture') {
    return 'paid';
  }
  return normalized || 'pending';
}

function normalizeProviderMultilineText(value: string) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\r\n');
}

function countProviderMultilineEntries(value: string) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function normalizeProviderUsername(value: string) {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '');
}

function buildOrderDetail(input: {
  serviceName: string;
  category: string;
  targetData: string;
  quantity: number | null;
  comments: string;
  username: string;
}) {
  return [
    `Layanan: ${input.serviceName}`,
    `Kategori: ${input.category || '-'}`,
    `Target: ${input.targetData || '-'}`,
    `Jumlah: ${input.quantity == null ? '-' : input.quantity}`,
    `Username: ${input.username || '-'}`,
    `Komentar: ${input.comments || '-'}`,
  ].join('\n');
}

function calculateSmmCheckoutTotal(service: { menuType: string; price: number }, quantity: number | null) {
  if (String(service.menuType || '').trim() === '4') {
    return Math.max(0, Math.round(Number(service.price || 0)));
  }

  const units = Math.max(0, Number(quantity || 0));
  if (units <= 0) {
    return 0;
  }

  return Math.max(0, Math.ceil((Math.max(0, Number(service.price || 0)) * units) / 1000));
}

function buildSnapshot(order: SmmOrderRow, payment: SmmPaymentRow | null, fallbackNotice = ''): SmmCheckoutSnapshot {
  const paymentMethod = order.payment_method === 'balance' ? 'balance' : 'midtrans';
  const paymentStatus = String(order.payment_status || '').trim() || (paymentMethod === 'balance' ? 'paid' : 'awaiting-payment');
  const orderStatus = String(order.order_status || '').trim() || 'pending';
  const normalizedOrderStatus = orderStatus.toLowerCase();
  let nextStep = 'Order sosial media sedang diproses.';

  if (
    normalizedOrderStatus.includes('error') ||
    normalizedOrderStatus.includes('fail') ||
    normalizedOrderStatus.includes('cancel') ||
    normalizedOrderStatus.includes('deny')
  ) {
    nextStep =
      paymentStatus === 'refunded'
        ? 'Order gagal dan dana order otomatis masuk ke saldo akun.'
        : 'Order gagal diproses oleh provider. Silakan hubungi admin store.';
  } else if (paymentMethod === 'balance') {
    nextStep = order.provider_order_id
      ? 'Saldo akun berhasil dipakai dan order langsung diteruskan ke provider.'
      : 'Saldo akun berhasil dipakai. Order sedang disiapkan.';
  } else if (paymentStatus === 'paid') {
    nextStep = order.provider_order_id
      ? 'Pembayaran berhasil dan order sudah diteruskan ke provider.'
      : orderStatus === 'paid-review'
        ? 'Pembayaran berhasil, tetapi order sedang menunggu pengecekan manual.'
        : 'Pembayaran berhasil dan order sedang disiapkan.';
  } else if (paymentStatus === 'expire' || paymentStatus === 'cancel' || paymentStatus === 'deny' || paymentStatus === 'failed') {
    nextStep = 'Pembayaran sudah tidak aktif. Silakan buat order baru.';
  } else if (paymentStatus === 'refunded') {
    nextStep = 'Order gagal dan dana order otomatis masuk ke saldo akun.';
  } else if (fallbackNotice) {
    nextStep = `${fallbackNotice} QRIS siap digunakan untuk menyelesaikan pembayaran.`;
  } else {
    nextStep = 'QRIS siap digunakan untuk menyelesaikan pembayaran.';
  }

  return {
    orderCode: order.order_code,
    providerOrderId: String(order.provider_order_id || '').trim(),
    serviceId: order.service_id,
    serviceName: order.service_name,
    category: order.category,
    targetData: order.target_data,
    quantity: order.quantity == null ? null : Number(order.quantity),
    unitPrice: Math.max(0, Number(order.unit_price || 0)),
    unitPriceLabel: formatRupiah(Math.max(0, Number(order.unit_price || 0))),
    totalPrice: Math.max(0, Number(order.total_price || 0)),
    totalPriceLabel: formatRupiah(Math.max(0, Number(order.total_price || 0))),
    paymentStatus,
    orderStatus,
    paymentMethod,
    fallbackNotice,
    nextStep,
    qris:
      paymentMethod === 'midtrans' && payment
        ? {
            transactionId: String(payment.transaction_id || '').trim(),
            qrUrl: String(payment.qr_url || '').trim(),
            qrString: String(payment.qr_string || '').trim(),
            deeplinkUrl: String(payment.deeplink_url || '').trim(),
            expiryTime: String(payment.expiry_time || '').trim(),
          }
        : null,
  };
}

async function syncCoreHistoryForSmmOrder(order: SmmOrderRow) {
  const accountContact = String(order.account_contact || '').trim();
  if (!accountContact) {
    return;
  }

  const paymentMethod = order.payment_method === 'balance' ? 'balance' : 'midtrans';
  const paymentStatus = String(order.payment_status || '').trim().toLowerCase();
  const orderStatus = String(order.order_status || '').trim().toLowerCase();
  const hasProviderOrder = Boolean(String(order.provider_order_id || '').trim());

  if (paymentMethod === 'midtrans') {
    if (paymentStatus === 'paid' && orderStatus === 'paid-review') {
      await updateCoreOrderHistoryStatusByReference({
        reference: order.order_code,
        statusLabel: 'Pembayaran berhasil',
        status: 'pending',
        methodLabel: 'QRIS',
        detailAppend: 'Pembayaran berhasil, tetapi order provider perlu dicek manual.',
      });
      return;
    }

    if (paymentStatus === 'paid' && (hasProviderOrder || orderStatus === 'pending')) {
      await updateCoreOrderHistoryStatusByReference({
        reference: order.order_code,
        statusLabel: 'Berhasil',
        status: 'success',
        methodLabel: 'QRIS',
        detailAppend: 'Pembayaran QRIS berhasil dan order diteruskan ke provider.',
      });
      return;
    }

    if (paymentStatus === 'expire' || paymentStatus === 'cancel' || paymentStatus === 'deny' || paymentStatus === 'failed') {
      await updateCoreOrderHistoryStatusByReference({
        reference: order.order_code,
        statusLabel: paymentStatus === 'expire' ? 'Expired' : 'Gagal',
        status: 'failed',
        methodLabel: 'QRIS',
        detailAppend:
          paymentStatus === 'expire'
            ? 'Pembayaran QRIS expired sebelum diselesaikan.'
            : 'Pembayaran QRIS tidak berhasil dikonfirmasi.',
      });
      return;
    }

    if (paymentStatus === 'refunded') {
      await updateCoreOrderHistoryStatusByReference({
        reference: order.order_code,
        statusLabel: 'Error',
        status: 'failed',
        methodLabel: 'QRIS',
        detailAppend: 'Order provider gagal dan dana order otomatis masuk ke saldo akun.',
      });
      return;
    }

    return;
  }

  if (paymentStatus === 'paid' && (hasProviderOrder || orderStatus === 'pending')) {
    await updateCoreOrderHistoryStatusByReference({
      reference: order.order_code,
      statusLabel: 'Berhasil',
      status: 'success',
      methodLabel: 'Saldo akun',
      detailAppend: 'Saldo akun berhasil dipakai dan order diteruskan ke provider.',
    });
    return;
  }

  if (orderStatus === 'failed' || paymentStatus === 'failed' || paymentStatus === 'refunded') {
    await updateCoreOrderHistoryStatusByReference({
      reference: order.order_code,
      statusLabel: 'Gagal',
      status: 'failed',
      methodLabel: 'Saldo akun',
      detailAppend: 'Order provider gagal dibuat dan saldo otomatis dikembalikan.',
    });
  }
}

async function getOrderRow(orderCode: string) {
  const sql = getNeonClient('smm');
  const rows = (await sql`
    select
      order_code,
      provider_order_id,
      account_contact,
      service_id,
      service_name,
      category,
      target_data,
      quantity,
      unit_price,
      total_price,
      username,
      comments,
      order_status,
      payment_status,
      payment_method
    from smm_orders
    where order_code = ${orderCode}
    limit 1
  `) as SmmOrderRow[];
  return rows[0] || null;
}

async function getPaymentRow(orderCode: string) {
  const sql = getNeonClient('smm');
  const rows = (await sql`
    select
      transaction_id,
      qr_url,
      qr_string,
      deeplink_url,
      expiry_time,
      transaction_status
    from smm_order_payments
    where order_code = ${orderCode}
    limit 1
  `) as SmmPaymentRow[];
  return rows[0] || null;
}

async function upsertOrderRow(input: {
  orderCode: string;
  providerOrderId: string;
  accountContact: string;
  serviceId: string;
  serviceName: string;
  category: string;
  targetData: string;
  quantity: number | null;
  unitPrice: number;
  totalPrice: number;
  username: string;
  comments: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: 'midtrans' | 'balance';
}) {
  const sql = getNeonClient('smm');
  await sql`
    insert into smm_orders (
      order_code,
      provider_order_id,
      account_contact,
      service_id,
      service_name,
      category,
      target_data,
      quantity,
      unit_price,
      total_price,
      username,
      comments,
      order_status,
      payment_status,
      payment_method
    ) values (
      ${input.orderCode},
      ${input.providerOrderId},
      ${input.accountContact},
      ${input.serviceId},
      ${input.serviceName},
      ${input.category},
      ${input.targetData},
      ${input.quantity},
      ${input.unitPrice},
      ${input.totalPrice},
      ${input.username},
      ${input.comments},
      ${input.orderStatus},
      ${input.paymentStatus},
      ${input.paymentMethod}
    )
    on conflict (order_code) where order_code <> '' do update
    set
      provider_order_id = excluded.provider_order_id,
      account_contact = excluded.account_contact,
      service_id = excluded.service_id,
      service_name = excluded.service_name,
      category = excluded.category,
      target_data = excluded.target_data,
      quantity = excluded.quantity,
      unit_price = excluded.unit_price,
      total_price = excluded.total_price,
      username = excluded.username,
      comments = excluded.comments,
      order_status = excluded.order_status,
      payment_status = excluded.payment_status,
      payment_method = excluded.payment_method,
      updated_at = now()
  `;
}

async function upsertPaymentRow(input: {
  orderCode: string;
  transactionId: string;
  transactionStatus: string;
  grossAmount: number;
  expiryTime: string;
  qrUrl: string;
  qrString: string;
  deeplinkUrl: string;
  raw: unknown;
}) {
  const sql = getNeonClient('smm');
  await sql`
    insert into smm_order_payments (
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
      ${input.orderCode},
      ${'midtrans'},
      ${input.orderCode},
      ${input.transactionId},
      ${'midtrans'},
      ${input.transactionStatus},
      ${''},
      ${input.grossAmount},
      ${input.expiryTime || null},
      ${input.qrUrl},
      ${input.qrString},
      ${input.deeplinkUrl},
      ${JSON.stringify(input.raw)}::jsonb,
      now()
    )
    on conflict (order_code) do update
    set
      provider_order_id = excluded.provider_order_id,
      transaction_id = excluded.transaction_id,
      payment_method = excluded.payment_method,
      transaction_status = excluded.transaction_status,
      gross_amount = excluded.gross_amount,
      expiry_time = excluded.expiry_time,
      qr_url = excluded.qr_url,
      qr_string = excluded.qr_string,
      deeplink_url = excluded.deeplink_url,
      raw_response = excluded.raw_response,
      updated_at = now()
  `;
}

async function resolveProviderMenuType(serviceId: string, fallbackMenuType?: string | null) {
  const normalizedFallback = String(fallbackMenuType || '').trim();
  if (normalizedFallback) {
    return normalizedFallback;
  }

  const normalizedServiceId = String(serviceId || '').trim();
  if (!normalizedServiceId) {
    return '1';
  }

  const services = await fetchPusatPanelServices();
  return services.find((item) => item.id === normalizedServiceId)?.menuType || '1';
}

async function claimPaidMidtransOrderForProvider(orderCode: string) {
  const sql = getNeonClient('smm');
  const rows = (await sql`
    update smm_orders
    set
      payment_status = ${'paid'},
      order_status = ${'provider-submitting'},
      updated_at = now()
    where order_code = ${orderCode}
      and payment_method = ${'midtrans'}
      and payment_status = ${'awaiting-payment'}
      and coalesce(provider_order_id, '') = ''
    returning
      order_code,
      provider_order_id,
      account_contact,
      service_id,
      service_name,
      category,
      target_data,
      quantity,
      unit_price,
      total_price,
      username,
      comments,
      order_status,
      payment_status,
      payment_method
  `) as SmmOrderRow[];

  return rows[0] || null;
}

async function placeProviderOrder(
  order: Pick<SmmOrderRow, 'service_id' | 'target_data' | 'quantity' | 'username' | 'comments'> & {
    menuType?: string | null;
  },
) {
  const serviceId = String(order.service_id || '').trim();
  const targetData = String(order.target_data || '').trim();
  const quantity = Number(order.quantity || 0);
  const username = normalizeProviderUsername(String(order.username || ''));
  const comments = normalizeProviderMultilineText(String(order.comments || ''));
  const menuType = await resolveProviderMenuType(serviceId, order.menuType);

  const payload: Record<string, string> = {
    action: 'order',
    service: serviceId,
  };

  if (!serviceId) {
    throw new Error('Service provider belum valid.');
  }

  if (menuType === '2') {
    if (!targetData) {
      throw new Error('Data target wajib diisi untuk layanan Custom Comments.');
    }
    if (!comments) {
      throw new Error('Komentar wajib diisi untuk layanan Custom Comments.');
    }
    payload.data = targetData;
    payload.komen = comments;
  } else if (menuType === '3') {
    if (!targetData) {
      throw new Error('Data target wajib diisi untuk layanan Comment Likes.');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Jumlah order wajib diisi untuk layanan Comment Likes.');
    }
    if (!username) {
      throw new Error('Username komentar wajib diisi untuk layanan Comment Likes.');
    }
    payload.data = targetData;
    payload.quantity = String(quantity);
    payload.username = username;
  } else if (menuType === '4') {
    if (!targetData) {
      throw new Error('Data target wajib diisi untuk layanan Package.');
    }
    payload.data = targetData;
  } else if (menuType === '5') {
    if (!targetData) {
      throw new Error('Data target wajib diisi untuk layanan SEO.');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Jumlah order wajib diisi untuk layanan SEO.');
    }
    if (!comments) {
      throw new Error('Keyword / komen wajib diisi untuk layanan SEO.');
    }
    payload.data = targetData;
    payload.quantity = String(quantity);
    payload.komen = comments;
  } else {
    if (!targetData) {
      throw new Error('Data target wajib diisi untuk layanan ini.');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Jumlah order wajib diisi untuk layanan ini.');
    }
    payload.data = targetData;
    payload.quantity = String(quantity);
  }

  const response = await requestPusatPanel<{ id: string }>({
    ...payload,
  });
  if (!response.status || !response.data || !('id' in response.data) || !response.data.id) {
    throw new Error(response.data && 'msg' in response.data ? String(response.data.msg || 'Order provider gagal dibuat.') : 'Order provider gagal dibuat.');
  }
  return String(response.data.id);
}

export async function submitSmmCheckoutOrder(input: CheckoutInput): Promise<SmmCheckoutSnapshot> {
  if (!isSmmCheckoutReady()) {
    throw new Error('DATABASE_URL_SMM belum diisi.');
  }

  await ensureSmmTables();
  const accountContact = String(input.accountContact || '').trim();
  const customerName = String(input.customerName || '').trim() || 'Pelanggan Sosmed';
  const service = String(input.service || '').trim();
  const targetData = String(input.data || '').trim();
  const username = normalizeProviderUsername(String(input.username || ''));
  const comments = normalizeProviderMultilineText(String(input.comments || ''));
  const requestedQuantity = input.quantity == null ? null : Math.max(0, Number(input.quantity || 0));
  const orderCode = createSmmOrderCode();

  if (!service) {
    throw new Error('Service wajib diisi.');
  }
  if (!targetData) {
    throw new Error('Data target wajib diisi.');
  }

  const providerServices = await fetchPusatPanelServices();
  const selectedService = providerServices.find((item) => item.id === service);
  if (!selectedService) {
    throw new Error('Layanan sosial media tidak ditemukan atau sudah tidak aktif.');
  }

  const serviceName = selectedService.name;
  const category = selectedService.category || 'Tanpa Kategori';
  const unitPrice = Math.max(0, Math.round(Number(selectedService.price || 0)));
  const quantity = selectedService.menuType === '2' ? countProviderMultilineEntries(comments) : requestedQuantity;
  const totalPrice = calculateSmmCheckoutTotal(selectedService, quantity);
  const detail = buildOrderDetail({
    serviceName,
    category,
    targetData,
    quantity,
    comments,
    username,
  });

  if (selectedService.menuType !== '4' && (!quantity || quantity <= 0)) {
    throw new Error('Jumlah order belum valid.');
  }
  if (quantity != null && quantity > 0 && quantity < selectedService.min) {
    throw new Error(`Jumlah minimal untuk layanan ini adalah ${selectedService.min.toLocaleString('id-ID')}.`);
  }
  if (quantity != null && quantity > selectedService.max) {
    throw new Error(`Jumlah maksimal untuk layanan ini adalah ${selectedService.max.toLocaleString('id-ID')}.`);
  }
  if (totalPrice <= 0) {
    throw new Error('Total harga belum valid.');
  }

  let useBalance = false;
  let fallbackNotice = '';
  if (accountContact) {
    try {
      const bundle = await getCoreWalletBundle(accountContact, true);
      if (bundle?.account.balance != null && Number(bundle.account.balance) >= totalPrice) {
        useBalance = true;
      } else if (bundle?.account.loggedIn) {
        fallbackNotice = 'Saldo akun tidak cukup. Pembayaran dialihkan ke QRIS.';
      }
    } catch {
      fallbackNotice = '';
    }
  }

  if (useBalance) {
    try {
      await spendCoreWalletBalanceForOrder({
        accountContact,
        amount: totalPrice,
        subjectName: customerName,
        title: serviceName,
        detail,
        reference: orderCode,
      });

      const providerOrderId = await placeProviderOrder({
        service_id: service,
        target_data: targetData,
        quantity,
        username,
        comments,
        menuType: selectedService.menuType,
      });

      await upsertOrderRow({
        orderCode,
        providerOrderId,
        accountContact,
        serviceId: service,
        serviceName,
        category,
        targetData,
        quantity,
        unitPrice,
        totalPrice,
        username,
        comments,
        orderStatus: 'pending',
        paymentStatus: 'paid',
        paymentMethod: 'balance',
      });

      const order = await getOrderRow(orderCode);
      if (!order) {
        throw new Error('Order saldo berhasil dibuat, tetapi data lokal belum bisa dimuat.');
      }
      return buildSnapshot(order, null);
    } catch (error) {
      await refundCoreWalletBalanceOrder({
        accountContact,
        amount: totalPrice,
        subjectName: customerName,
        reference: orderCode,
        reason: error instanceof Error ? error.message : 'Order sosial media gagal dibuat.',
      });
      await updateCoreOrderHistoryStatusByReference({
        reference: orderCode,
        statusLabel: 'Gagal',
        status: 'failed',
        methodLabel: 'Saldo akun',
        detailAppend: 'Order provider gagal dibuat dan saldo otomatis dikembalikan.',
      });
      throw error;
    }
  }

  if (!isMidtransConfigured()) {
    throw new Error('MIDTRANS_SERVER_KEY belum diisi. QRIS website belum aktif.');
  }

  const charge = await createMidtransQrisCharge({
    orderId: orderCode,
    grossAmount: totalPrice,
    customerName,
    customerContact: accountContact,
  });

  await upsertOrderRow({
    orderCode,
    providerOrderId: '',
    accountContact,
    serviceId: service,
    serviceName,
    category,
    targetData,
    quantity,
    unitPrice,
    totalPrice,
    username,
    comments,
    orderStatus: 'awaiting-payment',
    paymentStatus: 'awaiting-payment',
    paymentMethod: 'midtrans',
  });

  await upsertPaymentRow({
    orderCode,
    transactionId: charge.transactionId,
    transactionStatus: charge.transactionStatus,
    grossAmount: totalPrice,
    expiryTime: charge.expiryTime,
    qrUrl: charge.qrUrl,
    qrString: charge.qrString,
    deeplinkUrl: charge.deeplinkUrl,
    raw: charge.raw,
  });

  if (accountContact) {
    await recordCoreOrderHistory({
      accountContact,
      subjectName: customerName,
      title: serviceName,
      amount: totalPrice,
      detail,
      methodLabel: 'QRIS',
      reference: orderCode,
    });
  }

  const order = await getOrderRow(orderCode);
  const payment = await getPaymentRow(orderCode);
  if (!order) {
    throw new Error('Checkout sosial media berhasil dibuat, tetapi data order belum bisa dimuat.');
  }
  return buildSnapshot(order, payment, fallbackNotice);
}

export async function getSmmCheckoutOrderStatus(orderCode: string): Promise<SmmCheckoutSnapshot> {
  if (!isSmmCheckoutReady()) {
    throw new Error('DATABASE_URL_SMM belum diisi.');
  }

  await ensureSmmTables();
  const normalizedOrderCode = String(orderCode || '').trim();
  if (!normalizedOrderCode) {
    throw new Error('Order code wajib diisi.');
  }

  const sql = getNeonClient('smm');
  const order = await getOrderRow(normalizedOrderCode);
  if (!order) {
    throw new Error('Order sosial media tidak ditemukan.');
  }

  let payment = await getPaymentRow(normalizedOrderCode);
  if (payment && order.payment_method === 'midtrans' && order.payment_status === 'awaiting-payment' && isMidtransConfigured()) {
    const status = await getMidtransTransactionStatus(normalizedOrderCode);
    const normalizedPaymentStatus = normalizePaidStatus(status.transactionStatus);

    await sql`
      update smm_order_payments
      set
        transaction_status = ${normalizedPaymentStatus},
        fraud_status = ${status.fraudStatus},
        expiry_time = ${status.expiryTime || null},
        qr_url = ${status.qrUrl || payment.qr_url || ''},
        qr_string = ${status.qrString || payment.qr_string || ''},
        deeplink_url = ${status.deeplinkUrl || payment.deeplink_url || ''},
        raw_response = ${JSON.stringify(status.raw)}::jsonb,
        updated_at = now()
      where order_code = ${normalizedOrderCode}
    `;

    if (normalizedPaymentStatus === 'paid') {
      const claimedOrder = await claimPaidMidtransOrderForProvider(normalizedOrderCode);
      if (claimedOrder) {
        try {
          const providerOrderId = await placeProviderOrder(claimedOrder);
          await sql`
            update smm_orders
            set
              provider_order_id = ${providerOrderId},
              order_status = ${'pending'},
              payment_status = ${'paid'},
              updated_at = now()
            where order_code = ${normalizedOrderCode}
          `;
          if (String(claimedOrder.account_contact || '').trim()) {
            await updateCoreOrderHistoryStatusByReference({
              reference: normalizedOrderCode,
              statusLabel: 'Berhasil',
              status: 'success',
              methodLabel: 'QRIS',
              detailAppend: 'Pembayaran QRIS berhasil dan order diteruskan ke provider.',
            });
          }
        } catch (error) {
          await markSmmOrderAsFailedAndRefund(
            normalizedOrderCode,
            error instanceof Error ? error.message : 'Provider error.',
          );
        }
      }
    } else if (normalizedPaymentStatus === 'expire' || normalizedPaymentStatus === 'cancel' || normalizedPaymentStatus === 'deny' || normalizedPaymentStatus === 'failed') {
      await sql`
        update smm_orders
        set
          order_status = ${normalizedPaymentStatus === 'expire' ? 'expired' : 'failed'},
          payment_status = ${normalizedPaymentStatus},
          updated_at = now()
        where order_code = ${normalizedOrderCode}
      `;
      if (String(order.account_contact || '').trim()) {
        await updateCoreOrderHistoryStatusByReference({
          reference: normalizedOrderCode,
          statusLabel: normalizedPaymentStatus === 'expire' ? 'Expired' : 'Gagal',
          status: 'failed',
          methodLabel: 'QRIS',
          detailAppend: normalizedPaymentStatus === 'expire'
            ? 'Pembayaran QRIS expired sebelum diselesaikan.'
            : 'Pembayaran QRIS tidak berhasil dikonfirmasi.',
        });
      }
    }

    payment = await getPaymentRow(normalizedOrderCode);
  }

  const refreshedOrder = await getOrderRow(normalizedOrderCode);
  if (!refreshedOrder) {
    throw new Error('Order sosial media tidak bisa dimuat ulang.');
  }
  await syncCoreHistoryForSmmOrder(refreshedOrder);
  return buildSnapshot(refreshedOrder, payment);
}

export function getSmmPaymentGatewayStatus() {
  return {
    midtrans: getMidtransPublicConfig(),
  };
}
