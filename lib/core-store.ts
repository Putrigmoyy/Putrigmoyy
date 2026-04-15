import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { formatRupiah } from '@/lib/apk-premium';
import { getAppDataSourceConfig } from '@/lib/data-sources';
import { createMidtransQrisCharge, getMidtransTransactionStatus, isMidtransConfigured } from '@/lib/midtrans';
import { getNeonClient } from '@/lib/neon-clients';

export type CoreWalletProfile = {
  registered: boolean;
  loggedIn: boolean;
  name: string;
  username: string;
  contact: string;
  balance: number;
};

export type CoreHistoryEntry = {
  id: string;
  kind: 'order' | 'deposit';
  title: string;
  subjectName: string;
  amountLabel: string;
  statusLabel: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
  createdLabel: string;
  detail: string;
  methodLabel: string;
  reference: string;
};

export type CoreWalletBundle = {
  account: CoreWalletProfile;
  history: CoreHistoryEntry[];
};

type WalletRow = {
  display_name: string | null;
  username: string | null;
  contact: string | null;
  password_hash: string | null;
  pin_hash: string | null;
  balance: number | null;
};

type HistoryRow = {
  id: number;
  kind: 'order' | 'deposit';
  title: string;
  subject_name: string;
  amount: number;
  status_label: string;
  status: 'pending' | 'success' | 'failed';
  detail: string;
  method_label: string;
  reference: string;
  created_at: string;
};

type DepositPaymentRow = {
  account_contact: string | null;
  provider_order_id: string | null;
  transaction_id: string | null;
  transaction_status: string | null;
  fraud_status: string | null;
  gross_amount: number | null;
  expiry_time: string | null;
  qr_url: string | null;
  qr_string: string | null;
  deeplink_url: string | null;
  credited_at: string | null;
};

export type CoreDepositPaymentState = {
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

function isCoreConfigured() {
  return getAppDataSourceConfig().core.databaseConfigured;
}

function normalizeUsername(value: string) {
  return String(value || '').trim().toLowerCase();
}

function validateUsername(username: string) {
  return /^[a-z0-9._-]{4,24}$/.test(username);
}

function hashLegacyPin(pin: string) {
  return createHash('sha256').update(pin).digest('hex');
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password: string, storedHash: string) {
  const normalized = String(storedHash || '').trim();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith('scrypt$')) {
    const parts = normalized.split('$');
    if (parts.length !== 3) {
      return false;
    }
    const [, salt, stored] = parts;
    const storedBuffer = Buffer.from(stored, 'hex');
    const derivedBuffer = scryptSync(password, salt, storedBuffer.length);
    return storedBuffer.length === derivedBuffer.length && timingSafeEqual(storedBuffer, derivedBuffer);
  }

  return normalized === hashLegacyPin(password);
}

function formatHistoryDate(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createCoreDepositReference() {
  return `DPS${Date.now().toString().slice(2)}${randomBytes(2).toString('hex').toUpperCase()}`;
}

function normalizeCoreDepositPaymentStatus(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'settlement' || normalized === 'capture') return 'paid';
  if (normalized === 'expire') return 'expire';
  if (normalized === 'cancel') return 'cancel';
  if (normalized === 'deny') return 'deny';
  if (normalized === 'failure' || normalized === 'failed') return 'failed';
  return 'awaiting-payment';
}

function buildCoreDepositState(reference: string, payment?: DepositPaymentRow | null): CoreDepositPaymentState {
  const paymentStatus = normalizeCoreDepositPaymentStatus(String(payment?.transaction_status || 'awaiting-payment'));
  const amount = Math.max(0, Number(payment?.gross_amount || 0));
  return {
    reference,
    amount,
    amountLabel: formatRupiah(amount),
    paymentStatus,
    qris: payment
      ? {
          transactionId: String(payment.transaction_id || '').trim(),
          qrUrl: String(payment.qr_url || '').trim(),
          qrString: String(payment.qr_string || '').trim(),
          deeplinkUrl: String(payment.deeplink_url || '').trim(),
          expiryTime: String(payment.expiry_time || '').trim(),
        }
      : null,
    nextStep:
      paymentStatus === 'paid'
        ? 'Deposit berhasil dan saldo akun sudah bertambah.'
        : paymentStatus === 'expire' || paymentStatus === 'cancel' || paymentStatus === 'deny' || paymentStatus === 'failed'
          ? 'Pembayaran deposit tidak aktif lagi. Buat deposit baru jika masih diperlukan.'
          : 'QRIS deposit siap digunakan untuk menyelesaikan pembayaran.',
  };
}

