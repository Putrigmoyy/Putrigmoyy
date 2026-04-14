'use client';

import { useDeferredValue, useState, useTransition } from 'react';
import type { ApkPremiumProduct, ApkPremiumVariant } from '@/lib/apk-premium';
import { formatRupiah } from '@/lib/apk-premium';

type Props = {
  products: ApkPremiumProduct[];
  categories: string[];
};

function buildProductTone(accent: ApkPremiumProduct['accent']) {
  if (accent === 'amber') return 'apk-card apk-card--amber';
  if (accent === 'emerald') return 'apk-card apk-card--emerald';
  if (accent === 'violet') return 'apk-card apk-card--violet';
  return 'apk-card apk-card--cyan';
}

export function ApkPremiumBrowser({ products, categories }: Props) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [selectedVariantId, setSelectedVariantId] = useState(products[0]?.variants[0]?.id || '');
  const [checkoutForm, setCheckoutForm] = useState({
    quantity: '1',
    customerName: '',
    customerContact: '',
    note: '',
  });
  const [checkoutPreview, setCheckoutPreview] = useState<null | {
    orderCode: string;
    quantity: number;
    unitPriceLabel: string;
    totalPriceLabel: string;
    dataSource: string;
  }>(null);
  const [checkoutFeedback, setCheckoutFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: 'Isi data customer lalu ambil preview checkout website.',
  });
  const [isPreviewing, startPreview] = useTransition();
  const [isSubmittingOrder, startOrderSubmit] = useTransition();
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'Semua' || product.category === activeCategory;
    const haystack = [product.title, product.subtitle, product.note, product.category, product.delivery].join(' ').toLowerCase();
    const matchesQuery = !deferredQuery || haystack.includes(deferredQuery);
    return matchesCategory && matchesQuery;
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
    totalStock: products.reduce((sum, product) => sum + product.stock, 0),
    totalSold: products.reduce((sum, product) => sum + product.sold, 0),
  };

  const pickProduct = (product: ApkPremiumProduct) => {
    setSelectedProductId(product.id);
    setSelectedVariantId(product.variants[0]?.id || '');
    setCheckoutPreview(null);
    setCheckoutFeedback({
      tone: 'idle',
      text: `Produk "${product.title}" siap dipakai untuk checkout website.`,
    });
  };

  const pickVariant = (variant: ApkPremiumVariant) => {
    setSelectedVariantId(variant.id);
    setCheckoutForm((current) => ({ ...current, quantity: '1' }));
    setCheckoutPreview(null);
    setCheckoutFeedback({
      tone: 'idle',
      text: `Varian "${variant.title}" siap dipreview untuk order website.`,
    });
  };

  const runCheckoutPreview = () => {
    if (!selectedProduct || !selectedVariant) {
      setCheckoutFeedback({ tone: 'error', text: 'Pilih produk dan varian dulu.' });
      return;
    }

    startPreview(async () => {
      setCheckoutFeedback({ tone: 'idle', text: 'Menyiapkan ringkasan checkout website...' });
      setCheckoutPreview(null);
      try {
        const response = await fetch('/api/apk-premium/checkout', {
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
            quantity?: number;
            unitPriceLabel?: string;
            totalPriceLabel?: string;
            dataSource?: string;
          };
        };

        if (!response.ok || !result.status || !result.data?.orderCode) {
          setCheckoutFeedback({
            tone: 'error',
            text: result.data?.msg || 'Preview checkout belum berhasil dibuat.',
          });
          return;
        }

        setCheckoutPreview({
          orderCode: result.data.orderCode,
          quantity: Number(result.data.quantity || 0),
          unitPriceLabel: String(result.data.unitPriceLabel || '0'),
          totalPriceLabel: String(result.data.totalPriceLabel || '0'),
          dataSource: String(result.data.dataSource || '-'),
        });
        setCheckoutFeedback({
          tone: 'success',
          text: `Preview checkout siap. Kode order: ${result.data.orderCode}`,
        });
      } catch (error) {
        setCheckoutFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Preview checkout gagal dibuat.',
        });
      }
    });
  };

  const submitWebsiteOrder = () => {
    if (!selectedProduct || !selectedVariant) {
      setCheckoutFeedback({ tone: 'error', text: 'Pilih produk dan varian dulu.' });
      return;
    }

    startOrderSubmit(async () => {
      setCheckoutFeedback({ tone: 'idle', text: 'Membuat order website APK premium...' });
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
            syncReady?: boolean;
          };
        };

        if (!response.ok || !result.status || !result.data?.orderCode) {
          setCheckoutFeedback({
            tone: 'error',
            text: result.data?.msg || 'Order website belum berhasil dibuat.',
          });
          return;
        }

        setCheckoutFeedback({
          tone: 'success',
          text: `Order ${result.data.orderCode} berhasil dibuat. ${result.data.nextStep || ''}`.trim(),
        });
        setCheckoutPreview((current) =>
          current
            ? {
                ...current,
                orderCode: result.data?.orderCode || current.orderCode,
                totalPriceLabel: String(result.data?.totalPriceLabel || current.totalPriceLabel),
              }
            : current,
        );
      } catch (error) {
        setCheckoutFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Order website gagal dibuat.',
        });
      }
    });
  };

  return (
    <>
      <section className="section-block">
        <div className="apk-stage">
          <div className="apk-hero-card">
            <span className="section-kicker">APK PREMIUM CENTER</span>
            <h2>Etalase akun digital dibuat rapat dan terasa seperti storefront top-up mobile.</h2>
            <p className="apk-hero-copy">
              Mode ini disiapkan untuk sinkron stok pusat dengan aplikasi owner dan autoorder WhatsApp.
              Jadi nanti satu penjualan website atau private chat tetap membaca inventori yang sama.
            </p>
            <div className="apk-hero-actions">
              <a href="#apk-catalog" className="hero-cta">Lihat Etalase</a>
              <a href="#apk-sync" className="hero-ghost">Lihat Sinkronisasi</a>
            </div>
          </div>

          <div className="apk-highlight-stack">
            <article className="apk-mini-panel">
              <span className="stack-label">LIVE SNAPSHOT</span>
              <div className="apk-metrics-grid">
                <div>
                  <span>Produk</span>
                  <strong>{summaryStats.totalProducts}</strong>
                </div>
                <div>
                  <span>Varian</span>
                  <strong>{summaryStats.totalVariants}</strong>
                </div>
                <div>
                  <span>Stock</span>
                  <strong>{summaryStats.totalStock}</strong>
                </div>
                <div>
                  <span>Terjual</span>
                  <strong>{summaryStats.totalSold}</strong>
                </div>
              </div>
            </article>
            <article className="apk-mini-panel apk-mini-panel--accent">
              <span className="stack-label">ALUR JUALAN</span>
              <ul className="apk-flow-list">
                <li>Pilih produk premium</li>
                <li>Pilih varian paling cocok</li>
                <li>Checkout website / private chat</li>
                <li>Stock pusat otomatis ikut bergerak</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section id="apk-catalog" className="section-block">
        <div className="section-headline">
          <span className="section-kicker">ETALASE PRODUK</span>
          <h2>Katalog premium dibuat seperti rak produk digital yang padat dan gampang discan dari HP</h2>
        </div>

        <div className="catalog-toolbar">
          <label className="catalog-search">
            <span>Cari produk premium</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari Canva, Netflix, YT Premium, AI Tools, atau kategori"
            />
          </label>
          <div className="catalog-toolbar-side">
            <span className="catalog-chip catalog-chip--solid">{filteredProducts.length} produk</span>
            <span className="catalog-chip">{categories.length} kategori</span>
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

        <div className="apk-grid">
          {filteredProducts.map((product) => (
            <article key={product.id} className={buildProductTone(product.accent)}>
              <div className="apk-card-head">
                <span className="service-logo-pill">{product.category}</span>
                <span className="service-id-pill">{product.delivery}</span>
              </div>
              <h3>{product.title}</h3>
              <p className="apk-card-subtitle">{product.subtitle}</p>

              <div className="apk-card-metrics">
                <div>
                  <span>Stock</span>
                  <strong>{product.stock}</strong>
                </div>
                <div>
                  <span>Terjual</span>
                  <strong>{product.sold}</strong>
                </div>
                <div>
                  <span>Rating</span>
                  <strong>{product.rating}</strong>
                </div>
              </div>

              <p className="service-note">{product.note}</p>

              <div className="apk-card-actions">
                <button type="button" className="hero-cta service-action-button" onClick={() => pickProduct(product)}>
                  Pilih Produk
                </button>
              </div>
            </article>
          ))}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            Produk belum cocok dengan pencarian atau kategori ini.
          </div>
        ) : null}
      </section>

      <section className="section-block">
        <div className="section-headline">
          <span className="section-kicker">DETAIL PRODUK</span>
          <h2>Varian dan ringkasan order dibuat seperti langkah checkout mobile marketplace</h2>
        </div>

        <div className="apk-detail-grid">
          <article className="apk-detail-panel">
            {selectedProduct ? (
              <>
                <div className="order-panel-head">
                  <div>
                    <span className="stack-label">PRODUK TERPILIH</span>
                    <h3>{selectedProduct.title}</h3>
                  </div>
                  <span className="service-id-pill">{selectedProduct.category}</span>
                </div>

                <p className="order-panel-copy">{selectedProduct.subtitle}</p>

                <div className="order-selected-summary">
                  <div>
                    <span>Stock</span>
                    <strong>{selectedProduct.stock}</strong>
                  </div>
                  <div>
                    <span>Terjual</span>
                    <strong>{selectedProduct.sold}</strong>
                  </div>
                  <div>
                    <span>Delivery</span>
                    <strong>{selectedProduct.delivery}</strong>
                  </div>
                  <div>
                    <span>Garansi</span>
                    <strong>{selectedProduct.guarantee}</strong>
                  </div>
                </div>

                <div className="apk-variant-list">
                  {selectedProduct.variants.map((variant) => {
                    const active = selectedVariant?.id === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        className={active ? 'apk-variant-card apk-variant-card--active' : 'apk-variant-card'}
                        onClick={() => pickVariant(variant)}
                      >
                        <div className="apk-variant-head">
                          <div>
                            <strong>{variant.title}</strong>
                            <span>{variant.duration}</span>
                          </div>
                          {variant.badge ? <em>{variant.badge}</em> : null}
                        </div>
                        <div className="apk-variant-foot">
                          <span>Rp {formatRupiah(variant.price)}</span>
                          <small>{variant.stock} stock</small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="empty-state">
                Pilih produk dari etalase agar detail varian aktif.
              </div>
            )}
          </article>

          <article className="apk-summary-panel">
            <span className="stack-label">RINGKASAN ORDER</span>
            <h3>{selectedVariant ? selectedVariant.title : 'Pilih varian dulu'}</h3>
            <p className="order-panel-copy">
              Panel ini menjadi jembatan untuk checkout website, Midtrans, dan sinkron stok pusat saat backend final tersambung.
            </p>

            {selectedProduct && selectedVariant ? (
              <>
                <div className="status-result-card">
                  <div>
                    <span>Produk</span>
                    <strong>{selectedProduct.title}</strong>
                  </div>
                  <div>
                    <span>Varian</span>
                    <strong>{selectedVariant.title}</strong>
                  </div>
                  <div>
                    <span>Durasi</span>
                    <strong>{selectedVariant.duration}</strong>
                  </div>
                  <div>
                    <span>Harga</span>
                    <strong>Rp {formatRupiah(selectedVariant.price)}</strong>
                  </div>
                  <div>
                    <span>Stock varian</span>
                    <strong>{selectedVariant.stock}</strong>
                  </div>
                  <div>
                    <span>Pengiriman</span>
                    <strong>{selectedProduct.delivery}</strong>
                  </div>
                </div>

                <div className="apk-summary-note">
                  <strong>Deskripsi Produk</strong>
                  <p>{selectedProduct.note}</p>
                </div>

                <div className="apk-order-step-box">
                  <span>Checkout Website</span>
                  <div className="apk-form-grid">
                    <label className="form-field">
                      <span>Nama customer</span>
                      <input
                        value={checkoutForm.customerName}
                        onChange={(event) => setCheckoutForm((current) => ({ ...current, customerName: event.target.value }))}
                        placeholder="Nama pembeli"
                      />
                    </label>
                    <label className="form-field">
                      <span>Kontak customer</span>
                      <input
                        value={checkoutForm.customerContact}
                        onChange={(event) => setCheckoutForm((current) => ({ ...current, customerContact: event.target.value }))}
                        placeholder="Nomor WhatsApp / username"
                      />
                    </label>
                    <label className="form-field">
                      <span>Jumlah</span>
                      <input
                        value={checkoutForm.quantity}
                        onChange={(event) => setCheckoutForm((current) => ({ ...current, quantity: event.target.value.replace(/[^\d]/g, '') || '1' }))}
                        placeholder="1"
                      />
                    </label>
                    <label className="form-field">
                      <span>Catatan</span>
                      <input
                        value={checkoutForm.note}
                        onChange={(event) => setCheckoutForm((current) => ({ ...current, note: event.target.value }))}
                        placeholder="Catatan tambahan order"
                      />
                    </label>
                  </div>

                  {checkoutPreview ? (
                    <div className="apk-checkout-preview">
                      <div>
                        <span>Kode order</span>
                        <strong>{checkoutPreview.orderCode}</strong>
                      </div>
                      <div>
                        <span>Jumlah</span>
                        <strong>{checkoutPreview.quantity}</strong>
                      </div>
                      <div>
                        <span>Harga satuan</span>
                        <strong>Rp {checkoutPreview.unitPriceLabel}</strong>
                      </div>
                      <div>
                        <span>Total</span>
                        <strong>Rp {checkoutPreview.totalPriceLabel}</strong>
                      </div>
                    </div>
                  ) : null}

                  <div className={`feedback-box feedback-box--${checkoutFeedback.tone}`}>
                    {checkoutFeedback.text}
                  </div>
                </div>

                <div className="apk-order-step-box">
                  <span>Langkah berikutnya</span>
                  <ul className="apk-flow-list">
                    <li>Sambungkan stok pusat dari Neon / backend</li>
                    <li>Hubungkan checkout Midtrans website</li>
                    <li>Sinkron order berhasil ke aplikasi owner</li>
                    <li>Kirim notifikasi ke grup store</li>
                  </ul>
                </div>

                <div className="order-form-actions">
                  <button type="button" className="hero-cta order-submit-button" onClick={runCheckoutPreview} disabled={isPreviewing}>
                    {isPreviewing ? 'Menyiapkan preview...' : 'Ambil Preview Checkout'}
                  </button>
                  <button type="button" className="hero-cta order-submit-button" onClick={submitWebsiteOrder} disabled={isSubmittingOrder}>
                    {isSubmittingOrder ? 'Membuat order...' : 'Buat Order Website'}
                  </button>
                  <button type="button" className="hero-ghost order-submit-button">Lanjut Private Chat</button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                Pilih produk dan varian supaya ringkasan checkout tampil.
              </div>
            )}
          </article>
        </div>
      </section>

      <section id="apk-sync" className="section-block">
        <div className="section-headline">
          <span className="section-kicker">PETA SINKRONISASI</span>
          <h2>Flow stok pusat, website, dan private autoorder dibuat saling terhubung sejak dari desainnya</h2>
        </div>

        <div className="apk-sync-grid">
          <article className="trust-card">
            <h3>1. Aplikasi owner</h3>
            <p>Owner restock akun, atur produk, edit varian, dan kelola database akun dari panel aplikasi.</p>
          </article>
          <article className="trust-card">
            <h3>2. Database pusat</h3>
            <p>Produk, varian, akun, order, dan pembayaran membaca tabel yang sama agar stock tidak bentrok.</p>
          </article>
          <article className="trust-card">
            <h3>3. Website + WhatsApp</h3>
            <p>Order dari website atau private chat sama-sama mengurangi stok pusat dan bisa memicu notifikasi ke owner.</p>
          </article>
        </div>
      </section>
    </>
  );
}
