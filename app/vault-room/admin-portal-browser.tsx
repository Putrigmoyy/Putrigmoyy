'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { formatRupiah } from '@/lib/apk-premium';
import type { AdminApkProductRow, AdminApkVariantRow, AdminPortalSnapshot } from '@/lib/admin-portal-types';
import { ActionLoadingOverlay } from '@/app/components/action-loading-overlay';
import { FloatingNotice } from '@/app/components/floating-notice';

type Props = {
  initialSnapshot: AdminPortalSnapshot;
  secret: string;
};

type AdminTab = 'smm' | 'users' | 'apk';

type NoticeState = {
  tone: 'success' | 'error' | 'info';
  text: string;
} | null;

function formatDateLabel(value: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\./g, ':');
}

export function AdminPortalBrowser({ initialSnapshot, secret }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [activeTab, setActiveTab] = useState<AdminTab>('smm');
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isPending, startTransition] = useTransition();

  const [profitPercentDraft, setProfitPercentDraft] = useState(String(initialSnapshot.smmPricing.profitPercent));
  const [userQuery, setUserQuery] = useState('');
  const [selectedUsername, setSelectedUsername] = useState(initialSnapshot.users[0]?.username || '');
  const [userForm, setUserForm] = useState({
    displayName: initialSnapshot.users[0]?.name || '',
    nextUsername: initialSnapshot.users[0]?.username || '',
    newPassword: '',
    balanceDelta: '0',
  });

  const [variantQuery, setVariantQuery] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState(initialSnapshot.apkVariants[0]?.variantId || '');
  const [variantForm, setVariantForm] = useState({
    variantTitle: initialSnapshot.apkVariants[0]?.variantTitle || '',
    duration: initialSnapshot.apkVariants[0]?.duration || '',
    price: initialSnapshot.apkVariants[0] ? String(initialSnapshot.apkVariants[0].price) : '0',
    stockDelta: '0',
    badge: initialSnapshot.apkVariants[0]?.badge || '',
  });
  const [newProductForm, setNewProductForm] = useState({
    title: '',
    subtitle: '',
    category: 'App Premium',
    imageUrl: '',
  });
  const [newVariantForm, setNewVariantForm] = useState({
    productId: initialSnapshot.apkProducts[0]?.productId || '',
    variantTitle: '',
    duration: '',
    price: '',
    badge: '',
  });
  const [accountStockForm, setAccountStockForm] = useState({
    variantId: initialSnapshot.apkVariants[0]?.variantId || '',
    accountBatch: '',
    adminNote: '',
  });

  useEffect(() => {
    if (!notice?.text) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = userQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return snapshot.users;
    }
    return snapshot.users.filter((user) => {
      const haystack = `${user.username} ${user.name}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [snapshot.users, userQuery]);

  const selectedUser = useMemo(
    () => snapshot.users.find((user) => user.username === selectedUsername) || filteredUsers[0] || null,
    [filteredUsers, selectedUsername, snapshot.users],
  );

  useEffect(() => {
    if (!selectedUser) {
      return;
    }
    setSelectedUsername(selectedUser.username);
    setUserForm({
      displayName: selectedUser.name,
      nextUsername: selectedUser.username,
      newPassword: '',
      balanceDelta: '0',
    });
  }, [selectedUser]);

  const filteredVariants = useMemo(() => {
    const normalizedQuery = variantQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return snapshot.apkVariants;
    }
    return snapshot.apkVariants.filter((variant) => {
      const haystack = `${variant.productTitle} ${variant.variantTitle} ${variant.category}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [snapshot.apkVariants, variantQuery]);

  const selectedVariant = useMemo(
    () => snapshot.apkVariants.find((variant) => variant.variantId === selectedVariantId) || filteredVariants[0] || null,
    [filteredVariants, selectedVariantId, snapshot.apkVariants],
  );
  const selectedProduct = useMemo<AdminApkProductRow | null>(
    () => snapshot.apkProducts.find((product) => product.productId === newVariantForm.productId) || snapshot.apkProducts[0] || null,
    [newVariantForm.productId, snapshot.apkProducts],
  );
  const selectedAccountVariant = useMemo<AdminApkVariantRow | null>(
    () => snapshot.apkVariants.find((variant) => variant.variantId === accountStockForm.variantId) || snapshot.apkVariants[0] || null,
    [accountStockForm.variantId, snapshot.apkVariants],
  );

  useEffect(() => {
    if (!selectedVariant) {
      return;
    }
    setSelectedVariantId(selectedVariant.variantId);
    setVariantForm({
      variantTitle: selectedVariant.variantTitle,
      duration: selectedVariant.duration,
      price: String(selectedVariant.price),
      stockDelta: '0',
      badge: selectedVariant.badge,
    });
  }, [selectedVariant]);

  useEffect(() => {
    if (!snapshot.apkProducts.length) {
      return;
    }
    setNewVariantForm((current) => ({
      ...current,
      productId: snapshot.apkProducts.some((product) => product.productId === current.productId)
        ? current.productId
        : snapshot.apkProducts[0]?.productId || '',
    }));
  }, [snapshot.apkProducts]);

  useEffect(() => {
    if (!snapshot.apkVariants.length) {
      return;
    }
    setAccountStockForm((current) => ({
      ...current,
      variantId: snapshot.apkVariants.some((variant) => variant.variantId === current.variantId)
        ? current.variantId
        : snapshot.apkVariants[0]?.variantId || '',
    }));
  }, [snapshot.apkVariants]);

  async function fetchSnapshot() {
    const response = await fetch('/api/admin/portal', {
      method: 'GET',
      headers: {
        'x-admin-secret': secret,
      },
      cache: 'no-store',
    });
    const result = (await response.json()) as {
      status?: boolean;
      data?: AdminPortalSnapshot | {
        msg?: string;
      };
    };

    if (!response.ok || !result.status || !result.data || !('summary' in result.data)) {
      throw new Error(result.data && 'msg' in result.data ? String(result.data.msg || 'Data admin belum bisa dimuat.') : 'Data admin belum bisa dimuat.');
    }

    setSnapshot(result.data);
    setProfitPercentDraft(String(result.data.smmPricing.profitPercent));
  }

  function runAction(task: () => Promise<void>) {
    startTransition(() => {
      void task();
    });
  }

  const previewBasePrice = 1000;
  const previewSellPrice = Math.max(
    0,
    Math.ceil(previewBasePrice * (1 + Math.max(0, Number(profitPercentDraft || 0)) / 100)),
  );

  return (
    <div className="apk-app-shell">
      <ActionLoadingOverlay visible={isPending} label="Memuat portal admin..." />
      <div className="apk-app-phone admin-portal-phone">
        <FloatingNotice notice={notice} />

        <section className="admin-portal-hero">
          <div className="admin-portal-hero__copy">
            <span className="apk-app-section-label">Portal Admin Rahasia</span>
            <h1>Kontrol pusat untuk sosial media, user website, dan stok App Premium.</h1>
            <p>Halaman ini tidak muncul di menu mana pun. Semua perubahan langsung tersimpan ke database website yang sama.</p>
          </div>
          <button
            type="button"
            className="apk-app-ghost-button"
            onClick={() =>
              runAction(async () => {
                await fetchSnapshot();
                setNotice({
                  tone: 'success',
                  text: 'Data admin berhasil diperbarui ulang.',
                });
              })
            }
          >
            Refresh Data
          </button>
        </section>

        <section className="admin-portal-summary-grid">
          <article className="admin-portal-summary-card">
            <span>Total user</span>
            <strong>{snapshot.summary.totalUsers.toLocaleString('id-ID')}</strong>
          </article>
          <article className="admin-portal-summary-card">
            <span>Total produk premium</span>
            <strong>{snapshot.summary.totalProducts.toLocaleString('id-ID')}</strong>
          </article>
          <article className="admin-portal-summary-card">
            <span>Total varian App Premium</span>
            <strong>{snapshot.summary.totalVariants.toLocaleString('id-ID')}</strong>
          </article>
          <article className="admin-portal-summary-card">
            <span>Total stok premium</span>
            <strong>{snapshot.summary.totalPremiumStock.toLocaleString('id-ID')}</strong>
          </article>
        </section>

        <div className="admin-portal-tab-row">
          {([
            ['smm', 'Harga Sosmed'],
            ['users', 'Kelola User'],
            ['apk', 'Kelola Apprem'],
          ] as Array<[AdminTab, string]>).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'admin-portal-tab admin-portal-tab--active' : 'admin-portal-tab'}
              onClick={() => setActiveTab(tab)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="admin-portal-content">
          {activeTab === 'smm' ? (
            <section className="apk-app-panel">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Harga Sosial Media</span>
                  <h3>Atur persentase keuntungan umum untuk semua layanan provider.</h3>
                </div>
              </div>

              <div className="admin-portal-grid">
                <article className="account-popup-card">
                  <span className="smm-profile-title">Persentase keuntungan</span>
                  <div className="apk-app-form-grid smm-profile-form-grid">
                    <label className="apk-app-form-field">
                      <span>Profit (%)</span>
                      <input
                        value={profitPercentDraft}
                        onChange={(event) => setProfitPercentDraft(event.target.value.replace(/[^\d.]/g, ''))}
                        inputMode="decimal"
                        placeholder="contoh: 15"
                      />
                    </label>
                  </div>
                  <div className="admin-portal-preview-card">
                    <p>Harga provider contoh : Rp {formatRupiah(previewBasePrice)}</p>
                    <p>Harga jual website : Rp {formatRupiah(previewSellPrice)}</p>
                  </div>
                  <div className="apk-app-action-row apk-app-action-row--compact">
                    <button
                      type="button"
                      className="apk-app-primary-button"
                      onClick={() =>
                        runAction(async () => {
                          const response = await fetch('/api/admin/portal', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-admin-secret': secret,
                            },
                            body: JSON.stringify({
                              action: 'save-smm-pricing',
                              profitPercent: Number(profitPercentDraft || 0),
                            }),
                          });
                          const result = (await response.json()) as {
                            status?: boolean;
                            data?: {
                              msg?: string;
                              snapshot?: AdminPortalSnapshot;
                            };
                          };
                          if (!response.ok || !result.status || !result.data?.snapshot) {
                            throw new Error(result.data?.msg || 'Pengaturan harga sosial media belum bisa disimpan.');
                          }
                          setSnapshot(result.data.snapshot);
                          setProfitPercentDraft(String(result.data.snapshot.smmPricing.profitPercent));
                          setNotice({
                            tone: 'success',
                            text: result.data.msg || 'Persentase keuntungan berhasil disimpan.',
                          });
                        })
                      }
                    >
                      Simpan Profit
                    </button>
                  </div>
                </article>

                <article className="account-popup-card">
                  <span className="smm-profile-title">Keterangan</span>
                  <div className="smm-profile-lines">
                    <p>Perubahan ini langsung memengaruhi harga yang tampil di menu sosial media website.</p>
                    <p>Profit disimpan sebagai persentase di atas harga provider, lalu total order dihitung ulang otomatis saat checkout.</p>
                    <p>Backend checkout juga ikut memvalidasi ulang harga supaya tidak bisa dimanipulasi dari luar.</p>
                  </div>
                </article>
              </div>
            </section>
          ) : null}

          {activeTab === 'users' ? (
            <section className="apk-app-panel">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Kelola User Website</span>
                  <h3>Edit akun, ubah username/password, dan sesuaikan saldo user dari satu tempat.</h3>
                </div>
              </div>

              <div className="admin-portal-split">
                <article className="account-popup-card">
                  <label className="apk-app-form-field">
                    <span>Cari user</span>
                    <input
                      value={userQuery}
                      onChange={(event) => setUserQuery(event.target.value)}
                      placeholder="Cari username atau nama akun"
                    />
                  </label>

                  <div className="admin-portal-list">
                    {filteredUsers.length ? (
                      filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className={selectedUsername === user.username ? 'admin-portal-list-item admin-portal-list-item--active' : 'admin-portal-list-item'}
                          onClick={() => setSelectedUsername(user.username)}
                        >
                          <strong>@{user.username}</strong>
                          <span>{user.name || 'Tanpa nama'}</span>
                          <small>Saldo Rp {formatRupiah(user.balance)}</small>
                        </button>
                      ))
                    ) : (
                      <div className="apk-app-empty">Belum ada user yang cocok dengan pencarian ini.</div>
                    )}
                  </div>
                </article>

                <article className="account-popup-card">
                  {selectedUser ? (
                    <>
                      <span className="smm-profile-title">Editor user</span>
                      <div className="smm-profile-lines">
                        <p>Username aktif : @{selectedUser.username}</p>
                        <p>Saldo sekarang : Rp {formatRupiah(selectedUser.balance)}</p>
                        <p>Riwayat tercatat : {selectedUser.historyCount.toLocaleString('id-ID')}</p>
                        <p>Update terakhir : {formatDateLabel(selectedUser.updatedAt)}</p>
                      </div>

                      <div className="apk-app-form-grid smm-profile-form-grid">
                        <label className="apk-app-form-field">
                          <span>Nama akun</span>
                          <input
                            value={userForm.displayName}
                            onChange={(event) => setUserForm((current) => ({ ...current, displayName: event.target.value }))}
                            placeholder="Nama akun"
                          />
                        </label>
                        <label className="apk-app-form-field">
                          <span>Username baru</span>
                          <input
                            value={userForm.nextUsername}
                            onChange={(event) =>
                              setUserForm((current) => ({
                                ...current,
                                nextUsername: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''),
                              }))
                            }
                            placeholder="contoh: putrigmoyy"
                          />
                        </label>
                        <label className="apk-app-form-field">
                          <span>Password baru</span>
                          <input
                            type="password"
                            value={userForm.newPassword}
                            onChange={(event) => setUserForm((current) => ({ ...current, newPassword: event.target.value }))}
                            placeholder="Kosongkan jika tidak diubah"
                          />
                        </label>
                        <label className="apk-app-form-field">
                          <span>Tambah/Kurangi saldo</span>
                          <input
                            value={userForm.balanceDelta}
                            onChange={(event) => setUserForm((current) => ({ ...current, balanceDelta: event.target.value.replace(/[^\d-]/g, '') }))}
                            inputMode="numeric"
                            placeholder="contoh: 10000 atau -5000"
                          />
                        </label>
                      </div>

                      <div className="apk-app-action-row apk-app-action-row--compact">
                        <button
                          type="button"
                          className="apk-app-primary-button"
                          onClick={() =>
                            runAction(async () => {
                              const response = await fetch('/api/admin/portal', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'x-admin-secret': secret,
                                },
                                body: JSON.stringify({
                                  action: 'save-user',
                                  currentUsername: selectedUser.username,
                                  displayName: userForm.displayName,
                                  nextUsername: userForm.nextUsername,
                                  newPassword: userForm.newPassword,
                                  balanceDelta: Number(userForm.balanceDelta || 0),
                                }),
                              });
                              const result = (await response.json()) as {
                                status?: boolean;
                                data?: {
                                  msg?: string;
                                  snapshot?: AdminPortalSnapshot;
                                };
                              };
                              if (!response.ok || !result.status || !result.data?.snapshot) {
                                throw new Error(result.data?.msg || 'Data user belum bisa diperbarui.');
                              }
                              setSnapshot(result.data.snapshot);
                              setSelectedUsername(userForm.nextUsername || selectedUser.username);
                              setNotice({
                                tone: 'success',
                                text: result.data.msg || 'Data user berhasil diperbarui.',
                              });
                            })
                          }
                        >
                          Simpan User
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="apk-app-empty">Belum ada user untuk dikelola.</div>
                  )}
                </article>
              </div>
            </section>
          ) : null}

          {activeTab === 'apk' ? (
            <section className="apk-app-panel">
              <div className="apk-app-panel-head">
                <div>
                  <span className="apk-app-section-label">Kelola App Premium</span>
                  <h3>Tambah produk, tambah varian, isi data akun, dan atur stok premium dari satu portal.</h3>
                </div>
              </div>

              <div className="admin-portal-grid">
                <article className="account-popup-card">
                  <span className="smm-profile-title">Tambah produk</span>
                  <div className="apk-app-form-grid smm-profile-form-grid">
                    <label className="apk-app-form-field">
                      <span>Nama produk</span>
                      <input
                        value={newProductForm.title}
                        onChange={(event) => setNewProductForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Contoh: Canva Pro"
                      />
                    </label>
                    <label className="apk-app-form-field">
                      <span>Subtitle</span>
                      <input
                        value={newProductForm.subtitle}
                        onChange={(event) => setNewProductForm((current) => ({ ...current, subtitle: event.target.value }))}
                        placeholder="Deskripsi singkat produk"
                      />
                    </label>
                    <label className="apk-app-form-field">
                      <span>Kategori</span>
                      <input
                        value={newProductForm.category}
                        onChange={(event) => setNewProductForm((current) => ({ ...current, category: event.target.value }))}
                        placeholder="Streaming / Editing / AI"
                      />
                    </label>
                    <label className="apk-app-form-field">
                      <span>Logo resmi / URL gambar</span>
                      <input
                        value={newProductForm.imageUrl}
                        onChange={(event) => setNewProductForm((current) => ({ ...current, imageUrl: event.target.value }))}
                        placeholder="https://... atau /premium-icons/..."
                      />
                    </label>
                  </div>
                  <div className="apk-app-action-row apk-app-action-row--compact">
                    <button
                      type="button"
                      className="apk-app-primary-button"
                      onClick={() =>
                        runAction(async () => {
                          const response = await fetch('/api/admin/portal', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-admin-secret': secret,
                            },
                            body: JSON.stringify({
                              action: 'create-apk-product',
                              title: newProductForm.title,
                              subtitle: newProductForm.subtitle,
                              category: newProductForm.category,
                              imageUrl: newProductForm.imageUrl,
                            }),
                          });
                          const result = (await response.json()) as {
                            status?: boolean;
                            data?: {
                              msg?: string;
                              product?: AdminApkProductRow | null;
                              snapshot?: AdminPortalSnapshot;
                            };
                          };
                          if (!response.ok || !result.status || !result.data?.snapshot) {
                            throw new Error(result.data?.msg || 'Produk baru belum bisa ditambahkan.');
                          }
                          const nextSnapshot = result.data.snapshot;
                          const createdProductId = result.data.product?.productId || '';
                          setSnapshot(nextSnapshot);
                          if (createdProductId) {
                            setNewVariantForm((current) => ({ ...current, productId: createdProductId || current.productId }));
                          }
                          setNewProductForm({
                            title: '',
                            subtitle: '',
                            category: 'App Premium',
                            imageUrl: '',
                          });
                          setNotice({
                            tone: 'success',
                            text: result.data.msg || 'Produk App Premium berhasil ditambahkan.',
                          });
                        })
                      }
                    >
                      Simpan Produk
                    </button>
                  </div>
                </article>

                <article className="account-popup-card">
                  <span className="smm-profile-title">Tambah varian</span>
                  <div className="apk-app-form-grid smm-profile-form-grid">
                    <label className="apk-app-form-field">
                      <span>Pilih produk</span>
                      <select
                        value={newVariantForm.productId}
                        onChange={(event) => setNewVariantForm((current) => ({ ...current, productId: event.target.value }))}
                        className="smm-select"
                      >
                        {snapshot.apkProducts.map((product) => (
                          <option key={product.productId} value={product.productId}>
                            {product.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="apk-app-form-field">
                      <span>Nama varian</span>
                      <input
                        value={newVariantForm.variantTitle}
                        onChange={(event) => setNewVariantForm((current) => ({ ...current, variantTitle: event.target.value }))}
                        placeholder="Contoh: Member 1 Bulan"
                      />
                    </label>
                    <label className="apk-app-form-field">
                      <span>Durasi</span>
                      <input
                        value={newVariantForm.duration}
                        onChange={(event) => setNewVariantForm((current) => ({ ...current, duration: event.target.value }))}
                        placeholder="1 Bulan / 1 Tahun"
                      />
                    </label>
                    <label className="apk-app-form-field">
                      <span>Harga</span>
                      <input
                        value={newVariantForm.price}
                        onChange={(event) => setNewVariantForm((current) => ({ ...current, price: event.target.value.replace(/[^\d]/g, '') }))}
                        inputMode="numeric"
                        placeholder="Harga jual"
                      />
                    </label>
                    <label className="apk-app-form-field">
                      <span>Badge</span>
                      <input
                        value={newVariantForm.badge}
                        onChange={(event) => setNewVariantForm((current) => ({ ...current, badge: event.target.value }))}
                        placeholder="BEST / HOT / LIMITED"
                      />
                    </label>
                  </div>
                  <div className="smm-profile-lines">
                    <p>Produk aktif : {selectedProduct?.title || '-'}</p>
                    <p>Jumlah varian saat ini : {snapshot.apkVariants.filter((variant) => variant.productId === newVariantForm.productId).length.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="apk-app-action-row apk-app-action-row--compact">
                    <button
                      type="button"
                      className="apk-app-primary-button"
                      onClick={() =>
                        runAction(async () => {
                          const response = await fetch('/api/admin/portal', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-admin-secret': secret,
                            },
                            body: JSON.stringify({
                              action: 'create-apk-variant',
                              productId: newVariantForm.productId,
                              variantTitle: newVariantForm.variantTitle,
                              duration: newVariantForm.duration,
                              price: Number(newVariantForm.price || 0),
                              badge: newVariantForm.badge,
                            }),
                          });
                          const result = (await response.json()) as {
                            status?: boolean;
                            data?: {
                              msg?: string;
                              variant?: AdminApkVariantRow | null;
                              snapshot?: AdminPortalSnapshot;
                            };
                          };
                          if (!response.ok || !result.status || !result.data?.snapshot) {
                            throw new Error(result.data?.msg || 'Varian baru belum bisa ditambahkan.');
                          }
                          const nextSnapshot = result.data.snapshot;
                          const createdVariantId = result.data.variant?.variantId || '';
                          setSnapshot(nextSnapshot);
                          if (createdVariantId) {
                            setSelectedVariantId(createdVariantId);
                            setAccountStockForm((current) => ({ ...current, variantId: createdVariantId || current.variantId }));
                          }
                          setNewVariantForm((current) => ({
                            ...current,
                            variantTitle: '',
                            duration: '',
                            price: '',
                            badge: '',
                          }));
                          setNotice({
                            tone: 'success',
                            text: result.data.msg || 'Varian App Premium berhasil ditambahkan.',
                          });
                        })
                      }
                    >
                      Simpan Varian
                    </button>
                  </div>
                </article>

                <article className="account-popup-card">
                  <span className="smm-profile-title">Tambah data akun</span>
                  <div className="apk-app-form-grid smm-profile-form-grid">
                    <label className="apk-app-form-field">
                      <span>Pilih varian</span>
                      <select
                        value={accountStockForm.variantId}
                        onChange={(event) => setAccountStockForm((current) => ({ ...current, variantId: event.target.value }))}
                        className="smm-select"
                      >
                        {snapshot.apkVariants.map((variant) => (
                          <option key={variant.variantId} value={variant.variantId}>
                            {variant.productTitle} - {variant.variantTitle}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="apk-app-form-field">
                      <span>Catatan admin stok</span>
                      <input
                        value={accountStockForm.adminNote}
                        onChange={(event) => setAccountStockForm((current) => ({ ...current, adminNote: event.target.value }))}
                        placeholder="Catatan khusus stok akun ini"
                      />
                    </label>
                    <label className="apk-app-form-field apk-app-form-field--full">
                      <span>Data akun</span>
                      <textarea
                        value={accountStockForm.accountBatch}
                        onChange={(event) => setAccountStockForm((current) => ({ ...current, accountBatch: event.target.value }))}
                        rows={6}
                        placeholder="Satu akun per baris"
                      />
                    </label>
                  </div>
                  <div className="smm-profile-lines">
                    <p>Varian aktif : {selectedAccountVariant?.variantTitle || '-'}</p>
                    <p>Akun siap kirim : {selectedAccountVariant?.availableAccountCount.toLocaleString('id-ID') || '0'}</p>
                    <p>Stok website : {selectedAccountVariant?.stock.toLocaleString('id-ID') || '0'}</p>
                  </div>
                  <div className="apk-app-action-row apk-app-action-row--compact">
                    <button
                      type="button"
                      className="apk-app-primary-button"
                      onClick={() =>
                        runAction(async () => {
                          const response = await fetch('/api/admin/portal', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-admin-secret': secret,
                            },
                            body: JSON.stringify({
                              action: 'add-apk-account-data',
                              variantId: accountStockForm.variantId,
                              adminNote: accountStockForm.adminNote,
                              accountBatch: accountStockForm.accountBatch,
                            }),
                          });
                          const result = (await response.json()) as {
                            status?: boolean;
                            data?: {
                              msg?: string;
                              snapshot?: AdminPortalSnapshot;
                            };
                          };
                          if (!response.ok || !result.status || !result.data?.snapshot) {
                            throw new Error(result.data?.msg || 'Data akun belum bisa ditambahkan.');
                          }
                          setSnapshot(result.data.snapshot);
                          setAccountStockForm((current) => ({
                            ...current,
                            accountBatch: '',
                            adminNote: '',
                          }));
                          setNotice({
                            tone: 'success',
                            text: result.data.msg || 'Data akun berhasil ditambahkan ke stok premium.',
                          });
                        })
                      }
                    >
                      Simpan Data Akun
                    </button>
                  </div>
                </article>
              </div>

              <div className="admin-portal-split">
                <article className="account-popup-card">
                  <label className="apk-app-form-field">
                    <span>Cari varian premium</span>
                    <input
                      value={variantQuery}
                      onChange={(event) => setVariantQuery(event.target.value)}
                      placeholder="Cari produk, varian, atau kategori"
                    />
                  </label>

                  <div className="admin-portal-list">
                    {filteredVariants.length ? (
                      filteredVariants.map((variant) => (
                        <button
                          key={variant.variantId}
                          type="button"
                          className={selectedVariantId === variant.variantId ? 'admin-portal-list-item admin-portal-list-item--active' : 'admin-portal-list-item'}
                          onClick={() => setSelectedVariantId(variant.variantId)}
                        >
                          <strong>{variant.productTitle}</strong>
                          <span>{variant.variantTitle}</span>
                          <small>Stok {variant.stock.toLocaleString('id-ID')} • Rp {formatRupiah(variant.price)}</small>
                        </button>
                      ))
                    ) : (
                      <div className="apk-app-empty">Varian yang kamu cari belum ditemukan.</div>
                    )}
                  </div>
                </article>

                <article className="account-popup-card">
                  {selectedVariant ? (
                    <>
                      <span className="smm-profile-title">Editor varian</span>
                      <div className="smm-profile-lines">
                        <p>Produk : {selectedVariant.productTitle}</p>
                        <p>Kategori : {selectedVariant.category}</p>
                        <p>Stok sekarang : {selectedVariant.stock.toLocaleString('id-ID')}</p>
                        <p>Akun siap kirim : {selectedVariant.availableAccountCount.toLocaleString('id-ID')}</p>
                        <p>Update terakhir : {formatDateLabel(selectedVariant.productUpdatedAt)}</p>
                      </div>

                      <div className="apk-app-form-grid smm-profile-form-grid">
                        <label className="apk-app-form-field">
                          <span>Nama varian</span>
                          <input
                            value={variantForm.variantTitle}
                            onChange={(event) => setVariantForm((current) => ({ ...current, variantTitle: event.target.value }))}
                            placeholder="Nama varian"
                          />
                        </label>
                        <label className="apk-app-form-field">
                          <span>Durasi</span>
                          <input
                            value={variantForm.duration}
                            onChange={(event) => setVariantForm((current) => ({ ...current, duration: event.target.value }))}
                            placeholder="Durasi / keterangan"
                          />
                        </label>
                        <label className="apk-app-form-field">
                          <span>Harga</span>
                          <input
                            value={variantForm.price}
                            onChange={(event) => setVariantForm((current) => ({ ...current, price: event.target.value.replace(/[^\d]/g, '') }))}
                            inputMode="numeric"
                            placeholder="Harga jual"
                          />
                        </label>
                        <label className="apk-app-form-field">
                          <span>Tambah stok</span>
                          <input
                            value={variantForm.stockDelta}
                            onChange={(event) => setVariantForm((current) => ({ ...current, stockDelta: event.target.value.replace(/[^\d-]/g, '') }))}
                            inputMode="numeric"
                            placeholder="contoh: 5 atau -1"
                          />
                        </label>
                        <label className="apk-app-form-field">
                          <span>Badge</span>
                          <input
                            value={variantForm.badge}
                            onChange={(event) => setVariantForm((current) => ({ ...current, badge: event.target.value }))}
                            placeholder="Opsional"
                          />
                        </label>
                      </div>

                      <div className="apk-app-action-row apk-app-action-row--compact">
                        <button
                          type="button"
                          className="apk-app-primary-button"
                          onClick={() =>
                            runAction(async () => {
                              const response = await fetch('/api/admin/portal', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'x-admin-secret': secret,
                                },
                                body: JSON.stringify({
                                  action: 'save-apk-variant',
                                  variantId: selectedVariant.variantId,
                                  variantTitle: variantForm.variantTitle,
                                  duration: variantForm.duration,
                                  price: Number(variantForm.price || 0),
                                  stockDelta: Number(variantForm.stockDelta || 0),
                                  badge: variantForm.badge,
                                }),
                              });
                              const result = (await response.json()) as {
                                status?: boolean;
                                data?: {
                                  msg?: string;
                                  snapshot?: AdminPortalSnapshot;
                                };
                              };
                              if (!response.ok || !result.status || !result.data?.snapshot) {
                                throw new Error(result.data?.msg || 'Variant App Premium belum bisa diperbarui.');
                              }
                              setSnapshot(result.data.snapshot);
                              setNotice({
                                tone: 'success',
                                text: result.data.msg || 'Variant App Premium berhasil diperbarui.',
                              });
                            })
                          }
                        >
                          Simpan Varian
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="apk-app-empty">Belum ada varian premium untuk dikelola.</div>
                  )}
                </article>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
