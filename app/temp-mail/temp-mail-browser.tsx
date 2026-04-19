'use client';

import { useDeferredValue, useEffect, useEffectEvent, useState, useTransition } from 'react';
import styles from '@/app/temp-mail/temp-mail.module.css';
import type {
  TempMailConfigSnapshot,
  TempMailInboxDetailPayload,
  TempMailInboxListPayload,
  TempMailInboxSummary,
} from '@/lib/temp-mail-types';

type Props = {
  initialConfig: TempMailConfigSnapshot;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatRelative(value: string | null) {
  if (!value) {
    return 'Belum ada email masuk';
  }

  const diffMinutes = Math.round((new Date(value).getTime() - Date.now()) / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat('id-ID', {
    numeric: 'auto',
  });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }

  return formatter.format(Math.round(diffHours / 24), 'day');
}

async function readJson<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || 'Permintaan gagal diproses.');
  }

  return payload;
}

function createPreviewDocument(html: string) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><base target="_blank" /><style>body{font-family:Roboto,Segoe UI,Arial,sans-serif;padding:20px;margin:0;color:#111;background:#fff;}img{max-width:100%;height:auto;}pre{white-space:pre-wrap;}a{color:#1799f2;}</style></head><body>${html}</body></html>`;
}

function SetupStatus({ ready }: { ready: boolean }) {
  return <span className={ready ? styles.statusReady : styles.statusMissing}>{ready ? 'siap' : 'kurang'}</span>;
}

function InlineSpinner() {
  return <span className={styles.spin}>o</span>;
}

