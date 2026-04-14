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
