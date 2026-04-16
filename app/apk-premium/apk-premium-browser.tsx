'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState, useTransition } from 'react';
import type { ApkPremiumProduct, ApkPremiumVariant } from '@/lib/apk-premium';
import { formatRupiah } from '@/lib/apk-premium';
import { ActionLoadingOverlay } from '@/app/components/action-loading-overlay';
import { FloatingNotice } from '@/app/components/floating-notice';
import { TopAccountMenu } from '@/app/components/top-account-menu';

type Props = {
  products: ApkPremiumProduct[];
  categories: string[];
  minimumDeposit: number;
  requestedTab?: string | null;
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
type AccountModalView = 'deposit' | 'riwayat' | 'profil';
type HelperModalView = 'api-docs';

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

type CoreBundlePayload = {
  account?: {
    registered?: boolean;
    loggedIn?: boolean;
    name?: string;
    username?: string;
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
    depositState?: CoreDepositQrisState;
    msg?: string;
  };
};

type AppremQrisState = {
  orderCode: string;
  productTitle: string;
  variantTitle: string;
  quantity: number;
  totalPriceLabel: string;
  orderStatus: string;
  paymentStatus: string;
  nextStep: string;
  deliveredAccounts: Array<{
    id: number;
    accountData: string;
    adminNote: string;
  }>;
  qris: {
    transactionId: string;
    qrUrl: string;
    qrString: string;
    deeplinkUrl: string;
    expiryTime: string;
  } | null;
};

const APK_ACCOUNT_SESSION_KEY = 'putrigmoyy_apk_account_session_v1';

function normalizePremiumTab(value: string | null): PremiumTab | null {
  if (value === 'apprem' || value === 'deposit' || value === 'riwayat' || value === 'profil') {
    return value;
  }
  return null;
}

function buildQuickDepositAmounts(minimumDeposit: number) {
  const base = Math.max(1000, Number(minimumDeposit || 0));
  return Array.from(new Set([base, base * 2, Math.max(base * 5, 50000), Math.max(base * 10, 100000)])).sort((left, right) => left - right);
}

function buildQrisDownloadLink(qrUrl: string, filename: string) {
  const normalizedUrl = String(qrUrl || '').trim();
  if (!normalizedUrl) {
    return '';
  }
  return `/api/qris-download?url=${encodeURIComponent(normalizedUrl)}&filename=${encodeURIComponent(filename)}`;
}

const productArtwork: Record<string, string> = {
  canva: '/premium-icons/canva.jpg',
  netflix: '/premium-icons/netflix.jpg',
  'yt-premium': '/premium-icons/youtube.jpg',
  capcut: '/premium-icons/capcut.jpg',
  spotify: '/premium-icons/spotify.jpg',
  chatgpt: '/premium-icons/chatgpt.jpg',
};

function getProductArtwork(product: ApkPremiumProduct) {
  return product.imageUrl || productArtwork[product.id] || '/dashboard-apk-premium.svg';
}

function getLowestPrice(product: ApkPremiumProduct) {
  if (!product.variants.length) return 0;
  return Math.min(...product.variants.map((variant) => variant.price));
}

function getTotalVariantStock(product: ApkPremiumProduct) {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
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

function mapStatusTone(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized.includes('success') || normalized.includes('berhasil') || normalized.includes('paid')) {
    return 'success';
  }
  if (normalized.includes('pending') || normalized.includes('menunggu')) {
    return 'pending';
  }
  return 'failed';
}

function formatPaymentStatusLabel(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'awaiting-payment' || normalized === 'pending') {
    return 'menunggu pembayaran';
  }
  if (normalized === 'paid' || normalized === 'settlement' || normalized === 'capture') {
    return 'paid';
  }
  if (normalized === 'expire' || normalized === 'expired') {
    return 'expired';
  }
  if (normalized === 'cancel' || normalized === 'deny' || normalized === 'failed') {
    return 'gagal';
  }
  return normalized || '-';
}

function ModalCloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.2 7.2 16.8 16.8M16.8 7.2 7.2 16.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
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

function DetailGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 6.5h11v11h-11z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.1 9.2h5.8M9.1 12h5.8M9.1 14.8h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function SuccessCheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.4 12.6 10.3 15.5 16.8 9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function DownloadGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5.3v8.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
      <path d="m8.7 10.9 3.3 3.4 3.3-3.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
      <path d="M6 16.9h12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
    </svg>
  );
}