export function TempMailBrowser({ initialConfig }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [inboxes, setInboxes] = useState<TempMailInboxSummary[]>([]);
  const [detail, setDetail] = useState<TempMailInboxDetailPayload | null>(null);
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState('');
  const [domainDraft, setDomainDraft] = useState(initialConfig.primaryDomain);
  const [searchDraft, setSearchDraft] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(initialConfig.coreReady);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'text' | 'html'>('text');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(searchDraft);

  const activeDomain = config.domains.includes(domainDraft) ? domainDraft : config.primaryDomain;
  const filteredEmails =
    detail?.emails.filter((email) => {
      const keyword = deferredSearch.trim().toLowerCase();
      if (!keyword) {
        return true;
      }

      return (
        email.subject.toLowerCase().includes(keyword) ||
        email.fromAddress.toLowerCase().includes(keyword) ||
        email.snippet.toLowerCase().includes(keyword)
      );
    }) || [];

  async function refreshDashboard(override?: {
    inboxId?: string | null;
    messageId?: string | null;
    silent?: boolean;
  }) {
    if (!config.coreReady && !initialConfig.coreReady) {
      setIsBooting(false);
      return;
    }

    if (!override?.silent) {
      setIsRefreshing(true);
    }

    try {
      const listPayload = await readJson<TempMailInboxListPayload>(
        await fetch('/api/temp-mail/inboxes', {
          cache: 'no-store',
        }),
      );

      setConfig(listPayload.config);
      setInboxes(listPayload.inboxes);
      setErrorMessage(null);

      const preferredInboxId = override?.inboxId ?? selectedInboxId;
      const nextInbox =
        (preferredInboxId && listPayload.inboxes.find((item) => item.id === preferredInboxId)) ||
        listPayload.inboxes[0] ||
        null;

      if (!nextInbox) {
        setDetail(null);
        setSelectedInboxId(null);
        setSelectedMessageId(null);
        setLastSyncedAt(new Date().toISOString());
        return;
      }

      setSelectedInboxId(nextInbox.id);
      const requestedMessageId = override?.messageId ?? selectedMessageId;
      const query = requestedMessageId ? `?messageId=${encodeURIComponent(requestedMessageId)}` : '';

      const detailPayload = await readJson<TempMailInboxDetailPayload>(
        await fetch(`/api/temp-mail/inboxes/${encodeURIComponent(nextInbox.id)}${query}`, {
          cache: 'no-store',
        }),
      );

      setDetail(detailPayload);
      setSelectedMessageId(detailPayload.selectedEmail?.id || null);
      setPreviewMode(detailPayload.selectedEmail?.htmlBody && !detailPayload.selectedEmail?.textBody ? 'html' : 'text');
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Dashboard temp mail gagal dimuat.');
    } finally {
      setIsBooting(false);
      setIsRefreshing(false);
    }
  }

  const silentPoll = useEffectEvent(() => {
    void refreshDashboard({ silent: true });
  });

  const kickoffLoad = useEffectEvent(() => {
    void refreshDashboard();
  });

  useEffect(() => {
    if (!initialConfig.coreReady) {
      return;
    }

    const kickoff = window.setTimeout(() => {
      kickoffLoad();
    }, 0);

    const timer = window.setInterval(() => {
      silentPoll();
    }, 15000);

    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, [initialConfig.coreReady]);

  async function handleCopyEmail(emailAddress: string) {
    try {
      await navigator.clipboard.writeText(emailAddress);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 1500);
    } catch {
      setCopiedEmail(false);
    }
  }

  async function handleCreateInbox(customAlias?: string) {
    if (!config.coreReady) {
      return;
    }

    setBusyAction('create');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const payload = await readJson<{ inbox: TempMailInboxSummary }>(
        await fetch('/api/temp-mail/inboxes', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            localPart: customAlias || undefined,
            domain: activeDomain || undefined,
          }),
        }),
      );

      setAliasDraft('');
      setStatusMessage(`Inbox ${payload.inbox.emailAddress} berhasil dibuat.`);
      await refreshDashboard({
        inboxId: payload.inbox.id,
        messageId: null,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal membuat inbox baru.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteInbox() {
    if (!detail?.inbox.id) {
      return;
    }

    const approved = window.confirm(`Hapus inbox ${detail.inbox.emailAddress}? Isi email di dalamnya ikut terhapus.`);
    if (!approved) {
      return;
    }

    setBusyAction('delete');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await readJson(
        await fetch(`/api/temp-mail/inboxes/${encodeURIComponent(detail.inbox.id)}`, {
          method: 'DELETE',
        }),
      );

      setStatusMessage(`Inbox ${detail.inbox.emailAddress} berhasil dihapus.`);
      await refreshDashboard({
        inboxId: null,
        messageId: null,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menghapus inbox.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleClearInbox() {
    if (!detail?.inbox.id) {
      return;
    }

    const approved = window.confirm(`Kosongkan semua email pada inbox ${detail.inbox.emailAddress}?`);
    if (!approved) {
      return;
    }

    setBusyAction('clear');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const result = await readJson<{ deletedCount: number }>(
        await fetch(`/api/temp-mail/inboxes/${encodeURIComponent(detail.inbox.id)}/emails`, {
          method: 'DELETE',
        }),
      );

      setStatusMessage(`${result.deletedCount} email berhasil dibersihkan dari inbox aktif.`);
      await refreshDashboard({
        inboxId: detail.inbox.id,
        messageId: null,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal membersihkan isi inbox.');
    } finally {
      setBusyAction(null);
    }
  }

  const selectedEmail = detail?.selectedEmail || null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.heroGrid}>
          <div className={styles.heroCard}>
            <div className={styles.heroTop}>
              <div>
                <p className={styles.eyebrow}>Temp Mail Putri</p>
                <h1 className={styles.title}>Inbox privat multi-domain yang siap dipakai dari link rahasia.</h1>
                <p className={styles.description}>
                  Website ini disiapkan supaya kamu bisa membuat inbox permanen, memantau email masuk secara realtime,
                  membersihkan isi email lama otomatis, dan tetap memakai tampilan yang ringan di HP maupun desktop.
                </p>
              </div>

              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${styles.badgeSoft}`}>akses: {config.privateModeEnabled ? 'privat' : 'publik'}</span>
                <span className={styles.badge}>domain aktif: {config.domains.length}</span>
                <span className={styles.badge}>cleanup: {config.retentionHours} jam</span>
                <span className={styles.badge}>sinkron: 15 detik</span>
              </div>
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Permanen</p>
                <p className={styles.statText}>Alamat inbox tetap ada sampai kamu hapus sendiri. Yang dibersihkan hanya isi email lama.</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Webhook siap</p>
                <p className={styles.statText}>Begitu webhook inbound diarahkan ke website ini, email masuk akan otomatis muncul di dashboard.</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Mode rahasia</p>
                <p className={styles.statText}>Halaman inbox tidak tampil di menu utama, jadi hanya bisa dibuka jika tahu link aksesnya.</p>
              </div>
            </div>
          </div>

          <aside className={styles.checklistCard}>
            <div className={styles.panelTitleRow}>
              <h2 className={styles.panelTitle}>Checklist Deploy</h2>
            </div>
            <p className={styles.panelSubtext}>Kalau empat bagian ini sudah siap, temp mail kamu bisa langsung dipakai di Vercel.</p>

            <div className={styles.checklistList}>
              <div className={styles.checklistItem}>
                <div className={styles.checklistHead}>
                  <span className={styles.monoKey}>TEMP_MAIL_DATABASE_URL / DATABASE_URL_CORE</span>
                  <SetupStatus ready={config.setupChecklist.database} />
                </div>
                <p className={styles.helperText}>Dipakai untuk menyimpan inbox permanen dan isi email masuk.</p>
              </div>

              <div className={styles.checklistItem}>
                <div className={styles.checklistHead}>
                  <span className={styles.monoKey}>TEMP_MAIL_DOMAINS</span>
                  <SetupStatus ready={config.setupChecklist.domains} />
                </div>
                <p className={styles.helperText}>Isi dengan domain-domain email yang akan dipakai, dipisah koma.</p>
              </div>

              <div className={styles.checklistItem}>
                <div className={styles.checklistHead}>
                  <span className={styles.monoKey}>TEMP_MAIL_INBOUND_SECRET</span>
                  <SetupStatus ready={config.setupChecklist.inboundSecret} />
                </div>
                <p className={styles.helperText}>Kunci rahasia untuk mengamankan webhook email masuk.</p>
              </div>

              <div className={styles.checklistItem}>
                <div className={styles.checklistHead}>
                  <span className={styles.monoKey}>CRON_SECRET</span>
                  <SetupStatus ready={config.setupChecklist.cronSecret} />
                </div>
                <p className={styles.helperText}>Opsional, untuk cleanup otomatis lewat cron Vercel kalau kamu aktifkan nanti.</p>
              </div>
            </div>
          </aside>
        </section>

        <section className={styles.toolGrid}>
          <div className={`${styles.panelCard} ${styles.createCard}`}>
            <div className={styles.panelTitleRow}>
              <div>
                <h2 className={styles.panelTitle}>Buat Inbox</h2>
                <p className={styles.panelSubtext}>Pilih domain lalu buat alias custom atau alias otomatis.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.label}>Alias sebelum @</span>
                <input
                  className={styles.input}
                  value={aliasDraft}
                  onChange={(event) => setAliasDraft(event.target.value)}
                  placeholder="misal: senjaotp"
                  disabled={!config.coreReady || busyAction === 'create'}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Domain aktif</span>
                <select
                  className={styles.select}
                  value={activeDomain}
                  onChange={(event) => setDomainDraft(event.target.value)}
                  disabled={!config.coreReady || busyAction === 'create'}
                >
                  {config.domains.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.buttonRow}>
                <button
                  type="button"
                  className={styles.button}
                  disabled={!config.coreReady || busyAction === 'create'}
                  onClick={() => void handleCreateInbox()}
                >
                  {busyAction === 'create' ? <InlineSpinner /> : null}
                  New otomatis
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  disabled={!config.coreReady || busyAction === 'create'}
                  onClick={() => void handleCreateInbox(aliasDraft.trim() || undefined)}
                >
                  Buat custom
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  disabled={isRefreshing || !config.coreReady}
                  onClick={() => void refreshDashboard()}
                >
                  {isRefreshing ? <InlineSpinner /> : null}
                  Sinkronkan sekarang
                </button>
              </div>
            </div>

            <div className={styles.metaRow}>
              <span>Terakhir sinkron: {lastSyncedAt ? formatDateTime(lastSyncedAt) : 'belum ada'}</span>
              <span>Domain aktif: {config.domains.join(', ') || '-'}</span>
            </div>

            {statusMessage ? <div className={styles.statusNotice}>{statusMessage}</div> : null}
            {errorMessage ? <div className={styles.errorNotice}>{errorMessage}</div> : null}
          </div>

          <aside className={styles.panelCard}>
            <div className={styles.panelTitleRow}>
              <h2 className={styles.panelTitle}>Catatan Penting</h2>
            </div>
            <p className={styles.panelSubtext}>
              Kalau mau inbox ini benar-benar menerima email dari luar, kamu perlu mengarahkan provider inbound ke endpoint website ini.
              Setelah itu dashboard akan otomatis membaca email masuk ke inbox yang sesuai.
            </p>
            <div className={styles.detailGrid}>
              <div className={styles.detailCard}>
                <p className={styles.detailLabel}>Akses halaman</p>
                <p className={styles.detailValue}>Link temp mail hanya aktif lewat route rahasia temp-mail/kunci-kamu.</p>
              </div>
              <div className={styles.detailCard}>
                <p className={styles.detailLabel}>Pembersihan</p>
                <p className={styles.detailValue}>Isi email lebih dari {config.retentionHours} jam akan dibersihkan, tapi alamat inbox tetap disimpan.</p>
              </div>
            </div>
          </aside>
        </section>

        <section className={styles.contentGrid}>
          <section className={styles.panelCard}>
            <div className={styles.panelTitleRow}>
              <div>
                <p className={styles.eyebrow}>Inbox permanen</p>
                <h2 className={styles.panelTitle}>{inboxes.length} inbox aktif</h2>
              </div>
            </div>

            <div className={styles.list}>
              {isBooting ? (
                <div className={styles.emptyCard}>
                  <div>
                    <p className={styles.emptyTitle}>Memuat inbox...</p>
                    <p className={styles.emptyText}>Dashboard sedang mengambil daftar inbox temp mail kamu.</p>
                  </div>
                </div>
              ) : inboxes.length > 0 ? (
                inboxes.map((inbox) => {
                  const active = detail?.inbox.id === inbox.id;
                  return (
                    <button
                      key={inbox.id}
                      type="button"
                      className={`${styles.itemButton} ${active ? styles.itemButtonActive : ''}`}
                      onClick={() => {
                        startTransition(() => {
                          setSelectedInboxId(inbox.id);
                          setSelectedMessageId(null);
                          setSearchDraft('');
                        });
                        void refreshDashboard({
                          inboxId: inbox.id,
                          messageId: null,
                        });
                      }}
                    >
                      <div className={styles.itemHead}>
                        <div>
                          <p className={styles.itemEmail}>{inbox.emailAddress}</p>
                          <div className={styles.itemMeta}>
                            <span>dibuat {formatDateTime(inbox.createdAt)}</span>
                            <span className={styles.pill}>{inbox.messageCount} pesan</span>
                          </div>
                        </div>
                      </div>
                      <p className={styles.itemRelative}>{formatRelative(inbox.latestReceivedAt)}</p>
                    </button>
                  );
                })
              ) : (
                <div className={styles.emptyCard}>
                  <div>
                    <p className={styles.emptyTitle}>Belum ada inbox</p>
                    <p className={styles.emptyText}>Buat inbox pertama di panel atas. Alamat email akan tetap ada sampai kamu hapus sendiri.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className={styles.panelCard}>
            <div className={styles.panelTitleRow}>
              <div>
                <p className={styles.eyebrow}>Daftar email</p>
                <h2 className={styles.panelTitle}>{detail?.inbox.emailAddress || 'Pilih inbox dulu'}</h2>
              </div>
              {detail?.inbox.emailAddress ? (
                <div className={styles.buttonRow}>
                  <button
                    type="button"
                    className={styles.tinyButton}
                    onClick={() => void handleCopyEmail(detail.inbox.emailAddress)}
                  >
                    {copiedEmail ? 'Tersalin' : 'Salin alamat'}
                  </button>
                  <button type="button" className={styles.tinyButton} onClick={() => void handleClearInbox()} disabled={busyAction === 'clear'}>
                    {busyAction === 'clear' ? <InlineSpinner /> : null}
                    Kosongkan isi
                  </button>
                  <button type="button" className={styles.dangerButton} onClick={() => void handleDeleteInbox()} disabled={busyAction === 'delete'}>
                    {busyAction === 'delete' ? <InlineSpinner /> : null}
                    Hapus inbox
                  </button>
                </div>
              ) : null}
            </div>

            <div className={styles.hiddenSearch}>
              <input
                className={styles.search}
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Cari subjek, pengirim, atau ringkasan email..."
                disabled={!detail}
              />
            </div>

            <div className={styles.list}>
              {detail ? (
                filteredEmails.length > 0 ? (
                  filteredEmails.map((email) => {
                    const active = detail.selectedEmail?.id === email.id;
                    return (
                      <button
                        key={email.id}
                        type="button"
                        className={`${styles.messageButton} ${active ? styles.messageButtonActive : ''}`}
                        onClick={() => {
                          startTransition(() => {
                            setSelectedMessageId(email.id);
                          });
                          void refreshDashboard({
                            inboxId: detail.inbox.id,
                            messageId: email.id,
                          });
                        }}
                      >
                        <div className={styles.messageHead}>
                          <div>
                            <p className={styles.itemEmail}>{email.subject}</p>
                            <div className={styles.messageMeta}>
                              <span>{email.fromAddress}</span>
                              <span className={styles.pill}>{formatDateTime(email.receivedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <p className={styles.snippet}>{email.snippet || 'Email masuk tanpa ringkasan isi.'}</p>
                      </button>
                    );
                  })
                ) : (
                  <div className={styles.emptyCard}>
                    <div>
                      <p className={styles.emptyTitle}>Belum ada email masuk</p>
                      <p className={styles.emptyText}>Kirim email ke inbox ini, lalu dashboard akan otomatis menampilkannya di sini.</p>
                    </div>
                  </div>
                )
              ) : (
                <div className={styles.emptyCard}>
                  <div>
                    <p className={styles.emptyTitle}>Pilih inbox</p>
                    <p className={styles.emptyText}>Daftar email akan muncul setelah kamu memilih salah satu inbox di panel kiri.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className={styles.panelCard}>
            {selectedEmail ? (
              <>
                <div className={styles.previewHeader}>
                  <p className={styles.eyebrow}>Detail email</p>
                  <h2 className={styles.previewTitle}>{selectedEmail.subject}</h2>
                  <div className={styles.previewMeta}>
                    <span className={styles.pill}>Dari: {selectedEmail.fromAddress}</span>
                    <span className={styles.pill}>Ke: {selectedEmail.toAddress}</span>
                    <span className={styles.pill}>{formatDateTime(selectedEmail.receivedAt)}</span>
                  </div>
                </div>

                <div className={styles.detailToggleRow}>
                  <button
                    type="button"
                    className={previewMode === 'text' ? styles.segmentedButtonActive : styles.segmentedButton}
                    onClick={() => setPreviewMode('text')}
                  >
                    Mode teks
                  </button>
                  <button
                    type="button"
                    className={previewMode === 'html' ? styles.segmentedButtonActive : styles.segmentedButton}
                    onClick={() => setPreviewMode('html')}
                    disabled={!selectedEmail.htmlBody}
                  >
                    Mode HTML
                  </button>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailCard}>
                    <p className={styles.detailLabel}>Message ID</p>
                    <p className={styles.detailValue}>{selectedEmail.messageId || 'Tidak tersedia'}</p>
                  </div>
                  <div className={styles.detailCard}>
                    <p className={styles.detailLabel}>Attachment</p>
                    <p className={styles.detailValue}>{selectedEmail.attachmentCount} file terdeteksi</p>
                  </div>
                </div>

                {selectedEmail.attachments.length > 0 ? (
                  <div className={styles.attachmentWrap}>
                    {selectedEmail.attachments.map((attachment, index) => (
                      <span key={`${attachment.filename || 'file'}-${index}`} className={styles.pill}>
                        {attachment.filename || 'attachment'} / {attachment.mimeType || 'unknown'}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className={styles.previewBody}>
                  {previewMode === 'html' && selectedEmail.htmlBody ? (
                    <iframe
                      title={`temp-mail-preview-${selectedEmail.id}`}
                      className={styles.previewFrame}
                      sandbox=""
                      referrerPolicy="no-referrer"
                      srcDoc={createPreviewDocument(selectedEmail.htmlBody)}
                    />
                  ) : selectedEmail.textBody ? (
                    <pre className={styles.previewPre}>{selectedEmail.textBody}</pre>
                  ) : selectedEmail.htmlBody ? (
                    <iframe
                      title={`temp-mail-preview-${selectedEmail.id}`}
                      className={styles.previewFrame}
                      sandbox=""
                      referrerPolicy="no-referrer"
                      srcDoc={createPreviewDocument(selectedEmail.htmlBody)}
                    />
                  ) : (
                    <pre className={styles.previewPre}>Isi email tidak tersedia.</pre>
                  )}
                </div>

                {selectedEmail.headers ? (
                  <details className={styles.headerDetails}>
                    <summary className={styles.summary}>Lihat header mentah</summary>
                    <div className={styles.headerGrid}>
                      {Object.entries(selectedEmail.headers).map(([key, value]) => (
                        <div key={key} className={styles.headerRow}>
                          <span className={styles.headerKey}>{key}</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </>
            ) : (
              <div className={styles.emptyCard}>
                <div>
                  <p className={styles.emptyTitle}>Belum ada email dipilih</p>
                  <p className={styles.emptyText}>Pilih salah satu email dari daftar tengah untuk membaca isi pesan lengkap di sini.</p>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>

      {(isPending || isRefreshing) && config.coreReady ? (
        <div className={styles.floatingSync}>
          <InlineSpinner />
          Menyinkronkan inbox...
        </div>
      ) : null}
    </main>
  );
}
