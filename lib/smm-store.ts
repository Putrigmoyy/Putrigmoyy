import type { NormalizedPusatPanelService } from '@/lib/pusatpanel';
import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getNeonClient } from '@/lib/neon-clients';

function isSmmConfigured() {
  const config = getAppDataSourceConfig();
  return config.smm.databaseConfigured;
}

export async function ensureSmmTables() {
  if (!isSmmConfigured()) {
    return;
  }

  const sql = getNeonClient('smm');
  await sql`
    create table if not exists smm_orders (
      id bigserial primary key,
      order_code text not null default '',
      provider_order_id text not null default '',
      account_contact text not null default '',
      service_id text not null default '',
      service_name text not null default '',
      category text not null default '',
      target_data text not null default '',
      quantity integer,
      unit_price integer not null default 0,
      total_price integer not null default 0,
      username text not null default '',
      comments text not null default '',
      order_status text not null default 'pending',
      payment_status text not null default 'paid',
      payment_method text not null default 'direct',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`alter table smm_orders add column if not exists order_code text not null default ''`;
  await sql`alter table smm_orders add column if not exists provider_order_id text not null default ''`;
  await sql`alter table smm_orders add column if not exists account_contact text not null default ''`;
  await sql`alter table smm_orders add column if not exists unit_price integer not null default 0`;
  await sql`alter table smm_orders add column if not exists total_price integer not null default 0`;
  await sql`alter table smm_orders add column if not exists payment_status text not null default 'paid'`;
  await sql`alter table smm_orders add column if not exists payment_method text not null default 'direct'`;
  await sql`create unique index if not exists smm_orders_order_code_idx on smm_orders(order_code) where order_code <> ''`;
  await sql`create index if not exists smm_orders_account_contact_idx on smm_orders(account_contact)`;
  await sql`create index if not exists smm_orders_provider_order_idx on smm_orders(provider_order_id)`;
  await sql`
    create table if not exists smm_order_payments (
      order_code text primary key,
      provider text not null default 'midtrans',
      provider_order_id text not null default '',
      transaction_id text not null default '',
      payment_method text not null default 'midtrans',
      transaction_status text not null default 'pending',
      fraud_status text not null default '',
      gross_amount integer not null default 0,
      expiry_time timestamptz,
      qr_url text not null default '',
      qr_string text not null default '',
      deeplink_url text not null default '',
      raw_response jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists smm_services_cache (
      id text primary key,
      category text not null default '',
      name text not null default '',
      note text not null default '',
      min integer not null default 0,
      max integer not null default 0,
      price integer not null default 0,
      menu_type text not null default '1',
      logo_type text not null default '',
      speed text not null default '',
      last_synced_at timestamptz not null default now()
    )
  `;
}

export async function saveSmmOrder(input: {
  orderCode?: string;
  providerOrderId: string;
  accountContact?: string;
  serviceId: string;
  serviceName: string;
  category: string;
  targetData: string;
  quantity: number | null;
  unitPrice: number;
  totalPrice: number;
  username: string;
  comments: string;
  orderStatus: string;
}) {
  if (!isSmmConfigured()) {
    return;
  }

  await ensureSmmTables();
  const sql = getNeonClient('smm');
  const orderCode = String(input.orderCode || '').trim();
  if (orderCode) {
    await sql`
      insert into smm_orders (
        order_code,
        provider_order_id,
        account_contact,
        service_id,
        service_name,
        category,
        target_data,
        quantity,
        unit_price,
        total_price,
        username,
        comments,
        order_status
      ) values (
        ${orderCode},
        ${input.providerOrderId},
        ${String(input.accountContact || '').trim()},
        ${input.serviceId},
        ${input.serviceName},
        ${input.category || 'Tanpa Kategori'},
        ${input.targetData},
        ${input.quantity},
        ${Math.max(0, Number(input.unitPrice || 0))},
        ${Math.max(0, Number(input.totalPrice || 0))},
        ${input.username},
        ${input.comments},
        ${input.orderStatus}
      )
      on conflict (order_code) where order_code <> '' do update
      set
        provider_order_id = excluded.provider_order_id,
        account_contact = excluded.account_contact,
        service_id = excluded.service_id,
        service_name = excluded.service_name,
        category = excluded.category,
        target_data = excluded.target_data,
        quantity = excluded.quantity,
        unit_price = excluded.unit_price,
        total_price = excluded.total_price,
        username = excluded.username,
        comments = excluded.comments,
        order_status = excluded.order_status,
        payment_status = 'paid',
        payment_method = 'direct',
        updated_at = now()
    `;
    return;
  }

  await sql`
    insert into smm_orders (
      provider_order_id,
      account_contact,
      service_id,
      service_name,
      category,
      target_data,
      quantity,
      unit_price,
      total_price,
      username,
      comments,
      order_status
    ) values (
      ${input.providerOrderId},
      ${String(input.accountContact || '').trim()},
      ${input.serviceId},
      ${input.serviceName},
      ${input.category || 'Tanpa Kategori'},
      ${input.targetData},
      ${input.quantity},
      ${Math.max(0, Number(input.unitPrice || 0))},
      ${Math.max(0, Number(input.totalPrice || 0))},
      ${input.username},
      ${input.comments},
      ${input.orderStatus}
    )
  `;
}

export async function updateSmmOrderStatus(providerOrderId: string, status: string) {
  if (!isSmmConfigured()) {
    return;
  }

  await ensureSmmTables();
  const sql = getNeonClient('smm');
  await sql`
    update smm_orders
    set
      order_status = ${status},
      updated_at = now()
    where provider_order_id = ${providerOrderId}
  `;
}

export async function syncSmmServicesCache(services: NormalizedPusatPanelService[]) {
  if (!isSmmConfigured() || services.length === 0) {
    return;
  }

  const sql = getNeonClient('smm');
  for (const service of services) {
    await sql`
      insert into smm_services_cache (
        id,
        category,
        name,
        note,
        min,
        max,
        price,
        menu_type,
        logo_type,
        speed,
        last_synced_at
      ) values (
        ${service.id},
        ${service.category},
        ${service.name},
        ${service.note},
        ${service.min},
        ${service.max},
        ${service.price},
        ${service.menuType},
        ${service.logoType},
        ${service.speed},
        now()
      )
      on conflict (id) do update set
        category = excluded.category,
        name = excluded.name,
        note = excluded.note,
        min = excluded.min,
        max = excluded.max,
        price = excluded.price,
        menu_type = excluded.menu_type,
        logo_type = excluded.logo_type,
        speed = excluded.speed,
        last_synced_at = now()
    `;
  }
}

export type SmmOrderHistoryItem = {
  id: number;
  orderCode: string;
  providerOrderId: string;
  serviceId: string;
  serviceName: string;
  category: string;
  targetData: string;
  quantity: number | null;
  unitPrice: number;
  totalPrice: number;
  username: string;
  comments: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
};

export async function getSmmOrderHistory(limit = 40, options?: { accountContact?: string; providerOnly?: boolean }) {
  if (!isSmmConfigured()) {
    return [];
  }

  await ensureSmmTables();
  const sql = getNeonClient('smm');
  const accountContact = String(options?.accountContact || '').trim();
  const providerOnly = options?.providerOnly === true;
  const queryLimit = Math.max(1, Math.min(limit, 100));
  const rows = (
    accountContact
      ? await sql`
          select
            id,
            order_code,
            provider_order_id,
            service_id,
            service_name,
            category,
            target_data,
            quantity,
            unit_price,
            total_price,
            username,
            comments,
            order_status,
            payment_status,
            payment_method,
            created_at,
            updated_at
          from smm_orders
          where account_contact = ${accountContact}
          order by created_at desc
          limit ${queryLimit}
        `
      : providerOnly
        ? await sql`
            select
              id,
              order_code,
              provider_order_id,
              service_id,
              service_name,
              category,
              target_data,
              quantity,
              unit_price,
              total_price,
              username,
              comments,
              order_status,
              payment_status,
              payment_method,
              created_at,
              updated_at
            from smm_orders
            where provider_order_id <> ''
            order by created_at desc
            limit ${queryLimit}
          `
      : await sql`
          select
            id,
            order_code,
            provider_order_id,
            service_id,
            service_name,
            category,
            target_data,
            quantity,
            unit_price,
            total_price,
            username,
            comments,
            order_status,
            payment_status,
            payment_method,
            created_at,
            updated_at
          from smm_orders
          order by created_at desc
          limit ${queryLimit}
        `
  ) as Array<{
    id: number;
    order_code: string | null;
    provider_order_id: string | null;
    service_id: string;
    service_name: string;
    category: string;
    target_data: string;
    quantity: number | null;
    unit_price: number | null;
    total_price: number | null;
    username: string | null;
    comments: string | null;
    order_status: string;
    payment_status: string | null;
    payment_method: string | null;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map((row): SmmOrderHistoryItem => ({
    id: Number(row.id),
    orderCode: String(row.order_code || '').trim(),
    providerOrderId: String(row.provider_order_id || '').trim(),
    serviceId: row.service_id,
    serviceName: row.service_name,
    category: row.category,
    targetData: row.target_data,
    quantity: row.quantity == null ? null : Number(row.quantity),
    unitPrice: Number(row.unit_price || 0),
    totalPrice: Number(row.total_price || 0),
    username: String(row.username || ''),
    comments: String(row.comments || ''),
    orderStatus: row.order_status,
    paymentStatus: String(row.payment_status || ''),
    paymentMethod: String(row.payment_method || ''),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
