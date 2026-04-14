'use client';

import { Fragment, useEffect, useMemo, useState, useTransition } from 'react';
import type { NormalizedPusatPanelProfile, NormalizedPusatPanelService } from '@/lib/pusatpanel';

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

type ProviderOrderResult = {
  status?: boolean;
  data?: {
    id?: string;
    msg?: string;
  };
};

type ProviderStatusResult = {
  status?: boolean;
  data?: {
    status?: string;
    start_count?: number;
    remains?: number;
    msg?: string;
  };
};

type HistoryItem = {
  id: number;
  providerOrderId: string;
  serviceId: string;
  serviceName: string;
  category: string;
  targetData: string;
  quantity: number | null;
  username: string;
  comments: string;
  orderStatus: string;
  createdAt: string;
  updatedAt: string;
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
  { matchers: ['instagram', 'ig'], visual: { label: 'Instagram', accent: '#e4408b', icon: 'instagram' } },
  { matchers: ['tiktok'], visual: { label: 'TikTok', accent: '#111111', icon: 'tiktok' } },
  { matchers: ['facebook', 'fb'], visual: { label: 'Facebook', accent: '#1877f2', icon: 'facebook' } },
  { matchers: ['whatsapp', 'wa'], visual: { label: 'WhatsApp', accent: '#25d366', icon: 'whatsapp' } },
  { matchers: ['threads'], visual: { label: 'Threads', accent: '#111111', icon: 'threads' } },
  { matchers: ['twitter', 'x.com', 'twitter / x', ' x '], visual: { label: 'Twitter / X', accent: '#1d9bf0', icon: 'x' } },
  { matchers: ['spotify'], visual: { label: 'Spotify', accent: '#1db954', icon: 'spotify' } },
  { matchers: ['discord'], visual: { label: 'Discord', accent: '#5865f2', icon: 'discord' } },
  { matchers: ['soundcloud'], visual: { label: 'SoundCloud', accent: '#ff7700', icon: 'soundcloud' } },
  { matchers: ['pinterest'], visual: { label: 'Pinterest', accent: '#e60023', icon: 'pinterest' } },
  { matchers: ['quora'], visual: { label: 'Quora', accent: '#b92b27', icon: 'quora' } },
  { matchers: ['mobile app install', 'app install'], visual: { label: 'Mobile App Install', accent: '#17a65b', icon: 'install' } },
  { matchers: ['linkedin'], visual: { label: 'LinkedIn', accent: '#0a66c2', icon: 'linkedin' } },
  { matchers: ['likee'], visual: { label: 'Likee', accent: '#ff6680', icon: 'likee' } },
  { matchers: ['dailymotion'], visual: { label: 'Dailymotion', accent: '#0066dc', icon: 'dailymotion' } },
  { matchers: ['audiomack'], visual: { label: 'Audiomack', accent: '#ff9900', icon: 'audiomack' } },
  { matchers: ['youtube', 'yt'], visual: { label: 'YouTube', accent: '#ff0000', icon: 'youtube' } },
  { matchers: ['telegram'], visual: { label: 'Telegram', accent: '#27a7e7', icon: 'telegram' } },
  { matchers: ['shopee'], visual: { label: 'Shopee', accent: '#ee4d2d', icon: 'shopee' } },
  { matchers: ['tokopedia'], visual: { label: 'Tokopedia', accent: '#03ac0e', icon: 'tokopedia' } },
];

function buildMenuTypeTitle(menuType: string) {
  if (menuType === '2') return 'Custom Comments';
  if (menuType === '3') return 'Comment Likes';
  if (menuType === '4') return 'Package';
  if (menuType === '5') return 'SEO';
  return 'Default';
}

function buildMenuTypeHint(menuType: string) {
  if (menuType === '2') return 'Isi target lalu komentar dipisah per baris.';
  if (menuType === '3') return 'Isi target, quantity, dan username pemilik komentar.';
  if (menuType === '4') return 'Isi target tanpa quantity tambahan.';
  if (menuType === '5') return 'Isi target, quantity, lalu keyword per baris.';
  return 'Isi target dan quantity sesuai batas min dan max.';
}

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

