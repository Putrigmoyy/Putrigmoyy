type MidtransEnvironment = 'sandbox' | 'production';

type MidtransAction = {
  name?: string;
  method?: string;
  url?: string;
};

type MidtransChargeResponse = {
  transaction_id?: string;
  order_id?: string;
  gross_amount?: string | number;
  currency?: string;
  payment_type?: string;
  transaction_time?: string;
  transaction_status?: string;
  fraud_status?: string;
  expiry_time?: string;
  actions?: MidtransAction[];
  qr_string?: string;
  status_code?: string;
  status_message?: string;
};

export type MidtransChargeResult = {
  transactionId: string;
  orderId: string;
  paymentType: string;
  transactionStatus: string;
  fraudStatus: string;
  grossAmount: number;
  expiryTime: string;
  qrString: string;
  qrUrl: string;
  deeplinkUrl: string;
  raw: MidtransChargeResponse;
};

export type MidtransStatusResult = {
  transactionId: string;
  orderId: string;
  paymentType: string;
  transactionStatus: string;
  fraudStatus: string;
  grossAmount: number;
  expiryTime: string;
  qrString: string;
  qrUrl: string;
  deeplinkUrl: string;
  raw: MidtransChargeResponse;
};

function getMidtransEnvironment(): MidtransEnvironment {
  return String(process.env.MIDTRANS_ENVIRONMENT || '').trim().toLowerCase() === 'production' ? 'production' : 'sandbox';
}

function getMidtransApiBaseUrl() {
  const custom = String(process.env.MIDTRANS_API_BASE_URL || '').trim();
  if (custom) {
    return custom.replace(/\/+$/g, '');
  }
  return getMidtransEnvironment() === 'production'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
}

function getMidtransServerKey() {
  return String(process.env.MIDTRANS_SERVER_KEY || '').trim();
}

function getMidtransMerchantId() {
  return String(process.env.MIDTRANS_MERCHANT_ID || '').trim();
}

function encodeBasicAuth(username: string) {
  return Buffer.from(`${username}:`).toString('base64');
}

function getRequiredMidtransServerKey() {
  const serverKey = getMidtransServerKey();
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY belum diisi di Vercel.');
  }
  return serverKey;
}

function findMidtransActionUrl(actions: MidtransAction[] | undefined, actionName: string) {
  return (Array.isArray(actions) ? actions : []).find((item) => String(item?.name || '').trim().toLowerCase() === actionName)?.url || '';
}

function normalizeMidtransResponse(payload: MidtransChargeResponse): MidtransChargeResult {
  return {
    transactionId: String(payload.transaction_id || '').trim(),
    orderId: String(payload.order_id || '').trim(),
    paymentType: String(payload.payment_type || '').trim() || 'qris',
    transactionStatus: String(payload.transaction_status || '').trim().toLowerCase() || 'pending',
    fraudStatus: String(payload.fraud_status || '').trim().toLowerCase(),
    grossAmount: Math.max(0, Number(payload.gross_amount || 0)),
    expiryTime: String(payload.expiry_time || '').trim(),
    qrString: String(payload.qr_string || '').trim(),
    qrUrl: String(findMidtransActionUrl(payload.actions, 'generate-qr-code') || '').trim(),
    deeplinkUrl: String(findMidtransActionUrl(payload.actions, 'deeplink-redirect') || '').trim(),
    raw: payload,
  };
}

export function isMidtransConfigured() {
  return Boolean(getMidtransServerKey());
}

export function getMidtransPublicConfig() {
  return {
    configured: isMidtransConfigured(),
    environment: getMidtransEnvironment(),
    merchantId: getMidtransMerchantId(),
    apiBaseUrl: getMidtransApiBaseUrl(),
  };
}

export async function createMidtransQrisCharge(input: {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerContact: string;
  customerEmail?: string;
}) {
  const serverKey = getRequiredMidtransServerKey();
  const customerEmail = String(input.customerEmail || '').trim();
  const response = await fetch(`${getMidtransApiBaseUrl()}/v2/charge`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encodeBasicAuth(serverKey)}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      payment_type: 'qris',
      transaction_details: {
        order_id: input.orderId,
        gross_amount: Math.max(1, Math.round(Number(input.grossAmount || 0))),
      },
      customer_details: {
        first_name: String(input.customerName || '').trim().slice(0, 80) || 'Customer',
        phone: String(input.customerContact || '').trim().slice(0, 40),
        ...(customerEmail ? { email: customerEmail.slice(0, 120) } : {}),
      },
      qris: {
        acquirer: 'gopay',
      },
    }),
  });

  const payload = (await response.json()) as MidtransChargeResponse;
  if (!response.ok) {
    throw new Error(String(payload.status_message || 'Midtrans charge QRIS gagal dibuat.'));
  }

  const result = normalizeMidtransResponse(payload);
  if (!result.transactionId || (!result.qrUrl && !result.qrString)) {
    throw new Error('Midtrans tidak mengembalikan QRIS yang bisa ditampilkan.');
  }
  return result;
}

export async function getMidtransTransactionStatus(orderId: string) {
  const serverKey = getRequiredMidtransServerKey();
  const response = await fetch(`${getMidtransApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${encodeBasicAuth(serverKey)}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json()) as MidtransChargeResponse;
  if (!response.ok) {
    throw new Error(String(payload.status_message || 'Status Midtrans belum bisa diambil.'));
  }
  return normalizeMidtransResponse(payload);
}
