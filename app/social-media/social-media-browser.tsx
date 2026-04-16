'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  siApplepodcasts,
  siAudiomack,
  siClubhouse,
  siDailymotion,
  siDiscord,
  siFacebook,
  siGoogleplay,
  siInstagram,
  siKuaishou,
  siPinterest,
  siQuora,
  siReddit,
  siShopee,
  siSoundcloud,
  siSpotify,
  siTelegram,
  siThreads,
  siTiktok,
  siTwitch,
  siWhatsapp,
  siX,
  siYoutube,
} from 'simple-icons';
import type { NormalizedPusatPanelProfile, NormalizedPusatPanelService } from '@/lib/pusatpanel';
import { formatRupiah } from '@/lib/apk-premium';
import { ActionLoadingOverlay } from '@/app/components/action-loading-overlay';
import { FloatingNotice } from '@/app/components/floating-notice';
import { TopAccountMenu } from '@/app/components/top-account-menu';

type Props = {
  profile: NormalizedPusatPanelProfile | null;
  providerMeta: {
    apiUrl: string;
    configured: boolean;
  };
  services: NormalizedPusatPanelService[];
  categories: string[];
  minimumDeposit: number;
  requestedTab?: string | null;
};

type SocialTab = 'sosmed' | 'riwayat' | 'status' | 'provider';
type DepositMethod = 'midtrans' | 'balance';
type AccountModalView = 'profil' | 'deposit' | 'riwayat';
type HelperModalView = 'kontak' | 'mulai' | 'cara-deposit' | 'status-info' | 'target' | 'api-docs';
type FilterPickerKey =
  | 'monitoring-limit'
  | 'monitoring-status'
  | 'monitoring-category'
  | 'status-limit'
  | 'status-status'
  | 'status-year';
type ManualPickerOption = {
  value: string;
  label: string;
};
type StatusGuideItem = {
  label: string;
  tone: 'success' | 'processing' | 'pending' | 'partial' | 'error';
  description: string;
};
type TargetGuideSection = {
  title: string;
  items: string[];
};

type CoreDepositQrisState = {
  reference: string;
  amount: number;
  amountLabel: string;
  paymentStatus: string;
  qris: {
    transactionId: string;
    qrUrl: string;
    qrString: string;
    deeplinkUrl: string;
    expiryTime: string;
  } | null;
  nextStep: string;
};

type WalletHistoryEntry = {
  id: string;
  kind: 'order' | 'deposit';
  title: string;
  subjectName: string;
  amountLabel: string;
  statusLabel: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
  createdLabel: string;
  detail: string;
  methodLabel: string;
  reference: string;
};

type CheckoutOrderResult = {
  status?: boolean;
  data?: SocialCheckoutState | {
    msg?: string;
  };
};

type CoreBundlePayload = {
  account?: {
    registered?: boolean;
    loggedIn?: boolean;
    name?: string;
    username?: string;
    contact?: string;
    balance?: number;
  };
  history?: WalletHistoryEntry[];
};

type CoreBundleResult = {
  status?: boolean;
  data?: CoreBundlePayload | {
    msg?: string;
  };
};

type CoreDepositResult = {
  status?: boolean;
  data?: {
    bundle?: CoreBundlePayload;
    amount?: number;
    method?: DepositMethod;
    depositState?: CoreDepositQrisState;
    msg?: string;
  };
};

type HistoryItem = {
  id: number;
  orderCode: string;
  providerOrderId: string;
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
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
};