function detectPlatformVisual(service: NormalizedPusatPanelService): SocialPlatformVisual {
  const haystack = `${service.category} ${service.name} ${service.note}`.toLowerCase();
  const match = PLATFORM_VISUALS.find((entry) => entry.matchers.some((matcher) => haystack.includes(matcher)));
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
  if (icon === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4.5" y="4.5" width="15" height="15" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17" cy="7.4" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  if (icon === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13 5v8.25a3 3 0 1 1-2.4-2.94" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M13 5c.65 1.5 1.8 2.7 3.2 3.4 1 .5 1.75.65 2.3.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }
  if (icon === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.2 20v-7h2.35l.45-2.9H13.2V8.45c0-.82.34-1.45 1.56-1.45H16V4.46c-.64-.1-1.42-.16-2.3-.16-2.27 0-3.82 1.39-3.82 3.95V10.1H7.5V13h2.38v7Z" fill="currentColor" />
      </svg>
    );
  }
  if (icon === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4.8a7.2 7.2 0 0 0-6.2 10.84L5 19.3l3.78-.74A7.2 7.2 0 1 0 12 4.8Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9.25 8.95c.3-.66.64-.68.9-.69.23-.01.5-.01.77-.01.2 0 .52.08.79.65.27.58.92 2.25 1 2.41.08.16.14.35.03.57-.11.22-.17.35-.34.53-.16.18-.34.4-.48.53-.16.15-.33.3-.14.58.2.29.86 1.42 1.84 2.3 1.26 1.13 2.33 1.48 2.6 1.64.27.16.42.13.57-.08.15-.21.66-.76.84-1.02.18-.27.36-.22.61-.13.26.09 1.63.77 1.91.91.28.14.47.21.54.33.07.11.07.67-.16 1.31-.23.65-1.36 1.28-1.89 1.36-.49.07-1.1.11-1.77-.11-.41-.13-.93-.31-1.6-.6-2.8-1.21-4.64-4.22-4.78-4.42-.14-.2-1.13-1.5-1.13-2.87 0-1.37.71-2.04.96-2.33Z" fill="currentColor" />
      </svg>
    );
  }
  if (icon === 'threads') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.9 10.35c-.24-2.3-1.92-3.52-4.44-3.52-2.95 0-4.9 1.94-4.9 4.86 0 3.42 2.6 5.5 5.64 5.5 2.93 0 4.7-1.6 4.7-3.73 0-1.86-1.22-3.03-3.67-3.03-1.88 0-3.16.84-3.16 2.16 0 1.06.82 1.82 2.1 1.82 1.1 0 1.93-.5 2.17-1.53.2-.88.09-1.76-.03-2.53-.25-1.55-.97-3.5-3.85-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
      </svg>
    );
  }
  if (icon === 'x') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.2 5.5h2.85l3.4 4.46 3.78-4.46h1.88l-4.84 5.73 5.53 7.27h-2.85l-3.85-5.05-4.27 5.05H6.95l5.28-6.26Z" fill="currentColor" />
      </svg>
    );
  }
  if (icon === 'spotify') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.1 10.1c2.62-.7 5.72-.46 8.68.68" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
        <path d="M8.9 13.05c2.1-.45 4.45-.24 6.65.66" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M9.7 15.85c1.58-.28 3.18-.14 4.85.53" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      </svg>
    );
  }
  if (icon === 'discord') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.2 8.4c1.1-.5 2.26-.77 3.4-.84l.42.8c1.15-.02 2.3.1 3.42.38.13-.27.27-.54.42-.81 1.14.08 2.27.36 3.35.85 1.3 1.95 1.86 4.01 1.67 6.18-1.02.76-2.01 1.22-2.97 1.48-.24-.33-.46-.68-.66-1.05.36-.13.71-.3 1.04-.49-.09-.07-.18-.14-.26-.22-2 1-4.95 1-6.96 0l-.26.22c.33.2.68.36 1.04.49-.2.37-.42.72-.66 1.05-.96-.26-1.95-.72-2.97-1.48-.22-2.41.44-4.47 1.68-6.18Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
        <circle cx="9.8" cy="12.35" r="1.15" fill="currentColor" />
        <circle cx="14.2" cy="12.35" r="1.15" fill="currentColor" />
      </svg>
    );
  }
  if (icon === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.6 8.1c-.2-.78-.82-1.4-1.6-1.6C16.72 6.1 12 6.1 12 6.1s-4.72 0-6 .4c-.78.2-1.4.82-1.6 1.6-.4 1.29-.4 3.98-.4 3.98s0 2.69.4 3.98c.2.78.82 1.4 1.6 1.6 1.28.4 6 .4 6 .4s4.72 0 6-.4c.78-.2 1.4-.82 1.6-1.6.4-1.29.4-3.98.4-3.98s0-2.69-.4-3.98Z" fill="currentColor" />
        <path d="m10.4 14.8 4.2-2.8-4.2-2.8Z" fill="#ffffff" />
      </svg>
    );
  }
  if (icon === 'telegram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m19.7 5.2-2.47 13.2c-.19.94-.68 1.16-1.37.72l-4.42-3.25-2.13 2.05c-.24.24-.43.43-.89.43l.32-4.53 8.25-7.45c.36-.32-.08-.49-.56-.16l-10.2 6.42-4.4-1.38c-.96-.3-.98-.96.2-1.42L18.4 4.2c.75-.27 1.4.17 1.3 1Z" fill="currentColor" />
      </svg>
    );
  }
  if (icon === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.8 8.4a1.45 1.45 0 1 0 0-2.9 1.45 1.45 0 0 0 0 2.9ZM5.6 9.9h2.4v8.2H5.6Zm3.9 0h2.3v1.12h.03c.32-.61 1.1-1.25 2.27-1.25 2.43 0 2.88 1.6 2.88 3.69v4.64h-2.4V14c0-.98-.02-2.24-1.36-2.24-1.37 0-1.58 1.07-1.58 2.17v4.17H9.5Z" fill="currentColor" />
      </svg>
    );
  }
  if (icon === 'pinterest') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.35 5.2c-3.6 0-5.75 2.57-5.75 5.37 0 2.05 1.14 3.22 1.82 3.22.28 0 .43-.77.43-.99 0-.26-.67-.84-.67-1.95 0-2.31 1.76-3.95 4.03-3.95 1.96 0 3.42 1.11 3.42 3.16 0 1.53-.62 4.41-2.61 4.41-.72 0-1.34-.6-1.34-1.34 0-1.16.81-2.27.81-3.47 0-2.03-2.88-1.66-2.88.79 0 .52.07 1.1.3 1.58-.43 1.86-1.3 4.62-.87 6.52l.09.37.25-.29c.35-.42 1.77-4.87 1.77-4.87.44.84 1.58 1.3 2.48 1.3 3.8 0 5.5-3.38 5.5-6.74 0-2.84-2.47-4.89-5.78-4.89Z" fill="currentColor" />
      </svg>
    );
  }
  if (icon === 'soundcloud') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.1 16.6H6.7a2.2 2.2 0 1 1 .3-4.37 3.93 3.93 0 0 1 7.63 1.17 2.56 2.56 0 0 1 2.58 2.55 2.65 2.65 0 0 1-.06.55H9.1Z" fill="currentColor" />
        <path d="M4.3 16.6h-.95v-4.1h.95Zm1.7 0H5v-5.3h1Zm1.65 0H6.7V10.5h.95Zm1.65 0h-.95V9.2h.95Z" fill="currentColor" />
      </svg>
    );
  }
  return <span className="smm-platform-fallback">{icon}</span>;
}