function resolveAccountKey(row?: WalletRow | null) {
  return normalizeUsername(row?.username || row?.contact || '');
}

function mapWalletRow(row?: WalletRow | null, loggedIn = false): CoreWalletProfile {
  if (!row) {
    return {
      registered: false,
      loggedIn: false,
      name: '',
      username: '',
      contact: '',
      balance: 0,
    };
  }

  const username = resolveAccountKey(row);
  return {
    registered: true,
    loggedIn,
    name: String(row.display_name || '').trim(),
    username,
    contact: username,
    balance: Number(row.balance || 0),
  };
}

function mapHistoryRow(row: HistoryRow): CoreHistoryEntry {
  return {
    id: `${row.kind}-${row.id}`,
    kind: row.kind,
    title: row.title,
    subjectName: row.subject_name,
    amountLabel: `Rp ${formatRupiah(Number(row.amount || 0))}`,
    statusLabel: row.status_label,
    status: row.status,
    createdAt: row.created_at,
    createdLabel: formatHistoryDate(row.created_at),
    detail: row.detail,
    methodLabel: row.method_label,
    reference: row.reference,
  };
}

async function ensureCoreTables() {
  const sql = getNeonClient('core');
  await sql`
    create table if not exists core_wallet_accounts (
      id bigserial primary key,
      display_name text not null default '',
      username text not null default '',
      contact text not null default '',
      password_hash text not null default '',
      pin_hash text not null default '',
      balance integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists core_transaction_history (
      id bigserial primary key,
      account_contact text not null default '',
      kind text not null default 'order',
      title text not null default '',
      subject_name text not null default '',
      amount integer not null default 0,
      status_label text not null default 'Pending',
      status text not null default 'pending',
      detail text not null default '',
      method_label text not null default '',
      reference text not null default '',
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists core_deposit_payments (
      reference text primary key,
      account_contact text not null default '',
      provider text not null default 'midtrans',
      provider_order_id text not null default '',
      transaction_id text not null default '',
      transaction_status text not null default 'pending',
      fraud_status text not null default '',
      gross_amount integer not null default 0,
      expiry_time timestamptz,
      qr_url text not null default '',
      qr_string text not null default '',
      deeplink_url text not null default '',
      raw_response jsonb not null default '{}'::jsonb,
      credited_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`alter table core_wallet_accounts add column if not exists username text not null default ''`;
  await sql`alter table core_wallet_accounts add column if not exists password_hash text not null default ''`;
  await sql`alter table core_wallet_accounts add column if not exists contact text not null default ''`;
  await sql`alter table core_wallet_accounts add column if not exists pin_hash text not null default ''`;
  await sql`alter table core_wallet_accounts add column if not exists balance integer not null default 0`;
  await sql`update core_wallet_accounts set username = lower(trim(contact)) where username = '' and contact <> ''`;
  await sql`update core_wallet_accounts set contact = username where contact = '' and username <> ''`;
  await sql`create unique index if not exists core_wallet_accounts_username_idx on core_wallet_accounts(username) where username <> ''`;
  await sql`create index if not exists core_transaction_history_account_idx on core_transaction_history(account_contact)`;
  await sql`create index if not exists core_deposit_payments_account_idx on core_deposit_payments(account_contact)`;
}

async function getWalletRow(identifier: string) {
  await ensureCoreTables();
  const lookup = normalizeUsername(identifier);
  if (!lookup) {
    return null;
  }

  const sql = getNeonClient('core');
  const rows = (await sql`
    select
      display_name,
      username,
      contact,
      password_hash,
      pin_hash,
      balance
    from core_wallet_accounts
    where lower(username) = ${lookup}
      or lower(contact) = ${lookup}
    limit 1
  `) as WalletRow[];
  return rows[0] || null;
}

export async function getCoreWalletBundle(identifier: string, loggedIn = true): Promise<CoreWalletBundle | null> {
  if (!isCoreConfigured()) {
    return null;
  }

  const normalizedIdentifier = normalizeUsername(identifier);
  if (!normalizedIdentifier) {
    return null;
  }

  const row = await getWalletRow(normalizedIdentifier);
  if (!row) {
    return null;
  }

  const sql = getNeonClient('core');
  const accountKey = resolveAccountKey(row);
  const legacyContact = normalizeUsername(row.contact || '');
  const historyRows = (await sql`
    select
      id,
      kind,
      title,
      subject_name,
      amount,
      status_label,
      status,
      detail,
      method_label,
      reference,
      created_at
    from core_transaction_history
    where account_contact = ${accountKey}
      or (${legacyContact} <> '' and account_contact = ${legacyContact})
    order by created_at desc
    limit 60
  `) as HistoryRow[];

  return {
    account: mapWalletRow(row, loggedIn),
    history: historyRows.map(mapHistoryRow),
  };
}

export async function registerCoreWalletAccount(input: { name: string; username: string; password: string }) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  const name = String(input.name || '').trim();
  const username = normalizeUsername(input.username);
  const password = String(input.password || '').trim();

  if (!name || !username || !password) {
    throw new Error('Nama, username, dan password wajib diisi.');
  }
  if (!validateUsername(username)) {
    throw new Error('Username hanya boleh 4-24 karakter, huruf kecil, angka, titik, garis bawah, atau strip.');
  }
  if (password.length < 6) {
    throw new Error('Password minimal 6 karakter.');
  }

  const existing = await getWalletRow(username);
  if (existing) {
    throw new Error('Username ini sudah terdaftar. Silakan login.');
  }

  const sql = getNeonClient('core');
  await sql`
    insert into core_wallet_accounts (
      display_name,
      username,
      contact,
      password_hash,
      pin_hash
    ) values (
      ${name},
      ${username},
      ${username},
      ${hashPassword(password)},
      ${''}
    )
  `;

  const bundle = await getCoreWalletBundle(username, true);
  if (!bundle) {
    throw new Error('Akun berhasil dibuat, tetapi data akun belum bisa dimuat.');
  }
  return bundle;
}

export async function loginCoreWalletAccount(input: { username: string; password: string }) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  const username = normalizeUsername(input.username);
  const password = String(input.password || '').trim();
  if (!username || !password) {
    throw new Error('Username dan password wajib diisi.');
  }

  const row = await getWalletRow(username);
  if (!row) {
    throw new Error('Akun belum terdaftar.');
  }

  const validPassword =
    verifyPassword(password, String(row.password_hash || '').trim()) ||
    String(row.pin_hash || '').trim() === hashLegacyPin(password);
  if (!validPassword) {
    throw new Error('Username atau password tidak cocok.');
  }

  const normalizedUsername = resolveAccountKey(row) || username;
  const sql = getNeonClient('core');
  await sql`
    update core_wallet_accounts
    set
      username = ${normalizedUsername},
      contact = case when contact = '' then ${normalizedUsername} else contact end,
      password_hash = case
        when password_hash = '' then ${hashPassword(password)}
        else password_hash
      end,
      updated_at = now()
    where lower(username) = ${normalizedUsername}
      or lower(contact) = ${normalizedUsername}
  `;

  const bundle = await getCoreWalletBundle(normalizedUsername, true);
  if (!bundle) {
    throw new Error('Akun ditemukan, tetapi data belum bisa dimuat.');
  }
  return bundle;
}

export async function updateCoreWalletAccount(input: {
  currentUsername: string;
  newUsername?: string;
  newPassword?: string;
}) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  const currentUsername = normalizeUsername(input.currentUsername);
  const newUsername = normalizeUsername(input.newUsername || '');
  const newPassword = String(input.newPassword || '').trim();

  if (!currentUsername) {
    throw new Error('Username akun wajib diisi.');
  }

  const row = await getWalletRow(currentUsername);
  if (!row) {
    throw new Error('Akun belum ditemukan.');
  }

  const currentResolvedUsername = resolveAccountKey(row) || currentUsername;
  const nextUsername = newUsername || currentResolvedUsername;

  if (nextUsername !== currentResolvedUsername && !validateUsername(nextUsername)) {
    throw new Error('Username hanya boleh 4-24 karakter, huruf kecil, angka, titik, garis bawah, atau strip.');
  }

  if (nextUsername !== currentResolvedUsername) {
    const existing = await getWalletRow(nextUsername);
    if (existing && resolveAccountKey(existing) !== currentResolvedUsername) {
      throw new Error('Username baru sudah dipakai akun lain.');
    }
  }

  if (newPassword && newPassword.length < 6) {
    throw new Error('Password baru minimal 6 karakter.');
  }

  if (nextUsername === currentResolvedUsername && !newPassword) {
    throw new Error('Belum ada perubahan profil yang dikirim.');
  }

  const sql = getNeonClient('core');
  await sql`
    update core_wallet_accounts
    set
      username = ${nextUsername},
      password_hash = case
        when ${newPassword} <> '' then ${hashPassword(newPassword)}
        else password_hash
      end,
      updated_at = now()
    where lower(username) = ${currentResolvedUsername}
      or lower(contact) = ${currentResolvedUsername}
  `;

  const bundle = await getCoreWalletBundle(nextUsername, true);
  if (!bundle) {
    throw new Error('Profil berhasil diperbarui, tetapi data akun belum bisa dimuat.');
  }
  return bundle;
}

type CoreHistoryInsert = {
  accountContact: string;
  kind: 'order' | 'deposit';
  title: string;
  subjectName: string;
  amount: number;
  statusLabel: string;
  status: 'pending' | 'success' | 'failed';
  detail: string;
  methodLabel: string;
  reference: string;
};

async function insertCoreHistory(entry: CoreHistoryInsert) {
  await ensureCoreTables();
  const sql = getNeonClient('core');
  await sql`
    insert into core_transaction_history (
      account_contact,
      kind,
      title,
      subject_name,
      amount,
      status_label,
      status,
      detail,
      method_label,
      reference
    ) values (
      ${normalizeUsername(entry.accountContact)},
      ${entry.kind},
      ${entry.title},
      ${entry.subjectName},
      ${Math.max(0, Number(entry.amount || 0))},
      ${entry.statusLabel},
      ${entry.status},
      ${entry.detail},
      ${entry.methodLabel},
      ${entry.reference}
    )
  `;
}

async function updateCoreDepositHistoryStatusByReference(input: {
  reference: string;
  statusLabel: string;
  status: 'pending' | 'success' | 'failed';
  detailAppend?: string;
}) {
  await ensureCoreTables();
  const reference = String(input.reference || '').trim();
  if (!reference) {
    return;
  }

  const sql = getNeonClient('core');
  const rows = (await sql`
    select id, detail
    from core_transaction_history
    where reference = ${reference}
      and kind = 'deposit'
  `) as Array<{
    id: number;
    detail: string | null;
  }>;

  for (const row of rows) {
    const currentDetail = String(row.detail || '');
    const detailAppend = String(input.detailAppend || '').trim();
    const nextDetail =
      detailAppend && !currentDetail.includes(detailAppend)
        ? currentDetail
          ? `${currentDetail}\n${detailAppend}`
          : detailAppend
        : currentDetail;

    await sql`
      update core_transaction_history
      set
        status_label = ${input.statusLabel},
        status = ${input.status},
        detail = ${nextDetail}
      where id = ${row.id}
    `;
  }
}

export async function submitCoreDeposit(input: {
  accountContact: string;
  amount: number;
  method: 'midtrans' | 'balance';
}) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  const accountContact = normalizeUsername(input.accountContact);
  const amount = Math.max(0, Number(input.amount || 0));
  const method = 'midtrans';

  if (!accountContact) {
    throw new Error('Username akun wajib diisi.');
  }
  if (amount <= 0) {
    throw new Error('Jumlah deposit belum valid.');
  }
  if (amount < 10000) {
    throw new Error('Deposit minimal Rp 10.000.');
  }

  const row = await getWalletRow(accountContact);
  if (!row) {
    throw new Error('Akun belum ditemukan. Silakan daftar atau login dulu.');
  }

  if (!isMidtransConfigured()) {
    throw new Error('MIDTRANS_SERVER_KEY belum diisi. Deposit QRIS belum aktif.');
  }

  const sql = getNeonClient('core');
  const reference = createCoreDepositReference();
  const charge = await createMidtransQrisCharge({
    orderId: reference,
    grossAmount: amount,
    customerName: String(row.display_name || '').trim() || accountContact,
    customerContact: accountContact,
  });

  await insertCoreHistory({
    accountContact,
    kind: 'deposit',
    title: 'Deposit saldo akun',
    subjectName: String(row.display_name || '').trim() || accountContact,
    amount,
    statusLabel: 'Menunggu pembayaran',
    status: 'pending',
    detail: `Metode: QRIS Midtrans\nUsername: ${accountContact}\nNominal: Rp ${formatRupiah(amount)}`,
    methodLabel: 'QRIS Midtrans',
    reference,
  });

  await sql`
    insert into core_deposit_payments (
      reference,
      account_contact,
      provider,
      provider_order_id,
      transaction_id,
      transaction_status,
      fraud_status,
      gross_amount,
      expiry_time,
      qr_url,
      qr_string,
      deeplink_url,
      raw_response,
      updated_at
    ) values (
      ${reference},
      ${accountContact},
      ${'midtrans'},
      ${charge.orderId || reference},
      ${charge.transactionId},
      ${charge.transactionStatus},
      ${charge.fraudStatus},
      ${amount},
      ${charge.expiryTime || null},
      ${charge.qrUrl},
      ${charge.qrString},
      ${charge.deeplinkUrl},
      ${JSON.stringify(charge.raw)}::jsonb,
      now()
    )
    on conflict (reference) do update
    set
      transaction_id = excluded.transaction_id,
      transaction_status = excluded.transaction_status,
      fraud_status = excluded.fraud_status,
      gross_amount = excluded.gross_amount,
      expiry_time = excluded.expiry_time,
      qr_url = excluded.qr_url,
      qr_string = excluded.qr_string,
      deeplink_url = excluded.deeplink_url,
      raw_response = excluded.raw_response,
      updated_at = now()
  `;

  const bundle = await getCoreWalletBundle(accountContact, true);
  if (!bundle) {
    throw new Error('Transaksi tersimpan, tetapi bundle akun belum bisa dimuat.');
  }

  return {
    bundle,
    method,
    amount,
    depositState: buildCoreDepositState(reference, {
      account_contact: accountContact,
      provider_order_id: charge.orderId || reference,
      transaction_id: charge.transactionId,
      transaction_status: charge.transactionStatus,
      fraud_status: charge.fraudStatus,
      gross_amount: amount,
      expiry_time: charge.expiryTime,
      qr_url: charge.qrUrl,
      qr_string: charge.qrString,
      deeplink_url: charge.deeplinkUrl,
      credited_at: null,
    }),
  };
}

export async function recordCoreOrderHistory(input: {
  accountContact: string;
  subjectName: string;
  title: string;
  amount: number;
  detail: string;
  methodLabel: string;
  reference: string;
}) {
  if (!isCoreConfigured()) {
    return;
  }

  const accountContact = normalizeUsername(input.accountContact);
  if (!accountContact) {
    return;
  }

  const row = await getWalletRow(accountContact);
  if (!row) {
    return;
  }

  await insertCoreHistory({
    accountContact,
    kind: 'order',
    title: input.title,
    subjectName: String(input.subjectName || '').trim() || String(row.display_name || '').trim() || accountContact,
    amount: Math.max(0, Number(input.amount || 0)),
    statusLabel: 'Menunggu pembayaran',
    status: 'pending',
    detail: input.detail,
    methodLabel: input.methodLabel,
    reference: input.reference,
  });
}

export async function updateCoreOrderHistoryStatusByReference(input: {
  reference: string;
  statusLabel: string;
  status: 'pending' | 'success' | 'failed';
  methodLabel?: string;
  detailAppend?: string;
}) {
  if (!isCoreConfigured()) {
    return;
  }

  const reference = String(input.reference || '').trim();
  if (!reference) {
    return;
  }

  const statusLabel = String(input.statusLabel || '').trim() || 'Pending';
  const methodLabel = String(input.methodLabel || '').trim();
  const detailAppend = String(input.detailAppend || '').trim();

  await ensureCoreTables();
  const sql = getNeonClient('core');
  const rows = (await sql`
    select id, detail, method_label
    from core_transaction_history
    where reference = ${reference}
      and kind = 'order'
  `) as Array<{
    id: number;
    detail: string | null;
    method_label: string | null;
  }>;

  for (const row of rows) {
    const currentDetail = String(row.detail || '');
    const nextDetail =
      detailAppend && !currentDetail.includes(detailAppend)
        ? currentDetail
          ? `${currentDetail}\n${detailAppend}`
          : detailAppend
        : currentDetail;

    await sql`
      update core_transaction_history
      set
        status_label = ${statusLabel},
        status = ${input.status},
        method_label = ${methodLabel || String(row.method_label || '')},
        detail = ${nextDetail}
      where id = ${row.id}
    `;
  }
}

export async function spendCoreWalletBalanceForOrder(input: {
  accountContact: string;
  amount: number;
  subjectName: string;
  title: string;
  detail: string;
  reference: string;
}) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  const accountContact = normalizeUsername(input.accountContact);
  const amount = Math.max(0, Number(input.amount || 0));
  if (!accountContact) {
    throw new Error('Username akun wajib diisi untuk pembayaran saldo.');
  }
  if (amount <= 0) {
    throw new Error('Nominal pembayaran saldo belum valid.');
  }

  const row = await getWalletRow(accountContact);
  if (!row) {
    throw new Error('Akun saldo belum ditemukan. Silakan login dulu.');
  }
  if (Number(row.balance || 0) < amount) {
    throw new Error('Saldo akun belum cukup untuk menyelesaikan order ini.');
  }

  const sql = getNeonClient('core');
  const updatedRows = (await sql`
    update core_wallet_accounts
    set
      balance = balance - ${amount},
      updated_at = now()
    where (lower(username) = ${accountContact} or lower(contact) = ${accountContact})
      and balance >= ${amount}
    returning balance
  `) as Array<{ balance?: number }>;

  if (!updatedRows[0]) {
    throw new Error('Saldo akun berubah. Coba ulangi pembayaran ini.');
  }

  await insertCoreHistory({
    accountContact,
    kind: 'order',
    title: input.title,
    subjectName: String(input.subjectName || '').trim() || String(row.display_name || '').trim() || accountContact,
    amount,
    statusLabel: 'Berhasil',
    status: 'success',
    detail: input.detail,
    methodLabel: 'Saldo akun',
    reference: input.reference,
  });

  const bundle = await getCoreWalletBundle(accountContact, true);
  return {
    balanceAfter: Math.max(0, Number(updatedRows[0].balance || 0)),
    bundle,
  };
}

export async function refundCoreWalletBalanceOrder(input: {
  accountContact: string;
  amount: number;
  subjectName: string;
  reference: string;
  reason: string;
}) {
  if (!isCoreConfigured()) {
    return;
  }

  const accountContact = normalizeUsername(input.accountContact);
  const amount = Math.max(0, Number(input.amount || 0));
  if (!accountContact || amount <= 0) {
    return;
  }

  const row = await getWalletRow(accountContact);
  if (!row) {
    return;
  }

  const sql = getNeonClient('core');
  await sql`
    update core_wallet_accounts
    set
      balance = balance + ${amount},
      updated_at = now()
    where lower(username) = ${accountContact}
      or lower(contact) = ${accountContact}
  `;

  await insertCoreHistory({
    accountContact,
    kind: 'deposit',
    title: 'Refund saldo order website',
    subjectName: String(input.subjectName || '').trim() || String(row.display_name || '').trim() || accountContact,
    amount,
    statusLabel: 'Dikembalikan',
    status: 'success',
    detail: `Refund otomatis untuk order ${input.reference}\nAlasan: ${String(input.reason || '').trim() || '-'}`,
    methodLabel: 'Refund saldo akun',
    reference: `${input.reference}-REFUND`,
  });
}

export async function getCoreDepositStatus(reference: string) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  await ensureCoreTables();
  const normalizedReference = String(reference || '').trim();
  if (!normalizedReference) {
    throw new Error('Referensi deposit wajib diisi.');
  }

  const sql = getNeonClient('core');
  const paymentRows = (await sql`
    select
      account_contact,
      provider_order_id,
      transaction_id,
      transaction_status,
      fraud_status,
      gross_amount,
      expiry_time,
      qr_url,
      qr_string,
      deeplink_url,
      credited_at
    from core_deposit_payments
    where reference = ${normalizedReference}
    limit 1
  `) as DepositPaymentRow[];
  let payment = paymentRows[0] || null;

  if (!payment) {
    throw new Error('Deposit tidak ditemukan.');
  }

  const currentStatus = normalizeCoreDepositPaymentStatus(String(payment.transaction_status || 'awaiting-payment'));
  if (currentStatus === 'awaiting-payment' && isMidtransConfigured()) {
    const status = await getMidtransTransactionStatus(String(payment.provider_order_id || normalizedReference));
    const normalizedStatus = normalizeCoreDepositPaymentStatus(status.transactionStatus);

    await sql`
      update core_deposit_payments
      set
        transaction_status = ${normalizedStatus},
        fraud_status = ${status.fraudStatus},
        expiry_time = ${status.expiryTime || null},
        qr_url = ${status.qrUrl || String(payment.qr_url || '')},
        qr_string = ${status.qrString || String(payment.qr_string || '')},
        deeplink_url = ${status.deeplinkUrl || String(payment.deeplink_url || '')},
        raw_response = ${JSON.stringify(status.raw)}::jsonb,
        updated_at = now()
      where reference = ${normalizedReference}
    `;

    if (normalizedStatus === 'paid') {
      const creditedRows = (await sql`
        update core_deposit_payments
        set
          credited_at = coalesce(credited_at, now()),
          updated_at = now()
        where reference = ${normalizedReference}
          and credited_at is null
        returning account_contact, gross_amount
      `) as Array<{
        account_contact?: string | null;
        gross_amount?: number | null;
      }>;

      const credited = creditedRows[0];
      if (credited) {
        const accountContact = normalizeUsername(String(credited.account_contact || ''));
        const grossAmount = Math.max(0, Number(credited.gross_amount || 0));
        if (accountContact && grossAmount > 0) {
          await sql`
            update core_wallet_accounts
            set
              balance = balance + ${grossAmount},
              updated_at = now()
            where lower(username) = ${accountContact}
              or lower(contact) = ${accountContact}
          `;
        }
      }

      await updateCoreDepositHistoryStatusByReference({
        reference: normalizedReference,
        statusLabel: 'Berhasil',
        status: 'success',
        detailAppend: 'Pembayaran QRIS Midtrans berhasil dikonfirmasi dan saldo akun bertambah.',
      });
    } else if (normalizedStatus === 'expire' || normalizedStatus === 'cancel' || normalizedStatus === 'deny' || normalizedStatus === 'failed') {
      await updateCoreDepositHistoryStatusByReference({
        reference: normalizedReference,
        statusLabel: normalizedStatus === 'expire' ? 'Expired' : 'Gagal',
        status: 'failed',
        detailAppend:
          normalizedStatus === 'expire'
            ? 'Pembayaran deposit QRIS expired.'
            : 'Pembayaran deposit QRIS tidak berhasil.',
      });
    }

    const refreshedPaymentRows = (await sql`
      select
        account_contact,
        provider_order_id,
        transaction_id,
        transaction_status,
        fraud_status,
        gross_amount,
        expiry_time,
        qr_url,
        qr_string,
        deeplink_url,
        credited_at
      from core_deposit_payments
      where reference = ${normalizedReference}
      limit 1
    `) as DepositPaymentRow[];
    payment = refreshedPaymentRows[0] || payment;
  }

  const accountContact = normalizeUsername(String(payment.account_contact || ''));
  const bundle = accountContact ? await getCoreWalletBundle(accountContact, true) : null;

  return {
    bundle,
    depositState: buildCoreDepositState(normalizedReference, payment),
  };
}