type SocialCheckoutState = {
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

type ProviderStatusSnapshot = {
  status: string;
  startCount: number | null;
  remains: number | null;
};

type SocialPlatformVisual = {
  label: string;
  accent: string;
  icon: string;
};

type PlatformGroup = SocialPlatformVisual & {
  key: string;
  services: NormalizedPusatPanelService[];
  categories: string[];
};

const PLATFORM_VISUALS: Array<{ matchers: string[]; visual: SocialPlatformVisual }> = [
  { matchers: ['instagram'], visual: { label: 'Instagram', accent: '#e4408b', icon: 'instagram' } },
  { matchers: ['tiktok'], visual: { label: 'TikTok', accent: '#111111', icon: 'tiktok' } },
  { matchers: ['facebook'], visual: { label: 'Facebook', accent: '#1877f2', icon: 'facebook' } },
  { matchers: ['whatsapp'], visual: { label: 'WhatsApp', accent: '#25d366', icon: 'whatsapp' } },
  { matchers: ['threads'], visual: { label: 'Threads', accent: '#111111', icon: 'threads' } },
  { matchers: ['twitter / x', 'twitter', 'x.com'], visual: { label: 'Twitter / X', accent: '#1d9bf0', icon: 'x' } },
  { matchers: ['spotify'], visual: { label: 'Spotify', accent: '#1db954', icon: 'spotify' } },
  { matchers: ['discord'], visual: { label: 'Discord', accent: '#5865f2', icon: 'discord' } },
  { matchers: ['soundcloud'], visual: { label: 'SoundCloud', accent: '#ff7700', icon: 'soundcloud' } },
  { matchers: ['pinterest'], visual: { label: 'Pinterest', accent: '#e60023', icon: 'pinterest' } },
  { matchers: ['quora'], visual: { label: 'Quora', accent: '#b92b27', icon: 'quora' } },
  { matchers: ['mobile app install', 'mobile app installs', 'app install', 'app installs'], visual: { label: 'Mobile App Install', accent: '#17a65b', icon: 'install' } },
  { matchers: ['linkedin'], visual: { label: 'LinkedIn', accent: '#0a66c2', icon: 'linkedin' } },
  { matchers: ['likee'], visual: { label: 'Likee', accent: '#ff6680', icon: 'likee' } },
  { matchers: ['dailymotion'], visual: { label: 'Dailymotion', accent: '#0066dc', icon: 'dailymotion' } },
  { matchers: ['audiomack'], visual: { label: 'Audiomack', accent: '#ff9900', icon: 'audiomack' } },
  { matchers: ['youtube'], visual: { label: 'YouTube', accent: '#ff0000', icon: 'youtube' } },
  { matchers: ['telegram'], visual: { label: 'Telegram', accent: '#27a7e7', icon: 'telegram' } },
  { matchers: ['shopee'], visual: { label: 'Shopee', accent: '#ee4d2d', icon: 'shopee' } },
  { matchers: ['tokopedia'], visual: { label: 'Tokopedia', accent: '#03ac0e', icon: 'tokopedia' } },
  { matchers: ['clubhouse'], visual: { label: 'Clubhouse', accent: '#111111', icon: 'clubhouse' } },
  { matchers: ['kwai'], visual: { label: 'Kwai', accent: '#ff5b24', icon: 'kwai' } },
  { matchers: ['podcast', 'itunes'], visual: { label: 'Podcast [iTunes Store]', accent: '#a141ff', icon: 'podcast' } },
  { matchers: ['reddit'], visual: { label: 'Reddit', accent: '#ff4500', icon: 'reddit' } },
  { matchers: ['snackvideo', 'snack video'], visual: { label: 'SnackVideo', accent: '#111111', icon: 'snackvideo' } },
  { matchers: ['twitch'], visual: { label: 'Twitch', accent: '#9146ff', icon: 'twitch' } },
];

const SIMPLE_ICON_MAP = {
  instagram: siInstagram,
  tiktok: siTiktok,
  facebook: siFacebook,
  whatsapp: siWhatsapp,
  threads: siThreads,
  x: siX,
  spotify: siSpotify,
  discord: siDiscord,
  soundcloud: siSoundcloud,
  pinterest: siPinterest,
  quora: siQuora,
  install: siGoogleplay,
  dailymotion: siDailymotion,
  audiomack: siAudiomack,
  youtube: siYoutube,
  telegram: siTelegram,
  shopee: siShopee,
  clubhouse: siClubhouse,
  kwai: siKuaishou,
  podcast: siApplepodcasts,
  reddit: siReddit,
  twitch: siTwitch,
} as const;

const REMOTE_LOGO_MAP: Record<string, string> = {
  linkedin: 'https://logo.clearbit.com/linkedin.com',
  likee: 'https://logo.clearbit.com/likee.video',
  tokopedia: 'https://logo.clearbit.com/tokopedia.com',
  snackvideo: 'https://logo.clearbit.com/snackvideo.com',
};
const WEBSITE_ACCOUNT_SESSION_KEY = 'putrigmoyy_apk_account_session_v1';

function createInitialOrderForm(service?: NormalizedPusatPanelService | null) {
  return {
    data: '',
    quantity: service ? String(Math.max(0, service.min || 0)) : '',
    username: '',
    comments: '',
    emailNotification: '',
  };
}

function titleCaseWords(value: string) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ');
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsPlatformPhrase(value: string, phrase: string) {
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(phrase.toLowerCase())}([^a-z0-9]|$)`, 'i');
  return pattern.test(value.toLowerCase());
}

function detectPlatformVisual(service: NormalizedPusatPanelService): SocialPlatformVisual {
  const categoryText = String(service.category || '').toLowerCase();
  const nameText = String(service.name || '').toLowerCase();
  const match =
    PLATFORM_VISUALS.find((entry) => entry.matchers.some((matcher) => containsPlatformPhrase(categoryText, matcher))) ||
    PLATFORM_VISUALS.find((entry) => entry.matchers.some((matcher) => containsPlatformPhrase(nameText, matcher)));
  if (match) {
    return match.visual;
  }

  const source = service.category || service.name || 'General';
  const primaryLabel = titleCaseWords(source.split(/[-|/]/)[0] || source) || 'General';
  const glyph = primaryLabel
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  return {
    label: primaryLabel,
    accent: '#1799f2',
    icon: glyph || 'SM',
  };
}

function SocialPlatformIcon({ icon }: { icon: string }) {
  const simpleIcon = SIMPLE_ICON_MAP[icon as keyof typeof SIMPLE_ICON_MAP];
  if (simpleIcon) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={simpleIcon.path} fill="currentColor" />
      </svg>
    );
  }

  if (icon === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="3.1" fill="#0a66c2" />
        <circle cx="8.35" cy="8.25" r="1.2" fill="#ffffff" />
        <path d="M7.2 10.35h2.3v6.45H7.2Zm3.6 0h2.2v.88c.48-.67 1.3-1.13 2.45-1.13 2.03 0 3.33 1.3 3.33 4.04v2.66h-2.36v-2.4c0-1.31-.45-2.12-1.54-2.12-.83 0-1.33.56-1.54 1.1-.08.2-.1.47-.1.74v2.68H10.8Z" fill="#ffffff" />
      </svg>
    );
  }

  if (icon === 'likee') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="likee-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe35f" />
            <stop offset="38%" stopColor="#ff7e55" />
            <stop offset="68%" stopColor="#ff4f9f" />
            <stop offset="100%" stopColor="#7b61ff" />
          </linearGradient>
        </defs>
        <path
          d="M12 20.1c-.3 0-.6-.08-.83-.22-1.22-.75-5.8-3.7-7.18-7.14C2.83 9.9 4.1 6.45 6.95 5.1A5.4 5.4 0 0 1 12 5.4a5.4 5.4 0 0 1 5.05-.3c2.85 1.35 4.12 4.8 2.96 7.64-1.38 3.44-5.96 6.4-7.18 7.14-.23.14-.53.22-.83.22Z"
          fill="url(#likee-gradient)"
        />
        <path
          d="M12 18.2c-1.7-1.06-5.18-3.54-6.15-5.95-.82-2.03.1-4.4 2.1-5.34 1.55-.74 3.2-.26 4.05.9 0 0 1.57-2.15 4.05-.9 2 .94 2.92 3.31 2.1 5.34-.97 2.41-4.45 4.89-6.15 5.95Z"
          fill="none"
          stroke="#111111"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.1"
        />
      </svg>
    );
  }

  if (icon === 'snackvideo') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="#f4d53b" />
        <circle cx="12" cy="12" r="5.1" fill="#111111" />
        <path d="M13.9 12.05 10.55 10v4.1l3.35-2.05Z" fill="#f4d53b" />
      </svg>
    );
  }

  const remoteLogo = REMOTE_LOGO_MAP[icon];
  if (remoteLogo) {
    return <img src={remoteLogo} alt="" loading="lazy" referrerPolicy="no-referrer" />;
  }

  return <span className="smm-platform-fallback">{icon}</span>;
}

function formatDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const datePart = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\./g, ':');
  return `${datePart}, ${timePart}`;
}

function formatDateParts(value: string) {
  if (!value) {
    return { datePart: '-', timePart: '-' };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { datePart: '-', timePart: '-' };
  }
  return {
    datePart: new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date),
    timePart: new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .format(date)
      .replace(/\./g, ':'),
  };
}

function formatServicePickerLabel(service?: NormalizedPusatPanelService | null) {
  if (!service) return 'Pilih Salah Satu';
  return `${service.id} - ${service.name} - Rp${service.priceLabel}`;
}

function formatStatusOptionLabel(value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (normalized.toLowerCase() === 'semua') return 'Semua';
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ');
}

function buildStatusFilterOptions(defaultValues: string[], sourceValues: string[]) {
  const seen = new Set<string>();
  const items: ManualPickerOption[] = [];

  for (const value of [...defaultValues, ...sourceValues]) {
    const normalized = String(value || '').trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      value: normalized,
      label: formatStatusOptionLabel(normalized),
    });
  }

  return items;
}

function matchesStatusFilter(status: string, filterValue: string) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const normalizedFilter = String(filterValue || '').trim().toLowerCase();

  if (!normalizedFilter || normalizedFilter === 'semua') {
    return true;
  }
  if (!normalizedStatus) {
    return false;
  }
  if (normalizedStatus === normalizedFilter) {
    return true;
  }
  if (normalizedFilter === 'success') {
    return normalizedStatus.includes('success') || normalizedStatus.includes('complete');
  }
  if (normalizedFilter === 'pending') {
    return normalizedStatus.includes('pending') || normalizedStatus.includes('waiting');
  }
  if (normalizedFilter === 'processing') {
    return normalizedStatus.includes('process');
  }
  if (normalizedFilter === 'partial') {
    return normalizedStatus.includes('partial');
  }
  if (normalizedFilter === 'error') {
    return (
      normalizedStatus.includes('error') ||
      normalizedStatus.includes('fail') ||
      normalizedStatus.includes('cancel') ||
      normalizedStatus.includes('deny')
    );
  }
  if (normalizedFilter === 'expired') {
    return normalizedStatus.includes('expire') || normalizedStatus.includes('expired');
  }
  return normalizedStatus === normalizedFilter;
}

function SearchableManualPicker({
  value,
  placeholder,
  open,
  onToggle,
  onSelect,
  query,
  onQueryChange,
  options,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  multiline = false,
  stackClassName = 'smm-select-stack',
}: {
  value: string;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  options: ManualPickerOption[];
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  multiline?: boolean;
  stackClassName?: string;
}) {
  const selectedOption = options.find((option) => option.value === value);
  const displayValue = selectedOption?.label || value || placeholder;
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery))
    : options;

  return (
    <div className={stackClassName}>
      <button
        type="button"
        className={
          open
            ? `smm-picker-trigger${multiline ? ' smm-picker-trigger--multiline' : ''}${!value ? ' smm-picker-trigger--placeholder' : ''} smm-picker-trigger--open`
            : !value
              ? `smm-picker-trigger${multiline ? ' smm-picker-trigger--multiline' : ''} smm-picker-trigger--placeholder`
              : `smm-picker-trigger${multiline ? ' smm-picker-trigger--multiline' : ''}`
        }
        onClick={onToggle}
        disabled={disabled}
      >
        <span>{displayValue}</span>
        <i aria-hidden="true" />
      </button>

      {open ? (
        <div className="smm-picker-panel">
          <div className="apk-app-form-field">
            <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={searchPlaceholder} />
          </div>
          <div className={multiline ? 'smm-manual-list smm-manual-list--service' : 'smm-manual-list'}>
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={value === option.value ? 'smm-manual-item smm-manual-item--active' : 'smm-manual-item'}
                  onClick={() => onSelect(option.value)}
                >
                  <div className="smm-manual-item-copy">
                    <strong>{option.label}</strong>
                  </div>
                </button>
              ))
            ) : (
              <div className="apk-app-empty">{emptyMessage}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function calculateSmmTotal(service: NormalizedPusatPanelService | null, quantity: number) {
  if (!service) {
    return 0;
  }
  if (service.menuType === '4') {
    return Math.max(0, service.price);
  }

  const units = Math.max(0, Number(quantity || 0));
  if (units <= 0) {
    return 0;
  }

  return Math.max(0, Math.ceil((service.price * units) / 1000));
}

function buildQuickDepositAmounts(minimumDeposit: number) {
  const base = Math.max(1000, Number(minimumDeposit || 0));
  return Array.from(new Set([base, base * 2, Math.max(base * 5, 50000), Math.max(base * 10, 100000)])).sort((left, right) => left - right);
}

function formatPaymentStatusLabel(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'awaiting-payment') return 'menunggu pembayaran';
  if (normalized === 'paid') return 'paid';
  if (normalized === 'refunded') return 'refund saldo';
  if (normalized === 'expire' || normalized === 'expired') return 'expired';
  if (normalized === 'cancel') return 'cancel';
  if (normalized === 'deny') return 'deny';
  if (normalized === 'failed') return 'failed';
  return status || '-';
}

function mapStatusTone(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized.includes('success') || normalized.includes('complete') || normalized.includes('completed')) {
    return 'success';
  }
  if (normalized.includes('process') || normalized.includes('pending') || normalized.includes('waiting')) {
    return 'pending';
  }
  if (normalized.includes('cancel') || normalized.includes('error') || normalized.includes('fail') || normalized.includes('partial') || normalized.includes('expired')) {
    return 'failed';
  }
  return 'pending';
}

function SocialNavGlyph({ type }: { type: SocialTab }) {
  if (type === 'sosmed') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4.75" y="5.5" width="14.5" height="13" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8.1 9.15h7.8M8.1 12h7.8M8.1 14.85h4.35" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === 'riwayat') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 7.4v4.45l2.6 1.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        <path d="M19.3 12a7.3 7.3 0 1 1-2.2-5.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        <path d="M19.35 5.65v2.85H16.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === 'status') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7.35" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9.45 12.2l1.7 1.72 3.55-3.95" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 8.1h14M7.3 5.7h9.4M6.4 10.85h11.2v7.2H6.4z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function StatusDetailGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.4 6.5h11.2v11H6.4z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 9.2h6M9 12h6M9 14.8h4.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function CopyGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="10" height="10" rx="2.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6.3 14.9H6a2 2 0 0 1-2-2V6.2a2 2 0 0 1 2-2h6.7a2 2 0 0 1 2 2v.3" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.2" y="6.2" width="15.6" height="11.6" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m6.5 9 5.5 4.1L17.5 9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function ModalCloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.2 7.2 16.8 16.8M16.8 7.2 7.2 16.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function SuccessCheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 12.3 10.5 15.3 16.8 8.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function StatusInfoGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <path d="M12 10.45v5.25M12 7.95h.01" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function AccountPopupGlyph({ type }: { type: AccountModalView }) {
  if (type === 'deposit') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M4 10h16M8 6h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (type === 'riwayat') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M20 5v3h-3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6.5 18a5.5 5.5 0 0 1 11 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function MenuBurgerGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function DrawerMenuGlyph({
  type,
}: {
  type:
    | 'dashboard'
    | 'profil'
    | 'order'
    | 'status'
    | 'deposit'
    | 'riwayat'
    | 'monitoring'
    | 'kontak'
    | 'mulai'
    | 'cara-deposit'
    | 'status-info'
    | 'target'
    | 'api-docs';
}) {
  if (type === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.8 5.1h6.5v6.5H4.8zm7.9 0h6.5v6.5h-6.5zm-7.9 7.9h6.5v6.5H4.8zm7.9 0h6.5v6.5h-6.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === 'profil') return <AccountPopupGlyph type="profil" />;
  if (type === 'deposit') return <AccountPopupGlyph type="deposit" />;
  if (type === 'riwayat') return <AccountPopupGlyph type="riwayat" />;
  if (type === 'order') return <SocialNavGlyph type="sosmed" />;
  if (type === 'status' || type === 'status-info') return <SocialNavGlyph type="status" />;
  if (type === 'monitoring') return <SocialNavGlyph type="riwayat" />;
  if (type === 'kontak') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.2 6.2h11.6v11.6H6.2z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="m7.9 9.1 4.1 3.2 4.1-3.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === 'mulai') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.1 5.8 18 12l-9.9 6.2z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === 'cara-deposit') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 8.2h15v9.1a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8V8.2Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
        <path d="M4.5 10.2h15M8.1 6.2h7.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === 'target') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 3.8v2.2M12 18v2.2M20.2 12H18M6 12H3.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 7.2h13M5.5 11.2h13M5.5 15.2h7.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      <path d="M15.2 15.4h3.3v3.2h-3.3z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function normalizeSocialTab(value: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'sosmed') return 'sosmed' satisfies SocialTab;
  if (normalized === 'riwayat') return 'riwayat' satisfies SocialTab;
  if (normalized === 'status') return 'status' satisfies SocialTab;
  return null;
}

function normalizeAccountModalTab(value: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'profil' || normalized === 'provider') return 'profil' satisfies AccountModalView;
  if (normalized === 'deposit') return 'deposit' satisfies AccountModalView;
  if (normalized === 'riwayat-deposit' || normalized === 'deposit-history') return 'riwayat' satisfies AccountModalView;
  return null;
}

export function SocialMediaBrowser({ profile, providerMeta, services, categories, minimumDeposit, requestedTab }: Props) {
  const [activeTab, setActiveTab] = useState<SocialTab>('sosmed');
  const quickDepositAmounts = useMemo(() => buildQuickDepositAmounts(minimumDeposit), [minimumDeposit]);
  const [accountProfile, setAccountProfile] = useState({
    registered: false,
    loggedIn: false,
    name: '',
    username: '',
    balance: 0,
  });
  const [accountModalView, setAccountModalView] = useState<AccountModalView | null>(null);
  const [helperModalView, setHelperModalView] = useState<HelperModalView | null>(null);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [accountRegisterDraft, setAccountRegisterDraft] = useState({
    name: '',
    username: '',
    password: '',
  });
  const [accountLoginDraft, setAccountLoginDraft] = useState({
    username: '',
    password: '',
  });
  const [profileEditDraft, setProfileEditDraft] = useState({
    username: '',
    password: '',
  });
  const [profileAccessMode, setProfileAccessMode] = useState<'register' | 'login'>('register');
  const [walletHistoryEntries, setWalletHistoryEntries] = useState<WalletHistoryEntry[]>([]);
  const [depositAmount, setDepositAmount] = useState(String(minimumDeposit));
  const [activeDepositQris, setActiveDepositQris] = useState<CoreDepositQrisState | null>(null);
  const [depositFeedback, setDepositFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: '',
  });
  const [profileFeedback, setProfileFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: '',
  });
  const [floatingNotice, setFloatingNotice] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedPlatformKey, setSelectedPlatformKey] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [orderForm, setOrderForm] = useState(createInitialOrderForm(services[0] || null));
  const [orderFeedback, setOrderFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: 'Pilih layanan social media langsung dari katalog live provider.',
  });
  const [activeCheckoutOrder, setActiveCheckoutOrder] = useState<SocialCheckoutState | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [accountOrderItems, setAccountOrderItems] = useState<HistoryItem[]>([]);
  const [detailStatusOrder, setDetailStatusOrder] = useState<HistoryItem | null>(null);
  const [detailProviderStatus, setDetailProviderStatus] = useState<ProviderStatusSnapshot | null>(null);
  const [monitoringFilterDraft, setMonitoringFilterDraft] = useState({
    limit: '25',
    status: 'Semua',
    category: 'Semua Kategori',
  });
  const [appliedMonitoringFilter, setAppliedMonitoringFilter] = useState({
    limit: 25,
    status: 'Semua',
    category: 'Semua Kategori',
  });
  const [statusFilterDraft, setStatusFilterDraft] = useState({
    limit: '10',
    status: 'Semua',
    year: String(new Date().getFullYear()),
    search: '',
  });
  const [activeFilterPicker, setActiveFilterPicker] = useState<FilterPickerKey | null>(null);
  const [filterPickerQueries, setFilterPickerQueries] = useState<Record<FilterPickerKey, string>>({
    'monitoring-limit': '',
    'monitoring-status': '',
    'monitoring-category': '',
    'status-limit': '',
    'status-status': '',
    'status-year': '',
  });
  const [appliedStatusFilter, setAppliedStatusFilter] = useState({
    limit: 10,
    status: 'Semua',
    year: String(new Date().getFullYear()),
    search: '',
  });
  const [isOrdering, startOrdering] = useTransition();
  const [isRefreshingHistory, startHistoryRefresh] = useTransition();
  const [isRefreshingAccountOrders, startAccountOrdersRefresh] = useTransition();
  const [isRefreshingCheckoutStatus, startCheckoutStatusRefresh] = useTransition();
  const [isSubmittingProfile, startProfileSubmit] = useTransition();
  const [isSubmittingDeposit, startDepositSubmit] = useTransition();
  const [isCheckingDepositStatus, setIsCheckingDepositStatus] = useState(false);
  const sortedHistoryItems = useMemo(
    () =>
      [...historyItems].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [historyItems],
  );
  const sortedAccountOrderItems = useMemo(
    () =>
      [...accountOrderItems].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [accountOrderItems],
  );

  const monitoringLimitOptions = useMemo<ManualPickerOption[]>(
    () => ['10', '25', '50', '100'].map((limit) => ({ value: limit, label: limit })),
    [],
  );
  const monitoringStatusOptions = useMemo(
    () =>
      buildStatusFilterOptions(
        ['Semua', 'Pending', 'Processing', 'Success', 'Partial', 'Error', 'Expired'],
        sortedHistoryItems.map((item) => String(item.orderStatus || '').trim()).filter(Boolean),
      ),
    [sortedHistoryItems],
  );
  const statusOrderStatusOptions = useMemo(
    () =>
      buildStatusFilterOptions(
        ['Semua', 'Awaiting-payment', 'Pending', 'Processing', 'Success', 'Partial', 'Error', 'Expired'],
        sortedAccountOrderItems.map((item) => String(item.orderStatus || '').trim()).filter(Boolean),
      ),
    [sortedAccountOrderItems],
  );

  const availableMonitoringCategories = useMemo(() => {
    const values = Array.from(new Set(sortedHistoryItems.map((item) => String(item.category || '').trim()).filter(Boolean))).sort((left, right) =>
      left.localeCompare(right, 'id'),
    );
    return ['Semua Kategori', ...values];
  }, [sortedHistoryItems]);
  const monitoringCategoryOptions = useMemo(
    () => availableMonitoringCategories.map((category) => ({ value: category, label: category })),
    [availableMonitoringCategories],
  );

  const availableStatusYears = useMemo(() => {
    const years = Array.from(
      new Set(sortedAccountOrderItems.map((item) => new Date(item.createdAt).getFullYear()).filter(Boolean)),
    ).sort((left, right) => right - left);
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) {
      years.unshift(currentYear);
    }
    return years.map(String);
  }, [sortedAccountOrderItems]);
  const statusLimitOptions = useMemo<ManualPickerOption[]>(
    () => ['10', '25', '50', '100'].map((limit) => ({ value: limit, label: limit })),
    [],
  );
  const statusYearOptions = useMemo(
    () => availableStatusYears.map((year) => ({ value: year, label: year })),
    [availableStatusYears],
  );

  const applyCoreBundle = (bundle: CoreBundlePayload) => {
    const account = bundle.account || {};
    const username = String(account.username || account.contact || '');
    setAccountProfile({
      registered: account.registered === true,
      loggedIn: account.loggedIn === true,
      name: String(account.name || ''),
      username,
      balance: Math.max(0, Number(account.balance || 0)),
    });
    setAccountLoginDraft({
      username,
      password: '',
    });
    setProfileEditDraft({
      username,
      password: '',
    });
    setWalletHistoryEntries(Array.isArray(bundle.history) ? bundle.history : []);
  };

  const syncAccountBundle = async (username: string) => {
    const normalizedUsername = String(username || '').trim();
    if (!normalizedUsername) return false;
    const response = await fetch(`/api/core/account?username=${encodeURIComponent(normalizedUsername)}`, {
      method: 'GET',
      cache: 'no-store',
    });
    const result = (await response.json()) as CoreBundleResult;
    if (!response.ok || !result.status || !result.data || !('account' in result.data)) {
      throw new Error(
        result.data && 'msg' in result.data && result.data.msg ? String(result.data.msg) : 'Gagal memuat data akun.',
      );
    }

    applyCoreBundle(result.data);
    return true;
  };

  useEffect(() => {
    const previousPaddingBottom = document.body.style.paddingBottom;
    const previousOverflowX = document.body.style.overflowX;
    document.body.style.paddingBottom = '0';
    document.body.style.overflowX = 'hidden';

    return () => {
      document.body.style.paddingBottom = previousPaddingBottom;
      document.body.style.overflowX = previousOverflowX;
    };
  }, []);

  useEffect(() => {
    if (!accountModalView && !helperModalView && !isSideMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [accountModalView, helperModalView, isSideMenuOpen]);

  useEffect(() => {
    setActiveFilterPicker(null);
  }, [activeTab, accountModalView, helperModalView, isSideMenuOpen]);

  useEffect(() => {
    if (accountProfile.loggedIn) {
      return;
    }
    setProfileAccessMode(accountProfile.registered ? 'login' : 'register');
  }, [accountProfile.loggedIn, accountProfile.registered]);

  useEffect(() => {
    if (!profileFeedback.text || profileFeedback.tone === 'idle') {
      return;
    }
    setFloatingNotice({
      tone: profileFeedback.tone === 'success' ? 'success' : 'error',
      text: profileFeedback.text,
    });
  }, [profileFeedback]);

  useEffect(() => {
    if (!depositFeedback.text || depositFeedback.tone === 'idle') {
      return;
    }
    setFloatingNotice({
      tone: depositFeedback.tone === 'success' ? 'success' : 'error',
      text: depositFeedback.text,
    });
  }, [depositFeedback]);

  useEffect(() => {
    if (!floatingNotice?.text) {
      return;
    }
    const timerId = window.setTimeout(() => {
      setFloatingNotice(null);
    }, 2600);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [floatingNotice]);

  const refreshHistory = () => {
    startHistoryRefresh(async () => {
      try {
        const response = await fetch('/api/smm/history?limit=150', {
          method: 'GET',
          cache: 'no-store',
        });
        const result = (await response.json()) as {
          status?: boolean;
          data?: {
            items?: HistoryItem[];
            msg?: string;
          };
        };
        if (!response.ok || !result.status || !result.data?.items) {
          return;
        }
        setHistoryItems(result.data.items);
      } catch {
        // keep current history view
      }
    });
  };

  const refreshAccountOrders = (usernameOverride?: string) => {
    const normalizedUsername = String(usernameOverride || accountProfile.username || '').trim();
    if (!normalizedUsername) {
      setAccountOrderItems([]);
      setDetailStatusOrder(null);
      setDetailProviderStatus(null);
      return;
    }

    startAccountOrdersRefresh(async () => {
      try {
        const response = await fetch(`/api/smm/history?limit=150&contact=${encodeURIComponent(normalizedUsername)}`, {
          method: 'GET',
          cache: 'no-store',
        });
        const result = (await response.json()) as {
          status?: boolean;
          data?: {
            items?: HistoryItem[];
            msg?: string;
          };
        };
        if (!response.ok || !result.status || !result.data?.items) {
          return;
        }
        setAccountOrderItems(result.data.items);
      } catch {
        // keep current account history view
      }
    });
  };

  const toggleFilterPicker = (key: FilterPickerKey) => {
    setActiveFilterPicker((current) => (current === key ? null : key));
  };

  const updateFilterPickerQuery = (key: FilterPickerKey, value: string) => {
    setFilterPickerQueries((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const copyToClipboard = async (value: string, successText: string) => {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) {
      setFloatingNotice({
        tone: 'error',
        text: 'Data yang ingin disalin belum tersedia.',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(normalizedValue);
      setFloatingNotice({
        tone: 'success',
        text: successText,
      });
    } catch {
      setFloatingNotice({
        tone: 'error',
        text: 'Data belum bisa disalin dari perangkat ini.',
      });
    }
  };

  const handleCheckoutStatusPayload = async (payload: SocialCheckoutState) => {
    setActiveCheckoutOrder(payload);
    if (payload.fallbackNotice) {
      setOrderFeedback({ tone: 'success', text: payload.fallbackNotice });
    }

    if (payload.paymentStatus === 'paid') {
      setOrderFeedback({
        tone: 'success',
        text: payload.nextStep,
      });
      refreshHistory();
      if (accountProfile.username) {
        refreshAccountOrders(accountProfile.username);
        try {
          await syncAccountBundle(accountProfile.username);
        } catch {
          // keep current account banner if refresh fails
        }
      }
      return;
    }

    if (payload.paymentStatus === 'refunded') {
      setOrderFeedback({
        tone: 'success',
        text: payload.nextStep,
      });
      refreshHistory();
      if (accountProfile.username) {
        refreshAccountOrders(accountProfile.username);
        try {
          await syncAccountBundle(accountProfile.username);
        } catch {
          // keep current account banner if refresh fails
        }
      }
      return;
    }

    if (payload.paymentStatus === 'expire' || payload.paymentStatus === 'cancel' || payload.paymentStatus === 'deny' || payload.paymentStatus === 'failed') {
      setOrderFeedback({
        tone: 'error',
        text: payload.nextStep,
      });
      if (accountProfile.username) {
        refreshAccountOrders(accountProfile.username);
      }
    }
  };

  const refreshCheckoutStatus = () => {
    if (!activeCheckoutOrder?.orderCode) {
      return;
    }

    startCheckoutStatusRefresh(async () => {
      try {
        const response = await fetch(`/api/smm/order-status?orderCode=${encodeURIComponent(activeCheckoutOrder.orderCode)}`, {
          method: 'GET',
          cache: 'no-store',
        });
        const result = (await response.json()) as {
          status?: boolean;
          data?: SocialCheckoutState | {
            msg?: string;
          };
        };
        if (!response.ok || !result.status || !result.data || !('orderCode' in result.data)) {
          setOrderFeedback({
            tone: 'error',
            text: result.data && 'msg' in result.data && result.data.msg ? String(result.data.msg) : 'Status pembayaran belum bisa dimuat.',
          });
          return;
        }

        await handleCheckoutStatusPayload(result.data);
      } catch (error) {
        setOrderFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Status pembayaran belum bisa diperbarui.',
        });
      }
    });
  };

  const applyMonitoringFilter = () => {
    setActiveFilterPicker(null);
    setAppliedMonitoringFilter({
      limit: Math.max(1, Number(monitoringFilterDraft.limit || 25)),
      status: monitoringFilterDraft.status,
      category: monitoringFilterDraft.category,
    });
  };

  const applyStatusFilter = () => {
    setActiveFilterPicker(null);
    setAppliedStatusFilter({
      limit: Math.max(1, Number(statusFilterDraft.limit || 10)),
      status: statusFilterDraft.status,
      year: statusFilterDraft.year,
      search: statusFilterDraft.search.trim().toLowerCase(),
    });
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    const hydrateSession = async () => {
      try {
        const savedUsername = window.localStorage.getItem(WEBSITE_ACCOUNT_SESSION_KEY);
        if (savedUsername) {
          await syncAccountBundle(savedUsername);
        }
      } catch {
        // ignore session hydration issues
      }
    };

    void hydrateSession();
  }, []);

  useEffect(() => {
    const nextModal = normalizeAccountModalTab(requestedTab || null);
    if (nextModal) {
      setAccountModalView(nextModal);
      return;
    }

    const nextTab = normalizeSocialTab(requestedTab || null);
    if (nextTab && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, requestedTab]);

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!hash) {
      return;
    }

    const timerId = window.setTimeout(() => {
      const target = window.document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [activeTab, requestedTab]);

  useEffect(() => {
    if (accountProfile.loggedIn && accountProfile.username) {
      refreshAccountOrders(accountProfile.username);
      return;
    }
    setAccountOrderItems([]);
    setDetailStatusOrder(null);
    setDetailProviderStatus(null);
  }, [accountProfile.loggedIn, accountProfile.username]);

  useEffect(() => {
    if (activeTab !== 'status' || !accountProfile.loggedIn || !accountProfile.username) {
      return;
    }

    refreshAccountOrders(accountProfile.username);
    const intervalId = window.setInterval(() => {
      refreshAccountOrders(accountProfile.username);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeTab, accountProfile.loggedIn, accountProfile.username]);

  useEffect(() => {
    if (activeTab !== 'riwayat') {
      return;
    }

    refreshHistory();
    const intervalId = window.setInterval(() => {
      refreshHistory();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeTab]);

  useEffect(() => {
    if (!detailStatusOrder) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDetailStatusOrder(null);
        setDetailProviderStatus(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [detailStatusOrder]);

  useEffect(() => {
    if (!activeCheckoutOrder || activeCheckoutOrder.paymentMethod !== 'midtrans') {
      return;
    }
    if (
      activeCheckoutOrder.paymentStatus === 'paid' ||
      activeCheckoutOrder.paymentStatus === 'refunded' ||
      activeCheckoutOrder.paymentStatus === 'expire' ||
      activeCheckoutOrder.paymentStatus === 'cancel' ||
      activeCheckoutOrder.paymentStatus === 'deny' ||
      activeCheckoutOrder.paymentStatus === 'failed'
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      refreshCheckoutStatus();
    }, 12000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeCheckoutOrder?.orderCode, activeCheckoutOrder?.paymentMethod, activeCheckoutOrder?.paymentStatus]);

  useEffect(() => {
    if (!activeDepositQris || activeDepositQris.paymentStatus !== 'awaiting-payment') {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshDepositStatus(false);
    }, 12000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeDepositQris]);

  const openStatusDetail = async (item: HistoryItem) => {
    setDetailStatusOrder(item);
    setDetailProviderStatus({
      status: item.orderStatus || '-',
      startCount: null,
      remains: null,
    });

    const providerOrderId = String(item.providerOrderId || '').trim();
    if (!providerOrderId) {
      return;
    }

    try {
      const response = await fetch('/api/smm/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: providerOrderId }),
      });
      const result = (await response.json()) as {
        status?: boolean;
        data?: {
          status?: string;
          start_count?: number;
          remains?: number;
          msg?: string;
        };
      };

      if (!response.ok || !result.status || !result.data?.status) {
        return;
      }

      setDetailProviderStatus({
        status: String(result.data.status || item.orderStatus || '-'),
        startCount: Number.isFinite(Number(result.data.start_count)) ? Number(result.data.start_count) : null,
        remains: Number.isFinite(Number(result.data.remains)) ? Number(result.data.remains) : null,
      });
    } catch {
      // keep local detail readable even if provider status fetch fails
    }
  };

  const registerAccount = () => {
    startProfileSubmit(async () => {
      const name = accountRegisterDraft.name.trim();
      const username = accountRegisterDraft.username.trim().toLowerCase();
      const password = accountRegisterDraft.password.trim();
      if (!name || !username || !password) {
        setProfileFeedback({
          tone: 'error',
          text: 'Isi nama, username, dan password dulu untuk membuat akun.',
        });
        return;
      }

      try {
        const response = await fetch('/api/core/account/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, username, password }),
        });
        const result = (await response.json()) as CoreBundleResult;
        if (!response.ok || !result.status || !result.data || !('account' in result.data)) {
          setProfileFeedback({
            tone: 'error',
            text: result.data && 'msg' in result.data ? String(result.data.msg || 'Gagal membuat akun.') : 'Gagal membuat akun.',
          });
          return;
        }

        applyCoreBundle(result.data);
        setAccountRegisterDraft({ name: '', username: '', password: '' });
        window.localStorage.setItem(WEBSITE_ACCOUNT_SESSION_KEY, username);
        setProfileFeedback({
          tone: 'success',
          text: 'Akun berhasil dibuat dan langsung aktif.',
        });
      } catch (error) {
        setProfileFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Gagal membuat akun.',
        });
      }
    });
  };

  const loginAccount = () => {
    startProfileSubmit(async () => {
      const username = accountLoginDraft.username.trim().toLowerCase();
      const password = accountLoginDraft.password.trim();
      if (!username || !password) {
        setProfileFeedback({
          tone: 'error',
          text: 'Isi username dan password untuk masuk.',
        });
        return;
      }

      try {
        const response = await fetch('/api/core/account/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });
        const result = (await response.json()) as CoreBundleResult;
        if (!response.ok || !result.status || !result.data || !('account' in result.data)) {
          setProfileFeedback({
            tone: 'error',
            text: result.data && 'msg' in result.data ? String(result.data.msg || 'Login gagal.') : 'Login gagal.',
          });
          return;
        }

        applyCoreBundle(result.data);
        window.localStorage.setItem(WEBSITE_ACCOUNT_SESSION_KEY, username);
        setProfileFeedback({
          tone: 'success',
          text: 'Login berhasil. Saldo akun sekarang bisa dipakai di mode sosial media.',
        });
      } catch (error) {
        setProfileFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Login gagal.',
        });
      }
    });
  };

  const updateProfile = () => {
    startProfileSubmit(async () => {
      if (!accountProfile.loggedIn || !accountProfile.username) {
        setProfileFeedback({
          tone: 'error',
          text: 'Login akun dulu sebelum mengubah profil.',
        });
        return;
      }

      const nextUsername = profileEditDraft.username.trim().toLowerCase();
      const nextPassword = profileEditDraft.password.trim();
      if (!nextUsername && !nextPassword) {
        setProfileFeedback({
          tone: 'error',
          text: 'Isi username baru atau password baru dulu.',
        });
        return;
      }

      try {
        const response = await fetch('/api/core/account/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentUsername: accountProfile.username,
            newUsername: nextUsername,
            newPassword: nextPassword,
          }),
        });
        const result = (await response.json()) as CoreBundleResult;
        if (!response.ok || !result.status || !result.data || !('account' in result.data)) {
          setProfileFeedback({
            tone: 'error',
            text: result.data && 'msg' in result.data ? String(result.data.msg || 'Profil belum bisa diperbarui.') : 'Profil belum bisa diperbarui.',
          });
          return;
        }

        applyCoreBundle(result.data);
        const savedUsername =
          result.data.account?.username ||
          result.data.account?.contact ||
          nextUsername ||
          accountProfile.username;
        window.localStorage.setItem(WEBSITE_ACCOUNT_SESSION_KEY, String(savedUsername).trim().toLowerCase());
        setProfileFeedback({
          tone: 'success',
          text: 'Profil akun berhasil diperbarui.',
        });
      } catch (error) {
        setProfileFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Profil belum bisa diperbarui.',
        });
      }
    });
  };

  const submitDepositFlow = () => {
    startDepositSubmit(async () => {
      if (depositLocked) {
        setDepositFeedback({
          tone: 'error',
          text: 'Deposit terkunci. Login akun dulu dari popup Profil.',
        });
        return;
      }

      if (normalizedDepositAmount <= 0) {
        setDepositFeedback({
          tone: 'error',
          text: 'Masukkan jumlah deposit dulu.',
        });
        return;
      }
      if (normalizedDepositAmount < minimumDeposit) {
        setDepositFeedback({
          tone: 'error',
          text: `Deposit minimal Rp ${formatRupiah(minimumDeposit)}.`,
        });
        return;
      }

      try {
        const response = await fetch('/api/core/deposit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountContact: accountProfile.username,
            amount: normalizedDepositAmount,
          }),
        });
        const result = (await response.json()) as CoreDepositResult;
        if (!response.ok || !result.status || !result.data?.bundle) {
          setDepositFeedback({
            tone: 'error',
            text:
              result.data && 'msg' in result.data
                ? String(result.data.msg || 'Deposit belum berhasil diproses.')
                : 'Deposit belum berhasil diproses.',
          });
          return;
        }

        applyCoreBundle(result.data.bundle);
        setActiveDepositQris(result.data.depositState || null);
        setDepositFeedback({ tone: 'idle', text: '' });
      } catch (error) {
        setDepositFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Deposit belum berhasil diproses.',
        });
      }
    });
  };

  const refreshDepositStatus = async (manual = false) => {
    if (!activeDepositQris?.reference) {
      return;
    }

    if (manual) {
      setIsCheckingDepositStatus(true);
    }

    try {
      const response = await fetch(`/api/core/deposit/status?reference=${encodeURIComponent(activeDepositQris.reference)}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const result = (await response.json()) as {
        status?: boolean;
        data?: {
          bundle?: CoreBundlePayload;
          depositState?: CoreDepositQrisState;
          msg?: string;
        };
      };

      if (!response.ok || !result.status || !result.data?.depositState) {
        if (manual) {
          setFloatingNotice({
            tone: 'error',
            text:
              result.data && 'msg' in result.data && result.data.msg
                ? String(result.data.msg)
                : 'Status deposit belum bisa dimuat.',
          });
        }
        return;
      }

      if (result.data.bundle) {
        applyCoreBundle(result.data.bundle);
      }

      const nextState = result.data.depositState;
      if (nextState.paymentStatus === 'paid') {
        setActiveDepositQris(null);
        setDepositAmount(String(minimumDeposit));
        setDepositFeedback({
          tone: 'success',
          text: `Deposit Rp ${nextState.amountLabel} berhasil dan saldo akun sudah bertambah.`,
        });
        return;
      }

      if (nextState.paymentStatus === 'expire' || nextState.paymentStatus === 'cancel' || nextState.paymentStatus === 'deny' || nextState.paymentStatus === 'failed') {
        setActiveDepositQris(null);
        setDepositFeedback({
          tone: 'error',
          text: nextState.nextStep,
        });
        return;
      }

      setActiveDepositQris(nextState);
    } catch (error) {
      if (manual) {
        setFloatingNotice({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Status deposit belum bisa diperbarui.',
        });
      }
    } finally {
      if (manual) {
        setIsCheckingDepositStatus(false);
      }
    }
  };

  const logoutAccount = () => {
    window.localStorage.removeItem(WEBSITE_ACCOUNT_SESSION_KEY);
    setAccountProfile((current) => ({
      ...current,
      loggedIn: false,
      username: '',
      balance: 0,
    }));
    setAccountOrderItems([]);
    setWalletHistoryEntries([]);
    setAccountLoginDraft({
      username: '',
      password: '',
    });
    setProfileEditDraft({
      username: '',
      password: '',
    });
    setProfileFeedback({
      tone: 'success',
      text: 'Kamu sudah logout dari akun ini.',
    });
  };

  const openDrawerTab = (tab: SocialTab, selector?: string) => {
    setIsSideMenuOpen(false);
    setHelperModalView(null);
    setAccountModalView(null);
    setActiveTab(tab);
    if (!selector || typeof window === 'undefined') {
      return;
    }
    window.setTimeout(() => {
      const target = window.document.querySelector(selector);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 180);
  };

  const openDrawerModal = (view: AccountModalView) => {
    setIsSideMenuOpen(false);
    setHelperModalView(null);
    setAccountModalView(view);
  };

  const openHelperModal = (view: HelperModalView) => {
    setIsSideMenuOpen(false);
    setAccountModalView(null);
    setHelperModalView(view);
  };

  const helperModalTitle = (() => {
    if (helperModalView === 'kontak') return 'Kontak';
    if (helperModalView === 'mulai') return 'Mulai Transaksi';
    if (helperModalView === 'cara-deposit') return 'Cara Deposit';
    if (helperModalView === 'status-info') return 'Informasi Status Order';
    if (helperModalView === 'target') return 'Informasi Target Pesanan';
    if (helperModalView === 'api-docs') return 'Dokumentasi API';
    return '';
  })();
  const contactEntries = [
    {
      key: 'instagram',
      label: 'Instagram',
      value: '@aca_app_premium',
      copyValue: 'aca_app_premium',
      href: 'https://instagram.com/aca_app_premium',
      icon: 'instagram',
    },
    {
      key: 'telegram',
      label: 'Telegram',
      value: '082322633452',
      copyValue: '082322633452',
      href: '',
      icon: 'telegram',
    },
    {
      key: 'email-utama',
      label: 'Email Utama',
      value: 'senjaabadi365@gmail.com',
      copyValue: 'senjaabadi365@gmail.com',
      href: 'mailto:senjaabadi365@gmail.com',
      icon: 'email',
    },
    {
      key: 'email-backup',
      label: 'Email Backup',
      value: 'lincici684@gmail.com',
      copyValue: 'lincici684@gmail.com',
      href: 'mailto:lincici684@gmail.com',
      icon: 'email',
    },
    {
      key: 'whatsapp-1',
      label: 'WhatsApp 1',
      value: '088242049163',
      copyValue: '088242049163',
      href: 'https://wa.me/6288242049163',
      icon: 'whatsapp',
    },
    {
      key: 'whatsapp-2',
      label: 'WhatsApp 2',
      value: '082322633452',
      copyValue: '082322633452',
      href: 'https://wa.me/6282322633452',
      icon: 'whatsapp',
    },
    {
      key: 'whatsapp-group',
      label: 'Grup WhatsApp Store',
      value: 'Gabung grup store',
      copyValue: 'https://chat.whatsapp.com/Gpl3XMxuiVTGHbyEkaEoz6?mode=ems_copy_t',
      href: 'https://chat.whatsapp.com/Gpl3XMxuiVTGHbyEkaEoz6?mode=ems_copy_t',
      icon: 'whatsapp',
    },
  ] as const;
  const statusGuideItems: StatusGuideItem[] = [
    {
      label: 'SUCCESS',
      tone: 'success',
      description:
        'Pesanan selesai diproses. Jika pesanan tidak sesuai dengan jumlah order, segera infokan kepada admin untuk dilakukan pengecekan atau penyesuaian.',
    },
    {
      label: 'PROCESSING',
      tone: 'processing',
      description:
        'Pesanan sedang diproses. Lama proses tergantung pada masing-masing layanan, ini dijelaskan di nama layanan atau deskripsi yang dipilih saat melakukan order. Jika tidak ditampilkan, kemungkinan pengerjaan akan lebih lama dari layanan yang terdapat di bawahnya.',
    },
    {
      label: 'PENDING',
      tone: 'pending',
      description:
        'Pesanan dalam antrian untuk diproses. Orderan Anda telah berhasil, tetapi belum diproses. Status pending juga bisa terjadi ketika layanan yang dipilih sedang maintenance atau pesanan nyangkut di server.',
    },
    {
      label: 'PARTIAL',
      tone: 'partial',
      description:
        'Pesanan hanya masuk sebagian dari jumlah yang diorder. Anda hanya membayar yang masuk saja, dan sebagian dana akan kami kembalikan. Pada kasus tertentu status partial tetapi saldo yang dikembalikan penuh sesuai dengan jumlah orderan, jika remains sama dengan jumlah orderan.',
    },
    {
      label: 'ERROR',
      tone: 'error',
      description:
        'Terjadi kesalahan sistem atau kesalahan memasukkan target pesanan, atau orderan terlalu padat pada suatu layanan sehingga harus kami batalkan untuk menghindari proses yang memakan waktu lama. Jika error, saldo otomatis kembali penuh ke akun Anda.',
    },
  ];
  const targetGuideSections: TargetGuideSection[] = [
    {
      title: 'Facebook',
      items: [
        'Page Likes, Page Followers, Profil Followers, Friends : Link halaman atau profil Facebook // Contoh : https://www.facebook.com/putrigmoyystore/',
        'Post Likes, Post Comments, Post Video, Emoticon Likes : Link postingan Facebook // Contoh : https://www.facebook.com/putrigmoyystore/posts/722289351896143 (diawali dengan m.facebook.com jika link dari mobile)',
        'Video Views, Live Streaming : Link video Facebook // Contoh : https://www.facebook.com/putrigmoyystore/videos/722289351896143 (link terdapat di tanggal postingan, di bawah nama akun. Didapat dengan klik kanan tanggal postingan & copy link address, diawali dengan m.facebook.com jika link dari mobile)',
        'Group Members : Link grup Facebook // Contoh : https://www.facebook.com/groups/putrigmoyystore',
      ],
    },
    {
      title: 'Instagram',
      items: [
        'Followers, Story Views, Live Video, Profil Visits : Username akun Instagram tanpa tanda @ // Contoh : putrigmoyy',
        'Likes, Video Views, Comments, Impressions, Saves, IGTV : Link postingan akun Instagram // Contoh : https://www.instagram.com/p/putrigmoyy-promo-1/',
      ],
    },
    {
      title: 'Likee App',
      items: [
        'Followers : Link akun Likee // Contoh : https://likee.com/@putrigmoyy atau https://likee.video/@putrigmoyy',
        'Post Likes : Link video Likee // Contoh : https://likee.com/@putrigmoyy/video/123456789 atau https://likee.video/@putrigmoyy/video/123456789',
      ],
    },
    {
      title: 'LinkedIn',
      items: [
        'Followers : Link akun LinkedIn // Contoh : https://www.linkedin.com/in/putrigmoyy/',
        'Likes, Comments : Link postingan LinkedIn // Contoh : https://www.linkedin.com/posts/putrigmoyy_social-campaign-update-1234567890',
      ],
    },
    {
      title: 'Pinterest',
      items: [
        'Account Followers : Link akun Pinterest // Contoh : https://id.pinterest.com/putrigmoyystore/',
        'Board Follower : Link board Pinterest // Contoh : https://id.pinterest.com/putrigmoyystore/board-promo-store/',
        'Likes : Link postingan Pinterest // Contoh : https://id.pinterest.com/pin/754493743820940621/',
      ],
    },
    {
      title: 'SoundCloud',
      items: [
        'Followers : Link akun SoundCloud // Contoh : https://soundcloud.com/putrigmoyy',
        'Plays, Likes : Link konten/lagu/musik/sounds // Contoh : https://soundcloud.com/putrigmoyy/promo-store-track',
      ],
    },
    {
      title: 'Spotify',
      items: [
        'Follower : Link akun Spotify // Contoh : https://open.spotify.com/artist/3zkqzEu0nHPDeP93vvY49U',
        'Plays : Link konten/lagu/musik/sounds // Contoh : https://open.spotify.com/track/4Iv41kISupmIA1USRpqc8D',
        'Albums, Playlist : Link albums atau playlist // Contoh : https://open.spotify.com/album/4qYIQgEeEeFQ1rl9IYNVoj atau https://open.spotify.com/playlist/5Cv0perCVIUk3iboUtHs7x',
      ],
    },
    {
      title: 'Telegram',
      items: [
        'Channel Member : Link channel Telegram // Contoh : https://t.me/putrigmoyystore',
        'Post Views : Link channel Telegram tempat postingan // Contoh : https://t.me/c/putrigmoyystore (berdasarkan last post postingan Anda di channel tersebut)',
      ],
    },
    {
      title: 'TikTok',
      items: [
        'Follower : Link profil TikTok // Contoh : https://www.tiktok.com/@putrigmoyystore',
        'Views, Likes, Comments, Shares : Link video TikTok // Contoh : https://www.tiktok.com/@putrigmoyystore/video/6913480030462954754 atau copy link via App TikTok',
      ],
    },
    {
      title: 'Twitch',
      items: [
        'Follower : Link profil Twitch // Contoh : https://www.twitch.tv/putrigmoyystore',
      ],
    },
    {
      title: 'Twitter',
      items: [
        'Follower, Profil Click : Link profil atau username Twitter tanpa tanda @ // Contoh : https://twitter.com/putrigmoyystore atau putrigmoyystore',
        'Retweet, Comments, Shares, Likes, Favorites, Hashtag Clicks : Link postingan Twitter // Contoh : https://twitter.com/putrigmoyystore/status/1351742017726889984',
        'Views, Video Views, Impression, Live : Link video Twitter // Contoh : https://twitter.com/putrigmoyystore/status/1360547605290229774 atau https://twitter.com/i/status/1360547605290229774',
        'Poll Votes : Link dengan button number // Contoh : www.contoh.com?vote=ButtonNumber',
      ],
    },
    {
      title: 'Website',
      items: [
        'Web Traffic : Link home page situs web atau link artikel // Contoh : https://putrigmoyystore.com/ atau https://putrigmoyystore.com/halaman/produk-dan-layanan',
      ],
    },
    {
      title: 'Youtube',
      items: [
        'Subscribers : Link channel YouTube // Contoh : https://www.youtube.com/channel/UCZVJmTK9ynqFf4slQb_4vA atau https://www.youtube.com/c/putrigmoyystore',
        'Watchtimes (Jam Tayang), Viewers atau Video Views, Live Streaming, Premier atau Tayang Perdana, Likes, Dislikes, Shares, Comments : Link video YouTube // Contoh : https://www.youtube.com/watch?v=4cz0cKqgLxE atau https://youtu.be/4cz0cKqgLxE',
      ],
    },
    {
      title: 'Tokopedia',
      items: [
        'Tokopedia Followers : Username akun Tokopedia atau link toko // Contoh : putrigmoyystore atau https://www.tokopedia.com/putrigmoyystore',
        'Tokopedia Wishlist atau Favorite : Link produk Tokopedia // Contoh : https://www.tokopedia.com/putrigmoyystore/barang-premium',
      ],
    },
    {
      title: 'Shopee',
      items: [
        'Followers : Username akun Shopee atau link toko // Contoh : putrigmoyystore atau https://shopee.co.id/putrigmoyystore',
        'Product Likes : Link produk Shopee // Contoh : https://shopee.co.id/M231-Kemeja-Pria-Batik-Navy.197800',
        'Product Soldout atau Terjual : Username, password, dan link product akun Shopee // Contoh : putrigmoyystore|senjasuci1719|https://shopee.co.id/M231-Kemeja-Pria-Batik-Navy.197800',
        'Feed Likes, Feed Comments : Link feed postingan Shopee // Contoh : https://feeds.shopee.co.id/share/AAg95N2FBABgpfkFAAAAAA==',
      ],
    },
    {
      title: 'Bukalapak',
      items: [
        'Followers : Username akun Bukalapak atau link toko // Contoh : putrigmoyystore atau https://www.bukalapak.com/u/putrigmoyystore',
        'Product Likes, Product Soldout atau Terjual : Link produk Bukalapak // Contoh : https://www.bukalapak.com/p/elektronik/gadget/produk-putrigmoyystore',
      ],
    },
    {
      title: 'SEO (Search Engine Optimization)',
      items: [
        'Youtube Social Shares : Link video YouTube // Contoh : https://www.youtube.com/watch?v=4cz0cKqgLxE atau https://youtu.be/4cz0cKqgLxE',
      ],
    },
    {
      title: 'Jasa Programming',
      items: [
        'Jasa Pembuatan Website Panel SMM, Desktop : Nomor WhatsApp // Contoh : 082322633452',
      ],
    },
  ];

  const platformGroups = useMemo<PlatformGroup[]>(() => {
    const buckets = new Map<string, PlatformGroup>();
    for (const service of services) {
      const visual = detectPlatformVisual(service);
      const key = visual.label.toLowerCase();
      const existing = buckets.get(key);
      if (existing) {
        existing.services.push(service);
        if (!existing.categories.includes(service.category)) {
          existing.categories.push(service.category);
        }
      } else {
        buckets.set(key, {
          key,
          ...visual,
          services: [service],
          categories: [service.category],
        });
      }
    }

    return Array.from(buckets.values())
      .map((group) => ({
        ...group,
        categories: group.categories.sort((left, right) => left.localeCompare(right, 'id')),
        services: group.services.sort((left, right) => {
          const priceDelta = Number(left.price || 0) - Number(right.price || 0);
          if (priceDelta !== 0) return priceDelta;
          const nameDelta = left.name.localeCompare(right.name, 'id');
          if (nameDelta !== 0) return nameDelta;
          return left.id.localeCompare(right.id, 'id');
        }),
      }))
      .sort((left, right) => left.label.localeCompare(right.label, 'id'));
  }, [services]);

  useEffect(() => {
    if (!platformGroups.length) {
      setSelectedPlatformKey('');
      return;
    }
    setSelectedPlatformKey((current) => (platformGroups.some((group) => group.key === current) ? current : platformGroups[0].key));
  }, [platformGroups]);

  const activePlatform = platformGroups.find((group) => group.key === selectedPlatformKey) || platformGroups[0] || null;
  useEffect(() => {
    if (!activePlatform) {
      setSelectedCategory('');
      return;
    }
    setSelectedCategory((current) => (current && activePlatform.categories.includes(current) ? current : ''));
  }, [activePlatform]);

  useEffect(() => {
    setCategoryQuery('');
    setServiceQuery('');
    setCategoryPickerOpen(false);
    setServicePickerOpen(false);
  }, [selectedPlatformKey]);

  useEffect(() => {
    setServiceQuery('');
    setServicePickerOpen(false);
  }, [selectedCategory]);

  const filteredCategories = useMemo(() => {
    if (!activePlatform) return [];
    const query = categoryQuery.trim().toLowerCase();
    return activePlatform.categories.filter((category) => !query || category.toLowerCase().includes(query));
  }, [activePlatform, categoryQuery]);

  const platformServices = useMemo(() => {
    if (!activePlatform) return [];
    if (!selectedCategory) return [];
    return activePlatform.services
      .filter((service) => {
      const matchesCategory = service.category === selectedCategory;
      return matchesCategory;
      })
      .sort((left, right) => {
        const priceDelta = Number(left.price || 0) - Number(right.price || 0);
        if (priceDelta !== 0) return priceDelta;
        const nameDelta = left.name.localeCompare(right.name, 'id');
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id, 'id');
      });
  }, [activePlatform, selectedCategory]);

  const filteredServices = useMemo(() => {
    const queryTokens = serviceQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    return platformServices.filter((service) => {
      if (!queryTokens.length) return true;

      const richHaystack = [
        service.id,
        service.name,
        service.category,
        service.note,
        service.menuType,
        service.logoType,
        String(service.price),
        service.priceLabel,
        `rp ${service.priceLabel}`,
        `rp${service.priceLabel}`,
      ]
        .join(' ')
        .toLowerCase();
      const compactHaystack = richHaystack.replace(/[^a-z0-9]+/g, '');

      return queryTokens.every((token) => {
        const compactToken = token.replace(/[^a-z0-9]+/g, '');
        return richHaystack.includes(token) || (!!compactToken && compactHaystack.includes(compactToken));
      });
    });
  }, [platformServices, serviceQuery]);

  useEffect(() => {
    const nextService = platformServices.find((service) => service.id === selectedServiceId) || null;
    if (!nextService) {
      if (selectedServiceId) {
        setSelectedServiceId('');
      }
      setOrderForm(createInitialOrderForm(null));
      return;
    }

    setOrderForm((prev) => ({
      ...prev,
      quantity:
        nextService.menuType === '4'
          ? '1'
          : prev.quantity && nextService.id === selectedServiceId
            ? prev.quantity
            : String(Math.max(0, nextService.min || 0)),
    }));
  }, [platformServices, selectedServiceId]);

  const selectedService = platformServices.find((service) => service.id === selectedServiceId) || null;

  const calculatedQuantity = useMemo(() => {
    if (!selectedService) return 0;
    if (selectedService.menuType === '4') return 1;
    if (selectedService.menuType === '2') {
      const totalComments = orderForm.comments
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean).length;
      return totalComments || 0;
    }
    const parsed = Number(orderForm.quantity || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [orderForm.comments, orderForm.quantity, selectedService]);

  const liveTotal = useMemo(() => {
    return calculateSmmTotal(selectedService, calculatedQuantity);
  }, [calculatedQuantity, selectedService]);

  const filteredMonitoringItems = useMemo(() => {
    const filtered = sortedHistoryItems.filter((item) => {
      const matchesStatus = matchesStatusFilter(item.orderStatus, appliedMonitoringFilter.status);
      const matchesCategory =
        appliedMonitoringFilter.category === 'Semua Kategori' || item.category === appliedMonitoringFilter.category;
      return matchesStatus && matchesCategory;
    });

    return filtered.slice(0, appliedMonitoringFilter.limit);
  }, [appliedMonitoringFilter, sortedHistoryItems]);

  const filteredStatusOrders = useMemo(() => {
    const filtered = sortedAccountOrderItems.filter((item) => {
      const itemYear = String(new Date(item.createdAt).getFullYear());
      const matchesYear = !appliedStatusFilter.year || itemYear === appliedStatusFilter.year;
      const matchesStatus = matchesStatusFilter(item.orderStatus, appliedStatusFilter.status);
      const haystack = [
        item.orderCode,
        item.providerOrderId,
        item.serviceName,
        item.targetData,
        item.category,
        item.serviceId,
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !appliedStatusFilter.search || haystack.includes(appliedStatusFilter.search);
      return matchesYear && matchesStatus && matchesSearch;
    });

    return filtered.slice(0, appliedStatusFilter.limit);
  }, [appliedStatusFilter, sortedAccountOrderItems]);

  const pendingAccountOrderCount = useMemo(
    () => sortedAccountOrderItems.filter((item) => mapStatusTone(item.orderStatus) === 'pending').length,
    [sortedAccountOrderItems],
  );
  const normalizedDepositAmount = Math.max(0, Number(depositAmount.replace(/[^\d]/g, '') || 0));
  const depositLocked = !accountProfile.registered || !accountProfile.loggedIn;
  const depositHistoryEntries = walletHistoryEntries.filter((entry) => entry.kind === 'deposit');
  const showPendingQris =
    activeCheckoutOrder?.paymentMethod === 'midtrans' && activeCheckoutOrder.paymentStatus === 'awaiting-payment';
  const showPaidCheckoutResult =
    activeCheckoutOrder?.paymentMethod === 'midtrans' && activeCheckoutOrder.paymentStatus === 'paid';
  const activeCheckoutProviderId = String(activeCheckoutOrder?.providerOrderId || '').trim();
  const isActionLoading = isOrdering || isSubmittingProfile || isSubmittingDeposit;

  const submitOrder = () => {
    if (!selectedService) {
      setOrderFeedback({ tone: 'error', text: 'Pilih layanan dulu sebelum kirim order.' });
      return;
    }

    const data = orderForm.data.trim();
    const quantity = orderForm.quantity.trim();
    const username = orderForm.username.trim();
    const comments = orderForm.comments.trim();
    const menuType = selectedService.menuType;
    const submittedQuantity =
      menuType === '4'
        ? ''
        : menuType === '2'
          ? String(calculatedQuantity || 0)
          : quantity;

    if (!data) {
      setOrderFeedback({ tone: 'error', text: 'Data target wajib diisi.' });
      return;
    }
    if (menuType !== '4' && menuType !== '2' && !quantity) {
      setOrderFeedback({ tone: 'error', text: 'Quantity wajib diisi untuk layanan ini.' });
      return;
    }
    if (menuType === '2' && !comments) {
      setOrderFeedback({ tone: 'error', text: 'Komentar wajib diisi untuk tipe Custom Comments.' });
      return;
    }
    if (menuType === '3' && !username) {
      setOrderFeedback({ tone: 'error', text: 'Username wajib diisi untuk tipe Comment Likes.' });
      return;
    }
    if (menuType === '5' && !comments) {
      setOrderFeedback({ tone: 'error', text: 'Keyword / komen wajib diisi untuk tipe SEO.' });
      return;
    }

    startOrdering(async () => {
      setOrderFeedback({ tone: 'idle', text: 'Menyiapkan checkout sosial media...' });
      setActiveCheckoutOrder(null);
      try {
        const response = await fetch('/api/smm/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountContact: accountProfile.loggedIn ? accountProfile.username : '',
            customerName: accountProfile.loggedIn ? accountProfile.name : 'Pelanggan Sosmed',
            service: selectedService.id,
            serviceName: selectedService.name,
            category: selectedService.category,
            data,
            quantity: submittedQuantity,
            unitPrice: selectedService.price,
            totalPrice: liveTotal,
            username,
            komen: comments,
          }),
        });
        const result = (await response.json()) as CheckoutOrderResult;
        if (!response.ok || !result.status || !result.data || !('orderCode' in result.data)) {
          setOrderFeedback({
            tone: 'error',
            text: result.data && 'msg' in result.data && result.data.msg ? String(result.data.msg) : 'Checkout sosial media gagal dibuat.',
          });
          return;
        }

        if (result.data.paymentMethod === 'balance') {
          setActiveCheckoutOrder(null);
          setOrderFeedback({
            tone: 'success',
            text: result.data.nextStep,
          });
          refreshHistory();
          if (accountProfile.username) {
            refreshAccountOrders(accountProfile.username);
            try {
              await syncAccountBundle(accountProfile.username);
            } catch {
              // keep current account banner if sync fails
            }
          }
          setActiveTab('status');
          return;
        }

        await handleCheckoutStatusPayload(result.data);
      } catch (error) {
        setOrderFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Checkout sosial media gagal diproses.',
        });
      }
    });
  };

  return (
    <div className="apk-app-shell smm-app-page">
      <ActionLoadingOverlay visible={isActionLoading} label="Memuat..." />
      <FloatingNotice notice={floatingNotice} />
      <div className="apk-app-phone">
        <div className="apk-app-top-strip apk-app-top-strip--with-menu">
          <button
            type="button"
            className={isSideMenuOpen ? 'apk-app-top-menu-button apk-app-top-menu-button--open' : 'apk-app-top-menu-button'}
            onClick={() => setIsSideMenuOpen(true)}
            aria-label="Buka menu utama sosial media"
          >
            <MenuBurgerGlyph />
          </button>
          <TopAccountMenu
            displayName={accountProfile.loggedIn ? accountProfile.name : 'Profil'}
            balance={accountProfile.balance}
          />
        </div>
        {isSideMenuOpen ? (
          <div className="site-side-drawer-backdrop" onClick={() => setIsSideMenuOpen(false)}>
            <aside className="site-side-drawer" onClick={(event) => event.stopPropagation()}>
              <div className="site-side-drawer__head">
                <strong>Menu</strong>
                <button type="button" className="site-side-drawer__close" onClick={() => setIsSideMenuOpen(false)} aria-label="Tutup menu">
                  <ModalCloseGlyph />
                </button>
              </div>
              <div className="site-side-drawer__body">
                <section className="site-side-drawer__section">
                  <span className="site-side-drawer__title">Menu Utama</span>
                  <div className="site-side-drawer__list">
                    <a href="/" className="site-side-drawer__item" onClick={() => setIsSideMenuOpen(false)}>
                      <span className="site-side-drawer__icon"><DrawerMenuGlyph type="dashboard" /></span>
                      <span>Dashboard</span>
                    </a>
                    <button type="button" className="site-side-drawer__item" onClick={() => openDrawerModal('profil')}>
                      <span className="site-side-drawer__icon"><DrawerMenuGlyph type="profil" /></span>
                      <span>Profil</span>
                    </button>
                    <button type="button" className="site-side-drawer__item" onClick={() => openDrawerTab('sosmed', '#smm-target-pesanan')}>
                      <span className="site-side-drawer__icon"><DrawerMenuGlyph type="order" /></span>
                      <span>Order</span>
                    </button>
                    <button type="button" className="site-side-drawer__item" onClick={() => openDrawerTab('status', '#smm-status-order')}>
                      <span className="site-side-drawer__icon"><DrawerMenuGlyph type="status" /></span>
                      <span>Status Order</span>
                    </button>
                    <button type="button" className="site-side-drawer__item" onClick={() => openDrawerModal('deposit')}>
                      <span className="site-side-drawer__icon"><DrawerMenuGlyph type="deposit" /></span>
                      <span>Deposit</span>
                    </button>
                    <button type="button" className="site-side-drawer__item" onClick={() => openDrawerModal('riwayat')}>
                      <span className="site-side-drawer__icon"><DrawerMenuGlyph type="riwayat" /></span>
                      <span>Riwayat Deposit</span>
                    </button>
                    <button type="button" className="site-side-drawer__item" onClick={() => openDrawerTab('riwayat', '#smm-monitoring-sosmed')}>
                      <span className="site-side-drawer__icon"><DrawerMenuGlyph type="monitoring" /></span>
                      <span>Monitoring Sosmed</span>
                    </button>
                  </div>
                </section>

                <section className="site-side-drawer__section">
                  <span className="site-side-drawer__title">Bantuan</span>
                  <div className="site-side-drawer__list">
                    <button type="button" className="site-side-drawer__item" onClick={() => openHelperModal('kontak')}>
                      <span className="site-side-drawer__icon"><DrawerMenuGlyph type="kontak" /></span>
                      <span>Kontak</span>
                    </button>
                  </div>
                  <div className="site-side-drawer__subsection">
                    <span className="site-side-drawer__subtitle">Panduan</span>
                    <div className="site-side-drawer__sublist">
                      <button type="button" className="site-side-drawer__subitem" onClick={() => openHelperModal('mulai')}>
                        <span className="site-side-drawer__icon"><DrawerMenuGlyph type="mulai" /></span>
                        <span>Mulai Transaksi</span>
                      </button>
                      <button type="button" className="site-side-drawer__subitem" onClick={() => openHelperModal('cara-deposit')}>
                        <span className="site-side-drawer__icon"><DrawerMenuGlyph type="cara-deposit" /></span>
                        <span>Cara Deposit</span>
                      </button>
                    </div>
                  </div>
                  <div className="site-side-drawer__subsection">
                    <span className="site-side-drawer__subtitle">Informasi</span>
                    <div className="site-side-drawer__sublist">
                      <button type="button" className="site-side-drawer__subitem" onClick={() => openHelperModal('status-info')}>
                        <span className="site-side-drawer__icon"><DrawerMenuGlyph type="status-info" /></span>
                        <span>Status Order</span>
                      </button>
                      <button type="button" className="site-side-drawer__subitem" onClick={() => openHelperModal('target')}>
                        <span className="site-side-drawer__icon"><DrawerMenuGlyph type="target" /></span>
                        <span>Target Pesanan</span>
                      </button>
                    </div>
                  </div>
                  <div className="site-side-drawer__list">
                    <button type="button" className="site-side-drawer__item" onClick={() => openHelperModal('api-docs')}>
                      <span className="site-side-drawer__icon"><DrawerMenuGlyph type="api-docs" /></span>
                      <span>Dokumentasi API</span>
                    </button>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        ) : null}
        <div className="apk-app-content apk-app-content--tight">
          {activeTab === 'sosmed' ? (
            <section id="smm-start-transaction" className="apk-app-panel apk-app-panel--plain">
              {activePlatform ? (
                <>
                  <div className="apk-app-form-card" id="smm-target-pesanan">
                    <span className="apk-app-section-label">Pilih Platforms</span>
                    <div className="smm-platform-grid">
                      {platformGroups.map((platform) => (
                        <button
                          key={platform.key}
                          type="button"
                          className={platform.key === activePlatform.key ? 'smm-platform-card smm-platform-card--active' : 'smm-platform-card'}
                          onClick={() => setSelectedPlatformKey(platform.key)}
                        >
                          <span className="smm-platform-icon" style={{ background: platform.accent, boxShadow: `0 12px 28px ${platform.accent}28` }}>
                            <SocialPlatformIcon icon={platform.icon} />
                          </span>
                          <span className="smm-platform-label">{platform.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="apk-app-form-card">
                    <span className="apk-app-section-label">Kategori Layanan</span>
                    <div className="smm-stage-platform smm-stage-platform--inline">
                      <span className="smm-platform-icon" style={{ background: activePlatform.accent, boxShadow: `0 12px 28px ${activePlatform.accent}28` }}>
                        <SocialPlatformIcon icon={activePlatform.icon} />
                      </span>
                      <span className="smm-stage-platform-label">{activePlatform.label}</span>
                    </div>
                    <div className="smm-select-stack">
                      <button
                        type="button"
                        className={
                          categoryPickerOpen
                            ? `smm-picker-trigger${!selectedCategory ? ' smm-picker-trigger--placeholder' : ''} smm-picker-trigger--open`
                            : !selectedCategory
                              ? 'smm-picker-trigger smm-picker-trigger--placeholder'
                              : 'smm-picker-trigger'
                        }
                        onClick={() => {
                          setCategoryPickerOpen((current) => !current);
                          setServicePickerOpen(false);
                        }}
                      >
                        <span>{selectedCategory || 'Pilih Salah Satu'}</span>
                        <i aria-hidden="true" />
                      </button>
                      {categoryPickerOpen ? (
                        <div className="smm-picker-panel">
                          <div className="apk-app-form-field">
                            <input
                              value={categoryQuery}
                              onChange={(event) => setCategoryQuery(event.target.value)}
                              placeholder="Cari kategori yang sesuai"
                            />
                          </div>
                          <div className="smm-manual-list">
                            <button
                              type="button"
                              className={!selectedCategory ? 'smm-manual-item smm-manual-item--active' : 'smm-manual-item'}
                              onClick={() => {
                                setSelectedCategory('');
                                setSelectedServiceId('');
                                setCategoryPickerOpen(false);
                              }}
                            >
                              <div className="smm-manual-item-copy">
                                <strong>Pilih Salah Satu</strong>
                              </div>
                            </button>
                            {filteredCategories.length ? (
                              filteredCategories.map((category) => (
                                <button
                                  key={category}
                                  type="button"
                                  className={selectedCategory === category ? 'smm-manual-item smm-manual-item--active' : 'smm-manual-item'}
                                  onClick={() => {
                                    setSelectedCategory(category);
                                    setSelectedServiceId('');
                                    setCategoryPickerOpen(false);
                                  }}
                                >
                                  <div className="smm-manual-item-copy">
                                    <strong>{category}</strong>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="apk-app-empty">Kategori yang kamu cari belum ada di platform ini.</div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="apk-app-form-card">
                    <span className="apk-app-section-label">Pilih Layanan</span>
                    <div className="smm-select-stack">
                      <button
                        type="button"
                        className={
                          servicePickerOpen
                            ? `smm-picker-trigger smm-picker-trigger--multiline${!selectedService ? ' smm-picker-trigger--placeholder' : ''} smm-picker-trigger--open`
                            : !selectedService
                              ? 'smm-picker-trigger smm-picker-trigger--multiline smm-picker-trigger--placeholder'
                              : 'smm-picker-trigger smm-picker-trigger--multiline'
                        }
                        onClick={() => {
                          if (!selectedCategory) return;
                          setServicePickerOpen((current) => !current);
                          setCategoryPickerOpen(false);
                        }}
                        disabled={!selectedCategory}
                      >
                        <span>{formatServicePickerLabel(selectedService)}</span>
                        <i aria-hidden="true" />
                      </button>
                      {servicePickerOpen ? (
                        <div className="smm-picker-panel">
                          <div className="apk-app-form-field">
                            <input
                              value={serviceQuery}
                              onChange={(event) => setServiceQuery(event.target.value)}
                              placeholder="Cari nama layanan"
                            />
                          </div>
                          <div className="smm-manual-list smm-manual-list--service">
                            <button
                              type="button"
                              className={!selectedService?.id ? 'smm-manual-item smm-manual-item--active' : 'smm-manual-item'}
                              onClick={() => {
                                setSelectedServiceId('');
                                setServicePickerOpen(false);
                              }}
                            >
                              <div className="smm-manual-item-copy">
                                <strong>Pilih Salah Satu</strong>
                              </div>
                            </button>
                            {filteredServices.length ? (
                              filteredServices.map((service) => (
                                <button
                                  key={service.id}
                                  type="button"
                                  className={selectedService?.id === service.id ? 'smm-manual-item smm-manual-item--active' : 'smm-manual-item'}
                                  onClick={() => {
                                    setSelectedServiceId(service.id);
                                    setServicePickerOpen(false);
                                  }}
                                >
                                  <div className="smm-manual-item-copy">
                                    <strong>{formatServicePickerLabel(service)}</strong>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="apk-app-empty">Layanan yang kamu cari belum ada di kategori ini.</div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {!selectedCategory ? <div className="apk-app-empty">Pilih kategori dulu untuk menampilkan layanan.</div> : null}
                    {selectedCategory && platformServices.length === 0 ? <div className="apk-app-empty">Tidak ada layanan yang cocok di kategori ini.</div> : null}
                  </div>

                  <div className="apk-app-form-card">
                    <span className="apk-app-section-label">Data Pesanan</span>
                    {selectedService ? (
                      <>
                      <div className="smm-service-note-card">
                        <span>Deskripsi Layanan</span>
                        <p>{selectedService.note || 'Deskripsi layanan belum tersedia dari provider.'}</p>
                      </div>

                      <div className="smm-service-stats-card">
                        <p>
                          <strong>Min. Order:</strong> {selectedService.min.toLocaleString('id-ID')}
                        </p>
                        <p>
                          <strong>Max. Order:</strong> {selectedService.max.toLocaleString('id-ID')}
                        </p>
                        <p>
                          <strong>Harga/1000:</strong> Rp {selectedService.priceLabel}
                        </p>
                      </div>
                      </>
                    ) : null}

                    <div className="apk-app-form-grid">
                      <label className="apk-app-form-field">
                        <span>Target (URL/Username)</span>
                        <input
                          value={orderForm.data}
                          onChange={(event) => setOrderForm((prev) => ({ ...prev, data: event.target.value }))}
                          placeholder="Masukkan link/username target"
                        />
                      </label>

                      <label className="apk-app-form-field">
                        <span>Jumlah</span>
                        <input
                          value={
                            selectedService?.menuType === '2'
                              ? String(calculatedQuantity || 0)
                              : selectedService?.menuType === '4'
                                ? '1'
                                : orderForm.quantity
                          }
                          onChange={(event) => setOrderForm((prev) => ({ ...prev, quantity: event.target.value.replace(/[^\d]/g, '') }))}
                          placeholder={
                            selectedService
                              ? selectedService.menuType === '2'
                                ? 'Otomatis dari jumlah komentar'
                                : selectedService.menuType === '4'
                                  ? 'Otomatis 1'
                                  : `Minimal ${selectedService.min.toLocaleString('id-ID')}`
                              : 'Isi jumlah order'
                          }
                          readOnly={selectedService?.menuType === '2' || selectedService?.menuType === '4'}
                        />
                      </label>

                      <label className="apk-app-form-field">
                        <span>Email Notifikasi</span>
                        <input
                          value={orderForm.emailNotification}
                          onChange={(event) => setOrderForm((prev) => ({ ...prev, emailNotification: event.target.value }))}
                          placeholder="Masukkan email penerima notifikasi"
                        />
                      </label>

                      <label className="apk-app-form-field">
                        <span>Total Harga</span>
                        <input value={`Rp ${liveTotal.toLocaleString('id-ID')}`} readOnly className="smm-readonly-input" />
                      </label>

                      {selectedService?.menuType === '3' ? (
                        <label className="apk-app-form-field">
                          <span>Username komentar</span>
                          <input
                            value={orderForm.username}
                            onChange={(event) => setOrderForm((prev) => ({ ...prev, username: event.target.value }))}
                            placeholder="Username pemilik komentar"
                          />
                        </label>
                      ) : null}

                      {selectedService?.menuType === '2' || selectedService?.menuType === '5' ? (
                        <label className="apk-app-form-field">
                          <span>{selectedService.menuType === '2' ? 'Daftar komentar' : 'Daftar keyword / komen'}</span>
                          <textarea
                            value={orderForm.comments}
                            onChange={(event) => setOrderForm((prev) => ({ ...prev, comments: event.target.value }))}
                            rows={6}
                            placeholder={selectedService.menuType === '2' ? 'Satu komentar per baris' : 'Satu keyword per baris'}
                          />
                        </label>
                      ) : null}
                    </div>

                    <div className="apk-app-inline-helper">
                      {accountProfile.loggedIn
                        ? `Saldo aktif kamu Rp ${accountProfile.balance.toLocaleString('id-ID')}. Sistem akan memakai saldo dulu jika cukup, lalu otomatis dialihkan ke QRIS jika saldo kurang.`
                        : 'Jika ingin prioritas memakai saldo akun, login akun dulu. Kalau belum login, pembayaran akan langsung memakai QRIS.'}
                    </div>

                    {showPendingQris ? (
                      <div className="apk-app-qris-shell">
                        <div className="apk-app-qris-head">
                          <div>
                            <span className="apk-app-section-label">QRIS Payment</span>
                          </div>
                          <div className="apk-app-order-pill apk-app-order-pill--pending">
                            Menunggu bayar
                          </div>
                        </div>
                        <div className="apk-app-qris-card smm-qris-card">
                          {activeCheckoutOrder.qris?.qrUrl ? (
                            <img src={activeCheckoutOrder.qris.qrUrl} alt="QRIS pembayaran sosial media" className="apk-app-qris-image" />
                          ) : (
                            <div className="apk-app-qris-fallback">QRIS siap, tetapi gambar belum tersedia.</div>
                          )}
                        </div>

                        <div className="apk-app-live-total-card apk-app-live-total-card--compact smm-qris-total-card">
                          <span>Total Bayar</span>
                          <strong>Rp {activeCheckoutOrder.totalPriceLabel}</strong>
                        </div>

                        {activeCheckoutOrder.qris?.expiryTime ? (
                          <div className="smm-qris-expiry-note">
                            Berlaku sampai {new Date(activeCheckoutOrder.qris.expiryTime).toLocaleString('id-ID')}
                          </div>
                        ) : null}

                        <div className="smm-qris-detail-frame">
                          <p>Order ID : {activeCheckoutProviderId || 'Menunggu sinkron provider'}</p>
                          <p>Status bayar : {formatPaymentStatusLabel(activeCheckoutOrder.paymentStatus)}</p>
                          <p>Layanan : {activeCheckoutOrder.serviceName}</p>
                          <p>Kategori : {activeCheckoutOrder.category}</p>
                          <p>Target : {activeCheckoutOrder.targetData}</p>
                          <p>Jumlah : {activeCheckoutOrder.quantity == null ? '-' : String(activeCheckoutOrder.quantity)}</p>
                          <p>Total : Rp {activeCheckoutOrder.totalPriceLabel}</p>
                        </div>

                        <div className="apk-app-action-row smm-qris-status-row">
                          <button type="button" className="apk-app-primary-button" onClick={refreshCheckoutStatus} disabled={isRefreshingCheckoutStatus}>
                            {isRefreshingCheckoutStatus ? 'Memuat...' : 'Cek Status'}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {showPaidCheckoutResult ? (
                      <div className="smm-qris-detail-frame smm-qris-detail-frame--success">
                        <span className="smm-qris-success-mark" aria-hidden="true">
                          <SuccessCheckGlyph />
                        </span>
                        <p>Order ID : {activeCheckoutProviderId || '-'}</p>
                        <p>Status bayar : {formatPaymentStatusLabel(activeCheckoutOrder.paymentStatus)}</p>
                        <p>Layanan : {activeCheckoutOrder.serviceName}</p>
                        <p>Kategori : {activeCheckoutOrder.category}</p>
                        <p>Target : {activeCheckoutOrder.targetData}</p>
                        <p>Jumlah : {activeCheckoutOrder.quantity == null ? '-' : String(activeCheckoutOrder.quantity)}</p>
                        <p>Total : Rp {activeCheckoutOrder.totalPriceLabel}</p>
                      </div>
                    ) : null}

                    {showPaidCheckoutResult ? (
                      <div className="apk-app-feedback apk-app-feedback--success">
                        Transaksi berhasil, silahkan cek menu status order untuk pantau pesananmu.
                      </div>
                    ) : null}

                    {orderFeedback.tone !== 'idle' && !showPendingQris && !showPaidCheckoutResult ? (
                      <div className={`apk-app-feedback apk-app-feedback--${orderFeedback.tone}`}>
                        {orderFeedback.text}
                      </div>
                    ) : null}

                    {!showPendingQris && !showPaidCheckoutResult ? (
                    <div className="apk-app-action-row">
                      <button type="button" className="apk-app-primary-button" onClick={submitOrder} disabled={isOrdering}>
                        {isOrdering ? 'Mengirim...' : 'Lanjutkan Pembayaran'}
                      </button>
                    </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="apk-app-empty">Belum ada layanan dari provider yang bisa dipilih.</div>
              )}
            </section>
          ) : null}

          {activeTab === 'riwayat' ? (
            <section id="smm-monitoring-sosmed" className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head smm-panel-head">
                <div>
                  <span className="apk-app-section-label">Monitoring Sosmed</span>
                  <p className="smm-section-copy">Direkomendasikan untuk pantau monitoring sosmed terlebih dahulu, sebelum melakukan order untuk melihat layanan yang bagus dan lancar untuk saat ini, agar tidak ada kendala error atau proses lama saat pemesanan.</p>
                </div>
              </div>

              <div className="apk-app-form-card">
                <div className="smm-monitoring-filter-grid">
                  <div className="apk-app-form-field">
                    <span>Tampilkan Beberapa</span>
                    <SearchableManualPicker
                      value={monitoringFilterDraft.limit}
                      placeholder="Pilih jumlah data"
                      open={activeFilterPicker === 'monitoring-limit'}
                      onToggle={() => toggleFilterPicker('monitoring-limit')}
                      onSelect={(value) => {
                        setMonitoringFilterDraft((current) => ({ ...current, limit: value }));
                        updateFilterPickerQuery('monitoring-limit', '');
                        setActiveFilterPicker(null);
                      }}
                      query={filterPickerQueries['monitoring-limit']}
                      onQueryChange={(value) => updateFilterPickerQuery('monitoring-limit', value)}
                      options={monitoringLimitOptions}
                      searchPlaceholder="Cari jumlah data"
                      emptyMessage="Jumlah data yang kamu cari belum tersedia."
                      stackClassName="smm-select-stack smm-select-stack--compact"
                    />
                  </div>
                  <div className="apk-app-form-field">
                    <span>Filter Status</span>
                    <SearchableManualPicker
                      value={monitoringFilterDraft.status}
                      placeholder="Pilih status"
                      open={activeFilterPicker === 'monitoring-status'}
                      onToggle={() => toggleFilterPicker('monitoring-status')}
                      onSelect={(value) => {
                        setMonitoringFilterDraft((current) => ({ ...current, status: value }));
                        updateFilterPickerQuery('monitoring-status', '');
                        setActiveFilterPicker(null);
                      }}
                      query={filterPickerQueries['monitoring-status']}
                      onQueryChange={(value) => updateFilterPickerQuery('monitoring-status', value)}
                      options={monitoringStatusOptions}
                      searchPlaceholder="Cari status order"
                      emptyMessage="Status yang kamu cari belum tersedia."
                      stackClassName="smm-select-stack smm-select-stack--compact"
                    />
                  </div>
                  <div className="apk-app-form-field">
                    <span>Filter Category</span>
                    <SearchableManualPicker
                      value={monitoringFilterDraft.category}
                      placeholder="Pilih kategori"
                      open={activeFilterPicker === 'monitoring-category'}
                      onToggle={() => toggleFilterPicker('monitoring-category')}
                      onSelect={(value) => {
                        setMonitoringFilterDraft((current) => ({ ...current, category: value }));
                        updateFilterPickerQuery('monitoring-category', '');
                        setActiveFilterPicker(null);
                      }}
                      query={filterPickerQueries['monitoring-category']}
                      onQueryChange={(value) => updateFilterPickerQuery('monitoring-category', value)}
                      options={monitoringCategoryOptions}
                      searchPlaceholder="Cari kategori monitoring"
                      emptyMessage="Kategori yang kamu cari belum tersedia."
                      stackClassName="smm-select-stack smm-select-stack--compact"
                    />
                  </div>
                  <div className="smm-monitoring-filter-actions">
                    <span>Submit</span>
                    <div className="smm-monitoring-filter-buttons">
                      <button
                        type="button"
                        className="apk-app-primary-button"
                        onClick={() => {
                          applyMonitoringFilter();
                          refreshHistory();
                        }}
                      >
                        Filter
                      </button>
                      <button
                        type="button"
                        className="apk-app-ghost-button"
                        onClick={() => {
                          setActiveFilterPicker(null);
                          refreshHistory();
                        }}
                        disabled={isRefreshingHistory}
                      >
                        {isRefreshingHistory ? 'Memuat...' : 'Refresh'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="smm-status-table-wrap">
                <table className="smm-status-table">
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Kategori</th>
                      <th>Service ID</th>
                      <th>Layanan</th>
                      <th>Jumlah</th>
                      <th>Harga</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMonitoringItems.length ? (
                      filteredMonitoringItems.map((item) => {
                        const createdAt = formatDateParts(item.createdAt);
                        return (
                        <tr key={item.id}>
                          <td className="smm-status-time-cell">
                            <span>{createdAt.datePart}</span>
                            <span>{createdAt.timePart}</span>
                          </td>
                          <td><div className="smm-status-service-name">{item.category || '-'}</div></td>
                          <td className="smm-status-cell--nowrap">{item.serviceId || '-'}</td>
                          <td><div className="smm-status-service-name">{item.serviceName || '-'}</div></td>
                          <td className="smm-status-cell--nowrap">{item.quantity == null ? '-' : item.quantity.toLocaleString('id-ID')}</td>
                          <td className="smm-status-cell--nowrap">Rp {(item.totalPrice || item.unitPrice || 0).toLocaleString('id-ID')}</td>
                          <td className="smm-status-cell--nowrap">
                            <span className={`smm-status-badge smm-status-badge--${mapStatusTone(item.orderStatus)}`}>{item.orderStatus || '-'}</span>
                          </td>
                        </tr>
                      );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7}>
                          <div className="apk-app-empty">Belum ada data monitoring yang cocok dengan filter ini.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {activeTab === 'status' ? (
            <section id="smm-status-order" className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head smm-panel-head">
                <div>
                  <span className="apk-app-section-label">Status Order</span>
                </div>
              </div>

              {accountProfile.loggedIn ? (
                <>
                  <div className="apk-app-form-card">
                    <div className="smm-status-filter-grid">
                      <div className="apk-app-form-field">
                        <span>Tampilkan Beberapa</span>
                        <SearchableManualPicker
                          value={statusFilterDraft.limit}
                          placeholder="Pilih jumlah data"
                          open={activeFilterPicker === 'status-limit'}
                          onToggle={() => toggleFilterPicker('status-limit')}
                          onSelect={(value) => {
                            setStatusFilterDraft((current) => ({ ...current, limit: value }));
                            updateFilterPickerQuery('status-limit', '');
                            setActiveFilterPicker(null);
                          }}
                          query={filterPickerQueries['status-limit']}
                          onQueryChange={(value) => updateFilterPickerQuery('status-limit', value)}
                          options={statusLimitOptions}
                          searchPlaceholder="Cari jumlah data"
                          emptyMessage="Jumlah data yang kamu cari belum tersedia."
                          stackClassName="smm-select-stack smm-select-stack--compact"
                        />
                      </div>
                      <div className="apk-app-form-field">
                        <span>Filter Status</span>
                        <SearchableManualPicker
                          value={statusFilterDraft.status}
                          placeholder="Pilih status"
                          open={activeFilterPicker === 'status-status'}
                          onToggle={() => toggleFilterPicker('status-status')}
                          onSelect={(value) => {
                            setStatusFilterDraft((current) => ({ ...current, status: value }));
                            updateFilterPickerQuery('status-status', '');
                            setActiveFilterPicker(null);
                          }}
                          query={filterPickerQueries['status-status']}
                          onQueryChange={(value) => updateFilterPickerQuery('status-status', value)}
                          options={statusOrderStatusOptions}
                          searchPlaceholder="Cari status pesanan"
                          emptyMessage="Status yang kamu cari belum tersedia."
                          stackClassName="smm-select-stack smm-select-stack--compact"
                        />
                      </div>
                      <div className="apk-app-form-field">
                        <span>Filter Tahun</span>
                        <SearchableManualPicker
                          value={statusFilterDraft.year}
                          placeholder="Pilih tahun"
                          open={activeFilterPicker === 'status-year'}
                          onToggle={() => toggleFilterPicker('status-year')}
                          onSelect={(value) => {
                            setStatusFilterDraft((current) => ({ ...current, year: value }));
                            updateFilterPickerQuery('status-year', '');
                            setActiveFilterPicker(null);
                          }}
                          query={filterPickerQueries['status-year']}
                          onQueryChange={(value) => updateFilterPickerQuery('status-year', value)}
                          options={statusYearOptions}
                          searchPlaceholder="Cari tahun order"
                          emptyMessage="Tahun yang kamu cari belum tersedia."
                          stackClassName="smm-select-stack smm-select-stack--compact"
                        />
                      </div>
                      <label className="apk-app-form-field">
                        <span>Cari Order ID</span>
                        <input
                          value={statusFilterDraft.search}
                          onChange={(event) => setStatusFilterDraft((current) => ({ ...current, search: event.target.value }))}
                          placeholder="Cari Order ID/Target"
                        />
                      </label>
                      <div className="smm-monitoring-filter-actions">
                        <span>Submit</span>
                        <div className="smm-monitoring-filter-buttons">
                          <button
                            type="button"
                            className="apk-app-primary-button"
                            onClick={() => {
                              applyStatusFilter();
                              refreshAccountOrders(accountProfile.username);
                            }}
                          >
                            Filter
                          </button>
                          <button
                            type="button"
                            className="apk-app-ghost-button"
                            onClick={() => {
                              setActiveFilterPicker(null);
                              refreshAccountOrders(accountProfile.username);
                            }}
                            disabled={isRefreshingAccountOrders}
                          >
                            {isRefreshingAccountOrders ? 'Memuat...' : 'Refresh'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="smm-status-table-wrap">
                    <table className="smm-status-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Waktu</th>
                          <th>Layanan</th>
                          <th>Target</th>
                          <th>Jumlah</th>
                          <th>Harga</th>
                          <th>Status</th>
                          <th>Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStatusOrders.length ? (
                          filteredStatusOrders.map((item) => {
                            const createdAt = formatDateParts(item.createdAt);
                            return (
                              <tr key={item.id}>
                                <td className="smm-status-cell--nowrap">{item.providerOrderId || item.orderCode || '-'}</td>
                                <td className="smm-status-time-cell">
                                  <span>{createdAt.datePart}</span>
                                  <span>{createdAt.timePart}</span>
                                </td>
                                <td><div className="smm-status-service-name">{item.serviceName || '-'}</div></td>
                                <td>
                                  <div className="smm-status-target">
                                    <span className="smm-status-target__text">{item.targetData || '-'}</span>
                                    {item.targetData ? (
                                      <button
                                        type="button"
                                        className="smm-status-copy-button"
                                        onClick={() => void copyToClipboard(item.targetData, 'Target berhasil disalin.')}
                                        aria-label="Salin target pesanan"
                                      >
                                        <CopyGlyph />
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="smm-status-cell--nowrap">{item.quantity == null ? '-' : item.quantity.toLocaleString('id-ID')}</td>
                                <td className="smm-status-cell--nowrap">Rp {(item.totalPrice || item.unitPrice || 0).toLocaleString('id-ID')}</td>
                                <td className="smm-status-cell--nowrap">
                                  <span className={`smm-status-badge smm-status-badge--${mapStatusTone(item.orderStatus)}`}>
                                    {item.orderStatus || '-'}
                                  </span>
                                </td>
                                <td className="smm-status-cell--nowrap">
                                  <button
                                    type="button"
                                    className="smm-status-detail-button"
                                    onClick={() => void openStatusDetail(item)}
                                    aria-label="Detail pesanan"
                                  >
                                    <StatusDetailGlyph />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8}>
                              <div className="apk-app-empty">Belum ada transaksi social media yang cocok dengan filter akun ini.</div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="apk-app-empty">
                  Login akun dulu agar menu Status Order bisa menampilkan riwayat transaksi pengguna akun.
                </div>
              )}
            </section>
          ) : null}

          {detailStatusOrder ? (
            <div
              className="smm-detail-modal-backdrop"
              onClick={() => {
                setDetailStatusOrder(null);
                setDetailProviderStatus(null);
              }}
            >
              <div className="smm-detail-modal" onClick={(event) => event.stopPropagation()}>
                <div className="smm-detail-modal-head">
                  <strong>Detail Pesanan</strong>
                  <button
                    type="button"
                    className="smm-detail-modal-close"
                    onClick={() => {
                      setDetailStatusOrder(null);
                      setDetailProviderStatus(null);
                    }}
                    aria-label="Tutup detail pesanan"
                  >
                    <ModalCloseGlyph />
                  </button>
                </div>

                <div className="smm-detail-modal-body">
                  <table className="smm-detail-table">
                    <tbody>
                      <tr>
                        <th>Order ID</th>
                        <td>{detailStatusOrder.providerOrderId || detailStatusOrder.orderCode || '-'}</td>
                      </tr>
                      <tr>
                        <th>Layanan</th>
                        <td>{detailStatusOrder.serviceName || '-'}</td>
                      </tr>
                      <tr>
                        <th>Target</th>
                        <td>{detailStatusOrder.targetData || '-'}</td>
                      </tr>
                      <tr>
                        <th>Jumlah</th>
                        <td>{detailStatusOrder.quantity == null ? '-' : detailStatusOrder.quantity.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <th>Start</th>
                        <td>{detailProviderStatus?.startCount == null ? '-' : detailProviderStatus.startCount.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <th>Remains</th>
                        <td>{detailProviderStatus?.remains == null ? '-' : detailProviderStatus.remains.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <th>Harga</th>
                        <td>Rp {(detailStatusOrder.totalPrice || detailStatusOrder.unitPrice || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <th>Status</th>
                        <td>
                          <div className="smm-detail-status-row">
                            <span className={`smm-status-badge smm-status-badge--${mapStatusTone(detailProviderStatus?.status || detailStatusOrder.orderStatus)}`}>
                              {detailProviderStatus?.status || detailStatusOrder.orderStatus || '-'}
                            </span>
                            <span className="smm-detail-status-info" aria-hidden="true">
                              <StatusInfoGlyph />
                            </span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th>Tanggal &amp; Waktu</th>
                        <td>{formatDate(detailStatusOrder.createdAt)}</td>
                      </tr>
                      <tr>
                        <th>Refund</th>
                        <td>
                          <span className={`smm-detail-flag ${detailStatusOrder.paymentStatus === 'refunded' ? 'smm-detail-flag--success' : 'smm-detail-flag--failed'}`}>
                            {detailStatusOrder.paymentStatus === 'refunded' ? <SuccessCheckGlyph /> : <ModalCloseGlyph />}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <th>Via API</th>
                        <td>
                          <span className="smm-detail-flag smm-detail-flag--failed">
                            <ModalCloseGlyph />
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {helperModalView ? (
            <div className="smm-detail-modal-backdrop" onClick={() => setHelperModalView(null)}>
              <div
                className={
                  helperModalView === 'target' || helperModalView === 'status-info' || helperModalView === 'kontak'
                    ? 'smm-detail-modal smm-detail-modal--guide'
                    : 'smm-detail-modal'
                }
                onClick={(event) => event.stopPropagation()}
              >
                <div className="smm-detail-modal-head">
                  <strong>{helperModalTitle}</strong>
                  <button
                    type="button"
                    className="smm-detail-modal-close"
                    onClick={() => setHelperModalView(null)}
                    aria-label="Tutup bantuan"
                  >
                    <ModalCloseGlyph />
                  </button>
                </div>

                <div
                  className={
                    helperModalView === 'target' || helperModalView === 'status-info' || helperModalView === 'kontak'
                      ? 'smm-detail-modal-body smm-detail-modal-body--guide'
                      : 'smm-detail-modal-body'
                  }
                >
                  <div className="smm-helper-scroll-shell">
                    <div className="smm-helper-scroll-card">
                      {helperModalView === 'kontak' ? (
                        <div className="smm-contact-list">
                          {contactEntries.map((item) => (
                            <div key={item.key} className="smm-contact-item">
                              <div className="smm-guide-summary">
                                <span
                                  className="smm-contact-icon"
                                  aria-hidden="true"
                                  style={{
                                    color:
                                      item.icon === 'instagram'
                                        ? '#e4408b'
                                        : item.icon === 'telegram'
                                          ? '#27a7e7'
                                          : item.icon === 'whatsapp'
                                            ? '#25d366'
                                            : '#1799f2',
                                  }}
                                >
                                  {item.icon === 'email' ? <MailGlyph /> : <SocialPlatformIcon icon={item.icon} />}
                                </span>
                                <span className="smm-guide-summary__copy">
                                  <strong>{item.label}</strong>
                                  <span>{item.value}</span>
                                </span>
                              </div>
                              <div className="smm-guide-content smm-guide-content--static">
                                <div className="smm-contact-actions">
                                  {item.href ? (
                                    <a
                                      href={item.href}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="smm-contact-action smm-contact-action--open"
                                    >
                                      Buka
                                    </a>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="smm-contact-action"
                                    onClick={() => void copyToClipboard(item.copyValue, `${item.label} berhasil disalin.`)}
                                  >
                                    Salin
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {helperModalView === 'mulai' ? (
                        <div className="smm-profile-lines">
                          <p>Pilih platform yang sesuai dulu, lalu pilih kategori layanan dan layanan yang paling stabil.</p>
                          <p>Setelah itu isi target, jumlah, dan email notifikasi, lalu lanjutkan pembayaran untuk membuat order.</p>
                        </div>
                      ) : null}

                      {helperModalView === 'cara-deposit' ? (
                        <div className="smm-profile-lines">
                          <p>Buka menu deposit, isi nominal minimal Rp {formatRupiah(minimumDeposit)}, lalu tekan tombol deposit untuk memunculkan QRIS.</p>
                          <p>Setelah pembayaran berhasil, saldo akun akan otomatis bertambah dan bisa dipakai di mode website yang memakai akun yang sama.</p>
                        </div>
                      ) : null}

                      {helperModalView === 'status-info' ? (
                        <div className="smm-status-guide-grid">
                          {statusGuideItems.map((item) => (
                            <div key={item.label} className="smm-status-guide-card">
                              <div className="smm-guide-summary smm-guide-summary--status">
                                <span className={`smm-status-guide-badge smm-status-guide-badge--${item.tone}`}>{item.label}</span>
                                <span className="smm-guide-summary__copy">
                                  <strong>{item.label}</strong>
                                </span>
                              </div>
                              <div className="smm-guide-content smm-guide-content--static">
                                <div className="smm-status-guide-copy">
                                  <p>{item.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {helperModalView === 'target' ? (
                        <div className="smm-target-guide">
                          {targetGuideSections.map((section) => (
                            <section key={section.title} className="smm-target-guide-section">
                              <div className="smm-guide-summary smm-guide-summary--static">
                                <span className="smm-guide-summary__copy">
                                  <strong>{section.title}</strong>
                                </span>
                              </div>
                              <div className="smm-guide-content smm-guide-content--static">
                                <ul>
                                  {section.items.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            </section>
                          ))}
                        </div>
                      ) : null}

                      {helperModalView === 'api-docs' ? (
                        <div className="smm-profile-lines">
                          <p>COMING SOON....</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

        </div>

        <nav className="apk-app-bottom-nav">
          {([
            ['sosmed', 'Sosmed'],
            ['riwayat', 'Monitoring'],
            ['status', 'Status'],
            ['provider', 'Profil'],
          ] as Array<[SocialTab | 'provider', string]>).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              className={
                tab === 'provider'
                  ? accountModalView
                    ? 'apk-app-nav-item apk-app-nav-item--active'
                    : 'apk-app-nav-item'
                  : activeTab === tab
                    ? 'apk-app-nav-item apk-app-nav-item--active'
                    : 'apk-app-nav-item'
              }
              onClick={() => {
                if (tab === 'provider') {
                  setAccountModalView('profil');
                  return;
                }
                setActiveTab(tab);
              }}
            >
              <span className="apk-app-nav-icon">
                {tab === 'provider' ? <AccountPopupGlyph type="profil" /> : <SocialNavGlyph type={tab} />}
              </span>
              <span className="apk-app-nav-label">
                {label}
                {tab === 'status' && pendingAccountOrderCount > 0 ? (
                  <small className="apk-app-nav-count">{pendingAccountOrderCount}</small>
                ) : null}
              </span>
            </button>
          ))}
        </nav>

        {accountModalView ? (
          <div className="smm-detail-modal-backdrop" onClick={() => setAccountModalView(null)}>
            <div className="smm-detail-modal account-popup-modal" onClick={(event) => event.stopPropagation()}>
              <div className="smm-detail-modal-head">
                <strong>
                  {accountModalView === 'deposit'
                    ? 'Deposit'
                    : accountModalView === 'riwayat'
                      ? 'Riwayat Deposit'
                      : 'Profil'}
                </strong>
                <button
                  type="button"
                  className="smm-detail-modal-close"
                  onClick={() => setAccountModalView(null)}
                  aria-label="Tutup popup akun"
                >
                  <ModalCloseGlyph />
                </button>
              </div>

              <div className="smm-detail-modal-body account-popup-modal__body">
                <div className="account-popup-tabs">
                  {([
                    ['profil', 'Profil'],
                    ['deposit', 'Deposit'],
                    ['riwayat', 'Riwayat'],
                  ] as Array<[AccountModalView, string]>).map(([view, label]) => (
                    <button
                      key={view}
                      type="button"
                      className={accountModalView === view ? 'account-popup-tab account-popup-tab--active' : 'account-popup-tab'}
                      onClick={() => setAccountModalView(view)}
                    >
                      <span className="account-popup-tab__icon">
                        <AccountPopupGlyph type={view} />
                      </span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {accountModalView === 'profil' ? (
                  <div className="account-popup-stack">
                    <div className="account-popup-card">
                      <div className="account-popup-card__head">
                        <span className="smm-profile-title">Status akun</span>
                        {accountProfile.loggedIn ? (
                          <button type="button" className="account-popup-inline-action" onClick={logoutAccount}>
                            Log out
                          </button>
                        ) : null}
                      </div>
                      <div className="smm-profile-lines">
                        <p>Nama akun : {accountProfile.name || '-'}</p>
                        <p>Username : {accountProfile.username ? `@${accountProfile.username}` : '-'}</p>
                        <p>Saldo : Rp {formatRupiah(accountProfile.balance)}</p>
                        <p>Status : {accountProfile.loggedIn ? 'Login' : accountProfile.registered ? 'Belum login' : 'Belum terdaftar'}</p>
                      </div>
                    </div>

                    {accountProfile.loggedIn ? (
                      <div className="account-popup-card">
                        <span className="smm-profile-title">Profil</span>
                        <div className="apk-app-form-grid smm-profile-form-grid">
                          <label className="apk-app-form-field">
                            <span>Username baru</span>
                            <input
                              value={profileEditDraft.username}
                              onChange={(event) => setProfileEditDraft((current) => ({ ...current, username: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))}
                              placeholder="contoh: putrigmoyy"
                            />
                          </label>
                          <label className="apk-app-form-field">
                            <span>Password baru</span>
                            <input
                              type="password"
                              value={profileEditDraft.password}
                              onChange={(event) => setProfileEditDraft((current) => ({ ...current, password: event.target.value }))}
                              placeholder="Minimal 6 karakter"
                            />
                          </label>
                        </div>
                        <div className="apk-app-action-row apk-app-action-row--compact">
                          <button type="button" className="apk-app-primary-button" onClick={updateProfile} disabled={isSubmittingProfile}>
                            {isSubmittingProfile ? 'Memproses...' : 'Simpan Profil'}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {!accountProfile.loggedIn ? (
                      <div className="account-popup-card">
                        <span className="smm-profile-title">Profil</span>
                        <div className="account-popup-auth-toggle">
                          <button
                            type="button"
                            className={profileAccessMode === 'register' ? 'account-popup-auth-toggle__active' : ''}
                            onClick={() => setProfileAccessMode('register')}
                          >
                            Daftar
                          </button>
                          <button
                            type="button"
                            className={profileAccessMode === 'login' ? 'account-popup-auth-toggle__active' : ''}
                            onClick={() => setProfileAccessMode('login')}
                          >
                            Login
                          </button>
                        </div>

                        {profileAccessMode === 'register' ? (
                          <>
                            <div className="apk-app-form-grid smm-profile-form-grid">
                              <label className="apk-app-form-field">
                                <span>Nama akun</span>
                                <input
                                  value={accountRegisterDraft.name}
                                  onChange={(event) => setAccountRegisterDraft((current) => ({ ...current, name: event.target.value }))}
                                  placeholder="Nama lengkap"
                                />
                              </label>
                              <label className="apk-app-form-field">
                                <span>Username akun</span>
                                <input
                                  value={accountRegisterDraft.username}
                                  onChange={(event) => setAccountRegisterDraft((current) => ({ ...current, username: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))}
                                  placeholder="contoh: putrigmoyy"
                                />
                              </label>
                              <label className="apk-app-form-field">
                                <span>Password akun</span>
                                <input
                                  type="password"
                                  value={accountRegisterDraft.password}
                                  onChange={(event) => setAccountRegisterDraft((current) => ({ ...current, password: event.target.value }))}
                                  placeholder="Minimal 6 karakter"
                                />
                              </label>
                            </div>
                            <div className="apk-app-action-row apk-app-action-row--compact">
                              <button type="button" className="apk-app-primary-button" onClick={registerAccount} disabled={isSubmittingProfile}>
                                {isSubmittingProfile ? 'Memproses...' : 'Daftar akun'}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="apk-app-form-grid smm-profile-form-grid">
                              <label className="apk-app-form-field">
                                <span>Username akun</span>
                                <input
                                  value={accountLoginDraft.username}
                                  onChange={(event) => setAccountLoginDraft((current) => ({ ...current, username: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))}
                                  placeholder="Masukkan username"
                                />
                              </label>
                              <label className="apk-app-form-field">
                                <span>Password akun</span>
                                <input
                                  type="password"
                                  value={accountLoginDraft.password}
                                  onChange={(event) => setAccountLoginDraft((current) => ({ ...current, password: event.target.value }))}
                                  placeholder="Masukkan password"
                                />
                              </label>
                            </div>
                            <div className="apk-app-action-row apk-app-action-row--compact">
                              <button type="button" className="apk-app-primary-button" onClick={loginAccount} disabled={isSubmittingProfile}>
                                {isSubmittingProfile ? 'Memproses...' : 'Login'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}

                  </div>
                ) : null}

                {accountModalView === 'deposit' ? (
                  <div className="account-popup-stack">
                    <div className="account-popup-card">
                      <span className="smm-profile-title">Status akun</span>
                      <div className="smm-profile-lines">
                        <p>Username : {accountProfile.username ? `@${accountProfile.username}` : '-'}</p>
                        <p>Saldo : Rp {formatRupiah(accountProfile.balance)}</p>
                      </div>
                    </div>

                    <div className="account-popup-card">
                      <span className="smm-profile-title">Deposit</span>
                      {!activeDepositQris ? (
                        <>
                          <div className="apk-app-form-grid smm-profile-form-grid">
                            <label className="apk-app-form-field">
                              <span>Jumlah deposit</span>
                              <input
                                value={depositAmount}
                                onChange={(event) => setDepositAmount(event.target.value.replace(/[^\d]/g, ''))}
                                placeholder={`Minimal ${minimumDeposit.toLocaleString('id-ID')}`}
                                inputMode="numeric"
                              />
                            </label>
                          </div>

                          <div className="apk-app-quick-grid">
                            {quickDepositAmounts.map((amount) => (
                              <button
                                key={amount}
                                type="button"
                                className={normalizedDepositAmount === amount ? 'apk-app-quick-chip apk-app-quick-chip--active' : 'apk-app-quick-chip'}
                                onClick={() => setDepositAmount(String(amount))}
                              >
                                Rp {formatRupiah(amount)}
                              </button>
                            ))}
                          </div>

                          <div className="apk-app-action-row apk-app-action-row--compact">
                            <button
                              type="button"
                              className="apk-app-primary-button"
                              onClick={submitDepositFlow}
                              disabled={depositLocked || isSubmittingDeposit}
                            >
                              {isSubmittingDeposit ? 'Memproses...' : 'Deposit'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="apk-app-qris-shell">
                          <div className="apk-app-qris-card smm-qris-card">
                            {activeDepositQris.qris?.qrUrl ? (
                              <img src={activeDepositQris.qris.qrUrl} alt={`QRIS deposit ${activeDepositQris.reference}`} className="apk-app-qris-image" />
                            ) : (
                              <div className="apk-app-qris-fallback">QRIS siap, tetapi gambar belum tersedia.</div>
                            )}
                          </div>

                          <div className="apk-app-live-total-card apk-app-live-total-card--compact smm-qris-total-card">
                            <span>Total Deposit</span>
                            <strong>Rp {activeDepositQris.amountLabel}</strong>
                          </div>

                          {activeDepositQris.qris?.expiryTime ? (
                            <div className="smm-qris-expiry-note">
                              Berlaku sampai {new Date(activeDepositQris.qris.expiryTime).toLocaleString('id-ID')}
                            </div>
                          ) : null}

                          <div className="smm-qris-detail-frame">
                            <p>Deposit ID : {activeDepositQris.reference}</p>
                            <p>Status bayar : {activeDepositQris.paymentStatus === 'awaiting-payment' ? 'menunggu pembayaran' : activeDepositQris.paymentStatus}</p>
                            <p>Jumlah : Rp {activeDepositQris.amountLabel}</p>
                          </div>

                          <div className="apk-app-action-row smm-qris-status-row">
                            <button type="button" className="apk-app-primary-button" onClick={() => void refreshDepositStatus(true)} disabled={isCheckingDepositStatus}>
                              {isCheckingDepositStatus ? 'Memuat...' : 'Cek Status'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {accountModalView === 'riwayat' ? (
                  <div className="account-popup-stack">
                    {depositHistoryEntries.length ? (
                      <div className="account-popup-history-mini">
                        {depositHistoryEntries.slice(0, 8).map((entry) => (
                          <article key={entry.id} className="account-popup-history-mini__row">
                            <div className="account-popup-history-mini__top">
                              <span className="account-popup-history-mini__time">{entry.createdLabel}</span>
                              <span className={`apk-app-history-status apk-app-history-status--${entry.status}`}>{entry.statusLabel}</span>
                            </div>
                            <div className="account-popup-history-mini__bottom">
                              <span className="account-popup-history-mini__amount">{entry.amountLabel}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="apk-app-empty">Belum ada riwayat deposit.</div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
