'use client';

import { useDeferredValue, useEffect, useEffectEvent, useRef, useState, useTransition } from 'react';
import styles from '@/app/temp-mail/temp-mail.module.css';
import type {
  TempMailConfigSnapshot,
  TempMailEmailDetail,
  TempMailEmailSummary,
  TempMailInboxDetailPayload,
  TempMailInboxListPayload,
  TempMailInboxSummary,
} from '@/lib/temp-mail-types';

type Props = {
  initialConfig: TempMailConfigSnapshot;
};

type IconProps = {
  className?: string;
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
  return `<!doctype html><html lang="id"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><base target="_blank" /><style>body{font-family:Roboto,Segoe UI,Arial,sans-serif;padding:18px;margin:0;color:#111;background:#fff;}img{max-width:100%;height:auto;}pre{white-space:pre-wrap;}a{color:#1799f2;}</style></head><body>${html}</body></html>`;
}

function SetupStatus({ ready }: { ready: boolean }) {
  return <span className={ready ? styles.statusReady : styles.statusMissing}>{ready ? 'siap' : 'kurang'}</span>;
}

function InlineSpinner() {
  return <span className={styles.spin}>o</span>;
}

function IconBrand({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6.5 8.5 12 12.7 17.5 8.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 15.5h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconCopy({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 15V7a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconRefresh({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M20 11a8 8 0 1 0 2 5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSettings({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 7h12M4 7h1M19 7h1M9 17h11M4 17h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="8" cy="7" r="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17" cy="17" r="2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function IconHistory({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.4-5.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 5v4h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSearch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 7h16M9.5 11.5v5M14.5 11.5v5M7 7l1 11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-11M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSpark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3 14.5 9.5 21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function IconShield({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3c1.8 1.7 4.4 3 7 3v5.6c0 4.3-2.8 7.2-7 9.4-4.2-2.2-7-5.1-7-9.4V6c2.6 0 5.2-1.3 7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function IconGlobe({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 12h17M12 3c2.4 2.8 3.7 5.8 3.7 9S14.4 18.2 12 21M12 3c-2.4 2.8-3.7 5.8-3.7 9S9.6 18.2 12 21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SectionEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.emptyCard}>
      <div>
        <p className={styles.emptyTitle}>{title}</p>
        <p className={styles.emptyText}>{text}</p>
      </div>
    </div>
  );
}

const EXTERNAL_INBOX_STORAGE_KEY = 'putri-temp-mail-external-inboxes-v1';

function normalizeLocalPart(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._-]/g, '');
}

function randomLocalPart() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let value = 'putri';

  for (let index = 0; index < 7; index += 1) {
    value += characters[Math.floor(Math.random() * characters.length)];
  }

  return value;
}

function loadExternalInboxes() {
  if (typeof window === 'undefined') {
    return [] as TempMailInboxSummary[];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(EXTERNAL_INBOX_STORAGE_KEY) || '[]') as TempMailInboxSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as TempMailInboxSummary[];
  }
}

function saveExternalInboxes(inboxes: TempMailInboxSummary[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(EXTERNAL_INBOX_STORAGE_KEY, JSON.stringify(inboxes));
}

function upsertExternalInbox(inbox: TempMailInboxSummary) {
  const next = [...loadExternalInboxes().filter((item) => item.id !== inbox.id), inbox].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
  saveExternalInboxes(next);
  return next;
}

function removeExternalInbox(inboxId: string) {
  const next = loadExternalInboxes().filter((item) => item.id !== inboxId);
  saveExternalInboxes(next);
  return next;
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
  const [isBooting, setIsBooting] = useState(initialConfig.dashboardReady);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'text' | 'html'>('text');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(searchDraft);
  const inboxPanelRef = useRef<HTMLElement | null>(null);
  const externalMode = config.providerMode === 'external' && config.externalProvider.enabled;

  const activeDomain = config.domains.includes(domainDraft) ? domainDraft : config.primaryDomain;
  const selectedEmail = detail?.selectedEmail || null;
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

  const currentAddress = detail?.inbox.emailAddress || '';
  const previewAddress = currentAddress || (activeDomain ? `random@${activeDomain}` : 'domain-belum-aktif');

  async function refreshExternalDashboard(override?: {
    inboxId?: string | null;
    messageId?: string | null;
  }) {
    const storedInboxes = loadExternalInboxes();
    setInboxes(storedInboxes);

    try {
      const retention = await readJson<{ seconds: number; hours: number; updatedAt: string | null }>(
        await fetch('/api/temp-mail/external/retention', {
          cache: 'no-store',
        }),
      );

      setConfig((current) => ({
        ...current,
        retentionHours: retention.hours || current.retentionHours,
      }));
    } catch {
      // keep default retention
    }

    const preferredInboxId = override?.inboxId ?? selectedInboxId;
    const nextInbox =
      (preferredInboxId && storedInboxes.find((item) => item.id === preferredInboxId)) || storedInboxes[0] || null;

    if (!nextInbox) {
      setDetail(null);
      setSelectedInboxId(null);
      setSelectedMessageId(null);
      setLastSyncedAt(new Date().toISOString());
      return;
    }

    setSelectedInboxId(nextInbox.id);

    const inboxPayload = await readJson<{ emails: TempMailEmailSummary[] }>(
      await fetch(`/api/temp-mail/external/inbox?address=${encodeURIComponent(nextInbox.emailAddress)}`, {
        cache: 'no-store',
      }),
    );

    const emails = inboxPayload.emails || [];
    const updatedInbox: TempMailInboxSummary = {
      ...nextInbox,
      messageCount: emails.length,
      latestReceivedAt: emails[0]?.receivedAt || null,
    };
    const nextStored = upsertExternalInbox(updatedInbox);
    setInboxes(nextStored);

    const requestedMessageId = override?.messageId ?? selectedMessageId;
    const selectedSummary = (requestedMessageId && emails.find((item) => item.id === requestedMessageId)) || emails[0] || null;

    let selectedDetail: TempMailEmailDetail | null = null;

    if (selectedSummary) {
      try {
        const downloadPayload = await readJson<{ detail: TempMailEmailDetail }>(
          await fetch(
            `/api/temp-mail/external/download?address=${encodeURIComponent(
              nextInbox.emailAddress,
            )}&emailId=${encodeURIComponent(selectedSummary.id)}&type=email`,
            {
              cache: 'no-store',
            },
          ),
        );

        selectedDetail = downloadPayload.detail;
      } catch {
        selectedDetail = {
          ...selectedSummary,
          messageId: selectedSummary.id,
          textBody: selectedSummary.snippet || 'Isi email belum bisa dimuat dari provider eksternal.',
          htmlBody: null,
          headers: null,
          attachments: [],
        };
      }
    }

    setDetail({
      inbox: updatedInbox,
      emails,
      selectedEmail: selectedDetail,
    });
    setSelectedMessageId(selectedDetail?.id || null);
    setPreviewMode(selectedDetail?.htmlBody && !selectedDetail?.textBody ? 'html' : 'text');
    setLastSyncedAt(new Date().toISOString());
  }

  async function refreshDashboard(override?: {
    inboxId?: string | null;
    messageId?: string | null;
    silent?: boolean;
  }) {
    if (!config.dashboardReady && !initialConfig.dashboardReady) {
      setIsBooting(false);
      return;
    }

    if (!override?.silent) {
      setIsRefreshing(true);
    }

    try {
      if (externalMode) {
        await refreshExternalDashboard({
          inboxId: override?.inboxId,
          messageId: override?.messageId,
        });
        setErrorMessage(null);
        return;
      }

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
    if (!initialConfig.dashboardReady) {
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
  }, [initialConfig.dashboardReady, kickoffLoad, silentPoll]);

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
    if (!config.dashboardReady) {
      return;
    }

    setBusyAction('create');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      if (externalMode) {
        const localPart = normalizeLocalPart(customAlias || '') || randomLocalPart();
        const domain = config.externalProvider.defaultDomain || activeDomain;
        const inbox: TempMailInboxSummary = {
          id: `${localPart}@${domain}`,
          localPart,
          domain,
          emailAddress: `${localPart}@${domain}`,
          createdAt: new Date().toISOString(),
          messageCount: 0,
          latestReceivedAt: null,
        };

        upsertExternalInbox(inbox);
        setAliasDraft('');
        setStatusMessage(`Inbox eksternal ${inbox.emailAddress} berhasil ditambahkan ke riwayat.`);
        await refreshDashboard({
          inboxId: inbox.id,
          messageId: null,
        });
        return;
      }

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

    const approved = window.confirm(
      externalMode
        ? `Hapus ${detail.inbox.emailAddress} dari riwayat lokal browser ini?`
        : `Hapus inbox ${detail.inbox.emailAddress}? Isi email di dalamnya ikut terhapus.`,
    );
    if (!approved) {
      return;
    }

    setBusyAction('delete');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      if (externalMode) {
        removeExternalInbox(detail.inbox.id);
        setStatusMessage(`Inbox ${detail.inbox.emailAddress} dihapus dari riwayat lokal.`);
        await refreshDashboard({
          inboxId: null,
          messageId: null,
        });
        return;
      }

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

    if (externalMode) {
      setErrorMessage('Provider eksternal ini tidak menyediakan fitur hapus isi inbox lewat API publik.');
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

  function scrollToInboxes() {
    inboxPanelRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.auraLeft} />
      <div className={styles.auraRight} />

      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brandCluster}>
            <div className={styles.brandMark}>
              <IconBrand className={styles.brandIcon} />
            </div>
            <div>
              <p className={styles.brandOverline}>Temp mail privat</p>
              <h1 className={styles.brandTitle}>Putri Mail Vault</h1>
            </div>
          </div>

          <div className={styles.liveBadge}>
            {externalMode ? `${config.externalProvider.provider} mode` : config.operationalReady ? 'engine ready' : 'setup incomplete'}
          </div>
        </header>

        <section className={styles.heroCard}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Instant inbox for OTP</p>
            <h2 className={styles.heroTitle}>Buat inbox cepat, tunggu email OTP, lalu baca pesannya nyaman dari HP Android.</h2>
            <p className={styles.heroText}>
              Saya ubah layout-nya jadi mobile-first: alamat aktif langsung terlihat, tombol utama tidak berantakan, daftar inbox rapi,
              dan isi email lebih enak dibaca tanpa membuat layar sempit terasa penuh.
            </p>

            <div className={styles.pillRow}>
              <span className={styles.heroPill}>provider {externalMode ? config.externalProvider.provider : 'private'}</span>
              <span className={styles.heroPill}>akses {config.privateModeEnabled ? 'privat' : 'publik'}</span>
              <span className={styles.heroPill}>domain {config.domains.length}</span>
              <span className={styles.heroPill}>retensi {config.retentionHours} jam</span>
              <span className={styles.heroPill}>sinkron 15 detik</span>
            </div>
          </div>

          <div className={styles.heroUtility}>
            <div className={styles.addressCard}>
              <p className={styles.addressLabel}>Alamat inbox aktif</p>
              <p className={styles.addressValue}>{previewAddress}</p>
              <div className={styles.addressMeta}>
                <span>{lastSyncedAt ? `sinkron ${formatDateTime(lastSyncedAt)}` : 'belum ada sinkron pertama'}</span>
                <span>{config.domains.join(', ') || 'domain belum aktif'}</span>
              </div>
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!detail?.inbox.emailAddress}
                  onClick={() => void handleCopyEmail(detail?.inbox.emailAddress || '')}
                >
                  <IconCopy className={styles.inlineIcon} />
                  {copiedEmail ? 'Tersalin' : 'Copy alamat'}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={!config.dashboardReady || busyAction === 'create'}
                  onClick={() => void handleCreateInbox()}
                >
                  {busyAction === 'create' ? <InlineSpinner /> : <IconSpark className={styles.inlineIcon} />}
                  New random
                </button>
              </div>
            </div>

            <div className={styles.shortcutRow}>
              <button type="button" className={styles.iconButton} onClick={() => setShowSetup((value) => !value)}>
                <IconSettings className={styles.inlineIcon} />
                {showSetup ? 'Tutup setup' : 'Lihat setup'}
              </button>
              <button type="button" className={styles.iconButton} onClick={scrollToInboxes}>
                <IconHistory className={styles.inlineIcon} />
                Riwayat inbox
              </button>
              <button
                type="button"
                className={styles.iconButton}
                disabled={isRefreshing || !config.dashboardReady}
                onClick={() => void refreshDashboard()}
              >
                {isRefreshing ? <InlineSpinner /> : <IconRefresh className={styles.inlineIcon} />}
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className={styles.composerCard}>
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>Compose inbox</p>
              <h2 className={styles.sectionTitle}>Buat alamat sendiri atau pakai random</h2>
            </div>
          </div>

          <div className={styles.composerGrid}>
            <label className={styles.field}>
              <span className={styles.label}>Username sebelum @</span>
              <input
                className={styles.input}
                value={aliasDraft}
                onChange={(event) => setAliasDraft(event.target.value)}
                placeholder="misal: otp-senja"
                disabled={!config.dashboardReady || busyAction === 'create'}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Domain aktif</span>
              <select
                className={styles.select}
              value={activeDomain}
              onChange={(event) => setDomainDraft(event.target.value)}
              disabled={!config.dashboardReady || busyAction === 'create'}
            >
                {config.domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.composeActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={!config.dashboardReady || busyAction === 'create' || !aliasDraft.trim()}
                onClick={() => void handleCreateInbox(aliasDraft.trim() || undefined)}
              >
                {busyAction === 'create' ? <InlineSpinner /> : <IconBrand className={styles.inlineIcon} />}
                Buat custom
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={isRefreshing || !config.dashboardReady}
                onClick={() => void refreshDashboard()}
              >
                {isRefreshing ? <InlineSpinner /> : <IconRefresh className={styles.inlineIcon} />}
                Sinkronkan
              </button>
            </div>
          </div>

          <p className={styles.helperLine}>
            {externalMode
              ? `Mode ini memakai provider eksternal ${config.externalProvider.provider} dengan domain bawaan ${config.externalProvider.defaultDomain}, jadi kamu bisa uji inbox tanpa beli domain dulu.`
              : 'OTP dari layanan luar baru bisa masuk kalau domain email benar-benar punya DNS dan inbound routing aktif. Kalau belum aktif, inbox tetap bisa dibuat tapi email publik tidak akan sampai.'}
          </p>
        </section>

        {showSetup ? (
          <section className={styles.setupCard}>
            <div className={styles.panelHeading}>
              <div>
                <p className={styles.eyebrow}>Deploy checklist</p>
                <h2 className={styles.sectionTitle}>Status komponen temp mail</h2>
              </div>
            </div>

            <div className={styles.setupGrid}>
              <div className={styles.setupItem}>
                <div className={styles.setupHead}>
                  <span className={styles.setupKey}>TEMP_MAIL_DATABASE_URL / DATABASE_URL_CORE</span>
                  <SetupStatus ready={config.setupChecklist.database} />
                </div>
                <p className={styles.setupText}>
                  {externalMode
                    ? 'Tidak wajib untuk mode eksternal. Database hanya dipakai kalau kamu kembali ke mode private/local.'
                    : 'Dipakai untuk menyimpan daftar inbox dan email masuk.'}
                </p>
              </div>
              <div className={styles.setupItem}>
                <div className={styles.setupHead}>
                  <span className={styles.setupKey}>TEMP_MAIL_DOMAINS</span>
                  <SetupStatus ready={config.setupChecklist.domains} />
                </div>
                <p className={styles.setupText}>Daftar domain email yang boleh dipakai oleh inbox temp mail.</p>
              </div>
              <div className={styles.setupItem}>
                <div className={styles.setupHead}>
                  <span className={styles.setupKey}>TEMP_MAIL_INBOUND_SECRET</span>
                  <SetupStatus ready={config.setupChecklist.inboundSecret} />
                </div>
                <p className={styles.setupText}>Kunci rahasia untuk mengamankan webhook inbound email.</p>
              </div>
              <div className={styles.setupItem}>
                <div className={styles.setupHead}>
                  <span className={styles.setupKey}>CRON_SECRET</span>
                  <SetupStatus ready={config.setupChecklist.cronSecret} />
                </div>
                <p className={styles.setupText}>Dipakai Vercel Cron untuk membersihkan isi inbox lama secara otomatis.</p>
              </div>
            </div>
          </section>
        ) : null}

        {statusMessage || errorMessage ? (
          <div className={styles.noticeStack}>
            {statusMessage ? <div className={styles.statusNotice}>{statusMessage}</div> : null}
            {errorMessage ? <div className={styles.errorNotice}>{errorMessage}</div> : null}
          </div>
        ) : null}

        <section className={styles.warningCard}>
          <div className={styles.warningIconWrap}>
            <IconShield className={styles.warningIcon} />
          </div>
          <div>
            <p className={styles.warningTitle}>Kenapa email OTP dari luar belum masuk?</p>
            <p className={styles.warningText}>
              {externalMode
                ? `Dalam mode eksternal, email akan mengikuti ketersediaan provider ${config.externalProvider.provider}. Jadi kamu tidak perlu DNS sendiri untuk uji coba, tetapi kestabilan, limit, dan isi inbox tetap bergantung pada provider tersebut.`
                : 'Saat ini inbox web dan database sudah siap, tetapi email publik hanya akan mendarat jika domain email sudah memiliki DNS yang valid, lalu diarahkan ke jalur inbound seperti Cloudflare Email Routing atau provider sejenis. Kalau domain belum hidup, pesan OTP dari layanan pendaftaran memang tidak akan pernah sampai ke dashboard.'}
            </p>
          </div>
        </section>

        <section className={styles.workspace}>
          <section className={styles.columnCard} ref={inboxPanelRef}>
            <div className={styles.panelHeading}>
              <div>
                <p className={styles.eyebrow}>Inbox list</p>
                <h2 className={styles.sectionTitle}>{inboxes.length} inbox aktif</h2>
              </div>
              <span className={styles.cornerBadge}>history</span>
            </div>

            <div className={styles.scrollList}>
              {isBooting ? (
                <SectionEmpty title="Memuat inbox..." text="Dashboard sedang mengambil daftar inbox temp mail kamu." />
              ) : inboxes.length > 0 ? (
                inboxes.map((inbox) => {
                  const active = detail?.inbox.id === inbox.id;
                  return (
                    <button
                      key={inbox.id}
                      type="button"
                      className={`${styles.inboxButton} ${active ? styles.inboxButtonActive : ''}`}
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
                      <div className={styles.inboxHead}>
                        <p className={styles.inboxAddress}>{inbox.emailAddress}</p>
                        <span className={styles.smallPill}>{inbox.messageCount}</span>
                      </div>
                      <p className={styles.inboxMeta}>dibuat {formatDateTime(inbox.createdAt)}</p>
                      <p className={styles.inboxRelative}>{formatRelative(inbox.latestReceivedAt)}</p>
                    </button>
                  );
                })
              ) : (
                <SectionEmpty
                  title="Belum ada inbox"
                  text="Buat inbox pertama di bagian atas. Alamat akan tetap ada sampai kamu hapus sendiri."
                />
              )}
            </div>
          </section>

          <section className={styles.columnCard}>
            <div className={styles.panelHeading}>
              <div>
                <p className={styles.eyebrow}>Message list</p>
                <h2 className={styles.sectionTitle}>{detail?.inbox.emailAddress || 'Pilih inbox dulu'}</h2>
              </div>
            </div>

            <div className={styles.searchWrap}>
              <IconSearch className={styles.searchIcon} />
              <input
                className={styles.search}
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Cari subjek, pengirim, isi ringkas, atau OTP..."
                disabled={!detail}
              />
            </div>

            {detail?.inbox.emailAddress ? (
              <div className={styles.messageActionRow}>
                <button
                  type="button"
                  className={styles.miniButton}
                  onClick={() => void handleCopyEmail(detail.inbox.emailAddress)}
                >
                  <IconCopy className={styles.inlineIcon} />
                  {copiedEmail ? 'Tersalin' : 'Copy alamat'}
                </button>
                {!externalMode ? (
                  <button
                    type="button"
                    className={styles.miniButton}
                    disabled={busyAction === 'clear'}
                    onClick={() => void handleClearInbox()}
                  >
                    {busyAction === 'clear' ? <InlineSpinner /> : <IconRefresh className={styles.inlineIcon} />}
                    Kosongkan
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.dangerButton}
                  disabled={busyAction === 'delete'}
                  onClick={() => void handleDeleteInbox()}
                >
                  {busyAction === 'delete' ? <InlineSpinner /> : <IconTrash className={styles.inlineIcon} />}
                  Hapus
                </button>
              </div>
            ) : null}

            <div className={styles.scrollList}>
              {detail ? (
                filteredEmails.length > 0 ? (
                  filteredEmails.map((email) => {
                    const active = detail.selectedEmail?.id === email.id;
                    return (
                      <button
                        key={email.id}
                        type="button"
                        className={`${styles.mailButton} ${active ? styles.mailButtonActive : ''}`}
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
                        <div className={styles.mailTop}>
                          <div>
                            <p className={styles.mailSubject}>{email.subject}</p>
                            <p className={styles.mailFrom}>{email.fromName || email.fromAddress}</p>
                          </div>
                          <span className={styles.smallPill}>{email.attachmentCount}</span>
                        </div>
                        <p className={styles.mailSnippet}>{email.snippet || 'Email masuk tanpa ringkasan isi.'}</p>
                        <div className={styles.mailFooter}>
                          <span>{email.fromAddress}</span>
                          <span>{formatDateTime(email.receivedAt)}</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <SectionEmpty
                    title="Belum ada email masuk"
                    text={
                      externalMode
                        ? 'Alamat ini sudah aktif di provider eksternal. Kalau ada pesan masuk, daftar email akan muncul di sini saat kamu refresh atau auto-sync.'
                        : 'Kirim email ke inbox ini. Kalau routing domain sudah aktif, pesan OTP akan muncul di sini.'
                    }
                  />
                )
              ) : (
                <SectionEmpty
                  title="Pilih inbox dulu"
                  text="Setelah kamu memilih inbox di panel kiri, daftar email akan langsung tampil di sini."
                />
              )}
            </div>
          </section>

          <section className={styles.columnCard}>
            {selectedEmail ? (
              <>
                <div className={styles.panelHeading}>
                  <div>
                    <p className={styles.eyebrow}>Reader</p>
                    <h2 className={styles.sectionTitle}>{selectedEmail.subject}</h2>
                  </div>
                </div>

                <div className={styles.readerMetaGrid}>
                  <div className={styles.readerMetaCard}>
                    <p className={styles.metaLabel}>Dari</p>
                    <p className={styles.metaValue}>{selectedEmail.fromAddress}</p>
                  </div>
                  <div className={styles.readerMetaCard}>
                    <p className={styles.metaLabel}>Ke</p>
                    <p className={styles.metaValue}>{selectedEmail.toAddress}</p>
                  </div>
                  <div className={styles.readerMetaCard}>
                    <p className={styles.metaLabel}>Waktu</p>
                    <p className={styles.metaValue}>{formatDateTime(selectedEmail.receivedAt)}</p>
                  </div>
                  <div className={styles.readerMetaCard}>
                    <p className={styles.metaLabel}>Attachment</p>
                    <p className={styles.metaValue}>{selectedEmail.attachmentCount} file</p>
                  </div>
                </div>

                <div className={styles.readerSwitch}>
                  <button
                    type="button"
                    className={previewMode === 'text' ? styles.segmentActive : styles.segmentButton}
                    onClick={() => setPreviewMode('text')}
                  >
                    Mode teks
                  </button>
                  <button
                    type="button"
                    className={previewMode === 'html' ? styles.segmentActive : styles.segmentButton}
                    onClick={() => setPreviewMode('html')}
                    disabled={!selectedEmail.htmlBody}
                  >
                    Mode HTML
                  </button>
                </div>

                {selectedEmail.attachments.length > 0 ? (
                  <div className={styles.attachmentRow}>
                    {selectedEmail.attachments.map((attachment, index) => (
                      <span key={`${attachment.filename || 'file'}-${index}`} className={styles.smallPill}>
                        {attachment.filename || 'attachment'}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className={styles.readerBody}>
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

                <div className={styles.messageInfoCard}>
                  <p className={styles.metaLabel}>Message ID</p>
                  <p className={styles.metaValue}>{selectedEmail.messageId || 'Tidak tersedia'}</p>
                </div>

                {selectedEmail.headers ? (
                  <details className={styles.headerDetails}>
                    <summary className={styles.summary}>Lihat header mentah</summary>
                    <div className={styles.headerGrid}>
                      {Object.entries(selectedEmail.headers).map(([key, value]) => (
                        <div key={key} className={styles.headerRow}>
                          <span className={styles.headerKey}>{key}</span>
                          <span className={styles.headerValue}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </>
            ) : (
              <SectionEmpty
                title="Pilih email untuk dibaca"
                text="Begitu ada pesan masuk, kamu bisa buka detail email di panel ini dan membaca isi OTP atau verifikasi dengan lebih nyaman."
              />
            )}
          </section>
        </section>

        <section className={styles.featureGrid}>
          <article className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <IconSpark className={styles.featureIcon} />
            </div>
            <h3 className={styles.featureTitle}>Cepat untuk OTP</h3>
            <p className={styles.featureText}>Fokus utamanya sekarang ada di alur buka inbox, tunggu pesan, lalu baca OTP tanpa perlu scroll yang bikin ribet.</p>
          </article>

          <article className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <IconShield className={styles.featureIcon} />
            </div>
            <h3 className={styles.featureTitle}>Akses privat</h3>
            <p className={styles.featureText}>Halaman tetap berada di link rahasia, jadi tidak ikut tampil di dashboard utama website kamu.</p>
          </article>

          <article className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <IconGlobe className={styles.featureIcon} />
            </div>
            <h3 className={styles.featureTitle}>Siap untuk domain sendiri</h3>
            <p className={styles.featureText}>
              {externalMode
                ? 'Sambil menunggu domain sendiri siap, kamu masih bisa uji temp mail memakai provider eksternal dari mode ini.'
                : 'Begitu DNS dan routing inbound benar-benar aktif, inbox ini siap menerima email publik dari luar.'}
            </p>
          </article>
        </section>
      </div>

      {(isPending || isRefreshing) && config.dashboardReady ? (
        <div className={styles.floatingSync}>
          <InlineSpinner />
          Menyinkronkan inbox...
        </div>
      ) : null}
    </main>
  );
}
