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

type PremiumTab = 'dashboard' | 'kategori' | 'checkout' | 'info';

const productArtwork: Record<string, string> = {
  canva: '/premium-canva.svg',
  netflix: '/premium-netflix.svg',
  'yt-premium': '/premium-youtube.svg',
  capcut: '/premium-capcut.svg',
  spotify: '/premium-spotify.svg',
  chatgpt: '/premium-chatgpt.svg',
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

export function ApkPremiumBrowser({ products, categories }: Props) {
  const [activeTab, setActiveTab] = useState<PremiumTab>('dashboard');
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
    text: 'Pilih produk premium lalu lanjut ke checkout website.',
  });
  const [isPreviewing, startPreview] = useTransition();
  const [isSubmittingOrder, startOrderSubmit] = useTransition();
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    const previousPaddingBottom = document.body.style.paddingBottom;
    document.body.style.paddingBottom = '0';

    return () => {
      document.body.style.paddingBottom = previousPaddingBottom;
    };
  }, []);

  const summaryStats = {
    totalProducts: products.length,
    totalVariants: products.reduce((sum, product) => sum + product.variants.length, 0),
    totalStock: products.reduce((sum, product) => sum + getTotalVariantStock(product), 0),
    totalSold: products.reduce((sum, product) => sum + product.sold, 0),
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'Semua' || product.category === activeCategory;
    const haystack = [product.title, product.subtitle, product.category, product.note, product.delivery].join(' ').toLowerCase();
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

  const openProduct = (product: ApkPremiumProduct, nextTab: PremiumTab = 'checkout') => {
    setSelectedProductId(product.id);
    setSelectedVariantId(product.variants[0]?.id || '');
    setCheckoutPreview(null);
    setCheckoutFeedback({
      tone: 'idle',
      text: `Produk "${product.title}" siap dilanjutkan ke checkout.`,
    });
    setActiveTab(nextTab);
  };

  const pickVariant = (variant: ApkPremiumVariant) => {
    setSelectedVariantId(variant.id);
    setCheckoutForm((current) => ({ ...current, quantity: '1' }));
    setCheckoutPreview(null);
    setCheckoutFeedback({
      tone: 'idle',
      text: `Varian "${variant.title}" siap dipreview untuk checkout website.`,
    });
  };

  const runCheckoutPreview = () => {
    if (!selectedProduct || !selectedVariant) {
      setCheckoutFeedback({ tone: 'error', text: 'Pilih produk dan varian dulu.' });
      return;
    }

    startPreview(async () => {
      setCheckoutFeedback({ tone: 'idle', text: 'Menyiapkan preview checkout website...' });
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
    <div className="apk-app-shell">
      <div className="apk-app-phone">
        <header className="apk-app-header">
          <Link href="/" className="apk-app-home-link">
            Dashboard
          </Link>
          <div className="apk-app-header-copy">
            <span className="apk-app-kicker">Aplikasi Premium</span>
            <h1>Putri Gmoyy Store</h1>
          </div>
          <span className="apk-app-header-badge">Mobile</span>
        </header>

        <section className="apk-app-hero">
          <div>
            <span className="apk-app-kicker">Premium Center</span>
            <h2>Semua aplikasi premium dalam satu menu yang rapat dan nyaman di HP.</h2>
            <p>
              Dashboard ini disusun seperti aplikasi mobile, lengkap dengan daftar produk bergambar,
              kategori, checkout website, dan info sinkronisasi.
            </p>
          </div>
          <div className="apk-app-stat-strip">
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
          </div>
        </section>

        <div className="apk-app-content">
          {activeTab === 'dashboard' ? (
            <section className="apk-app-panel">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Dashboard</span>
                  <h3>Daftar aplikasi premium</h3>
                </div>
                <span className="apk-app-count-pill">{filteredProducts.length} produk</span>
              </div>

              <label className="apk-app-search">
                <span>Cari aplikasi premium</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari Canva, Netflix, Spotify, AI Tools"
                />
              </label>

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
                      <span>{product.category}</span>
                      <em>Mulai Rp {formatRupiah(getLowestPrice(product))}</em>
                    </div>
                  </button>
                ))}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="apk-app-empty">Belum ada produk yang cocok dengan pencarian ini.</div>
              ) : null}
            </section>
          ) : null}

          {activeTab === 'kategori' ? (
            <section className="apk-app-panel">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Kategori</span>
                  <h3>Pilih kategori paling cocok</h3>
                </div>
              </div>

              <div className="apk-app-chip-row">
                <button
                  type="button"
                  className={activeCategory === 'Semua' ? 'apk-app-chip apk-app-chip--active' : 'apk-app-chip'}
                  onClick={() => setActiveCategory('Semua')}
                >
                  Semua
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={activeCategory === category ? 'apk-app-chip apk-app-chip--active' : 'apk-app-chip'}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="apk-app-category-stack">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="apk-app-category-row"
                    onClick={() => openProduct(product)}
                  >
                    <div className="apk-app-category-row-image">
                      <Image
                        src={getProductArtwork(product.id)}
                        alt={product.title}
                        fill
                        sizes="80px"
                        className="apk-app-product-art"
                      />
                    </div>
                    <div className="apk-app-category-row-copy">
                      <strong>{product.title}</strong>
                      <span>{product.subtitle}</span>
                      <small>
                        {product.variants.length} varian • {getTotalVariantStock(product)} stock
                      </small>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === 'checkout' ? (
            <section className="apk-app-panel">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Checkout</span>
                  <h3>{selectedProduct ? selectedProduct.title : 'Pilih produk premium'}</h3>
                </div>
                {selectedProduct ? <span className="apk-app-count-pill">{selectedProduct.category}</span> : null}
              </div>

              {selectedProduct && selectedVariant ? (
                <>
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
                        {getTotalVariantStock(selectedProduct)} stock • {selectedProduct.sold} terjual
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
                          <div>
                            <strong>{variant.title}</strong>
                            <span>{variant.duration}</span>
                          </div>
                          <div className="apk-app-variant-meta">
                            <em>Rp {formatRupiah(variant.price)}</em>
                            <small>{variant.stock} stock</small>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="apk-app-summary-card">
                    <div>
                      <span>Produk</span>
                      <strong>{selectedProduct.title}</strong>
                    </div>
                    <div>
                      <span>Varian</span>
                      <strong>{selectedVariant.title}</strong>
                    </div>
                    <div>
                      <span>Harga</span>
                      <strong>Rp {formatRupiah(selectedVariant.price)}</strong>
                    </div>
                    <div>
                      <span>Pengiriman</span>
                      <strong>{selectedProduct.delivery}</strong>
                    </div>
                  </div>

                  <div className="apk-app-form-card">
                    <span className="apk-app-section-label">Form order website</span>
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

                    {checkoutPreview ? (
                      <div className="apk-app-preview-card">
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

                    <div className={`apk-app-feedback apk-app-feedback--${checkoutFeedback.tone}`}>
                      {checkoutFeedback.text}
                    </div>

                    <div className="apk-app-action-row">
                      <button type="button" className="apk-app-primary-button" onClick={runCheckoutPreview} disabled={isPreviewing}>
                        {isPreviewing ? 'Menyiapkan...' : 'Ambil Preview'}
                      </button>
                      <button type="button" className="apk-app-secondary-button" onClick={submitWebsiteOrder} disabled={isSubmittingOrder}>
                        {isSubmittingOrder ? 'Memproses...' : 'Buat Order'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="apk-app-empty">Pilih produk premium dari dashboard dulu.</div>
              )}
            </section>
          ) : null}

          {activeTab === 'info' ? (
            <section className="apk-app-panel">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Info</span>
                  <h3>Flow website dan stok pusat</h3>
                </div>
              </div>

              <div className="apk-app-info-stack">
                <article className="apk-app-info-card">
                  <strong>1. Restock dari aplikasi owner</strong>
                  <p>Produk, varian, dan akun tetap dikelola dari aplikasi owner agar owner tidak repot input manual di website.</p>
                </article>
                <article className="apk-app-info-card">
                  <strong>2. Website dan private chat sinkron</strong>
                  <p>Order website dan autoorder WhatsApp akan membaca stok pusat yang sama, jadi stock tetap realtime.</p>
                </article>
                <article className="apk-app-info-card">
                  <strong>3. Notifikasi owner siap disambungkan</strong>
                  <p>Order berhasil dari website nanti bisa mendorong notifikasi ke aplikasi owner dan grup store kamu.</p>
                </article>
              </div>
            </section>
          ) : null}
        </div>

        <nav className="apk-app-bottom-nav">
          <button
            type="button"
            className={activeTab === 'dashboard' ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="apk-app-nav-icon">D</span>
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={activeTab === 'kategori' ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
            onClick={() => setActiveTab('kategori')}
          >
            <span className="apk-app-nav-icon">K</span>
            <span>Kategori</span>
          </button>
          <button
            type="button"
            className={activeTab === 'checkout' ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
            onClick={() => setActiveTab('checkout')}
          >
            <span className="apk-app-nav-icon">C</span>
            <span>Checkout</span>
          </button>
          <button
            type="button"
            className={activeTab === 'info' ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
            onClick={() => setActiveTab('info')}
          >
            <span className="apk-app-nav-icon">I</span>
            <span>Info</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