function AccountPopupGlyph({ type }: { type: 'deposit' | 'profil' }) {
  if (type === 'deposit') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M4 10h16M8 6h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
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

function DrawerMenuGlyph({
  type,
}: {
  type: 'dashboard' | 'profil' | 'order' | 'deposit' | 'riwayat' | 'api-docs';
}) {
  if (type === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.8 5.1h6.5v6.5H4.8zm7.9 0h6.5v6.5h-6.5zm-7.9 7.9h6.5v6.5H4.8zm7.9 0h6.5v6.5h-6.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === 'profil') {
    return <AccountPopupGlyph type="profil" />;
  }
  if (type === 'deposit') {
    return <AccountPopupGlyph type="deposit" />;
  }
  if (type === 'riwayat') {
    return <NavGlyph type="riwayat" />;
  }
  if (type === 'order') {
    return <NavGlyph type="apprem" />;
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 7.2h13M5.5 11.2h13M5.5 15.2h7.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      <path d="M15.2 15.4h3.3v3.2h-3.3z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
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

export function ApkPremiumBrowser({ products, categories, minimumDeposit, requestedTab }: Props) {
  const quickDepositAmounts = buildQuickDepositAmounts(minimumDeposit);
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
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState(String(minimumDeposit));
  const [walletProfile, setWalletProfile] = useState({
    registered: false,
    loggedIn: false,
    name: '',
    username: '',
    balance: 0,
  });
  const [walletRegisterDraft, setWalletRegisterDraft] = useState({
    name: '',
    username: '',
    password: '',
  });
  const [walletLoginDraft, setWalletLoginDraft] = useState({
    username: '',
    password: '',
  });
  const [profileEditDraft, setProfileEditDraft] = useState({
    username: '',
    password: '',
  });
  const [profileAccessMode, setProfileAccessMode] = useState<'register' | 'login'>('register');
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
  const [activeQrisOrder, setActiveQrisOrder] = useState<AppremQrisState | null>(null);
  const [activeDepositQris, setActiveDepositQris] = useState<CoreDepositQrisState | null>(null);
  const [accountModalView, setAccountModalView] = useState<AccountModalView | null>(null);
  const [helperModalView, setHelperModalView] = useState<HelperModalView | null>(null);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [historyFilterDraft, setHistoryFilterDraft] = useState({
    limit: '10',
    status: 'Semua',
    kind: 'Semua Riwayat',
    search: '',
  });
  const [appliedHistoryFilter, setAppliedHistoryFilter] = useState({
    limit: 10,
    status: 'Semua',
    kind: 'Semua Riwayat',
    search: '',
  });
  const [detailHistoryEntry, setDetailHistoryEntry] = useState<HistoryEntry | null>(null);
  const [floatingNotice, setFloatingNotice] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSubmittingOrder, startOrderSubmit] = useTransition();
  const [isSubmittingProfile, startProfileSubmit] = useTransition();
  const [isSubmittingDeposit, startDepositSubmit] = useTransition();
  const [, startRefreshQris] = useTransition();
  const [isCheckingDepositStatus, setIsCheckingDepositStatus] = useState(false);
  const [isCheckingOrderStatus, setIsCheckingOrderStatus] = useState(false);
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

  useEffect(() => {
    if (!accountModalView && !helperModalView && !isSideMenuOpen && !detailHistoryEntry) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [accountModalView, detailHistoryEntry, helperModalView, isSideMenuOpen]);

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

  const applyCoreBundle = (bundle: CoreBundlePayload) => {
    const account = bundle.account || {};
    const username = String(account.username || account.contact || '');
    setWalletProfile({
      registered: account.registered === true,
      loggedIn: account.loggedIn === true,
      name: String(account.name || ''),
      username,
      balance: Math.max(0, Number(account.balance || 0)),
    });
    setWalletLoginDraft({
      username,
      password: '',
    });
    setProfileEditDraft({
      username,
      password: '',
    });
    setHistoryEntries(Array.isArray(bundle.history) ? bundle.history : []);
  };

  const syncAccountBundle = async (username: string) => {
    const normalizedUsername = String(username || '').trim();
    if (!normalizedUsername) {
      return false;
    }

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
    const hydrateSession = async () => {
      try {
        const savedUsername = window.localStorage.getItem(APK_ACCOUNT_SESSION_KEY);
        if (savedUsername) {
          await syncAccountBundle(savedUsername);
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
  const appremHistoryEntries = historyEntries.filter((entry) => {
    if (entry.kind === 'deposit') {
      return true;
    }
    return String(entry.reference || '').trim().toUpperCase().startsWith('APK');
  });
  const sortedHistoryEntries = [...appremHistoryEntries].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const availableHistoryStatuses = ['Semua', ...Array.from(new Set(sortedHistoryEntries.map((entry) => entry.statusLabel).filter(Boolean)))];
  const availableHistoryKinds = ['Semua Riwayat', 'Deposit', 'Order'];
  const filteredHistoryEntries = sortedHistoryEntries
    .filter((entry) => {
      if (appliedHistoryFilter.status !== 'Semua' && entry.statusLabel !== appliedHistoryFilter.status) {
        return false;
      }
      if (appliedHistoryFilter.kind !== 'Semua Riwayat') {
        const expectedKind = appliedHistoryFilter.kind === 'Deposit' ? 'deposit' : 'order';
        if (entry.kind !== expectedKind) {
          return false;
        }
      }
      if (!appliedHistoryFilter.search) {
        return true;
      }

      const haystack = [entry.title, entry.subjectName, entry.amountLabel, entry.methodLabel, entry.reference, entry.detail]
        .join(' ')
        .toLowerCase();
      return haystack.includes(appliedHistoryFilter.search);
    })
    .slice(0, appliedHistoryFilter.limit);
  const showPendingQris = activeQrisOrder?.paymentStatus === 'awaiting-payment';
  const showPaidQrisResult = activeQrisOrder?.paymentStatus === 'paid';

  useEffect(() => {
    const nextTab = normalizePremiumTab(requestedTab || null);
    if (nextTab === 'deposit' || nextTab === 'profil') {
      setAccountModalView(nextTab);
      return;
    }
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
    if (!walletProfile.loggedIn) {
      setDepositFeedback({ tone: 'idle', text: '' });
    }
  }, [walletProfile.loggedIn]);

  useEffect(() => {
    if (walletProfile.loggedIn) {
      return;
    }
    setProfileAccessMode(walletProfile.registered ? 'login' : 'register');
  }, [walletProfile.loggedIn, walletProfile.registered]);

  useEffect(() => {
    if (!activeQrisOrder || activeQrisOrder.paymentStatus === 'paid' || activeQrisOrder.paymentStatus === 'expire' || activeQrisOrder.paymentStatus === 'cancel' || activeQrisOrder.paymentStatus === 'deny') {
      return;
    }

    const timer = window.setInterval(() => {
      startRefreshQris(async () => {
        try {
          const response = await fetch(`/api/apk-premium/order-status?orderCode=${encodeURIComponent(activeQrisOrder.orderCode)}`, {
            method: 'GET',
            cache: 'no-store',
          });
          const result = await response.json() as {
            status?: boolean;
            data?: AppremQrisState | { msg?: string };
          };
          if (response.ok && result.status && result.data && 'orderCode' in result.data) {
            setActiveQrisOrder(result.data);
            if (result.data.paymentStatus === 'paid') {
              setCheckoutFeedback({
                tone: 'success',
                text:
                  result.data.deliveredAccounts && result.data.deliveredAccounts.length > 0
                    ? `Pembayaran ${result.data.orderCode} berhasil dan data akun premium sudah siap.`
                    : `Pembayaran ${result.data.orderCode} berhasil. ${result.data.nextStep || ''}`.trim(),
              });
              setFloatingNotice({
                tone: 'success',
                text:
                  result.data.deliveredAccounts && result.data.deliveredAccounts.length > 0
                    ? `Pembayaran ${result.data.orderCode} berhasil dan data akun premium sudah siap.`
                    : `Pembayaran ${result.data.orderCode} berhasil.`,
              });
              if (walletProfile.loggedIn && walletProfile.username) {
                try {
                  await syncAccountBundle(walletProfile.username);
                } catch {
                  // ignore history refresh issue
                }
              }
            }
          }
        } catch {
          // swallow polling errors to keep UI calm
        }
      });
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeQrisOrder, startRefreshQris, walletProfile.loggedIn, walletProfile.username]);

  useEffect(() => {
    if (!activeDepositQris || activeDepositQris.paymentStatus !== 'awaiting-payment') {
      return;
    }

    const timerId = window.setInterval(() => {
      void refreshDepositStatus(false);
    }, 12000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [activeDepositQris]);

  const openProduct = (product: ApkPremiumProduct) => {
    setSelectedProductId(product.id);
    setSelectedVariantId(product.variants[0]?.id || '');
    setActiveQrisOrder(null);
    setCheckoutFeedback({
      tone: 'idle',
      text: `Produk "${product.title}" siap dilanjutkan ke order.`,
    });
    setActiveTab('apprem');
    setAppremMode('order');
  };

  const backToCatalog = () => {
    setAppremMode('catalog');
    setActiveQrisOrder(null);
    setCheckoutFeedback({
      tone: 'idle',
      text: 'Pilih aplikasi premium lalu lanjutkan order langsung dari menu apprem.',
    });
  };

  const pickVariant = (variant: ApkPremiumVariant) => {
    setSelectedVariantId(variant.id);
    setCheckoutForm((current) => ({ ...current, quantity: '1' }));
    setActiveQrisOrder(null);
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
            accountContact: walletProfile.loggedIn ? walletProfile.username : '',
            note: checkoutForm.note,
          }),
        });

        const result = await response.json() as {
          status?: boolean;
          data?: {
            msg?: string;
            orderCode?: string;
            productTitle?: string;
            variantTitle?: string;
            quantity?: number;
            totalPriceLabel?: string;
            nextStep?: string;
            orderStatus?: 'pending' | 'paid';
            paymentStatus?: string;
            deliveredAccounts?: AppremQrisState['deliveredAccounts'];
            qris?: AppremQrisState['qris'];
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
              ? `Pembayaran ${result.data.orderCode} berhasil. ${result.data.nextStep || ''}`.trim()
              : `Order ${result.data.orderCode} berhasil dibuat. ${result.data.nextStep || ''}`.trim(),
        });
        setActiveQrisOrder({
          orderCode: String(result.data.orderCode || ''),
          productTitle: String(result.data.productTitle || selectedProduct.title),
          variantTitle: String(result.data.variantTitle || selectedVariant.title),
          quantity: Math.max(1, Number(result.data.quantity || checkoutForm.quantity || 1)),
          totalPriceLabel: String(result.data.totalPriceLabel || ''),
          orderStatus: String(result.data.orderStatus || 'pending'),
          paymentStatus: String(result.data.paymentStatus || 'awaiting-payment'),
          nextStep: String(result.data.nextStep || ''),
          deliveredAccounts: Array.isArray(result.data.deliveredAccounts) ? result.data.deliveredAccounts : [],
          qris: result.data.qris || null,
        });
        if (walletProfile.loggedIn && walletProfile.username) {
          try {
            await syncAccountBundle(walletProfile.username);
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
      const username = walletRegisterDraft.username.trim().toLowerCase();
      const password = walletRegisterDraft.password.trim();
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
        setWalletRegisterDraft({ name: '', username: '', password: '' });
        window.localStorage.setItem(APK_ACCOUNT_SESSION_KEY, username);
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
      const username = walletLoginDraft.username.trim().toLowerCase();
      const password = walletLoginDraft.password.trim();
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
        window.localStorage.setItem(APK_ACCOUNT_SESSION_KEY, username);
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

  const updateWalletProfile = () => {
    startProfileSubmit(async () => {
      if (!walletProfile.loggedIn || !walletProfile.username) {
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
            currentUsername: walletProfile.username,
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
          walletProfile.username;
        window.localStorage.setItem(APK_ACCOUNT_SESSION_KEY, String(savedUsername).trim().toLowerCase());
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

  const logoutWalletAccount = () => {
    window.localStorage.removeItem(APK_ACCOUNT_SESSION_KEY);
    setWalletProfile((current) => ({ ...current, loggedIn: false, username: '' }));
    setHistoryEntries([]);
    setWalletLoginDraft((current) => ({ ...current, username: '', password: '' }));
    setProfileEditDraft({
      username: '',
      password: '',
    });
    setProfileFeedback({
      tone: 'success',
      text: 'Kamu sudah logout dari akun ini.',
    });
  };

  const applyHistoryFilter = () => {
    setAppliedHistoryFilter({
      limit: Math.max(1, Number(historyFilterDraft.limit || 10)),
      status: historyFilterDraft.status,
      kind: historyFilterDraft.kind,
      search: historyFilterDraft.search.trim().toLowerCase(),
    });
  };

  const refreshHistoryTable = () => {
    if (!walletProfile.username) {
      return;
    }
    void syncAccountBundle(walletProfile.username).catch(() => {
      setFloatingNotice({
        tone: 'error',
        text: 'Riwayat belum bisa dimuat ulang.',
      });
    });
  };

  const openDrawerTab = (tab: PremiumTab) => {
    setIsSideMenuOpen(false);
    setHelperModalView(null);
    setAccountModalView(null);
    setActiveTab(tab);
    if (tab === 'apprem') {
      setAppremMode('catalog');
    }
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

  const helperModalTitle = helperModalView === 'api-docs' ? 'Dokumentasi API' : '';

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
            accountContact: walletProfile.username,
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
        setFloatingNotice({
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

  const refreshQrisStatus = (manual = true) => {
    if (!activeQrisOrder?.orderCode) {
      return;
    }
    if (manual) {
      setIsCheckingOrderStatus(true);
    }
    startRefreshQris(async () => {
      try {
        const response = await fetch(`/api/apk-premium/order-status?orderCode=${encodeURIComponent(activeQrisOrder.orderCode)}`, {
          method: 'GET',
          cache: 'no-store',
        });
        const result = await response.json() as {
          status?: boolean;
          data?: AppremQrisState | { msg?: string };
        };
        if (!response.ok || !result.status || !result.data || !('orderCode' in result.data)) {
          setCheckoutFeedback({
            tone: 'error',
            text: result.data && 'msg' in result.data ? String(result.data.msg || 'Status pembayaran belum bisa dimuat.') : 'Status pembayaran belum bisa dimuat.',
          });
          return;
        }

        setActiveQrisOrder(result.data);
        setCheckoutFeedback({
          tone: result.data.paymentStatus === 'paid' ? 'success' : 'idle',
          text:
            result.data.paymentStatus === 'paid'
              ? result.data.deliveredAccounts && result.data.deliveredAccounts.length > 0
                ? `Pembayaran ${result.data.orderCode} berhasil dan data akun premium sudah siap.`
                : `Pembayaran ${result.data.orderCode} berhasil. ${result.data.nextStep || ''}`.trim()
              : `Status ${result.data.orderCode} masih ${result.data.paymentStatus}.`,
        });
        if (result.data.paymentStatus === 'paid') {
          setFloatingNotice({
            tone: 'success',
            text:
              result.data.deliveredAccounts && result.data.deliveredAccounts.length > 0
                ? `Pembayaran ${result.data.orderCode} berhasil dan data akun premium sudah siap.`
                : `Pembayaran ${result.data.orderCode} berhasil.`,
          });
        }
        if (result.data.paymentStatus === 'paid' && walletProfile.loggedIn && walletProfile.username) {
          try {
            await syncAccountBundle(walletProfile.username);
          } catch {
            // ignore sync failure
          }
        }
      } catch (error) {
        setCheckoutFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Status pembayaran belum bisa dimuat.',
        });
      } finally {
        if (manual) {
          setIsCheckingOrderStatus(false);
        }
      }
    });
  };

  return (
    <div className="apk-app-shell">
      <ActionLoadingOverlay visible={isSubmittingOrder || isSubmittingProfile || isSubmittingDeposit || isCheckingOrderStatus || isCheckingDepositStatus} label="Memuat..." />
      <div className="apk-app-phone">
        <FloatingNotice notice={floatingNotice} />
        <div className="apk-app-top-strip apk-app-top-strip--with-menu">
          <button
            type="button"
            className={isSideMenuOpen ? 'apk-app-top-menu-button apk-app-top-menu-button--open' : 'apk-app-top-menu-button'}
            onClick={() => setIsSideMenuOpen(true)}
            aria-label="Buka menu utama aplikasi premium"
          >
            <MenuBurgerGlyph />
          </button>
          <TopAccountMenu
            displayName={walletProfile.loggedIn ? walletProfile.name : 'Profil'}
            balance={walletProfile.balance}
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
                    <button type="button" className="site-side-drawer__item" onClick={() => openDrawerTab('apprem')}>
                      <span className="site-side-drawer__icon"><DrawerMenuGlyph type="order" /></span>
                      <span>Order</span>
                    </button>
                    <button type="button" className="site-side-drawer__item" onClick={() => openDrawerModal('deposit')}>
                      <span className="site-side-drawer__icon"><DrawerMenuGlyph type="deposit" /></span>
                      <span>Deposit</span>
                    </button>
                    <button type="button" className="site-side-drawer__item" onClick={() => openDrawerTab('riwayat')}>
                      <span className="site-side-drawer__icon"><DrawerMenuGlyph type="riwayat" /></span>
                      <span>Riwayat</span>
                    </button>
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
                            <img
                              src={getProductArtwork(product)}
                              alt={product.title}
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
                      <img
                        src={getProductArtwork(selectedProduct)}
                        alt={selectedProduct.title}
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
                          <div className="apk-app-qris-card-media">
                            {activeQrisOrder?.qris?.qrUrl ? (
                              <a
                                href={buildQrisDownloadLink(activeQrisOrder.qris.qrUrl, `${activeQrisOrder.orderCode || 'apk-order'}-qris.png`)}
                                className="apk-app-qris-download-icon"
                                aria-label="Download QRIS"
                                title="Download QRIS"
                              >
                                <DownloadGlyph />
                              </a>
                            ) : null}
                            {activeQrisOrder?.qris?.qrUrl ? (
                              <img src={activeQrisOrder.qris.qrUrl} alt={`QRIS ${activeQrisOrder.orderCode}`} className="apk-app-qris-image" />
                            ) : (
                              <div className="apk-app-qris-fallback">QRIS siap, tetapi gambar belum tersedia.</div>
                            )}
                          </div>
                        </div>

                        <div className="apk-app-live-total-card apk-app-live-total-card--compact smm-qris-total-card">
                          <span>Total Bayar</span>
                          <strong>Rp {activeQrisOrder?.totalPriceLabel}</strong>
                        </div>

                        {activeQrisOrder?.qris?.expiryTime ? (
                          <div className="smm-qris-expiry-note">
                            Berlaku sampai {new Date(activeQrisOrder.qris.expiryTime).toLocaleString('id-ID')}
                          </div>
                        ) : null}

                        <div className="smm-qris-detail-frame">
                          <p>Order ID : {activeQrisOrder?.orderCode || '-'}</p>
                          <p>Status bayar : {formatPaymentStatusLabel(activeQrisOrder?.paymentStatus || '')}</p>
                          <p>Produk : {activeQrisOrder?.productTitle || selectedProduct.title}</p>
                          <p>Varian : {activeQrisOrder?.variantTitle || selectedVariant.title}</p>
                          <p>Jumlah : {activeQrisOrder?.quantity || selectedQuantity}</p>
                          <p>Total : Rp {activeQrisOrder?.totalPriceLabel || formatRupiah(selectedTotal)}</p>
                        </div>

                        <div className="apk-app-action-row smm-qris-status-row">
                          <button type="button" className="apk-app-primary-button" onClick={() => refreshQrisStatus()} disabled={isCheckingOrderStatus}>
                            {isCheckingOrderStatus ? 'Memuat...' : 'Cek Status'}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {showPaidQrisResult ? (
                      <>
                        <div className="smm-qris-detail-frame smm-qris-detail-frame--success">
                          <span className="smm-qris-success-mark" aria-hidden="true">
                            <SuccessCheckGlyph />
                          </span>
                          <p>Order ID : {activeQrisOrder?.orderCode || '-'}</p>
                          <p>Status bayar : {formatPaymentStatusLabel(activeQrisOrder?.paymentStatus || '')}</p>
                          <p>Produk : {activeQrisOrder?.productTitle || selectedProduct.title}</p>
                          <p>Varian : {activeQrisOrder?.variantTitle || selectedVariant.title}</p>
                          <p>Jumlah : {activeQrisOrder?.quantity || selectedQuantity}</p>
                          <p>Total : Rp {activeQrisOrder?.totalPriceLabel || formatRupiah(selectedTotal)}</p>
                        </div>

                        <div className="smm-qris-detail-frame">
                          <p>Data akun premium :</p>
                          {activeQrisOrder?.deliveredAccounts?.length ? (
                            activeQrisOrder.deliveredAccounts.map((entry, index) => (
                              <p key={entry.id}>
                                {index + 1}. {entry.accountData}
                                {entry.adminNote ? ` | Catatan : ${entry.adminNote}` : ''}
                              </p>
                            ))
                          ) : (
                            <p>Data akun belum tersedia. Silahkan cek kembali dalam beberapa saat.</p>
                          )}
                        </div>

                        <div className="apk-app-feedback apk-app-feedback--success">
                          Transaksi berhasil, data akun premium sudah tampil di atas.
                        </div>
                      </>
                    ) : null}

                    {checkoutFeedback.tone !== 'idle' && !showPendingQris && !showPaidQrisResult ? (
                      <div className={`apk-app-feedback apk-app-feedback--${checkoutFeedback.tone}`}>
                        {checkoutFeedback.text}
                      </div>
                    ) : null}

                    {!showPendingQris && !showPaidQrisResult ? (
                      <div className="apk-app-action-row">
                        <button type="button" className="apk-app-primary-button" onClick={submitWebsiteOrder} disabled={isSubmittingOrder}>
                          {isSubmittingOrder ? 'Memproses...' : 'Order'}
                        </button>
                      </div>
                    ) : null}
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
                      : `${walletProfile.name} - @${walletProfile.username}`}
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
                        placeholder={`Contoh: ${minimumDeposit.toLocaleString('id-ID')}`}
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
                  <span className="apk-app-section-label">Deposit</span>
                  <p className="smm-section-copy">Masukkan nominal minimal Rp {formatRupiah(minimumDeposit)} lalu tekan tombol deposit untuk membuka QRIS pembayaran.</p>

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
                  <h3>Riwayat deposit dan order aplikasi premium</h3>
                </div>
              </div>

              {walletProfile.loggedIn ? (
                <>
                  <div className="apk-app-form-card">
                    <div className="smm-status-filter-grid">
                      <label className="apk-app-form-field">
                        <span>Tampilkan</span>
                        <select
                          value={historyFilterDraft.limit}
                          onChange={(event) => setHistoryFilterDraft((current) => ({ ...current, limit: event.target.value }))}
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
                          value={historyFilterDraft.status}
                          onChange={(event) => setHistoryFilterDraft((current) => ({ ...current, status: event.target.value }))}
                          className="smm-select"
                        >
                          {availableHistoryStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="apk-app-form-field">
                        <span>Filter Riwayat</span>
                        <select
                          value={historyFilterDraft.kind}
                          onChange={(event) => setHistoryFilterDraft((current) => ({ ...current, kind: event.target.value }))}
                          className="smm-select"
                        >
                          {availableHistoryKinds.map((kind) => (
                            <option key={kind} value={kind}>
                              {kind}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="apk-app-form-field">
                        <span>Cari Riwayat</span>
                        <input
                          value={historyFilterDraft.search}
                          onChange={(event) => setHistoryFilterDraft((current) => ({ ...current, search: event.target.value }))}
                          placeholder="Cari nama, referensi, atau detail"
                        />
                      </label>
                      <div className="smm-monitoring-filter-actions">
                        <span>Submit</span>
                        <div className="smm-monitoring-filter-buttons">
                          <button type="button" className="apk-app-primary-button" onClick={applyHistoryFilter}>
                            Filter
                          </button>
                          <button
                            type="button"
                            className="apk-app-ghost-button"
                            onClick={refreshHistoryTable}
                            disabled={!walletProfile.username || isSubmittingProfile || isSubmittingDeposit}
                          >
                            Refresh
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
                          <th>Jenis</th>
                          <th>Transaksi</th>
                          <th>Jumlah</th>
                          <th>Metode</th>
                          <th>Status</th>
                          <th>Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistoryEntries.length ? (
                          filteredHistoryEntries.map((entry) => {
                            const createdAt = formatDateParts(entry.createdAt);
                            return (
                              <tr key={entry.id}>
                                <td className="smm-status-time-cell">
                                  <span>{createdAt.datePart}</span>
                                  <span>{createdAt.timePart}</span>
                                </td>
                                <td className="smm-status-cell--nowrap">{entry.kind === 'deposit' ? 'Deposit' : 'Order'}</td>
                                <td>
                                  <div className="smm-status-service-name">{entry.title}</div>
                                  <div className="smm-status-service-name">{entry.subjectName}</div>
                                </td>
                                <td className="smm-status-cell--nowrap">{entry.amountLabel}</td>
                                <td className="smm-status-cell--nowrap">{entry.methodLabel || '-'}</td>
                                <td className="smm-status-cell--nowrap">
                                  <span className={`smm-status-badge smm-status-badge--${mapStatusTone(entry.statusLabel)}`}>{entry.statusLabel}</span>
                                </td>
                                <td className="smm-status-cell--nowrap">
                                  <button
                                    type="button"
                                    className="smm-status-detail-button"
                                    onClick={() => setDetailHistoryEntry(entry)}
                                    aria-label="Detail riwayat"
                                  >
                                    <DetailGlyph />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7}>
                              <div className="apk-app-empty">Belum ada riwayat transaksi yang cocok dengan filter ini.</div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="apk-app-empty">Login akun dulu agar riwayat deposit dan order bisa ditampilkan.</div>
              )}
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
                <article id="profile-account" className="apk-app-info-card">
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
                        <span>Username akun</span>
                        <input
                          value={walletRegisterDraft.username}
                          onChange={(event) => setWalletRegisterDraft((current) => ({ ...current, username: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))}
                          placeholder="contoh: putrigmoyy"
                        />
                      </label>
                      <label className="apk-app-form-field">
                        <span>Password akun</span>
                        <input
                          type="password"
                          value={walletRegisterDraft.password}
                          onChange={(event) => setWalletRegisterDraft((current) => ({ ...current, password: event.target.value }))}
                          placeholder="Minimal 6 karakter"
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
                        <span>Username akun</span>
                        <input
                          value={walletLoginDraft.username}
                          onChange={(event) => setWalletLoginDraft((current) => ({ ...current, username: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))}
                          placeholder="Masukkan username"
                        />
                      </label>
                      <label className="apk-app-form-field">
                        <span>Password akun</span>
                        <input
                          type="password"
                          value={walletLoginDraft.password}
                          onChange={(event) => setWalletLoginDraft((current) => ({ ...current, password: event.target.value }))}
                          placeholder="Masukkan password"
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
                      <span>Username : @{walletProfile.username}</span>
                      <span>Status : Login</span>
                    </div>
                    <div className="apk-app-action-row">
                      <button type="button" className="apk-app-ghost-button" onClick={logoutWalletAccount}>
                        Logout
                      </button>
                    </div>
                  </article>
                ) : null}

                <article className="apk-app-form-card">
                  <span className="apk-app-section-label">Panduan Mulai Transaksi</span>
                  <div className="apk-app-info-stack">
                    <article id="guide-deposit" className="apk-app-info-card apk-app-history-card">
                      <strong>Cara Deposit</strong>
                      <p>Masuk ke menu Deposit, isi nominal manual atau pilih nominal cepat, lalu lanjutkan pembayaran sampai status deposit berubah berhasil.</p>
                    </article>
                    <article id="guide-status" className="apk-app-info-card apk-app-history-card">
                      <strong>Informasi Status Order</strong>
                      <p>Status order akan otomatis diperbarui. Jika pembayaran sukses maka order lanjut diproses, sedangkan jika QRIS expired kamu perlu membuat order baru.</p>
                    </article>
                    <article id="guide-order" className="apk-app-info-card apk-app-history-card">
                      <strong>Panduan Cara Pesanan</strong>
                      <p>Pilih produk, tentukan varian, cek total harga, lalu selesaikan pembayaran. Setelah lunas, data akun atau proses order akan berjalan otomatis sesuai jenis produk.</p>
                    </article>
                    <article id="guide-contact" className="apk-app-info-card apk-app-history-card">
                      <strong>Kontak</strong>
                      <p>Jika ada kendala transaksi, gunakan kontak store yang aktif pada website atau WhatsApp admin yang kamu pakai saat bertransaksi.</p>
                    </article>
                  </div>
                </article>

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
            className={accountModalView === 'deposit' ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
            onClick={() => setAccountModalView('deposit')}
          >
            <span className="apk-app-nav-icon">
              <NavGlyph type="deposit" />
            </span>
            <span>Deposit</span>
          </button>
          <button
            type="button"
            className={activeTab === 'riwayat' ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
            onClick={() => {
              setAccountModalView(null);
              setActiveTab('riwayat');
            }}
          >
            <span className="apk-app-nav-icon">
              <NavGlyph type="riwayat" />
            </span>
            <span>Riwayat</span>
          </button>
          <button
            type="button"
            className={accountModalView === 'profil' ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
            onClick={() => setAccountModalView('profil')}
          >
            <span className="apk-app-nav-icon">
              <NavGlyph type="profil" />
            </span>
            <span>Profil</span>
          </button>
        </nav>

        {accountModalView ? (
          <div className="smm-detail-modal-backdrop" onClick={() => setAccountModalView(null)}>
            <div className="smm-detail-modal account-popup-modal" onClick={(event) => event.stopPropagation()}>
              <div className="smm-detail-modal-head">
                <strong>{accountModalView === 'deposit' ? 'Deposit' : 'Profil'}</strong>
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
                <div className="account-popup-tabs account-popup-tabs--dual">
                  {([
                    ['profil', 'Profil'],
                    ['deposit', 'Deposit'],
                  ] as Array<['profil' | 'deposit', string]>).map(([view, label]) => (
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

                {accountModalView === 'deposit' ? (
                  <div className="account-popup-stack">
                    <div className="account-popup-card">
                      <span className="smm-profile-title">Status akun</span>
                      <div className="smm-profile-lines">
                        <p>Username : {walletProfile.username ? `@${walletProfile.username}` : '-'}</p>
                        <p>Saldo : Rp {formatRupiah(walletProfile.balance)}</p>
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
                            <div className="apk-app-qris-card-media">
                              {activeDepositQris.qris?.qrUrl ? (
                                <a
                                  href={buildQrisDownloadLink(activeDepositQris.qris.qrUrl, `${activeDepositQris.reference}-deposit-qris.png`)}
                                  className="apk-app-qris-download-icon"
                                  aria-label="Download QRIS"
                                  title="Download QRIS"
                                >
                                  <DownloadGlyph />
                                </a>
                              ) : null}
                              {activeDepositQris.qris?.qrUrl ? (
                                <img src={activeDepositQris.qris.qrUrl} alt={`QRIS deposit ${activeDepositQris.reference}`} className="apk-app-qris-image" />
                              ) : (
                                <div className="apk-app-qris-fallback">QRIS siap, tetapi gambar belum tersedia.</div>
                              )}
                            </div>
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

                {accountModalView === 'profil' ? (
                  <div className="account-popup-stack">
                    <div className="account-popup-card">
                      <div className="account-popup-card__head">
                        <span className="smm-profile-title">Status akun</span>
                        {walletProfile.loggedIn ? (
                          <button type="button" className="account-popup-inline-action" onClick={logoutWalletAccount}>
                            Log out
                          </button>
                        ) : null}
                      </div>
                      <div className="smm-profile-lines">
                        <p>Nama akun : {walletProfile.name || '-'}</p>
                        <p>Username : {walletProfile.username ? `@${walletProfile.username}` : '-'}</p>
                        <p>Saldo : Rp {formatRupiah(walletProfile.balance)}</p>
                        <p>Status : {walletProfile.loggedIn ? 'Login' : walletProfile.registered ? 'Belum login' : 'Belum terdaftar'}</p>
                      </div>
                    </div>

                    {walletProfile.loggedIn ? (
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
                          <button type="button" className="apk-app-primary-button" onClick={updateWalletProfile} disabled={isSubmittingProfile}>
                            {isSubmittingProfile ? 'Memproses...' : 'Simpan Profil'}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {!walletProfile.loggedIn ? (
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
                                  value={walletRegisterDraft.name}
                                  onChange={(event) => setWalletRegisterDraft((current) => ({ ...current, name: event.target.value }))}
                                  placeholder="Nama lengkap"
                                />
                              </label>
                              <label className="apk-app-form-field">
                                <span>Username akun</span>
                                <input
                                  value={walletRegisterDraft.username}
                                  onChange={(event) => setWalletRegisterDraft((current) => ({ ...current, username: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))}
                                  placeholder="contoh: putrigmoyy"
                                />
                              </label>
                              <label className="apk-app-form-field">
                                <span>Password akun</span>
                                <input
                                  type="password"
                                  value={walletRegisterDraft.password}
                                  onChange={(event) => setWalletRegisterDraft((current) => ({ ...current, password: event.target.value }))}
                                  placeholder="Minimal 6 karakter"
                                />
                              </label>
                            </div>
                            <div className="apk-app-action-row apk-app-action-row--compact">
                              <button type="button" className="apk-app-primary-button" onClick={registerWalletAccount} disabled={isSubmittingProfile}>
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
                                  value={walletLoginDraft.username}
                                  onChange={(event) => setWalletLoginDraft((current) => ({ ...current, username: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))}
                                  placeholder="Masukkan username"
                                />
                              </label>
                              <label className="apk-app-form-field">
                                <span>Password akun</span>
                                <input
                                  type="password"
                                  value={walletLoginDraft.password}
                                  onChange={(event) => setWalletLoginDraft((current) => ({ ...current, password: event.target.value }))}
                                  placeholder="Masukkan password"
                                />
                              </label>
                            </div>
                            <div className="apk-app-action-row apk-app-action-row--compact">
                              <button type="button" className="apk-app-primary-button" onClick={loginWalletAccount} disabled={isSubmittingProfile}>
                                {isSubmittingProfile ? 'Memproses...' : 'Login'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}

                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {detailHistoryEntry ? (
          <div className="smm-detail-modal-backdrop" onClick={() => setDetailHistoryEntry(null)}>
            <div className="smm-detail-modal" onClick={(event) => event.stopPropagation()}>
              <div className="smm-detail-modal-head">
                <strong>Detail Riwayat</strong>
                <button
                  type="button"
                  className="smm-detail-modal-close"
                  onClick={() => setDetailHistoryEntry(null)}
                  aria-label="Tutup detail riwayat"
                >
                  <ModalCloseGlyph />
                </button>
              </div>

              <div className="smm-detail-modal-body">
                <table className="smm-detail-table">
                  <tbody>
                    <tr>
                      <th>Jenis</th>
                      <td>{detailHistoryEntry.kind === 'deposit' ? 'Deposit' : 'Order'}</td>
                    </tr>
                    <tr>
                      <th>Transaksi</th>
                      <td>{detailHistoryEntry.title || '-'}</td>
                    </tr>
                    <tr>
                      <th>Nama</th>
                      <td>{detailHistoryEntry.subjectName || '-'}</td>
                    </tr>
                    <tr>
                      <th>Jumlah</th>
                      <td>{detailHistoryEntry.amountLabel || '-'}</td>
                    </tr>
                    <tr>
                      <th>Metode</th>
                      <td>{detailHistoryEntry.methodLabel || '-'}</td>
                    </tr>
                    <tr>
                      <th>Status</th>
                      <td>{detailHistoryEntry.statusLabel || '-'}</td>
                    </tr>
                    <tr>
                      <th>Referensi</th>
                      <td>{detailHistoryEntry.reference || '-'}</td>
                    </tr>
                    <tr>
                      <th>Tanggal &amp; Waktu</th>
                      <td>{detailHistoryEntry.createdLabel || '-'}</td>
                    </tr>
                    <tr>
                      <th>Detail</th>
                      <td>{detailHistoryEntry.detail || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {helperModalView ? (
          <div className="smm-detail-modal-backdrop" onClick={() => setHelperModalView(null)}>
            <div className="smm-detail-modal" onClick={(event) => event.stopPropagation()}>
              <div className="smm-detail-modal-head">
                <strong>{helperModalTitle}</strong>
                <button
                  type="button"
                  className="smm-detail-modal-close"
                  onClick={() => setHelperModalView(null)}
                  aria-label="Tutup dokumentasi api"
                >
                  <ModalCloseGlyph />
                </button>
              </div>

              <div className="smm-detail-modal-body">
                <div className="account-popup-stack">
                  <div className="account-popup-card">
                    <div className="smm-profile-lines">
                      <p>COMING SOON....</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
