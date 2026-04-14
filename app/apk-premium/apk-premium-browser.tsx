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

type HistoryKind = 'order' | 'deposit';
type HistoryStatus = 'pending' | 'success' | 'failed';

type HistoryEntry = {
  id: string;
  kind: HistoryKind;
  title: string;
  subjectName: string;
  amountLabel: string;
  statusLabel: string;
  status: HistoryStatus;
  createdAt: string;
  createdLabel: string;
  detail: string;
  methodLabel: string;
  reference: string;
};

type DepositMethod = 'midtrans' | 'balance';
type OrderPaymentMethod = 'midtrans' | 'balance';

type CoreBundlePayload = {
  account?: {
    registered?: boolean;
    loggedIn?: boolean;
    name?: string;
    contact?: string;
    balance?: number;
  };
  history?: HistoryEntry[];
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
    msg?: string;
  };
};

const APK_ACCOUNT_SESSION_KEY = 'putrigmoyy_apk_account_session_v1';

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
  const quickDepositAmounts = [10000, 20000, 50000, 100000];
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
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<OrderPaymentMethod>('midtrans');
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('10000');
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('midtrans');
  const [walletProfile, setWalletProfile] = useState({
    registered: false,
    loggedIn: false,
    name: '',
    contact: '',
    pin: '',
    balance: 0,
  });
  const [walletRegisterDraft, setWalletRegisterDraft] = useState({
    name: '',
    contact: '',
    pin: '',
  });
  const [walletLoginDraft, setWalletLoginDraft] = useState({
    contact: '',
    pin: '',
  });
  const [depositFeedback, setDepositFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: '',
  });
  const [profileFeedback, setProfileFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: '',
  });
  const [checkoutFeedback, setCheckoutFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: 'Pilih aplikasi premium lalu lanjutkan order langsung dari menu apprem.',
  });
  const [isSubmittingOrder, startOrderSubmit] = useTransition();
  const [isSubmittingProfile, startProfileSubmit] = useTransition();
  const [isSubmittingDeposit, startDepositSubmit] = useTransition();
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

  const applyCoreBundle = (bundle: CoreBundlePayload) => {
    const account = bundle.account || {};
    setWalletProfile({
      registered: account.registered === true,
      loggedIn: account.loggedIn === true,
      name: String(account.name || ''),
      contact: String(account.contact || ''),
      pin: '',
      balance: Math.max(0, Number(account.balance || 0)),
    });
    setWalletLoginDraft({
      contact: String(account.contact || ''),
      pin: '',
    });
    setHistoryEntries(Array.isArray(bundle.history) ? bundle.history : []);
  };

  const syncAccountBundle = async (contact: string) => {
    const normalizedContact = String(contact || '').trim();
    if (!normalizedContact) {
      return false;
    }

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

    applyCoreBundle(result.data);
    return true;
  };

  useEffect(() => {
    const hydrateSession = async () => {
      try {
        const savedContact = window.localStorage.getItem(APK_ACCOUNT_SESSION_KEY);
        if (savedContact) {
          await syncAccountBundle(savedContact);
        }
      } catch {
        // ignore session hydration issues
      }
    };

    void hydrateSession();
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
  const normalizedDepositAmount = Math.max(0, Number(depositAmount.replace(/[^\d]/g, '') || 0));
  const depositLocked = !walletProfile.registered || !walletProfile.loggedIn;
  const canUseBalance = !depositLocked && normalizedDepositAmount > 0 && walletProfile.balance >= normalizedDepositAmount;
  const canPayOrderWithBalance = walletProfile.loggedIn && selectedTotal > 0 && walletProfile.balance >= selectedTotal;
  const orderHistoryEntries = historyEntries.filter((entry) => entry.kind === 'order');
  const depositHistoryEntries = historyEntries.filter((entry) => entry.kind === 'deposit');

  useEffect(() => {
    if (depositLocked || !canUseBalance) {
      if (depositMethod === 'balance') {
        setDepositMethod('midtrans');
      }
    }
  }, [canUseBalance, depositLocked, depositMethod]);

  useEffect(() => {
    if (!walletProfile.loggedIn || !canPayOrderWithBalance) {
      if (orderPaymentMethod === 'balance') {
        setOrderPaymentMethod('midtrans');
      }
      return;
    }
  }, [canPayOrderWithBalance, orderPaymentMethod, walletProfile.loggedIn]);

  useEffect(() => {
    if (!walletProfile.loggedIn) {
      setDepositFeedback({ tone: 'idle', text: '' });
    }
  }, [walletProfile.loggedIn]);

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
            accountContact: walletProfile.loggedIn ? walletProfile.contact : '',
            paymentMethod: orderPaymentMethod,
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
            paymentMethod?: OrderPaymentMethod;
            orderStatus?: 'pending' | 'paid';
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
          text:
            result.data.orderStatus === 'paid'
              ? `Order ${result.data.orderCode} berhasil dibayar dengan saldo akun. ${result.data.nextStep || ''}`.trim()
              : `Order ${result.data.orderCode} berhasil dibuat. ${result.data.nextStep || ''}`.trim(),
        });
        if (walletProfile.loggedIn && walletProfile.contact) {
          try {
            await syncAccountBundle(walletProfile.contact);
          } catch {
            // keep UI success state even if history refresh fails
          }
        }
      } catch (error) {
        setCheckoutFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Order gagal dibuat.',
        });
      }
    });
  };

  const registerWalletAccount = () => {
    startProfileSubmit(async () => {
      const name = walletRegisterDraft.name.trim();
      const contact = walletRegisterDraft.contact.trim();
      const pin = walletRegisterDraft.pin.trim();
      if (!name || !contact || !pin) {
        setProfileFeedback({
          tone: 'error',
          text: 'Isi nama, kontak, dan PIN dulu untuk membuat akun.',
        });
        return;
      }

      try {
        const response = await fetch('/api/core/account/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, contact, pin }),
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
        setWalletRegisterDraft({ name: '', contact: '', pin: '' });
        window.localStorage.setItem(APK_ACCOUNT_SESSION_KEY, contact);
        setProfileFeedback({
          tone: 'success',
          text: 'Akun berhasil dibuat dan langsung aktif. Sekarang menu deposit sudah terbuka.',
        });
      } catch (error) {
        setProfileFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Gagal membuat akun.',
        });
      }
    });
  };

  const loginWalletAccount = () => {
    startProfileSubmit(async () => {
      const contact = walletLoginDraft.contact.trim();
      const pin = walletLoginDraft.pin.trim();
      if (!contact || !pin) {
        setProfileFeedback({
          tone: 'error',
          text: 'Isi kontak dan PIN untuk masuk.',
        });
        return;
      }

      try {
        const response = await fetch('/api/core/account/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contact, pin }),
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
        window.localStorage.setItem(APK_ACCOUNT_SESSION_KEY, contact);
        setProfileFeedback({
          tone: 'success',
          text: 'Login berhasil. Deposit dan saldo akun sekarang bisa dipakai.',
        });
      } catch (error) {
        setProfileFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Login gagal.',
        });
      }
    });
  };

  const logoutWalletAccount = () => {
    window.localStorage.removeItem(APK_ACCOUNT_SESSION_KEY);
    setWalletProfile((current) => ({ ...current, loggedIn: false, pin: '' }));
    setHistoryEntries([]);
    setWalletLoginDraft((current) => ({ ...current, pin: '' }));
    setProfileFeedback({
      tone: 'success',
      text: 'Kamu sudah logout dari akun ini.',
    });
  };

  const submitDepositFlow = () => {
    startDepositSubmit(async () => {
      if (depositLocked) {
        setDepositFeedback({
          tone: 'error',
          text: 'Deposit terkunci. Daftar akun atau login dulu dari menu Profil.',
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

      try {
        const response = await fetch('/api/core/deposit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountContact: walletProfile.contact,
            amount: normalizedDepositAmount,
            method: depositMethod,
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
        setDepositFeedback({
          tone: 'success',
          text:
            depositMethod === 'balance'
              ? `Saldo akun berhasil dipakai sebesar Rp ${formatRupiah(normalizedDepositAmount)}.`
              : `Permintaan deposit QRIS Midtrans sebesar Rp ${formatRupiah(normalizedDepositAmount)} sudah dicatat.`,
        });
      } catch (error) {
        setDepositFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Deposit belum berhasil diproses.',
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

                    <div className="apk-app-payment-methods">
                      <button
                        type="button"
                        className={orderPaymentMethod === 'midtrans' ? 'apk-app-quick-chip apk-app-quick-chip--active' : 'apk-app-quick-chip'}
                        onClick={() => setOrderPaymentMethod('midtrans')}
                      >
                        QRIS Midtrans
                      </button>
                      <button
                        type="button"
                        className={orderPaymentMethod === 'balance' ? 'apk-app-quick-chip apk-app-quick-chip--active' : 'apk-app-quick-chip'}
                        onClick={() => setOrderPaymentMethod('balance')}
                        disabled={!canPayOrderWithBalance}
                      >
                        Pakai saldo akun
                      </button>
                    </div>
                    <div className="apk-app-inline-helper">
                      {orderPaymentMethod === 'balance'
                        ? `Saldo aktif akan dipotong Rp ${formatRupiah(selectedTotal)} dan order langsung masuk ke owner.`
                        : walletProfile.loggedIn
                          ? `Saldo akun kamu saat ini Rp ${formatRupiah(walletProfile.balance)}. Kalau cukup, kamu bisa bayar langsung pakai saldo.`
                          : 'Login dulu kalau ingin memakai saldo akun. Kalau belum, order akan dibuat dengan status menunggu pembayaran.'}
                    </div>

                    {checkoutFeedback.tone !== 'idle' ? (
                      <div className={`apk-app-feedback apk-app-feedback--${checkoutFeedback.tone}`}>
                        {checkoutFeedback.text}
                      </div>
                    ) : null}

                    <div className="apk-app-action-row">
                      <button type="button" className="apk-app-primary-button" onClick={submitWebsiteOrder} disabled={isSubmittingOrder}>
                        {isSubmittingOrder ? 'Memproses...' : orderPaymentMethod === 'balance' ? 'Bayar dengan Saldo' : 'Buat Order'}
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
                  <h3>Isi saldo dengan nominal manual atau pilihan cepat</h3>
                </div>
              </div>

              <div className="apk-app-deposit-stack">
                <article className="apk-app-info-card apk-app-deposit-account">
                  <strong>{depositLocked ? 'Deposit terkunci' : 'Akun saldo aktif'}</strong>
                  <p>
                    {depositLocked
                      ? 'Untuk menggunakan deposit, kamu perlu daftar akun lalu login dulu dari menu Profil.'
                      : `${walletProfile.name} - ${walletProfile.contact}`}
                  </p>
                  <div className="apk-app-live-total-card">
                    <span>Saldo akun</span>
                    <strong>Rp {formatRupiah(walletProfile.balance)}</strong>
                  </div>
                  {depositLocked ? (
                    <button type="button" className="apk-app-ghost-button" onClick={() => setActiveTab('profil')}>
                      Buka Profil
                    </button>
                  ) : null}
                </article>

                <article className="apk-app-form-card">
                  <span className="apk-app-section-label">Nominal Deposit</span>
                  <div className="apk-app-form-grid">
                    <label className="apk-app-form-field">
                      <span>Masukkan jumlah</span>
                      <input
                        value={depositAmount}
                        onChange={(event) => setDepositAmount(event.target.value.replace(/[^\d]/g, ''))}
                        placeholder="Contoh: 10000"
                        disabled={depositLocked}
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
                        disabled={depositLocked}
                      >
                        Rp {formatRupiah(amount)}
                      </button>
                    ))}
                  </div>

                  <div className="apk-app-live-total-card">
                    <span>Total deposit</span>
                    <strong>Rp {formatRupiah(normalizedDepositAmount)}</strong>
                  </div>
                </article>

                <article className="apk-app-form-card">
                  <span className="apk-app-section-label">Metode Bayar</span>
                  <div className="apk-app-method-grid">
                    <button
                      type="button"
                      className={
                        depositLocked
                          ? 'apk-app-method-card apk-app-method-card--disabled'
                          : depositMethod === 'midtrans'
                            ? 'apk-app-method-card apk-app-method-card--active'
                            : 'apk-app-method-card'
                      }
                      onClick={() => {
                        if (!depositLocked) {
                          setDepositMethod('midtrans');
                        }
                      }}
                      disabled={depositLocked}
                    >
                      <strong>QRIS Otomatis Midtrans</strong>
                      <p>Dipakai saat saldo akun belum cukup atau kamu ingin isi saldo manual.</p>
                    </button>
                    <button
                      type="button"
                      className={
                        depositMethod === 'balance'
                          ? 'apk-app-method-card apk-app-method-card--active'
                          : !walletProfile.registered || !canUseBalance
                            ? 'apk-app-method-card apk-app-method-card--disabled'
                            : 'apk-app-method-card'
                      }
                      onClick={() => {
                        if (walletProfile.registered && canUseBalance) {
                          setDepositMethod('balance');
                        }
                      }}
                      disabled={depositLocked}
                    >
                      <strong>Pakai Saldo Akun</strong>
                      <p>
                        {!walletProfile.registered
                          ? 'Daftar akun dulu untuk mengaktifkan metode ini.'
                          : canUseBalance
                            ? 'Saldo akun cukup untuk membayar langsung.'
                            : 'Saldo akun belum cukup untuk nominal ini.'}
                      </p>
                    </button>
                  </div>

                  {depositFeedback.text ? (
                    <div className={`apk-app-feedback apk-app-feedback--${depositFeedback.tone}`}>
                      {depositFeedback.text}
                    </div>
                  ) : null}

                  <div className="apk-app-action-row">
                    <button
                      type="button"
                      className="apk-app-primary-button"
                      onClick={submitDepositFlow}
                      disabled={depositLocked || isSubmittingDeposit}
                    >
                      {isSubmittingDeposit ? 'Memproses...' : 'Deposit'}
                    </button>
                  </div>
                </article>
              </div>
            </section>
          ) : null}

          {activeTab === 'riwayat' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Riwayat Transaksi</span>
                  <h3>Riwayat deposit dan order tersimpan terpisah</h3>
                </div>
              </div>

              <div className="apk-app-info-stack">
                <article className="apk-app-form-card">
                  <span className="apk-app-section-label">Riwayat Deposit</span>
                  {depositHistoryEntries.length ? (
                    <div className="apk-app-info-stack">
                      {depositHistoryEntries.map((entry) => {
                        const expanded = expandedHistoryId === entry.id;
                        return (
                          <article key={entry.id} className="apk-app-info-card apk-app-history-card">
                            <div className="apk-app-history-head">
                              <strong>{entry.title}</strong>
                              <span className={`apk-app-history-status apk-app-history-status--${entry.status}`}>{entry.statusLabel}</span>
                            </div>
                            <div className="apk-app-history-meta">
                              <span>Waktu : {entry.createdLabel}</span>
                              <span>Nama : {entry.subjectName}</span>
                              <span>Harga : {entry.amountLabel}</span>
                              <span>Metode : {entry.methodLabel}</span>
                            </div>
                            <button
                              type="button"
                              className="apk-app-ghost-button"
                              onClick={() => setExpandedHistoryId(expanded ? null : entry.id)}
                            >
                              {expanded ? 'Tutup Detail Deposit' : 'Lihat Detail Deposit'}
                            </button>
                            {expanded ? (
                              <div className="apk-app-history-detail">
                                <p>{entry.detail}</p>
                                <p>Referensi : {entry.reference}</p>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="apk-app-empty">Belum ada riwayat deposit.</div>
                  )}
                </article>

                <article className="apk-app-form-card">
                  <span className="apk-app-section-label">Riwayat Order</span>
                  {orderHistoryEntries.length ? (
                    <div className="apk-app-info-stack">
                      {orderHistoryEntries.map((entry) => {
                        const expanded = expandedHistoryId === entry.id;
                        return (
                          <article key={entry.id} className="apk-app-info-card apk-app-history-card">
                            <div className="apk-app-history-head">
                              <strong>{entry.title}</strong>
                              <span className={`apk-app-history-status apk-app-history-status--${entry.status}`}>{entry.statusLabel}</span>
                            </div>
                            <div className="apk-app-history-meta">
                              <span>Waktu : {entry.createdLabel}</span>
                              <span>Order : {entry.title}</span>
                              <span>Nama : {entry.subjectName}</span>
                              <span>Harga : {entry.amountLabel}</span>
                            </div>
                            <button
                              type="button"
                              className="apk-app-ghost-button"
                              onClick={() => setExpandedHistoryId(expanded ? null : entry.id)}
                            >
                              {expanded ? 'Tutup Detail Order' : 'Lihat Detail Order'}
                            </button>
                            {expanded ? (
                              <div className="apk-app-history-detail">
                                <p>{entry.detail}</p>
                                <p>Metode : {entry.methodLabel}</p>
                                <p>Referensi : {entry.reference}</p>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="apk-app-empty">Belum ada riwayat order.</div>
                  )}
                </article>
              </div>
            </section>
          ) : null}

          {activeTab === 'profil' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Profil</span>
                  <h3>Daftar akun, login, dan kelola akses saldo</h3>
                </div>
              </div>

              <div className="apk-app-info-stack">
                <article className="apk-app-info-card">
                  <strong>Status akun</strong>
                  <p>
                    {walletProfile.registered
                      ? walletProfile.loggedIn
                        ? `Akun aktif atas nama ${walletProfile.name}.`
                        : `Akun ${walletProfile.name} sudah terdaftar, tetapi belum login.`
                      : 'Belum ada akun yang terdaftar untuk akses saldo dan deposit.'}
                  </p>
                  <div className="apk-app-live-total-card">
                    <span>Saldo akun</span>
                    <strong>Rp {formatRupiah(walletProfile.balance)}</strong>
                  </div>
                </article>

                {!walletProfile.registered ? (
                  <article className="apk-app-form-card">
                    <span className="apk-app-section-label">Daftar Akun Baru</span>
                    <div className="apk-app-form-grid">
                      <label className="apk-app-form-field">
                        <span>Nama akun</span>
                        <input
                          value={walletRegisterDraft.name}
                          onChange={(event) => setWalletRegisterDraft((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Nama lengkap"
                        />
                      </label>
                      <label className="apk-app-form-field">
                        <span>Kontak akun</span>
                        <input
                          value={walletRegisterDraft.contact}
                          onChange={(event) => setWalletRegisterDraft((current) => ({ ...current, contact: event.target.value }))}
                          placeholder="WhatsApp / username"
                        />
                      </label>
                      <label className="apk-app-form-field">
                        <span>PIN akun</span>
                        <input
                          value={walletRegisterDraft.pin}
                          onChange={(event) => setWalletRegisterDraft((current) => ({ ...current, pin: event.target.value.replace(/[^\d]/g, '').slice(0, 6) }))}
                          placeholder="PIN 4-6 digit"
                        />
                      </label>
                    </div>
                    <div className="apk-app-action-row">
                      <button type="button" className="apk-app-primary-button" onClick={registerWalletAccount} disabled={isSubmittingProfile}>
                        {isSubmittingProfile ? 'Memproses...' : 'Daftar Akun'}
                      </button>
                    </div>
                  </article>
                ) : null}

                {walletProfile.registered && !walletProfile.loggedIn ? (
                  <article className="apk-app-form-card">
                    <span className="apk-app-section-label">Login Akun</span>
                    <div className="apk-app-form-grid">
                      <label className="apk-app-form-field">
                        <span>Kontak akun</span>
                        <input
                          value={walletLoginDraft.contact}
                          onChange={(event) => setWalletLoginDraft((current) => ({ ...current, contact: event.target.value }))}
                          placeholder="WhatsApp / username"
                        />
                      </label>
                      <label className="apk-app-form-field">
                        <span>PIN akun</span>
                        <input
                          value={walletLoginDraft.pin}
                          onChange={(event) => setWalletLoginDraft((current) => ({ ...current, pin: event.target.value.replace(/[^\d]/g, '').slice(0, 6) }))}
                          placeholder="Masukkan PIN"
                        />
                      </label>
                    </div>
                    <div className="apk-app-action-row">
                      <button type="button" className="apk-app-primary-button" onClick={loginWalletAccount} disabled={isSubmittingProfile}>
                        {isSubmittingProfile ? 'Memproses...' : 'Login'}
                      </button>
                    </div>
                  </article>
                ) : null}

                {walletProfile.registered && walletProfile.loggedIn ? (
                  <article className="apk-app-form-card">
                    <span className="apk-app-section-label">Akun Sedang Aktif</span>
                    <div className="apk-app-history-meta">
                      <span>Nama : {walletProfile.name}</span>
                      <span>Kontak : {walletProfile.contact}</span>
                      <span>Status : Login</span>
                    </div>
                    <div className="apk-app-action-row">
                      <button type="button" className="apk-app-ghost-button" onClick={logoutWalletAccount}>
                        Logout
                      </button>
                    </div>
                  </article>
                ) : null}

                {profileFeedback.text ? (
                  <div className={`apk-app-feedback apk-app-feedback--${profileFeedback.tone}`}>
                    {profileFeedback.text}
                  </div>
                ) : null}

                <article className="apk-app-form-card">
                  <span className="apk-app-section-label">Rekomendasi</span>
                  <div className="apk-app-info-stack">
                    <article className="apk-app-info-card apk-app-history-card">
                      <strong>Notifikasi pembayaran</strong>
                      <p>Bagus ditambah agar setiap deposit sukses dan order berhasil langsung masuk ke akun kamu.</p>
                    </article>
                    <article className="apk-app-info-card apk-app-history-card">
                      <strong>Favorit aplikasi</strong>
                      <p>Pelanggan bisa simpan aplikasi premium favorit supaya order ulang lebih cepat.</p>
                    </article>
                    <article className="apk-app-info-card apk-app-history-card">
                      <strong>Voucher promo</strong>
                      <p>Tambahkan kode promo atau cashback agar halaman premium terasa lebih hidup dan profesional.</p>
                    </article>
                    <article className="apk-app-info-card apk-app-history-card">
                      <strong>Navigasi cepat</strong>
                      <p>
                        <Link href="/">Kembali ke dashboard utama</Link>
                      </p>
                    </article>
                  </div>
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