function formatDate(value: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapStatusTone(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized.includes('success') || normalized.includes('complete') || normalized.includes('completed') || normalized.includes('processing')) {
    return 'success';
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
  const [selectedPlatformKey, setSelectedPlatformKey] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [orderForm, setOrderForm] = useState(createInitialOrderForm(services[0] || null));
  const [orderFeedback, setOrderFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: 'Pilih layanan social media langsung dari katalog live provider.',
  });
  const [statusOrderId, setStatusOrderId] = useState('');
  const [statusFeedback, setStatusFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: 'Masukkan ID order untuk cek status dari provider.',
  });
  const [statusResult, setStatusResult] = useState<ProviderStatusResult['data'] | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
  const [isOrdering, startOrdering] = useTransition();
  const [isCheckingStatus, startStatusCheck] = useTransition();
  const [isRefreshingHistory, startHistoryRefresh] = useTransition();
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
        const response = await fetch('/api/smm/history?limit=40', {
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

  useEffect(() => {
    refreshHistory();
  }, []);

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
    setSelectedCategory((current) => (current && activePlatform.categories.includes(current) ? current : activePlatform.categories[0] || ''));
  }, [activePlatform]);

  const platformServices = useMemo(() => {
    if (!activePlatform) return [];
    return activePlatform.services.filter((service) => {
      const matchesCategory = !selectedCategory || service.category === selectedCategory;
      return matchesCategory;
    });
  }, [activePlatform, selectedCategory]);

  useEffect(() => {
    const nextService = platformServices.find((service) => service.id === selectedServiceId) || platformServices[0] || null;
    setSelectedServiceId(nextService?.id || '');
    if (nextService) {
      setOrderForm((prev) => ({
        ...prev,
        quantity: nextService.menuType === '4' ? '' : prev.quantity && nextService.id === selectedServiceId ? prev.quantity : String(Math.max(0, nextService.min || 0)),
      }));
    }
  }, [platformServices, selectedServiceId]);

  const selectedService =
    platformServices.find((service) => service.id === selectedServiceId) ||
    services.find((service) => service.id === selectedServiceId) ||
    platformServices[0] ||
    services[0] ||
    null;

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
      setOrderFeedback({ tone: 'idle', text: 'Mengirim order ke provider...' });
      try {
        const response = await fetch('/api/smm/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service: selectedService.id,
            serviceName: selectedService.name,
            category: selectedService.category,
            data,
            quantity,
            username,
            komen: comments,
          }),
        });
        const result = (await response.json()) as ProviderOrderResult;
        if (!response.ok || !result.status || !result.data?.id) {
          setOrderFeedback({
            tone: 'error',
            text: result.data?.msg || 'Order gagal diproses oleh provider.',
          });
          return;
        }
        setStatusOrderId(result.data.id);
        setOrderFeedback({
          tone: 'success',
          text: `Order berhasil dibuat. ID provider: ${result.data.id}`,
        });
        refreshHistory();
        setActiveTab('riwayat');
      } catch (error) {
        setOrderFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Order gagal dikirim.',
        });
      }
    });
  };

  const checkOrderStatus = () => {
    const orderId = statusOrderId.trim();
    if (!orderId) {
      setStatusFeedback({ tone: 'error', text: 'Isi ID order dulu.' });
      return;
    }

    startStatusCheck(async () => {
      setStatusFeedback({ tone: 'idle', text: 'Mengambil status order dari provider...' });
      try {
        const response = await fetch('/api/smm/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: orderId }),
        });
        const result = (await response.json()) as ProviderStatusResult;
        if (!response.ok || !result.status || !result.data?.status) {
          setStatusResult(null);
          setStatusFeedback({
            tone: 'error',
            text: result.data?.msg || 'Status order tidak ditemukan.',
          });
          return;
        }
        setStatusResult(result.data);
        setStatusFeedback({
          tone: 'success',
          text: `Status order saat ini: ${result.data.status}`,
        });
        refreshHistory();
      } catch (error) {
        setStatusResult(null);
        setStatusFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Gagal mengambil status order.',
        });
      }
    });
  };

  return (
    <div className="apk-app-shell">
      <div className="apk-app-phone">
        <div className="apk-app-content apk-app-content--tight">
          {activeTab === 'sosmed' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              {activePlatform ? (
                <>
                  <div className="apk-app-panel-head">
                    <div>
                      <span className="apk-app-section-label">Kebutuhan Social Media</span>
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
                      <label className="apk-app-form-field">
                        <span>Pilih kategori layanan</span>
                        <select
                          value={selectedCategory}
                          onChange={(event) => setSelectedCategory(event.target.value)}
                          className="smm-select"
                        >
                          {activePlatform.categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="apk-app-form-card">
                    <span className="apk-app-section-label">Pilih Layanan</span>
                    <div className="smm-select-stack">
                      <label className="apk-app-form-field">
                        <span>Pilih layanan</span>
                        <select
                          value={selectedService?.id || ''}
                          onChange={(event) => setSelectedServiceId(event.target.value)}
                          className="smm-select"
                        >
                          {platformServices.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {platformServices.length === 0 ? <div className="apk-app-empty">Tidak ada layanan yang cocok di platform ini.</div> : null}
                  </div>

                  {selectedService ? (
                    <div className="apk-app-form-card">
                      <span className="apk-app-section-label">Data Pesanan</span>
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

                      <div className="smm-order-summary-card">
                        <div>
                          <span>Harga per unit</span>
                          <strong>Rp {selectedService.priceLabel}</strong>
                        </div>
                        <div>
                          <span>Tipe layanan</span>
                          <strong>{buildMenuTypeTitle(selectedService.menuType)}</strong>
                        </div>
                        <div>
                          <span>Min / Max</span>
                          <strong>
                            {selectedService.min.toLocaleString('id-ID')} / {selectedService.max.toLocaleString('id-ID')}
                          </strong>
                        </div>
                        <div>
                          <span>Total Harga</span>
                          <strong>Rp {liveTotal.toLocaleString('id-ID')}</strong>
                        </div>
                      </div>

                      <div className="apk-app-inline-helper">{buildMenuTypeHint(selectedService.menuType)}</div>

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
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Riwayat</span>
                  <h3>Order social media yang tersimpan</h3>
                </div>
                <button type="button" className="apk-app-ghost-button" onClick={refreshHistory} disabled={isRefreshingHistory}>
                  {isRefreshingHistory ? 'Memuat...' : 'Refresh'}
                </button>
              </div>

              <div className="apk-app-history-card">
                {historyItems.length === 0 ? (
                  <div className="apk-app-empty">Belum ada riwayat order social media yang tersimpan.</div>
                ) : (
                  historyItems.map((item) => (
                    <article key={item.id} className="apk-app-info-card">
                      <div className="apk-app-history-head">
                        <div className="apk-app-history-meta">
                          <strong>{item.serviceName}</strong>
                          <span>{item.category}</span>
                          <span>ID Provider : {item.providerOrderId || '-'}</span>
                          <span>Waktu : {formatDate(item.createdAt)}</span>
                        </div>
                        <div className={`apk-app-history-status apk-app-history-status--${mapStatusTone(item.orderStatus)}`}>
                          {item.orderStatus}
                        </div>
                      </div>
                      <div className="apk-app-action-row apk-app-action-row--compact">
                        <button
                          type="button"
                          className="apk-app-ghost-button"
                          onClick={() => setExpandedHistoryId((current) => (current === item.id ? null : item.id))}
                        >
                          {expandedHistoryId === item.id ? 'Tutup Detail' : 'Lihat Detail'}
                        </button>
                      </div>
                      {expandedHistoryId === item.id ? (
                        <div className="apk-app-history-detail">
                          <p>Target : {item.targetData || '-'}</p>
                          <p>Quantity : {item.quantity == null ? '-' : item.quantity.toLocaleString('id-ID')}</p>
                          <p>Username : {item.username || '-'}</p>
                          <p>Komentar : {item.comments || '-'}</p>
                          <p>Update Terakhir : {formatDate(item.updatedAt)}</p>
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          ) : null}

          {activeTab === 'status' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Status</span>
                  <h3>Cek status order provider langsung</h3>
                </div>
              </div>

              <div className="apk-app-form-card">
                <div className="apk-app-form-grid">
                  <label className="apk-app-form-field">
                    <span>ID order provider</span>
                    <input
                      value={statusOrderId}
                      onChange={(event) => setStatusOrderId(event.target.value)}
                      placeholder="Contoh 123456"
                    />
                  </label>
                </div>

                {statusFeedback.tone !== 'idle' ? (
                  <div className={`apk-app-feedback apk-app-feedback--${statusFeedback.tone}`}>
                    {statusFeedback.text}
                  </div>
                ) : null}

                {statusResult ? (
                  <div className="smm-status-grid">
                    <div className="apk-app-info-card">
                      <span>Status</span>
                      <strong>{statusResult.status || '-'}</strong>
                    </div>
                    <div className="apk-app-info-card">
                      <span>Start Count</span>
                      <strong>{Number(statusResult.start_count || 0).toLocaleString('id-ID')}</strong>
                    </div>
                    <div className="apk-app-info-card">
                      <span>Remains</span>
                      <strong>{Number(statusResult.remains || 0).toLocaleString('id-ID')}</strong>
                    </div>
                  </div>
                ) : null}

                <div className="apk-app-action-row">
                  <button type="button" className="apk-app-primary-button" onClick={checkOrderStatus} disabled={isCheckingStatus}>
                    {isCheckingStatus ? 'Memuat...' : 'Cek Status'}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'provider' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Provider</span>
                  <h3>Koneksi langsung ke PusatPanelSMM</h3>
                </div>
              </div>

              <div className="apk-app-history-card">
                <article className="apk-app-info-card">
                  <strong>{profile?.fullName || 'Profil provider belum terbaca'}</strong>
                  <p className="smm-provider-copy">Semua layanan di halaman ini diambil langsung dari API provider menggunakan API key dan secret key aktif di Vercel.</p>
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
            ['riwayat', 'Riwayat'],
            ['status', 'Status'],
            ['provider', 'Provider'],
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
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
