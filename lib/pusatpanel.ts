import { applySmmPricingProfit, getSmmPricingSettings } from '@/lib/smm-pricing';

type PusatPanelResponse<T> = {
  status: boolean;
  data: T | {
    msg?: string;
  };
};

type ProviderPayload = Record<string, string>;

export type PusatPanelProfile = {
  email: string;
  username: string;
  full_name: string;
  balance: string;
};

export type PusatPanelService = {
  id: string;
  category: string;
  name: string;
  note: string;
  min: string | number;
  max: string | number;
  price: string | number;
  tipe_menu?: string | number;
  tipe_logo?: string;
  speed?: string;
};

export type NormalizedPusatPanelProfile = {
  email: string;
  username: string;
  fullName: string;
  balance: number;
  balanceLabel: string;
};

export type NormalizedPusatPanelService = {
  id: string;
  category: string;
  name: string;
  note: string;
  min: number;
  max: number;
  price: number;
  priceLabel: string;
  menuType: string;
  logoType: string;
  speed: string;
};

const DEFAULT_API_URL = 'https://pusatpanelsmm.com/api/json.php';

function getProviderConfig() {
  const apiUrl = String(process.env.PUSATPANELSMM_API_URL || DEFAULT_API_URL).trim() || DEFAULT_API_URL;
  const apiKey = String(process.env.PUSATPANELSMM_API_KEY || '').trim();
  const secretKey = String(process.env.PUSATPANELSMM_SECRET_KEY || '').trim();
  return {
    apiUrl,
    apiKey,
    secretKey,
    configured: Boolean(apiKey && secretKey),
  };
}

export function getPusatPanelMeta() {
  return getProviderConfig();
}

function cleanProviderText(value: unknown) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeProviderNumber(value: unknown) {
  const parsed = Number(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isBlockedPusatPanelService(service?: Pick<PusatPanelService, 'name' | 'category' | 'note'> | null) {
  const haystack = `${service?.name || ''} ${service?.category || ''} ${service?.note || ''}`.toLowerCase();
  return haystack.includes('traffic');
}

export function normalizePusatPanelProfile(profile?: PusatPanelProfile | null): NormalizedPusatPanelProfile {
  const balance = normalizeProviderNumber(profile?.balance);
  return {
    email: cleanProviderText(profile?.email),
    username: cleanProviderText(profile?.username),
    fullName: cleanProviderText(profile?.full_name),
    balance,
    balanceLabel: balance.toLocaleString('id-ID'),
  };
}

export function normalizePusatPanelService(service?: PusatPanelService | null): NormalizedPusatPanelService {
  const price = normalizeProviderNumber(service?.price);
  return {
    id: cleanProviderText(service?.id),
    category: cleanProviderText(service?.category) || 'Tanpa Kategori',
    name: cleanProviderText(service?.name),
    note: cleanProviderText(service?.note),
    min: normalizeProviderNumber(service?.min),
    max: normalizeProviderNumber(service?.max),
    price,
    priceLabel: price.toLocaleString('id-ID'),
    menuType: cleanProviderText(service?.tipe_menu) || '1',
    logoType: cleanProviderText(service?.tipe_logo) || 'General',
    speed: cleanProviderText(service?.speed) || '-',
  };
}

export async function requestPusatPanel<T>(payload: ProviderPayload): Promise<PusatPanelResponse<T>> {
  const config = getProviderConfig();
  if (!config.configured) {
    throw new Error('PUSATPANELSMM credentials belum diisi.');
  }

  const body = new URLSearchParams({
    api_key: config.apiKey,
    secret_key: config.secretKey,
    ...payload,
  });

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Provider error ${response.status}`);
  }

  const json = await response.json() as PusatPanelResponse<T>;
  return json;
}

export async function fetchPusatPanelProfile() {
  const response = await requestPusatPanel<PusatPanelProfile>({
    action: 'profile',
  });

  if (!response.status || !('email' in (response.data || {}))) {
    const message = 'msg' in (response.data || {}) ? String((response.data as { msg?: string }).msg || 'Profil provider tidak tersedia.') : 'Profil provider tidak tersedia.';
    throw new Error(message);
  }

  return normalizePusatPanelProfile(response.data as PusatPanelProfile);
}

export async function fetchPusatPanelServices() {
  const response = await requestPusatPanel<PusatPanelService[]>({
    action: 'services',
  });

  if (!response.status || !Array.isArray(response.data)) {
    const message = 'msg' in (response.data || {}) ? String((response.data as { msg?: string }).msg || 'Daftar layanan provider tidak tersedia.') : 'Daftar layanan provider tidak tersedia.';
    throw new Error(message);
  }

  const pricingSettings = await getSmmPricingSettings();

  return response.data
    .filter((service) => !isBlockedPusatPanelService(service))
    .map((service) => {
      const normalizedService = normalizePusatPanelService(service);
      const adjustedPrice = applySmmPricingProfit(normalizedService.price, pricingSettings.profitPercent);
      return {
        ...normalizedService,
        price: adjustedPrice,
        priceLabel: adjustedPrice.toLocaleString('id-ID'),
      };
    });
}
