'use client';

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
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
  };
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
        <rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 9h8M8 12h8M8 15h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
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
  if (type === 'status') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9.5 12.3l1.7 1.7 3.7-4.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8h16M7 5h10M6 11h12v8H6z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function SocialMediaBrowser({ profile, providerMeta, services, categories }: Props) {
  const [activeTab, setActiveTab] = useState<SocialTab>('sosmed');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [activeMenuType, setActiveMenuType] = useState('Semua');
  const [sosmedMode, setSosmedMode] = useState<'catalog' | 'order'>('catalog');
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
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
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const menuTypeOptions = useMemo(() => ['Semua', ...Array.from(new Set(services.map((service) => service.menuType).filter(Boolean)))], [services]);

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

  const filteredServices = services.filter((service) => {
    const matchesCategory = activeCategory === 'Semua' || service.category === activeCategory;
    const matchesMenuType = activeMenuType === 'Semua' || service.menuType === activeMenuType;
    const haystack = [service.name, service.category, service.note, service.logoType, service.speed].join(' ').toLowerCase();
    const matchesQuery = !deferredQuery || haystack.includes(deferredQuery);
    return matchesCategory && matchesMenuType && matchesQuery;
  });

  const selectedService =
    filteredServices.find((service) => service.id === selectedServiceId) ||
    services.find((service) => service.id === selectedServiceId) ||
    filteredServices[0] ||
    services[0] ||
    null;

  const summaryStats = {
    totalServices: services.length,
    totalCategories: categories.length,
    avgPrice: services.length ? Math.round(services.reduce((sum, service) => sum + service.price, 0) / services.length) : 0,
  };

  const pickService = (service: NormalizedPusatPanelService) => {
    setSelectedServiceId(service.id);
    setOrderForm(createInitialOrderForm(service));
    setOrderFeedback({
      tone: 'idle',
      text: `Layanan "${service.name}" siap dilanjutkan ke order provider.`,
    });
    setActiveTab('sosmed');
    setSosmedMode('order');
  };

  const backToCatalog = () => {
    setSosmedMode('catalog');
    setOrderFeedback({
      tone: 'idle',
      text: 'Pilih layanan social media langsung dari katalog live provider.',
    });
  };

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
              {sosmedMode === 'catalog' ? (
                <>
                  <label className="apk-app-search apk-app-search--top">
                    <span>Cari layanan social media</span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Cari followers, views, likes, subscribers"
                    />
                  </label>

                  <div className="apk-app-inline-stats">
                    {categories.slice(0, 8).map((category) => (
                      <span key={category}>{category}</span>
                    ))}
                  </div>

                  <div className="smm-mini-summary">
                    <div>
                      <span>Total layanan</span>
                      <strong>{summaryStats.totalServices.toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                      <span>Kategori</span>
                      <strong>{summaryStats.totalCategories.toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                      <span>Avg harga</span>
                      <strong>Rp {summaryStats.avgPrice.toLocaleString('id-ID')}</strong>
                    </div>
                  </div>

                  <div className="chip-scroller">
                    <button
                      type="button"
                      className={activeCategory === 'Semua' ? 'catalog-chip catalog-chip--active' : 'catalog-chip'}
                      onClick={() => setActiveCategory('Semua')}
                    >
                      Semua
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={activeCategory === category ? 'catalog-chip catalog-chip--active' : 'catalog-chip'}
                        onClick={() => setActiveCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  <div className="chip-scroller chip-scroller--secondary">
                    {menuTypeOptions.map((menuType) => (
                      <button
                        key={menuType}
                        type="button"
                        className={activeMenuType === menuType ? 'catalog-chip catalog-chip--secondary-active' : 'catalog-chip catalog-chip--secondary'}
                        onClick={() => setActiveMenuType(menuType)}
                      >
                        {menuType === 'Semua' ? 'Semua Menu' : `Menu ${menuType}`}
                      </button>
                    ))}
                  </div>

                  <div className="smm-app-service-list">
                    {filteredServices.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        className="smm-app-service-card"
                        onClick={() => pickService(service)}
                      >
                        <div className="smm-app-service-top">
                          <span className="service-logo-pill">{service.logoType}</span>
                          <span className="service-id-pill">ID {service.id}</span>
                        </div>
                        <strong>{service.name}</strong>
                        <small>{service.category}</small>
                        <div className="smm-app-service-meta">
                          <span>{buildMenuTypeTitle(service.menuType)}</span>
                          <span>{service.speed}</span>
                        </div>
                        <div className="smm-app-service-stats">
                          <div>
                            <span>Harga</span>
                            <strong>Rp {service.priceLabel}</strong>
                          </div>
                          <div>
                            <span>Min</span>
                            <strong>{service.min.toLocaleString('id-ID')}</strong>
                          </div>
                          <div>
                            <span>Max</span>
                            <strong>{service.max.toLocaleString('id-ID')}</strong>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {filteredServices.length === 0 ? <div className="apk-app-empty">Tidak ada layanan yang cocok dengan pencarian ini.</div> : null}
                </>
              ) : selectedService ? (
                <>
                  <div className="apk-app-order-head">
                    <button type="button" className="apk-app-back-button" onClick={backToCatalog}>
                      Kembali
                    </button>
                    <div className="apk-app-order-head-copy">
                      <span className="apk-app-section-label">Kebutuhan Social Media</span>
                      <h3>{selectedService.name}</h3>
                    </div>
                  </div>

                  <div className="apk-app-selected-card">
                    <div className="apk-app-selected-copy apk-app-selected-copy--wide">
                      <strong>{selectedService.name}</strong>
                      <small>{selectedService.category} - Menu {selectedService.menuType}</small>
                    </div>
                  </div>

                  <div className="apk-app-info-card smm-order-summary">
                    <div>
                      <span>Harga</span>
                      <strong>Rp {selectedService.priceLabel}</strong>
                    </div>
                    <div>
                      <span>Min</span>
                      <strong>{selectedService.min.toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                      <span>Max</span>
                      <strong>{selectedService.max.toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                      <span>Tipe</span>
                      <strong>{buildMenuTypeTitle(selectedService.menuType)}</strong>
                    </div>
                  </div>

                  <div className="apk-app-inline-helper">
                    {buildMenuTypeHint(selectedService.menuType)}
                  </div>

                  <div className="apk-app-form-card">
                    <span className="apk-app-section-label">Order</span>
                    <div className="apk-app-form-grid">
                      <label className="apk-app-form-field">
                        <span>Target / data</span>
                        <input
                          value={orderForm.data}
                          onChange={(event) => setOrderForm((prev) => ({ ...prev, data: event.target.value }))}
                          placeholder="Link post, username, atau target layanan"
                        />
                      </label>

                      {selectedService.menuType !== '4' && selectedService.menuType !== '2' ? (
                        <label className="apk-app-form-field">
                          <span>Quantity</span>
                          <input
                            value={orderForm.quantity}
                            onChange={(event) => setOrderForm((prev) => ({ ...prev, quantity: event.target.value.replace(/[^\d]/g, '') }))}
                            placeholder={`Minimal ${selectedService.min}`}
                          />
                        </label>
                      ) : null}

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

                    {orderFeedback.tone !== 'idle' ? (
                      <div className={`apk-app-feedback apk-app-feedback--${orderFeedback.tone}`}>
                        {orderFeedback.text}
                      </div>
                    ) : null}

                    <div className="apk-app-action-row">
                      <button type="button" className="apk-app-primary-button" onClick={submitOrder} disabled={isOrdering}>
                        {isOrdering ? 'Mengirim...' : 'Kirim Order'}
                      </button>
                      <button type="button" className="apk-app-ghost-button" onClick={backToCatalog}>
                        Pilih Layanan Lain
                      </button>
                    </div>
                  </div>
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
              className={activeTab === tab ? 'apk-app-bottom-tab apk-app-bottom-tab--active' : 'apk-app-bottom-tab'}
              onClick={() => setActiveTab(tab)}
            >
              <span className="apk-app-bottom-icon">
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
