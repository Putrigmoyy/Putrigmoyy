'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useDeferredValue, useEffect, useState, useTransition } from 'react';
import type { ApkPremiumProduct, ApkPremiumVariant } from '@/lib/apk-premium';
import { formatRupiah } from '@/lib/apk-premium';

type Props = {
  products: ApkPremiumProduct[];
  categories: string[];
};

type PremiumTab = 'apprem' | 'deposit' | 'riwayat' | 'profil';

type HistoryEntry = {
  id: string;
  type: 'order';
  title: string;
  detail: string;
  amountLabel: string;
  createdAt: string;
};

const productArtwork: Record<string, string> = {
  canva: '/premium-icons/canva.jpg',
  netflix: '/premium-icons/netflix.jpg',
  'yt-premium': '/premium-icons/youtube.jpg',
  capcut: '/premium-icons/capcut.jpg',
  spotify: '/premium-icons/spotify.jpg',
  chatgpt: '/premium-icons/chatgpt.jpg',
};

function getProductArtwork(productId: string) {
  return productArtwork[productId] || '/dashboard-apk-premium.svg';
}

function getLowestPrice(product: ApkPremiumProduct) {
  if (!product.variants.length) return 0;
  return Math.min(...product.variants.map((variant) => variant.price));
}

function getTotalVariantStock(product: ApkPremiumProduct) {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

function NavGlyph({ type }: { type: PremiumTab }) {
  if (type === 'apprem') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 9h8M8 12h8M8 15h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

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

export function ApkPremiumBrowser({ products, categories }: Props) {
  const [activeTab, setActiveTab] = useState<PremiumTab>('apprem');
  const [query, setQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [selectedVariantId, setSelectedVariantId] = useState(products[0]?.variants[0]?.id || '');
  const [appremMode, setAppremMode] = useState<'catalog' | 'order'>('catalog');
  const [checkoutForm, setCheckoutForm] = useState({
    quantity: '1',
    customerName: '',
    customerContact: '',
    note: '',
  });
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [checkoutFeedback, setCheckoutFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: 'Pilih aplikasi premium lalu lanjutkan order langsung dari menu apprem.',
  });
  const [isSubmittingOrder, startOrderSubmit] = useTransition();
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

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

  const filteredProducts = products.filter((product) => {
    const haystack = [product.title, product.subtitle, product.category, product.note, product.delivery].join(' ').toLowerCase();
    return !deferredQuery || haystack.includes(deferredQuery);
  });

  const selectedProduct =
    filteredProducts.find((product) => product.id === selectedProductId) ||
    products.find((product) => product.id === selectedProductId) ||
    filteredProducts[0] ||
    products[0] ||
    null;

  const selectedVariant =
    selectedProduct?.variants.find((variant) => variant.id === selectedVariantId) ||
    selectedProduct?.variants[0] ||
    null;

  const summaryStats = {
    totalProducts: products.length,
    totalVariants: products.reduce((sum, product) => sum + product.variants.length, 0),
    totalStock: products.reduce((sum, product) => sum + getTotalVariantStock(product), 0),
    totalSold: products.reduce((sum, product) => sum + product.sold, 0),
  };

  const selectedQuantity = Math.max(1, Number(checkoutForm.quantity || 1));
  const selectedTotal = selectedVariant ? selectedVariant.price * selectedQuantity : 0;

  const pushHistory = (entry: Omit<HistoryEntry, 'id' | 'createdAt'>) => {
    setHistoryEntries((current) => [
      {
        ...entry,
        id: `${entry.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
      ...current,
    ].slice(0, 10));
  };

  const openProduct = (product: ApkPremiumProduct) => {
    setSelectedProductId(product.id);
    setSelectedVariantId(product.variants[0]?.id || '');
    setCheckoutFeedback({
      tone: 'idle',
      text: `Produk "${product.title}" siap dilanjutkan ke order.`,
    });
    setActiveTab('apprem');
    setAppremMode('order');
  };

  const backToCatalog = () => {
    setAppremMode('catalog');
    setCheckoutFeedback({
      tone: 'idle',
      text: 'Pilih aplikasi premium lalu lanjutkan order langsung dari menu apprem.',
    });
  };

  const pickVariant = (variant: ApkPremiumVariant) => {
    setSelectedVariantId(variant.id);
    setCheckoutForm((current) => ({ ...current, quantity: '1' }));
    setCheckoutFeedback({
      tone: 'idle',
      text: `Varian "${variant.title}" siap dilanjutkan ke order.`,
    });
  };

  const submitWebsiteOrder = () => {
    if (!selectedProduct || !selectedVariant) {
      setCheckoutFeedback({ tone: 'error', text: 'Pilih produk dan varian dulu.' });
      return;
    }

    startOrderSubmit(async () => {
      setCheckoutFeedback({ tone: 'idle', text: 'Membuat order APK premium...' });

      try {
        const response = await fetch('/api/apk-premium/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: selectedProduct.id,
            variantId: selectedVariant.id,
            quantity: Number(checkoutForm.quantity || 0),
            customerName: checkoutForm.customerName,
            customerContact: checkoutForm.customerContact,
            note: checkoutForm.note,
          }),
        });

        const result = await response.json() as {
          status?: boolean;
          data?: {
            msg?: string;
            orderCode?: string;
            totalPriceLabel?: string;
            nextStep?: string;
          };
        };

        if (!response.ok || !result.status || !result.data?.orderCode) {
          setCheckoutFeedback({
            tone: 'error',
            text: result.data?.msg || 'Order belum berhasil dibuat.',
          });
          return;
        }

        setCheckoutFeedback({
          tone: 'success',
          text: `Order ${result.data.orderCode} berhasil dibuat. ${result.data.nextStep || ''}`.trim(),
        });

        pushHistory({
          type: 'order',
          title: `${selectedProduct.title} - ${selectedVariant.title}`,
          detail: `Order ${result.data.orderCode}`,
          amountLabel: `Rp ${String(result.data.totalPriceLabel || '0')}`,
        });
      } catch (error) {
        setCheckoutFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Order gagal dibuat.',
        });
      }
    });
  };

  return (
    <div className="apk-app-shell">
      <div className="apk-app-phone">
        <div className="apk-app-content apk-app-content--tight">
          {activeTab === 'apprem' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              {appremMode === 'catalog' ? (
                <>
                  <label className="apk-app-search apk-app-search--top">
                    <span>Cari aplikasi premium</span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Cari Canva, Netflix, Spotify, ChatGPT"
                    />
                  </label>

                  <div className="apk-app-inline-stats">
                    {categories.map((category) => (
                      <span key={category}>{category}</span>
                    ))}
                  </div>

                  <div className="apk-app-product-grid">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="apk-app-product-card"
                        onClick={() => openProduct(product)}
                      >
                        <div className="apk-app-product-image">
                          <Image
                            src={getProductArtwork(product.id)}
                            alt={product.title}
                            fill
                            sizes="(max-width: 640px) 42vw, 180px"
                            className="apk-app-product-art"
                          />
                        </div>
                        <div className="apk-app-product-copy">
                          <strong>{product.title}</strong>
                          <div className="apk-app-product-meta">
                            <span>{getTotalVariantStock(product)} stock</span>
                            <span>{product.sold} terjual</span>
                          </div>
                          <em>Mulai Rp {formatRupiah(getLowestPrice(product))}</em>
                        </div>
                      </button>
                    ))}
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="apk-app-empty">Belum ada aplikasi yang cocok dengan pencarian ini.</div>
                  ) : null}
                </>
              ) : selectedProduct && selectedVariant ? (
                <>
                  <div className="apk-app-order-head">
                    <button type="button" className="apk-app-back-button" onClick={backToCatalog}>
                      Kembali
                    </button>
                    <div className="apk-app-order-head-copy">
                      <span className="apk-app-section-label">Apprem</span>
                      <h3>{selectedProduct.title}</h3>
                    </div>
                  </div>

                  <div className="apk-app-selected-card">
                    <div className="apk-app-selected-image">
                      <Image
                        src={getProductArtwork(selectedProduct.id)}
                        alt={selectedProduct.title}
                        fill
                        sizes="120px"
                        className="apk-app-product-art"
                      />
                    </div>
                    <div className="apk-app-selected-copy">
                      <strong>{selectedProduct.title}</strong>
                      <span>{selectedProduct.subtitle}</span>
                      <small>
                        {getTotalVariantStock(selectedProduct)} stock - {selectedProduct.sold} terjual
                      </small>
                    </div>
                  </div>

                  <div className="apk-app-variant-list">
                    {selectedProduct.variants.map((variant) => {
                      const active = selectedVariant.id === variant.id;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          className={active ? 'apk-app-variant-card apk-app-variant-card--active' : 'apk-app-variant-card'}
                          onClick={() => pickVariant(variant)}
                        >
                          <div className="apk-app-variant-copy">
                            <strong>{variant.title}</strong>
                            <span>{variant.duration}</span>
                            {variant.badge ? <small className="apk-app-variant-badge">{variant.badge}</small> : null}
                          </div>
                          <div className="apk-app-variant-meta">
                            <em>Rp {formatRupiah(variant.price)}</em>
                            <small>{variant.stock} stock</small>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="apk-app-form-card">
                    <span className="apk-app-section-label">Order</span>
                    <div className="apk-app-form-note">
                      Total akan otomatis berubah mengikuti jumlah yang kamu isi di bawah.
                    </div>

                    <div className="apk-app-form-grid">
                      <label className="apk-app-form-field">
                        <span>Nama customer</span>
                        <input
                          value={checkoutForm.customerName}
                          onChange={(event) => setCheckoutForm((current) => ({ ...current, customerName: event.target.value }))}
                          placeholder="Nama pembeli"
                        />
                      </label>
                      <label className="apk-app-form-field">
                        <span>Kontak customer</span>
                        <input
                          value={checkoutForm.customerContact}
                          onChange={(event) => setCheckoutForm((current) => ({ ...current, customerContact: event.target.value }))}
                          placeholder="WhatsApp / username"
                        />
                      </label>
                      <label className="apk-app-form-field">
                        <span>Jumlah</span>
                        <input
                          value={checkoutForm.quantity}
                          onChange={(event) => setCheckoutForm((current) => ({ ...current, quantity: event.target.value.replace(/[^\d]/g, '') || '1' }))}
                          placeholder="1"
                        />
                      </label>
                      <label className="apk-app-form-field">
                        <span>Catatan</span>
                        <input
                          value={checkoutForm.note}
                          onChange={(event) => setCheckoutForm((current) => ({ ...current, note: event.target.value }))}
                          placeholder="Catatan tambahan"
                        />
                      </label>
                    </div>

                    <div className="apk-app-live-total-card">
                      <span>Total Bayar Saat Ini</span>
                      <strong>Rp {formatRupiah(selectedTotal)}</strong>
                    </div>

                    <div className={`apk-app-feedback apk-app-feedback--${checkoutFeedback.tone}`}>
                      {checkoutFeedback.text}
                    </div>

                    <div className="apk-app-action-row">
                      <button type="button" className="apk-app-primary-button" onClick={submitWebsiteOrder} disabled={isSubmittingOrder}>
                        {isSubmittingOrder ? 'Memproses...' : 'Buat Order'}
                      </button>
                      <button type="button" className="apk-app-ghost-button" onClick={backToCatalog}>
                        Pilih Aplikasi Lain
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="apk-app-empty">Pilih aplikasi premium dari daftar dulu.</div>
              )}
            </section>
          ) : null}

          {activeTab === 'deposit' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Deposit</span>
                  <h3>Metode isi saldo dan pembayaran</h3>
                </div>
              </div>

              <div className="apk-app-info-stack">
                <article className="apk-app-info-card">
                  <strong>Deposit QRIS Website</strong>
                  <p>Hubungkan QRIS Midtrans website agar pelanggan bisa isi saldo atau bayar order premium dengan cepat.</p>
                </article>
                <article className="apk-app-info-card">
                  <strong>Deposit Social Media</strong>
                  <p>Saldo untuk layanan social media nanti bisa dibuat satu alur terpisah agar lebih rapi dan hemat limit.</p>
                </article>
                <article className="apk-app-info-card">
                  <strong>Status Sinkron Owner</strong>
                  <p>Begitu backend penuh aktif, notifikasi deposit berhasil bisa masuk ke aplikasi owner dan grup store kamu.</p>
                </article>
              </div>
            </section>
          ) : null}

          {activeTab === 'riwayat' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Riwayat Transaksi</span>
                  <h3>Aktivitas order</h3>
                </div>
              </div>

              {historyEntries.length ? (
                <div className="apk-app-info-stack">
                  {historyEntries.map((entry) => (
                    <article key={entry.id} className="apk-app-info-card">
                      <strong>{entry.title}</strong>
                      <p>{entry.detail}</p>
                      <p>
                        {entry.amountLabel} - {entry.createdAt}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="apk-app-empty">Belum ada riwayat transaksi. Aktivitas order akan muncul di sini.</div>
              )}
            </section>
          ) : null}

          {activeTab === 'profil' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Profil</span>
                  <h3>Putri Gmoyy Store</h3>
                </div>
              </div>

              <div className="apk-app-info-stack">
                <article className="apk-app-info-card">
                  <strong>Katalog Premium</strong>
                  <p>
                    Total {summaryStats.totalProducts} aplikasi premium dengan {summaryStats.totalVariants} varian aktif dan {summaryStats.totalStock} stock.
                  </p>
                </article>
                <article className="apk-app-info-card">
                  <strong>Kategori Aktif</strong>
                  <p>{categories.join(', ')}</p>
                </article>
                <article className="apk-app-info-card">
                  <strong>Navigasi Cepat</strong>
                  <p>
                    <Link href="/">Kembali ke dashboard utama</Link>
                  </p>
                </article>
              </div>
            </section>
          ) : null}
        </div>

        <nav className="apk-app-bottom-nav">
          <button
            type="button"
            className={activeTab === 'apprem' ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
            onClick={() => setActiveTab('apprem')}
          >
            <span className="apk-app-nav-icon">
              <NavGlyph type="apprem" />
            </span>
            <span>Apprem</span>
          </button>
          <button
            type="button"
            className={activeTab === 'deposit' ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
            onClick={() => setActiveTab('deposit')}
          >
            <span className="apk-app-nav-icon">
              <NavGlyph type="deposit" />
            </span>
            <span>Deposit</span>
          </button>
          <button
            type="button"
            className={activeTab === 'riwayat' ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
            onClick={() => setActiveTab('riwayat')}
          >
            <span className="apk-app-nav-icon">
              <NavGlyph type="riwayat" />
            </span>
            <span>Riwayat</span>
          </button>
          <button
            type="button"
            className={activeTab === 'profil' ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
            onClick={() => setActiveTab('profil')}
          >
            <span className="apk-app-nav-icon">
              <NavGlyph type="profil" />
            </span>
            <span>Profil</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
