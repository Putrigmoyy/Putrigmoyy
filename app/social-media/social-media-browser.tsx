'use client';

import { Fragment, useEffect, useMemo, useState, useTransition } from 'react';
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
import { TopAccountMenu } from '@/app/components/top-account-menu';

type Props = {
  profile: NormalizedPusatPanelProfile | null;
  providerMeta: {
    apiUrl: string;
    configured: boolean;
  };
  services: NormalizedPusatPanelService[];
  categories: string[];
};

type SocialTab = 'sosmed' | 'riwayat' | 'status' | 'provider';

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
    contact?: string;
    balance?: number;
  };
};

type CoreBundleResult = {
  status?: boolean;
  data?: CoreBundlePayload | {
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
  { matchers: ['snackvideo'], visual: { label: 'SnackVideo', accent: '#111111', icon: 'snackvideo' } },
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

  const remoteLogo = REMOTE_LOGO_MAP[icon];
  if (remoteLogo) {
    return <img src={remoteLogo} alt="" loading="lazy" referrerPolicy="no-referrer" />;
  }

  return <span className="smm-platform-fallback">{icon}</span>;
}

function formatDate(value: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatServicePickerLabel(service?: NormalizedPusatPanelService | null) {
  if (!service) return 'Pilih Salah Satu';
  return `${service.id} - ${service.name} - Rp${service.priceLabel}`;
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

export function SocialMediaBrowser({ profile, providerMeta, services, categories }: Props) {
  const [activeTab, setActiveTab] = useState<SocialTab>('sosmed');
  const [accountProfile, setAccountProfile] = useState({
    loggedIn: false,
    name: '',
    contact: '',
    balance: 0,
  });
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
  const [expandedStatusHistoryId, setExpandedStatusHistoryId] = useState<number | null>(null);
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
  const switchTargets = [
    { label: 'Apprem', href: '/apk-premium' },
    { label: 'OTP Nokos', href: process.env.NEXT_PUBLIC_OTP_URL || '#', external: true },
    { label: 'Sewa Bot', href: process.env.NEXT_PUBLIC_BOT_RENTAL_URL || '#', external: true },
  ];
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

  const availableStatuses = useMemo(() => {
    const values = Array.from(new Set(sortedHistoryItems.map((item) => String(item.orderStatus || '').trim()).filter(Boolean)));
    return ['Semua', ...values];
  }, [sortedHistoryItems]);

  const availableStatusOrderStatuses = useMemo(() => {
    const values = Array.from(new Set(sortedAccountOrderItems.map((item) => String(item.orderStatus || '').trim()).filter(Boolean)));
    return ['Semua', ...values];
  }, [sortedAccountOrderItems]);

  const availableMonitoringCategories = useMemo(() => {
    const values = Array.from(new Set(sortedHistoryItems.map((item) => String(item.category || '').trim()).filter(Boolean))).sort((left, right) =>
      left.localeCompare(right, 'id'),
    );
    return ['Semua Kategori', ...values];
  }, [sortedHistoryItems]);

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

  const syncAccountBundle = async (contact: string) => {
    const normalizedContact = String(contact || '').trim();
    if (!normalizedContact) return false;
    const response = await fetch(`/api/core/account?contact=${encodeURIComponent(normalizedContact)}`, {
      method: 'GET',
      cache: 'no-store',
    });
    const result = (await response.json()) as CoreBundleResult;
    if (!response.ok || !result.status || !result.data || !('account' in result.data)) {
      throw new Error(
        result.data && 'msg' in result.data && result.data.msg ? String(result.data.msg) : 'Gagal memuat data akun.',
      );
    }

    const account = result.data.account || {};
    setAccountProfile({
      loggedIn: account.loggedIn === true,
      name: String(account.name || ''),
      contact: String(account.contact || ''),
      balance: Math.max(0, Number(account.balance || 0)),
    });
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

  const refreshAccountOrders = (contactOverride?: string) => {
    const normalizedContact = String(contactOverride || accountProfile.contact || '').trim();
    if (!normalizedContact) {
      setAccountOrderItems([]);
      setExpandedStatusHistoryId(null);
      return;
    }

    startAccountOrdersRefresh(async () => {
      try {
        const response = await fetch(`/api/smm/history?limit=150&contact=${encodeURIComponent(normalizedContact)}`, {
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
      if (accountProfile.contact) {
        refreshAccountOrders(accountProfile.contact);
        try {
          await syncAccountBundle(accountProfile.contact);
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
      if (accountProfile.contact) {
        refreshAccountOrders(accountProfile.contact);
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
    setAppliedMonitoringFilter({
      limit: Math.max(1, Number(monitoringFilterDraft.limit || 25)),
      status: monitoringFilterDraft.status,
      category: monitoringFilterDraft.category,
    });
  };

  const applyStatusFilter = () => {
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
        const savedContact = window.localStorage.getItem(WEBSITE_ACCOUNT_SESSION_KEY);
        if (savedContact) {
          await syncAccountBundle(savedContact);
        }
      } catch {
        // ignore session hydration issues
      }
    };

    void hydrateSession();
  }, []);

  useEffect(() => {
    if (accountProfile.loggedIn && accountProfile.contact) {
      refreshAccountOrders(accountProfile.contact);
      return;
    }
    setAccountOrderItems([]);
    setExpandedStatusHistoryId(null);
  }, [accountProfile.contact, accountProfile.loggedIn]);

  useEffect(() => {
    if (activeTab !== 'status' || !accountProfile.loggedIn || !accountProfile.contact) {
      return;
    }

    refreshAccountOrders(accountProfile.contact);
    const intervalId = window.setInterval(() => {
      refreshAccountOrders(accountProfile.contact);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeTab, accountProfile.contact, accountProfile.loggedIn]);

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
    if (!activeCheckoutOrder || activeCheckoutOrder.paymentMethod !== 'midtrans') {
      return;
    }
    if (
      activeCheckoutOrder.paymentStatus === 'paid' ||
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
        services: group.services.sort((left, right) => left.name.localeCompare(right.name, 'id')),
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
    return activePlatform.services.filter((service) => {
      const matchesCategory = service.category === selectedCategory;
      return matchesCategory;
    });
  }, [activePlatform, selectedCategory]);

  const filteredServices = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase();
    return platformServices.filter((service) => {
      if (!query) return true;
      const haystack = `${service.name} ${service.category} ${service.note}`.toLowerCase();
      return haystack.includes(query);
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
          ? ''
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
    if (!selectedService) return 0;
    if (selectedService.menuType === '4') return selectedService.price;
    const units = Math.max(0, calculatedQuantity);
    return selectedService.price * units;
  }, [calculatedQuantity, selectedService]);

  const filteredMonitoringItems = useMemo(() => {
    const filtered = sortedHistoryItems.filter((item) => {
      const matchesStatus =
        appliedMonitoringFilter.status === 'Semua' ||
        String(item.orderStatus || '').toLowerCase() === appliedMonitoringFilter.status.toLowerCase();
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
      const matchesStatus =
        appliedStatusFilter.status === 'Semua' ||
        String(item.orderStatus || '').toLowerCase() === appliedStatusFilter.status.toLowerCase();
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
            accountContact: accountProfile.loggedIn ? accountProfile.contact : '',
            customerName: accountProfile.loggedIn ? accountProfile.name : 'Pelanggan Sosmed',
            service: selectedService.id,
            serviceName: selectedService.name,
            category: selectedService.category,
            data,
            quantity,
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
          if (accountProfile.contact) {
            refreshAccountOrders(accountProfile.contact);
            try {
              await syncAccountBundle(accountProfile.contact);
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
      <div className="apk-app-phone">
        <div className="apk-app-top-strip">
          <TopAccountMenu
            displayName={accountProfile.loggedIn ? accountProfile.name : 'Profil'}
            balance={accountProfile.balance}
            targets={switchTargets}
          />
        </div>
        <div className="apk-app-content apk-app-content--tight">
          {activeTab === 'sosmed' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              {activePlatform ? (
                <>
                  <div className="apk-app-panel-head">
                    <div>
                      <span className="apk-app-section-label">Pilih Platforms dan Layanan</span>
                      <h3>Pilih Platform & Layanan</h3>
                      <p className="smm-platform-copy">Klik salah satu logo platform untuk memuat kategori layanan dari API provider secara langsung.</p>
                    </div>
                  </div>

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

                  <div className="apk-app-form-card">
                    <span className="apk-app-section-label">Kategori Layanan</span>
                    <div className="smm-stage-platform smm-stage-platform--inline">
                      <span className="smm-platform-icon smm-platform-icon--large" style={{ background: activePlatform.accent, boxShadow: `0 12px 28px ${activePlatform.accent}28` }}>
                        <SocialPlatformIcon icon={activePlatform.icon} />
                      </span>
                      <strong>{activePlatform.label}</strong>
                    </div>
                    <div className="smm-select-stack">
                      <button
                        type="button"
                        className={categoryPickerOpen ? 'smm-picker-trigger smm-picker-trigger--open' : 'smm-picker-trigger'}
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
                        className={servicePickerOpen ? 'smm-picker-trigger smm-picker-trigger--multiline smm-picker-trigger--open' : 'smm-picker-trigger smm-picker-trigger--multiline'}
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

                  {selectedService ? (
                    <div className="apk-app-form-card">
                      <span className="apk-app-section-label">Data Pesanan</span>
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

                      <div className="apk-app-form-grid">
                        <label className="apk-app-form-field">
                          <span>Target (URL/Username)</span>
                          <input
                            value={orderForm.data}
                            onChange={(event) => setOrderForm((prev) => ({ ...prev, data: event.target.value }))}
                            placeholder="Masukkan link/username target"
                          />
                        </label>

                        {selectedService.menuType !== '4' && selectedService.menuType !== '2' ? (
                          <label className="apk-app-form-field">
                            <span>Jumlah</span>
                            <input
                              value={orderForm.quantity}
                              onChange={(event) => setOrderForm((prev) => ({ ...prev, quantity: event.target.value.replace(/[^\d]/g, '') }))}
                              placeholder={`Minimal ${selectedService.min.toLocaleString('id-ID')}`}
                            />
                          </label>
                        ) : null}

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

                        {selectedService.menuType === '3' ? (
                          <label className="apk-app-form-field">
                            <span>Username komentar</span>
                            <input
                              value={orderForm.username}
                              onChange={(event) => setOrderForm((prev) => ({ ...prev, username: event.target.value }))}
                              placeholder="Username pemilik komentar"
                            />
                          </label>
                        ) : null}

                        {selectedService.menuType === '2' || selectedService.menuType === '5' ? (
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

                      {activeCheckoutOrder && activeCheckoutOrder.paymentMethod === 'midtrans' ? (
                        <div className="apk-app-qris-shell">
                          <div className="apk-app-qris-head">
                            <div>
                              <span className="apk-app-section-label">QRIS Payment</span>
                              <strong>{activeCheckoutOrder.orderCode}</strong>
                            </div>
                            <div className={`apk-app-order-pill apk-app-order-pill--${activeCheckoutOrder.paymentStatus === 'paid' ? 'success' : activeCheckoutOrder.paymentStatus === 'awaiting-payment' ? 'pending' : 'failed'}`}>
                              {activeCheckoutOrder.paymentStatus === 'awaiting-payment' ? 'Menunggu bayar' : activeCheckoutOrder.paymentStatus}
                            </div>
                          </div>
                          <div className="apk-app-qris-card">
                            {activeCheckoutOrder.qris?.qrUrl ? (
                              <img src={activeCheckoutOrder.qris.qrUrl} alt={`QRIS ${activeCheckoutOrder.orderCode}`} className="apk-app-qris-image" />
                            ) : (
                              <div className="apk-app-qris-fallback">QRIS siap, tetapi gambar belum tersedia.</div>
                            )}
                            <div className="apk-app-qris-copy">
                              <div className="apk-app-live-total-card apk-app-live-total-card--compact">
                                <span>Total Bayar</span>
                                <strong>Rp {activeCheckoutOrder.totalPriceLabel}</strong>
                              </div>
                              <p>{activeCheckoutOrder.nextStep}</p>
                              {activeCheckoutOrder.qris?.expiryTime ? <small>Berlaku sampai {new Date(activeCheckoutOrder.qris.expiryTime).toLocaleString('id-ID')}</small> : null}
                              <div className="apk-app-action-row apk-app-action-row--compact">
                                <button type="button" className="apk-app-primary-button" onClick={refreshCheckoutStatus} disabled={isRefreshingCheckoutStatus}>
                                  {isRefreshingCheckoutStatus ? 'Memuat...' : 'Cek Status'}
                                </button>
                                {activeCheckoutOrder.qris?.deeplinkUrl ? (
                                  <a className="apk-app-ghost-button apk-app-link-button" href={activeCheckoutOrder.qris.deeplinkUrl} target="_blank" rel="noreferrer">
                                    Buka Pembayaran
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="apk-app-form-grid smm-checkout-summary-grid">
                            <label className="apk-app-form-field">
                              <span>Order Code</span>
                              <input value={activeCheckoutOrder.orderCode} readOnly className="smm-readonly-input" />
                            </label>
                            <label className="apk-app-form-field">
                              <span>Layanan</span>
                              <input value={activeCheckoutOrder.serviceName} readOnly className="smm-readonly-input" />
                            </label>
                            <label className="apk-app-form-field">
                              <span>Kategori</span>
                              <input value={activeCheckoutOrder.category} readOnly className="smm-readonly-input" />
                            </label>
                            <label className="apk-app-form-field">
                              <span>Target</span>
                              <input value={activeCheckoutOrder.targetData} readOnly className="smm-readonly-input" />
                            </label>
                            <label className="apk-app-form-field">
                              <span>Jumlah</span>
                              <input value={activeCheckoutOrder.quantity == null ? '-' : String(activeCheckoutOrder.quantity)} readOnly className="smm-readonly-input" />
                            </label>
                            <label className="apk-app-form-field">
                              <span>Metode</span>
                              <input value="QRIS Midtrans" readOnly className="smm-readonly-input" />
                            </label>
                          </div>
                        </div>
                      ) : null}

                      {orderFeedback.tone !== 'idle' ? (
                        <div className={`apk-app-feedback apk-app-feedback--${orderFeedback.tone}`}>
                          {orderFeedback.text}
                        </div>
                      ) : null}

                      <div className="apk-app-action-row">
                        <button type="button" className="apk-app-primary-button" onClick={submitOrder} disabled={isOrdering}>
                          {isOrdering ? 'Mengirim...' : 'Lanjutkan Pembayaran'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="apk-app-empty">Belum ada layanan dari provider yang bisa dipilih.</div>
              )}
            </section>
          ) : null}

          {activeTab === 'riwayat' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="smm-monitoring-header">
                <div className="smm-monitoring-title">
                  <span className="smm-monitoring-title-icon" aria-hidden="true">
                    <SocialNavGlyph type="riwayat" />
                  </span>
                  <div>
                    <span className="apk-app-section-label">Monitoring Layanan Sosial Media</span>
                    <h3>Pantau order sesuai API key aktif</h3>
                  </div>
                </div>
                <p className="smm-provider-copy">
                  Monitoring ini membaca histori order social media yang dikirim menggunakan API key aktif milik {profile?.username || 'provider'}.
                </p>
              </div>

              <div className="apk-app-form-card">
                <div className="smm-monitoring-filter-grid">
                  <label className="apk-app-form-field">
                    <span>Tampilkan Beberapa</span>
                    <select
                      value={monitoringFilterDraft.limit}
                      onChange={(event) => setMonitoringFilterDraft((current) => ({ ...current, limit: event.target.value }))}
                      className="smm-select"
                    >
                      {['10', '25', '50', '100'].map((limit) => (
                        <option key={limit} value={limit}>
                          {limit}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="apk-app-form-field">
                    <span>Filter Status</span>
                    <select
                      value={monitoringFilterDraft.status}
                      onChange={(event) => setMonitoringFilterDraft((current) => ({ ...current, status: event.target.value }))}
                      className="smm-select"
                    >
                      {availableStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="apk-app-form-field">
                    <span>Filter Category</span>
                    <select
                      value={monitoringFilterDraft.category}
                      onChange={(event) => setMonitoringFilterDraft((current) => ({ ...current, category: event.target.value }))}
                      className="smm-select"
                    >
                      {availableMonitoringCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="smm-monitoring-filter-actions">
                    <span>Submit</span>
                    <div className="smm-monitoring-filter-buttons">
                      <button type="button" className="apk-app-primary-button" onClick={applyMonitoringFilter}>
                        Filter
                      </button>
                      <button type="button" className="apk-app-ghost-button" onClick={refreshHistory} disabled={isRefreshingHistory}>
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
                      filteredMonitoringItems.map((item) => (
                        <tr key={item.id}>
                          <td>{formatDate(item.createdAt)}</td>
                          <td>{item.category || '-'}</td>
                          <td>{item.serviceId || '-'}</td>
                          <td>{item.serviceName || '-'}</td>
                          <td>{item.quantity == null ? '-' : item.quantity.toLocaleString('id-ID')}</td>
                          <td>Rp {(item.totalPrice || item.unitPrice || 0).toLocaleString('id-ID')}</td>
                          <td>
                            <span className={`smm-status-badge smm-status-badge--${mapStatusTone(item.orderStatus)}`}>{item.orderStatus || '-'}</span>
                          </td>
                        </tr>
                      ))
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
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Status Order</span>
                  <h3>Riwayat pemesanan sosmed realtime</h3>
                </div>
                <span className="apk-app-count-pill">
                  {pendingAccountOrderCount.toLocaleString('id-ID')} Pending
                </span>
              </div>

              <div className="smm-status-order-note">
                Data ini otomatis diperbarui berkala saat halaman status sedang dibuka. Klik tombol detail untuk melihat rincian pesanan akun yang sedang login.
              </div>

              {accountProfile.loggedIn ? (
                <>
                  <div className="apk-app-info-card smm-status-account-banner">
                    <div>
                      <span>Akun aktif</span>
                      <strong>{accountProfile.name || accountProfile.contact || 'Akun pengguna'}</strong>
                    </div>
                    <div>
                      <span>Kontak</span>
                      <strong>{accountProfile.contact || '-'}</strong>
                    </div>
                    <div>
                      <span>Total transaksi</span>
                      <strong>{sortedAccountOrderItems.length.toLocaleString('id-ID')}</strong>
                    </div>
                  </div>

                  <div className="apk-app-form-card">
                    <div className="smm-status-filter-grid">
                      <label className="apk-app-form-field">
                        <span>Tampilkan</span>
                        <select
                          value={statusFilterDraft.limit}
                          onChange={(event) => setStatusFilterDraft((current) => ({ ...current, limit: event.target.value }))}
                          className="smm-select"
                        >
                          {['10', '25', '50', '100'].map((limit) => (
                            <option key={limit} value={limit}>
                              {limit}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="apk-app-form-field">
                        <span>Filter Status</span>
                        <select
                          value={statusFilterDraft.status}
                          onChange={(event) => setStatusFilterDraft((current) => ({ ...current, status: event.target.value }))}
                          className="smm-select"
                        >
                          {availableStatusOrderStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="apk-app-form-field">
                        <span>Filter Tahun</span>
                        <select
                          value={statusFilterDraft.year}
                          onChange={(event) => setStatusFilterDraft((current) => ({ ...current, year: event.target.value }))}
                          className="smm-select"
                        >
                          {availableStatusYears.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </label>
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
                          <button type="button" className="apk-app-primary-button" onClick={applyStatusFilter}>
                            Filter
                          </button>
                          <button
                            type="button"
                            className="apk-app-ghost-button"
                            onClick={() => refreshAccountOrders(accountProfile.contact)}
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
                            const expanded = expandedStatusHistoryId === item.id;
                            return (
                              <Fragment key={item.id}>
                                <tr>
                                  <td>{item.providerOrderId || item.orderCode || '-'}</td>
                                  <td>{formatDate(item.createdAt)}</td>
                                  <td>{item.serviceName || '-'}</td>
                                  <td>
                                    <div className="smm-status-target">{item.targetData || '-'}</div>
                                  </td>
                                  <td>{item.quantity == null ? '-' : item.quantity.toLocaleString('id-ID')}</td>
                                  <td>Rp {(item.totalPrice || item.unitPrice || 0).toLocaleString('id-ID')}</td>
                                  <td>
                                    <span className={`smm-status-badge smm-status-badge--${mapStatusTone(item.orderStatus)}`}>
                                      {item.orderStatus || '-'}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="smm-status-detail-button"
                                      onClick={() => setExpandedStatusHistoryId(expanded ? null : item.id)}
                                    >
                                      Detail
                                    </button>
                                  </td>
                                </tr>
                                {expanded ? (
                                  <tr>
                                    <td colSpan={8}>
                                      <div className="smm-status-detail-panel">
                                        <p>Order Code : {item.orderCode || '-'}</p>
                                        <p>Provider ID : {item.providerOrderId || '-'}</p>
                                        <p>Kategori : {item.category || '-'}</p>
                                        <p>Service ID : {item.serviceId || '-'}</p>
                                        <p>Metode bayar : {item.paymentMethod === 'balance' ? 'Saldo akun' : item.paymentMethod === 'midtrans' ? 'QRIS Midtrans' : '-'}</p>
                                        <p>Status bayar : {item.paymentStatus || '-'}</p>
                                        <p>Username : {item.username || '-'}</p>
                                        <p>Komentar : {item.comments || '-'}</p>
                                        <p>Update terakhir : {formatDate(item.updatedAt)}</p>
                                      </div>
                                    </td>
                                  </tr>
                                ) : null}
                              </Fragment>
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

          {activeTab === 'provider' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Profil</span>
                  <h3>Profil akun provider aktif</h3>
                </div>
              </div>

              <div className="apk-app-history-card">
                <article className="apk-app-info-card">
                  <strong>{profile?.fullName || 'Profil provider belum terbaca'}</strong>
                  <p className="smm-provider-copy">Profil ini dibaca langsung dari API key dan secret key aktif di Vercel.</p>
                </article>
                <article className="apk-app-info-card smm-provider-grid">
                  <div>
                    <span>Username</span>
                    <strong>{profile?.username || '-'}</strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{profile?.email || '-'}</strong>
                  </div>
                  <div>
                    <span>Balance</span>
                    <strong>Rp {profile?.balanceLabel || '0'}</strong>
                  </div>
                  <div>
                    <span>API URL</span>
                    <strong>{providerMeta.apiUrl}</strong>
                  </div>
                </article>
                <article className="apk-app-info-card smm-provider-grid">
                  <div>
                    <span>Status API</span>
                    <strong>{providerMeta.configured ? 'Terhubung' : 'Belum lengkap'}</strong>
                  </div>
                  <div>
                    <span>Total layanan live</span>
                    <strong>{services.length.toLocaleString('id-ID')}</strong>
                  </div>
                  <div>
                    <span>Total kategori</span>
                    <strong>{categories.length.toLocaleString('id-ID')}</strong>
                  </div>
                  <div>
                    <span>Mode data</span>
                    <strong>Direct provider</strong>
                  </div>
                </article>
              </div>
            </section>
          ) : null}
        </div>

        <nav className="apk-app-bottom-nav">
          {([
            ['sosmed', 'Sosmed'],
            ['riwayat', 'Monitoring'],
            ['status', 'Status'],
            ['provider', 'Profil'],
          ] as Array<[SocialTab, string]>).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
              onClick={() => setActiveTab(tab)}
            >
              <span className="apk-app-nav-icon">
                <SocialNavGlyph type={tab} />
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
      </div>
    </div>
  );
}
