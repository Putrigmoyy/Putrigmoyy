'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { formatRupiah } from '@/lib/apk-premium';
import { ActionLoadingOverlay } from '@/app/components/action-loading-overlay';
import { STORE_ACCOUNT_MENU_SECTIONS, TopAccountMenu } from '@/app/components/top-account-menu';

type Props = {
  requestedTab?: string | null;
};

type AccountCenterTab = 'profil' | 'deposit' | 'riwayat';
type DepositMethod = 'midtrans' | 'balance';
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
    msg?: string;
  };
};

const ACCOUNT_SESSION_KEY = 'putrigmoyy_apk_account_session_v1';

function normalizeAccountCenterTab(value: string | null) {
  if (value === 'profil' || value === 'deposit' || value === 'riwayat') {
    return value satisfies AccountCenterTab;
  }
  return null;
}

function formatDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const datePart = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\./g, ':');
  return `${datePart}, ${timePart}`;
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
  if (normalized.includes('success') || normalized.includes('berhasil') || normalized.includes('dikembalikan')) {
    return 'success';
  }
  if (normalized.includes('pending') || normalized.includes('menunggu')) {
    return 'pending';
  }
  return 'failed';
}

function CenterNavGlyph({ type }: { type: AccountCenterTab }) {
  if (type === 'deposit') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 8.2h15v9.1a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8V8.2Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="M4.5 10.2h15M8.1 6.2h7.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      </svg>
    );
  }

  if (type === 'riwayat') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 7.2v4.65l2.75 1.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="M19.35 12a7.35 7.35 0 1 1-2.2-5.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="M19.4 5.75V8.6h-2.85" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8.55" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6.8 18.25a5.2 5.2 0 0 1 10.4 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
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

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.2 7.2 16.8 16.8M16.8 7.2 7.2 16.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function AccountCenterBrowser({ requestedTab }: Props) {
  const quickDepositAmounts = [10000, 20000, 50000, 100000];
  const [activeTab, setActiveTab] = useState<AccountCenterTab>('profil');
  const [accountProfile, setAccountProfile] = useState({
    registered: false,
    loggedIn: false,
    name: '',
    username: '',
    balance: 0,
  });
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [registerDraft, setRegisterDraft] = useState({
    name: '',
    username: '',
    password: '',
  });
  const [loginDraft, setLoginDraft] = useState({
    username: '',
    password: '',
  });
  const [profileEditDraft, setProfileEditDraft] = useState({
    username: '',
    password: '',
  });
  const [depositAmount, setDepositAmount] = useState('10000');
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('midtrans');
  const [historyFilterDraft, setHistoryFilterDraft] = useState({
    limit: '10',
    status: 'Semua',
    method: 'Semua Metode',
    search: '',
  });
  const [appliedHistoryFilter, setAppliedHistoryFilter] = useState({
    limit: 10,
    status: 'Semua',
    method: 'Semua Metode',
    search: '',
  });
  const [detailEntry, setDetailEntry] = useState<HistoryEntry | null>(null);
  const [profileFeedback, setProfileFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: '',
  });
  const [depositFeedback, setDepositFeedback] = useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({
    tone: 'idle',
    text: '',
  });
  const [isSubmittingProfile, startProfileSubmit] = useTransition();
  const [isSubmittingDeposit, startDepositSubmit] = useTransition();
  const [isRefreshingHistory, startHistoryRefresh] = useTransition();

  const applyCoreBundle = (bundle: CoreBundlePayload) => {
    const account = bundle.account || {};
    const username = String(account.username || account.contact || '').trim().toLowerCase();
    setAccountProfile({
      registered: account.registered === true,
      loggedIn: account.loggedIn === true,
      name: String(account.name || ''),
      username,
      balance: Math.max(0, Number(account.balance || 0)),
    });
    setHistoryEntries(Array.isArray(bundle.history) ? bundle.history : []);
    setLoginDraft((current) => ({
      ...current,
      username,
      password: '',
    }));
    setProfileEditDraft({
      username,
      password: '',
    });
  };

  const syncAccountBundle = async (username: string) => {
    const normalizedUsername = String(username || '').trim().toLowerCase();
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
        result.data && 'msg' in result.data && result.data.msg ? String(result.data.msg) : 'Gagal memuat akun.',
      );
    }

    applyCoreBundle(result.data);
    return true;
  };

  const refreshHistoryEntries = (usernameOverride?: string) => {
    const normalizedUsername = String(usernameOverride || accountProfile.username || '').trim().toLowerCase();
    if (!normalizedUsername) {
      setHistoryEntries([]);
      return;
    }

    startHistoryRefresh(async () => {
      try {
        await syncAccountBundle(normalizedUsername);
      } catch {
        // keep current history view readable
      }
    });
  };

  useEffect(() => {
    const hydrateSession = async () => {
      try {
        const savedUsername = window.localStorage.getItem(ACCOUNT_SESSION_KEY);
        if (savedUsername) {
          await syncAccountBundle(savedUsername);
        }
      } catch {
        // ignore hydration issue to keep page responsive
      }
    };

    void hydrateSession();
  }, []);

  useEffect(() => {
    const nextTab = normalizeAccountCenterTab(requestedTab || null);
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
    if (activeTab !== 'riwayat' || !accountProfile.loggedIn || !accountProfile.username) {
      return;
    }

    refreshHistoryEntries(accountProfile.username);
    const intervalId = window.setInterval(() => {
      refreshHistoryEntries(accountProfile.username);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeTab, accountProfile.loggedIn, accountProfile.username]);

  useEffect(() => {
    if (!detailEntry) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDetailEntry(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [detailEntry]);

  const depositHistoryEntries = useMemo(
    () => historyEntries.filter((entry) => entry.kind === 'deposit'),
    [historyEntries],
  );

  const availableDepositStatuses = useMemo(
    () => ['Semua', ...Array.from(new Set(depositHistoryEntries.map((entry) => entry.statusLabel).filter(Boolean)))],
    [depositHistoryEntries],
  );

  const availableDepositMethods = useMemo(
    () => ['Semua Metode', ...Array.from(new Set(depositHistoryEntries.map((entry) => entry.methodLabel).filter(Boolean)))],
    [depositHistoryEntries],
  );

  const filteredDepositHistory = useMemo(() => {
    const searchQuery = appliedHistoryFilter.search.trim().toLowerCase();
    return depositHistoryEntries
      .filter((entry) => {
        if (appliedHistoryFilter.status !== 'Semua' && entry.statusLabel !== appliedHistoryFilter.status) {
          return false;
        }
        if (appliedHistoryFilter.method !== 'Semua Metode' && entry.methodLabel !== appliedHistoryFilter.method) {
          return false;
        }
        if (!searchQuery) {
          return true;
        }

        const haystack = [
          entry.reference,
          entry.title,
          entry.subjectName,
          entry.methodLabel,
          entry.statusLabel,
          entry.detail,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchQuery);
      })
      .slice(0, appliedHistoryFilter.limit);
  }, [appliedHistoryFilter, depositHistoryEntries]);

  const normalizedDepositAmount = Math.max(0, Number(depositAmount.replace(/[^\d]/g, '') || 0));
  const depositLocked = !accountProfile.registered || !accountProfile.loggedIn;
  const canUseBalance = !depositLocked && normalizedDepositAmount > 0 && accountProfile.balance >= normalizedDepositAmount;
  const isActionLoading = isSubmittingProfile || isSubmittingDeposit || isRefreshingHistory;

  useEffect(() => {
    if (!canUseBalance && depositMethod === 'balance') {
      setDepositMethod('midtrans');
    }
  }, [canUseBalance, depositMethod]);

  const applyHistoryFilter = () => {
    setAppliedHistoryFilter({
      limit: Math.max(1, Number(historyFilterDraft.limit || 10)),
      status: historyFilterDraft.status,
      method: historyFilterDraft.method,
      search: historyFilterDraft.search.trim(),
    });
  };

  const registerAccount = () => {
    startProfileSubmit(async () => {
      const name = registerDraft.name.trim();
      const username = registerDraft.username.trim().toLowerCase();
      const password = registerDraft.password.trim();
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
        setRegisterDraft({ name: '', username: '', password: '' });
        window.localStorage.setItem(ACCOUNT_SESSION_KEY, username);
        setProfileFeedback({
          tone: 'success',
          text: 'Akun berhasil dibuat dan langsung aktif.',
        });
      } catch (error) {
        setProfileFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Gagal membuat akun.',
        });
      }
    });
  };

  const loginAccount = () => {
    startProfileSubmit(async () => {
      const username = loginDraft.username.trim().toLowerCase();
      const password = loginDraft.password.trim();
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
        window.localStorage.setItem(ACCOUNT_SESSION_KEY, username);
        setProfileFeedback({
          tone: 'success',
          text: 'Login berhasil. Saldo akun sekarang bisa dipakai di semua mode website.',
        });
      } catch (error) {
        setProfileFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Login gagal.',
        });
      }
    });
  };

  const updateProfile = () => {
    startProfileSubmit(async () => {
      if (!accountProfile.loggedIn || !accountProfile.username) {
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
            currentUsername: accountProfile.username,
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
          accountProfile.username;
        window.localStorage.setItem(ACCOUNT_SESSION_KEY, String(savedUsername).trim().toLowerCase());
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

  const logoutAccount = () => {
    const preservedUsername = accountProfile.username;
    const preservedName = accountProfile.name;
    window.localStorage.removeItem(ACCOUNT_SESSION_KEY);
    setAccountProfile({
      registered: Boolean(preservedUsername),
      loggedIn: false,
      name: preservedName,
      username: preservedUsername,
      balance: 0,
    });
    setHistoryEntries([]);
    setLoginDraft({
      username: preservedUsername,
      password: '',
    });
    setProfileEditDraft({
      username: preservedUsername,
      password: '',
    });
    setDepositFeedback({ tone: 'idle', text: '' });
    setProfileFeedback({
      tone: 'success',
      text: 'Kamu sudah logout dari akun ini.',
    });
  };

  const submitDepositFlow = () => {
    startDepositSubmit(async () => {
      if (depositLocked || !accountProfile.username) {
        setDepositFeedback({
          tone: 'error',
          text: 'Login akun dulu untuk membuka deposit akun website.',
        });
        return;
      }
      if (normalizedDepositAmount <= 0) {
        setDepositFeedback({
          tone: 'error',
          text: 'Isi nominal deposit yang valid dulu.',
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
            accountContact: accountProfile.username,
            amount: normalizedDepositAmount,
            method: depositMethod,
          }),
        });
        const result = (await response.json()) as CoreDepositResult;
        if (!response.ok || !result.status || !result.data?.bundle) {
          setDepositFeedback({
            tone: 'error',
            text: result.data && 'msg' in result.data ? String(result.data.msg || 'Deposit belum bisa diproses.') : 'Deposit belum bisa diproses.',
          });
          return;
        }

        applyCoreBundle(result.data.bundle);
        setDepositFeedback({
          tone: 'success',
          text:
            depositMethod === 'balance'
              ? 'Pembayaran dengan saldo akun berhasil dicatat. Cek tab riwayat deposit untuk detailnya.'
              : 'Deposit QRIS sudah dicatat. Cek tab riwayat deposit untuk memantau status pembayarannya.',
        });
      } catch (error) {
        setDepositFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Deposit belum bisa diproses.',
        });
      }
    });
  };

  return (
    <div className="apk-app-shell account-center-page">
      <ActionLoadingOverlay visible={isActionLoading} label="Memuat..." />
      <div className="apk-app-phone">
        <div className="apk-app-top-strip">
          <TopAccountMenu
            displayName={accountProfile.loggedIn ? accountProfile.name : 'Profil'}
            balance={accountProfile.balance}
            sections={STORE_ACCOUNT_MENU_SECTIONS}
          />
        </div>

        <div className="apk-app-content apk-app-content--tight">
          {activeTab === 'profil' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Profil</span>
                </div>
              </div>

              <article className="apk-app-form-card smm-profile-sheet account-center-sheet">
                <div id="profile-account" className="smm-profile-block">
                  <span className="smm-profile-title">Status akun</span>
                  <div className="smm-profile-lines">
                    <p>Nama akun : {accountProfile.name || '-'}</p>
                    <p>Username : {accountProfile.username ? `@${accountProfile.username}` : '-'}</p>
                    <p>Saldo : Rp {accountProfile.balance.toLocaleString('id-ID')}</p>
                    <p>Status : {accountProfile.loggedIn ? 'Login' : accountProfile.registered ? 'Belum login' : 'Belum terdaftar'}</p>
                  </div>
                </div>

                {accountProfile.loggedIn ? (
                  <div id="profile-edit" className="smm-profile-block">
                    <span className="smm-profile-title">Profil</span>
                    <div className="apk-app-form-grid smm-profile-form-grid">
                      <label className="apk-app-form-field">
                        <span>Username baru</span>
                        <input
                          value={profileEditDraft.username}
                          onChange={(event) =>
                            setProfileEditDraft((current) => ({
                              ...current,
                              username: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''),
                            }))
                          }
                          placeholder="contoh: putrigmoyy"
                        />
                      </label>
                      <label className="apk-app-form-field">
                        <span>Password baru</span>
                        <input
                          type="password"
                          value={profileEditDraft.password}
                          onChange={(event) =>
                            setProfileEditDraft((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                          placeholder="Minimal 6 karakter"
                        />
                      </label>
                    </div>
                    <div className="apk-app-action-row smm-profile-action-row">
                      <button type="button" className="apk-app-primary-button" onClick={updateProfile} disabled={isSubmittingProfile}>
                        {isSubmittingProfile ? 'Memproses...' : 'Simpan Profil'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {!accountProfile.registered ? (
                  <div className="smm-profile-block account-center-block--plain">
                    <div className="apk-app-form-grid smm-profile-form-grid">
                      <label className="apk-app-form-field">
                        <span>Nama akun</span>
                        <input
                          value={registerDraft.name}
                          onChange={(event) => setRegisterDraft((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Nama lengkap"
                        />
                      </label>
                      <label className="apk-app-form-field">
                        <span>Username akun</span>
                        <input
                          value={registerDraft.username}
                          onChange={(event) =>
                            setRegisterDraft((current) => ({
                              ...current,
                              username: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''),
                            }))
                          }
                          placeholder="contoh: putrigmoyy"
                        />
                      </label>
                      <label className="apk-app-form-field">
                        <span>Password akun</span>
                        <input
                          type="password"
                          value={registerDraft.password}
                          onChange={(event) => setRegisterDraft((current) => ({ ...current, password: event.target.value }))}
                          placeholder="Minimal 6 karakter"
                        />
                      </label>
                    </div>
                    <div className="apk-app-action-row smm-profile-action-row">
                      <button type="button" className="apk-app-primary-button" onClick={registerAccount} disabled={isSubmittingProfile}>
                        {isSubmittingProfile ? 'Memproses...' : 'Daftar akun'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {accountProfile.registered && !accountProfile.loggedIn ? (
                  <div className="smm-profile-block account-center-block--plain">
                    <div className="apk-app-form-grid smm-profile-form-grid">
                      <label className="apk-app-form-field">
                        <span>Username akun</span>
                        <input
                          value={loginDraft.username}
                          onChange={(event) =>
                            setLoginDraft((current) => ({
                              ...current,
                              username: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''),
                            }))
                          }
                          placeholder="Masukkan username"
                        />
                      </label>
                      <label className="apk-app-form-field">
                        <span>Password akun</span>
                        <input
                          type="password"
                          value={loginDraft.password}
                          onChange={(event) => setLoginDraft((current) => ({ ...current, password: event.target.value }))}
                          placeholder="Masukkan password"
                        />
                      </label>
                    </div>
                    <div className="apk-app-action-row smm-profile-action-row">
                      <button type="button" className="apk-app-primary-button" onClick={loginAccount} disabled={isSubmittingProfile}>
                        {isSubmittingProfile ? 'Memproses...' : 'Login'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {profileFeedback.text ? (
                  <div className={`apk-app-feedback apk-app-feedback--${profileFeedback.tone}`}>
                    {profileFeedback.text}
                  </div>
                ) : null}

                <div className="smm-profile-block">
                  <span className="smm-profile-title">Panduan mulai transaksi</span>
                  <div className="smm-profile-lines account-center-guide-lines">
                    <p id="guide-deposit">Cara deposit : buka tab deposit, isi nominal, lalu selesaikan pembayaran sampai status berubah berhasil.</p>
                    <p id="guide-status">Informasi status order : status order website diperbarui otomatis. Jika pembayaran expired, kamu perlu membuat transaksi baru.</p>
                    <p id="guide-order">Panduan cara pesanan : login akun dulu, pilih mode transaksi, lalu lanjutkan order dan pantau progresnya dari menu status masing-masing mode.</p>
                    <p id="guide-contact">Kontak : gunakan kontak admin store yang aktif jika ada kendala deposit atau transaksi.</p>
                  </div>
                </div>

                {accountProfile.registered && accountProfile.loggedIn ? (
                  <div className="apk-app-action-row smm-profile-logout-row">
                    <button type="button" className="apk-app-ghost-button" onClick={logoutAccount}>
                      Logout
                    </button>
                  </div>
                ) : null}
              </article>
            </section>
          ) : null}

          {activeTab === 'deposit' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Deposit</span>
                </div>
              </div>

              {accountProfile.loggedIn ? (
                <div className="apk-app-deposit-stack">
                  <article className="apk-app-info-card">
                    <strong>Saldo akun bersama</strong>
                    <p>Saldo ini dipakai bersama untuk App Premium dan Kebutuhan Social Media.</p>
                    <div className="apk-app-live-total-card">
                      <span>Saldo aktif</span>
                      <strong>Rp {formatRupiah(accountProfile.balance)}</strong>
                    </div>
                  </article>

                  <article className="apk-app-form-card">
                    <span className="apk-app-section-label">Nominal Deposit</span>
                    <div className="apk-app-form-grid">
                      <label className="apk-app-form-field">
                        <span>Masukkan jumlah deposit</span>
                        <input
                          value={depositAmount}
                          onChange={(event) => setDepositAmount(event.target.value.replace(/[^\d]/g, ''))}
                          placeholder="Contoh : 50000"
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
                        className={depositMethod === 'midtrans' ? 'apk-app-method-card apk-app-method-card--active' : 'apk-app-method-card'}
                        onClick={() => setDepositMethod('midtrans')}
                      >
                        <strong>QRIS Otomatis Midtrans</strong>
                        <p>Dipakai saat saldo akun belum cukup atau kamu ingin isi saldo manual.</p>
                      </button>
                      <button
                        type="button"
                        className={
                          depositMethod === 'balance'
                            ? 'apk-app-method-card apk-app-method-card--active'
                            : canUseBalance
                              ? 'apk-app-method-card'
                              : 'apk-app-method-card apk-app-method-card--disabled'
                        }
                        onClick={() => {
                          if (canUseBalance) {
                            setDepositMethod('balance');
                          }
                        }}
                        disabled={!canUseBalance}
                      >
                        <strong>Pakai Saldo Akun</strong>
                        <p>{canUseBalance ? 'Saldo akun cukup untuk membayar langsung.' : 'Saldo akun belum cukup untuk nominal ini.'}</p>
                      </button>
                    </div>

                    {depositFeedback.text ? (
                      <div className={`apk-app-feedback apk-app-feedback--${depositFeedback.tone}`}>
                        {depositFeedback.text}
                      </div>
                    ) : null}

                    <div className="apk-app-action-row">
                      <button type="button" className="apk-app-primary-button" onClick={submitDepositFlow} disabled={isSubmittingDeposit}>
                        {isSubmittingDeposit ? 'Memproses...' : 'Deposit'}
                      </button>
                    </div>
                  </article>
                </div>
              ) : (
                <div className="apk-app-empty">
                  Login akun dulu untuk membuka deposit akun website yang dipakai bersama di semua mode.
                </div>
              )}
            </section>
          ) : null}

          {activeTab === 'riwayat' ? (
            <section className="apk-app-panel apk-app-panel--plain">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Riwayat Deposit</span>
                </div>
              </div>

              {accountProfile.loggedIn ? (
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
                          {availableDepositStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="apk-app-form-field">
                        <span>Filter Metode</span>
                        <select
                          value={historyFilterDraft.method}
                          onChange={(event) => setHistoryFilterDraft((current) => ({ ...current, method: event.target.value }))}
                          className="smm-select"
                        >
                          {availableDepositMethods.map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="apk-app-form-field">
                        <span>Cari Referensi</span>
                        <input
                          value={historyFilterDraft.search}
                          onChange={(event) => setHistoryFilterDraft((current) => ({ ...current, search: event.target.value }))}
                          placeholder="Cari referensi / judul"
                        />
                      </label>
                      <div className="smm-monitoring-filter-actions">
                        <span>Submit</span>
                        <div className="smm-monitoring-filter-buttons">
                          <button
                            type="button"
                            className="apk-app-primary-button"
                            onClick={() => {
                              applyHistoryFilter();
                              refreshHistoryEntries(accountProfile.username);
                            }}
                          >
                            Filter
                          </button>
                          <button
                            type="button"
                            className="apk-app-ghost-button"
                            onClick={() => refreshHistoryEntries(accountProfile.username)}
                            disabled={isRefreshingHistory}
                          >
                            {isRefreshingHistory ? 'Memuat...' : 'Refresh'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div id="deposit-history" className="smm-status-table-wrap">
                    <table className="smm-status-table">
                      <thead>
                        <tr>
                          <th>Referensi</th>
                          <th>Waktu</th>
                          <th>Judul</th>
                          <th>Nominal</th>
                          <th>Metode</th>
                          <th>Status</th>
                          <th>Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDepositHistory.length ? (
                          filteredDepositHistory.map((entry) => {
                            const createdAt = formatDateParts(entry.createdAt);
                            return (
                              <tr key={entry.id}>
                                <td className="smm-status-cell--nowrap">{entry.reference || '-'}</td>
                                <td className="smm-status-time-cell">
                                  <span>{createdAt.datePart}</span>
                                  <span>{createdAt.timePart}</span>
                                </td>
                                <td>
                                  <div className="smm-status-service-name">{entry.title || '-'}</div>
                                </td>
                                <td className="smm-status-cell--nowrap">{entry.amountLabel || '-'}</td>
                                <td className="smm-status-cell--nowrap">{entry.methodLabel || '-'}</td>
                                <td className="smm-status-cell--nowrap">
                                  <span className={`smm-status-badge smm-status-badge--${mapStatusTone(entry.statusLabel || entry.status)}`}>
                                    {entry.statusLabel || '-'}
                                  </span>
                                </td>
                                <td className="smm-status-cell--nowrap">
                                  <button
                                    type="button"
                                    className="smm-status-detail-button"
                                    onClick={() => setDetailEntry(entry)}
                                    aria-label="Detail deposit"
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
                              <div className="apk-app-empty">Belum ada riwayat deposit yang cocok dengan filter ini.</div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="apk-app-empty">
                  Login akun dulu agar riwayat deposit bisa ditampilkan untuk akun website yang aktif.
                </div>
              )}
            </section>
          ) : null}
        </div>

        <nav className="apk-app-bottom-nav">
          {([
            ['profil', 'Profil'],
            ['deposit', 'Deposit'],
            ['riwayat', 'Riwayat'],
          ] as Array<[AccountCenterTab, string]>).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'apk-app-nav-item apk-app-nav-item--active' : 'apk-app-nav-item'}
              onClick={() => setActiveTab(tab)}
            >
              <span className="apk-app-nav-icon">
                <CenterNavGlyph type={tab} />
              </span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {detailEntry ? (
        <div className="smm-detail-modal-backdrop" onClick={() => setDetailEntry(null)}>
          <div className="smm-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="smm-detail-modal-head">
              <strong>Detail Deposit</strong>
              <button
                type="button"
                className="smm-detail-modal-close"
                onClick={() => setDetailEntry(null)}
                aria-label="Tutup detail deposit"
              >
                <CloseGlyph />
              </button>
            </div>

            <div className="smm-detail-modal-body">
              <table className="smm-detail-table">
                <tbody>
                  <tr>
                    <th>Referensi</th>
                    <td>{detailEntry.reference || '-'}</td>
                  </tr>
                  <tr>
                    <th>Judul</th>
                    <td>{detailEntry.title || '-'}</td>
                  </tr>
                  <tr>
                    <th>Nama</th>
                    <td>{detailEntry.subjectName || '-'}</td>
                  </tr>
                  <tr>
                    <th>Nominal</th>
                    <td>{detailEntry.amountLabel || '-'}</td>
                  </tr>
                  <tr>
                    <th>Metode</th>
                    <td>{detailEntry.methodLabel || '-'}</td>
                  </tr>
                  <tr>
                    <th>Status</th>
                    <td>{detailEntry.statusLabel || '-'}</td>
                  </tr>
                  <tr>
                    <th>Waktu</th>
                    <td>{formatDate(detailEntry.createdAt)}</td>
                  </tr>
                  <tr>
                    <th>Catatan</th>
                    <td>{detailEntry.detail || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
