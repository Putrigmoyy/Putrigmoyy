import { createHash } from 'node:crypto';
import { formatRupiah } from '@/lib/apk-premium';
import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getNeonClient } from '@/lib/neon-clients';

export type CoreWalletProfile = {
  registered: boolean;
  loggedIn: boolean;
  name: string;
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
  display_name: string;
  contact: string;
  pin_hash: string;
  balance: number;
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

function isCoreConfigured() {
  return getAppDataSourceConfig().core.databaseConfigured;
}

function hashPin(pin: string) {
  return createHash('sha256').update(pin).digest('hex');
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

function mapWalletRow(row?: WalletRow | null, loggedIn = false): CoreWalletProfile {
  if (!row) {
    return {
      registered: false,
      loggedIn: false,
      name: '',
      contact: '',
      balance: 0,
    };
  }

  return {
    registered: true,
    loggedIn,
    name: row.display_name,
    contact: row.contact,
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

async function getWalletRow(contact: string) {
  const sql = getNeonClient('core');
  const rows = (await sql`
    select
      display_name,
      contact,
      pin_hash,
      balance
    from core_wallet_accounts
    where contact = ${contact}
    limit 1
  `) as WalletRow[];
  return rows[0] || null;
}

export async function getCoreWalletBundle(contact: string, loggedIn = true): Promise<CoreWalletBundle | null> {
  if (!isCoreConfigured()) {
    return null;
  }

  const normalizedContact = String(contact || '').trim();
  if (!normalizedContact) {
    return null;
  }

  const row = await getWalletRow(normalizedContact);
  if (!row) {
    return null;
  }

  const sql = getNeonClient('core');
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
    where account_contact = ${normalizedContact}
    order by created_at desc
    limit 60
  `) as HistoryRow[];

  return {
    account: mapWalletRow(row, loggedIn),
    history: historyRows.map(mapHistoryRow),
  };
}

export async function registerCoreWalletAccount(input: { name: string; contact: string; pin: string }) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  const name = String(input.name || '').trim();
  const contact = String(input.contact || '').trim();
  const pin = String(input.pin || '').trim();

  if (!name || !contact || !pin) {
    throw new Error('Nama, kontak, dan PIN wajib diisi.');
  }

  const existing = await getWalletRow(contact);
  if (existing) {
    throw new Error('Kontak ini sudah terdaftar. Silakan login.');
  }

  const sql = getNeonClient('core');
  await sql`
    insert into core_wallet_accounts (
      display_name,
      contact,
      pin_hash
    ) values (
      ${name},
      ${contact},
      ${hashPin(pin)}
    )
  `;

  const bundle = await getCoreWalletBundle(contact, true);
  if (!bundle) {
    throw new Error('Akun berhasil dibuat, tetapi data akun belum bisa dimuat.');
  }
  return bundle;
}

export async function loginCoreWalletAccount(input: { contact: string; pin: string }) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  const contact = String(input.contact || '').trim();
  const pin = String(input.pin || '').trim();
  if (!contact || !pin) {
    throw new Error('Kontak dan PIN wajib diisi.');
  }

  const row = await getWalletRow(contact);
  if (!row) {
    throw new Error('Akun belum terdaftar.');
  }
  if (row.pin_hash !== hashPin(pin)) {
    throw new Error('Kontak atau PIN tidak cocok.');
  }

  const bundle = await getCoreWalletBundle(contact, true);
  if (!bundle) {
    throw new Error('Akun ditemukan, tetapi data belum bisa dimuat.');
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
      ${entry.accountContact},
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

export async function submitCoreDeposit(input: {
  accountContact: string;
  amount: number;
  method: 'midtrans' | 'balance';
}) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  const accountContact = String(input.accountContact || '').trim();
  const amount = Math.max(0, Number(input.amount || 0));
  const method = input.method;

  if (!accountContact) {
    throw new Error('Kontak akun wajib diisi.');
  }
  if (amount <= 0) {
    throw new Error('Jumlah deposit belum valid.');
  }

  const row = await getWalletRow(accountContact);
  if (!row) {
    throw new Error('Akun belum ditemukan. Silakan daftar atau login dulu.');
  }

  const sql = getNeonClient('core');
  if (method === 'balance') {
    if (Number(row.balance || 0) < amount) {
      throw new Error('Saldo akun belum cukup untuk nominal ini.');
    }

    await sql`
      update core_wallet_accounts
      set
        balance = balance - ${amount},
        updated_at = now()
      where contact = ${accountContact}
    `;

    await insertCoreHistory({
      accountContact,
      kind: 'deposit',
      title: 'Pembayaran dengan saldo akun',
      subjectName: row.display_name,
      amount,
      statusLabel: 'Berhasil',
      status: 'success',
      detail: `Metode: Saldo akun\nKontak: ${accountContact}\nSaldo terpakai: Rp ${formatRupiah(amount)}`,
      methodLabel: 'Saldo akun',
      reference: `SALDO-${Date.now().toString().slice(-6)}`,
    });
  } else {
    await insertCoreHistory({
      accountContact,
      kind: 'deposit',
      title: 'Deposit via QRIS Midtrans',
      subjectName: row.display_name,
      amount,
      statusLabel: 'Menunggu pembayaran',
      status: 'pending',
      detail: `Metode: QRIS Midtrans\nKontak: ${accountContact}\nNominal: Rp ${formatRupiah(amount)}`,
      methodLabel: 'QRIS Midtrans',
      reference: `DPS-${Date.now().toString().slice(-6)}`,
    });
  }

  const bundle = await getCoreWalletBundle(accountContact, true);
  if (!bundle) {
    throw new Error('Transaksi tersimpan, tetapi bundle akun belum bisa dimuat.');
  }

  return {
    bundle,
    method,
    amount,
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

  const accountContact = String(input.accountContact || '').trim();
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
    subjectName: String(input.subjectName || '').trim() || row.display_name,
    amount: Math.max(0, Number(input.amount || 0)),
    statusLabel: 'Menunggu pembayaran',
    status: 'pending',
    detail: input.detail,
    methodLabel: input.methodLabel,
    reference: input.reference,
  });
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

  const accountContact = String(input.accountContact || '').trim();
  const amount = Math.max(0, Number(input.amount || 0));
  if (!accountContact) {
    throw new Error('Kontak akun wajib diisi untuk pembayaran saldo.');
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
    where contact = ${accountContact}
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
    subjectName: String(input.subjectName || '').trim() || row.display_name,
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

  const accountContact = String(input.accountContact || '').trim();
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
    where contact = ${accountContact}
  `;

  await insertCoreHistory({
    accountContact,
    kind: 'deposit',
    title: 'Refund saldo order APK',
    subjectName: String(input.subjectName || '').trim() || row.display_name,
    amount,
    statusLabel: 'Dikembalikan',
    status: 'success',
    detail: `Refund otomatis untuk order ${input.reference}\nAlasan: ${String(input.reason || '').trim() || '-'}`,
    methodLabel: 'Refund saldo akun',
    reference: `${input.reference}-REFUND`,
  });
}
