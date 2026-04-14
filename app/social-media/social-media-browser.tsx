'use client';

import { useDeferredValue, useState, useTransition } from 'react';
import type { NormalizedPusatPanelService } from '@/lib/pusatpanel';

const INITIAL_VISIBLE_COUNT = 36;

type Props = {
  services: NormalizedPusatPanelService[];
  categories: string[];
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

type ProviderOrderResult = {
  status?: boolean;
  data?: {
    id?: string;
    msg?: string;
  };
};

function buildMenuTypeTitle(menuType: string) {
  if (menuType === '2') return 'Custom Comments';
  if (menuType === '3') return 'Comment Likes';
  if (menuType === '4') return 'Package';
  if (menuType === '5') return 'SEO';
  return 'Default';
}

function buildMenuTypeHint(menuType: string) {
  if (menuType === '2') return 'Isi link/target lalu daftar komentar terpisah per baris.';
  if (menuType === '3') return 'Isi link/target, quantity, lalu username pemilik komentar.';
  if (menuType === '4') return 'Isi link/target tanpa quantity tambahan.';
  if (menuType === '5') return 'Isi link/target, quantity, lalu daftar keyword / komen per baris.';
  return 'Isi link/target lalu quantity sesuai batas min dan max provider.';
}

function createInitialOrderForm(service?: NormalizedPusatPanelService | null) {
  return {
    data: '',
    quantity: service ? String(Math.max(0, service.min || 0)) : '',
    username: '',
    comments: '',
  };
}

export function SocialMediaBrowser({ services, categories }: Props) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [activeMenuType, setActiveMenuType] = useState('Semua');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [orderForm, setOrderForm] = useState(createInitialOrderForm(services[0] || null));
  const [orderFeedback, setOrderFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: 'Pilih layanan di katalog lalu isi form order di panel ini.',
  });
  const [statusOrderId, setStatusOrderId] = useState('');
  const [statusFeedback, setStatusFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: 'Masukkan ID order untuk cek status proses provider.',
  });
  const [statusResult, setStatusResult] = useState<ProviderStatusResult['data'] | null>(null);
  const [isOrdering, startOrdering] = useTransition();
  const [isCheckingStatus, startStatusCheck] = useTransition();
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredServices = services.filter((service) => {
    const matchesCategory = activeCategory === 'Semua' || service.category === activeCategory;
    const matchesMenuType = activeMenuType === 'Semua' || service.menuType === activeMenuType;
    const haystack = [
      service.name,
      service.category,
      service.note,
      service.logoType,
      service.speed,
    ].join(' ').toLowerCase();
    const matchesQuery = !deferredQuery || haystack.includes(deferredQuery);
    return matchesCategory && matchesMenuType && matchesQuery;
  });

  const visibleServices = filteredServices.slice(0, visibleCount);
  const selectedService = services.find((service) => service.id === selectedServiceId) || filteredServices[0] || services[0] || null;
  const menuTypeOptions = ['Semua', ...Array.from(new Set(services.map((service) => service.menuType).filter(Boolean)))];

  const resetVisible = () => setVisibleCount(INITIAL_VISIBLE_COUNT);

  const pickService = (service: NormalizedPusatPanelService) => {
    setSelectedServiceId(service.id);
    setOrderForm(createInitialOrderForm(service));
    setOrderFeedback({
      tone: 'idle',
      text: `Layanan "${service.name}" siap diorder.`,
    });
  };

  const submitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        const result = await response.json() as ProviderOrderResult;
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
        const result = await response.json() as ProviderStatusResult;
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
    <>
      <section className="section-block">
        <div className="section-headline">
          <span className="section-kicker">KATALOG LIVE</span>
          <h2>Daftar layanan provider yang sudah bisa kamu filter langsung dari HP</h2>
        </div>

        <div className="catalog-toolbar">
          <label className="catalog-search">
            <span>Cari layanan</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetVisible();
              }}
              placeholder="Cari nama layanan, kategori, note, atau logo"
            />
          </label>
          <div className="catalog-toolbar-side">
            <span className="catalog-chip catalog-chip--solid">{filteredServices.length} layanan</span>
            <span className="catalog-chip">{categories.length} kategori</span>
          </div>
        </div>

        <div className="chip-scroller">
          <button
            type="button"
            className={activeCategory === 'Semua' ? 'catalog-chip catalog-chip--active' : 'catalog-chip'}
            onClick={() => {
              setActiveCategory('Semua');
              resetVisible();
            }}
          >
            Semua
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={activeCategory === category ? 'catalog-chip catalog-chip--active' : 'catalog-chip'}
              onClick={() => {
                setActiveCategory(category);
                resetVisible();
              }}
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
              onClick={() => {
                setActiveMenuType(menuType);
                resetVisible();
              }}
            >
              Menu {menuType}
            </button>
          ))}
        </div>

        <div className="services-grid">
          {visibleServices.map((service) => (
            <article key={service.id} className="service-card">
              <div className="service-card-top">
                <span className="service-logo-pill">{service.logoType}</span>
                <span className="service-id-pill">ID {service.id}</span>
              </div>
              <h3>{service.name}</h3>
              <p className="service-category">{service.category}</p>
              <div className="service-metrics">
                <div>
                  <span>Harga</span>
                  <strong>Rp {service.priceLabel}</strong>
                </div>
                <div>
                  <span>Kecepatan</span>
                  <strong>{service.speed}</strong>
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
              {service.note ? <p className="service-note">{service.note}</p> : <p className="service-note service-note--empty">Belum ada note tambahan dari provider.</p>}
              <div className="service-card-actions">
                <button type="button" className="hero-cta service-action-button" onClick={() => pickService(service)}>
                  Pilih Layanan
                </button>
              </div>
            </article>
          ))}
        </div>

        {filteredServices.length === 0 ? (
          <div className="empty-state">
            Tidak ada layanan yang cocok dengan pencarian atau filter ini.
          </div>
        ) : null}

        {visibleCount < filteredServices.length ? (
          <div className="catalog-actions">
            <button type="button" className="hero-cta" onClick={() => setVisibleCount((current) => current + INITIAL_VISIBLE_COUNT)}>
              Muat lebih banyak
            </button>
          </div>
        ) : null}
      </section>

      <section className="section-block">
        <div className="section-headline">
          <span className="section-kicker">ORDER & STATUS</span>
          <h2>Form order provider dan cek status dibuat dalam satu alur</h2>
        </div>

        <div className="order-status-grid">
          <article className="order-panel">
            <div className="order-panel-head">
              <div>
                <span className="stack-label">FORM ORDER</span>
                <h3>{selectedService ? selectedService.name : 'Pilih layanan dari katalog'}</h3>
              </div>
              {selectedService ? <span className="service-id-pill">Menu {selectedService.menuType}</span> : null}
            </div>

            {selectedService ? (
              <>
                <p className="order-panel-copy">{buildMenuTypeHint(selectedService.menuType)}</p>
                <div className="order-selected-summary">
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

                <form className="order-form" onSubmit={submitOrder}>
                  <label className="form-field">
                    <span>Target / data</span>
                    <input
                      value={orderForm.data}
                      onChange={(event) => setOrderForm((prev) => ({ ...prev, data: event.target.value }))}
                      placeholder="Masukkan link, username, atau target order"
                    />
                  </label>

                  {selectedService.menuType !== '4' && selectedService.menuType !== '2' ? (
                    <label className="form-field">
                      <span>Quantity</span>
                      <input
                        value={orderForm.quantity}
                        onChange={(event) => setOrderForm((prev) => ({ ...prev, quantity: event.target.value.replace(/[^\d]/g, '') }))}
                        placeholder={`Minimal ${selectedService.min}`}
                      />
                    </label>
                  ) : null}

                  {selectedService.menuType === '3' ? (
                    <label className="form-field">
                      <span>Username pemilik komentar</span>
                      <input
                        value={orderForm.username}
                        onChange={(event) => setOrderForm((prev) => ({ ...prev, username: event.target.value }))}
                        placeholder="Masukkan username pemilik komentar"
                      />
                    </label>
                  ) : null}

                  {selectedService.menuType === '2' || selectedService.menuType === '5' ? (
                    <label className="form-field">
                      <span>{selectedService.menuType === '2' ? 'Daftar komentar' : 'Daftar keyword / komen'}</span>
                      <textarea
                        value={orderForm.comments}
                        onChange={(event) => setOrderForm((prev) => ({ ...prev, comments: event.target.value }))}
                        rows={6}
                        placeholder={selectedService.menuType === '2' ? 'Satu komentar per baris' : 'Satu keyword per baris'}
                      />
                    </label>
                  ) : null}

                  <div className={`feedback-box feedback-box--${orderFeedback.tone}`}>
                    {orderFeedback.text}
                  </div>

                  <div className="order-form-actions">
                    <button type="submit" className="hero-cta order-submit-button" disabled={isOrdering}>
                      {isOrdering ? 'Mengirim order...' : 'Kirim Order Provider'}
                    </button>
                    <button
                      type="button"
                      className="hero-ghost order-submit-button"
                      onClick={() => {
                        setOrderForm(createInitialOrderForm(selectedService));
                        setOrderFeedback({
                          tone: 'idle',
                          text: 'Form order direset untuk layanan yang sedang dipilih.',
                        });
                      }}
                    >
                      Reset Form
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="empty-state">
                Pilih salah satu layanan di katalog agar panel order aktif.
              </div>
            )}
          </article>

          <article className="status-panel">
            <span className="stack-label">CEK STATUS ORDER</span>
            <h3>Status order provider bisa dicek langsung dari website</h3>
            <p className="order-panel-copy">Masukkan ID order dari hasil transaksi. Sistem akan membaca status terbaru dari provider.</p>

            <label className="form-field">
              <span>ID order</span>
              <input
                value={statusOrderId}
                onChange={(event) => setStatusOrderId(event.target.value)}
                placeholder="Contoh: 123456"
              />
            </label>

            <div className={`feedback-box feedback-box--${statusFeedback.tone}`}>
              {statusFeedback.text}
            </div>

            {statusResult ? (
              <div className="status-result-card">
                <div>
                  <span>Status</span>
                  <strong>{statusResult.status || '-'}</strong>
                </div>
                <div>
                  <span>Start count</span>
                  <strong>{Number(statusResult.start_count || 0).toLocaleString('id-ID')}</strong>
                </div>
                <div>
                  <span>Remains</span>
                  <strong>{Number(statusResult.remains || 0).toLocaleString('id-ID')}</strong>
                </div>
              </div>
            ) : null}

            <div className="order-form-actions">
              <button type="button" className="hero-cta order-submit-button" onClick={checkOrderStatus} disabled={isCheckingStatus}>
                {isCheckingStatus ? 'Mengambil status...' : 'Cek Status'}
              </button>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
