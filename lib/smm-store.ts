import type { NormalizedPusatPanelService } from '@/lib/pusatpanel';
import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getNeonClient } from '@/lib/neon-clients';

function isSmmConfigured() {
  const config = getAppDataSourceConfig();
  return config.smm.databaseConfigured;
}

export async function saveSmmOrder(input: {
  providerOrderId: string;
  serviceId: string;
  serviceName: string;
  category: string;
  targetData: string;
  quantity: number | null;
  username: string;
  comments: string;
  orderStatus: string;
}) {
  if (!isSmmConfigured()) {
    return;
  }

  const sql = getNeonClient('smm');
  await sql`
    insert into smm_orders (
      provider_order_id,
      service_id,
      service_name,
      category,
      target_data,
      quantity,
      username,
      comments,
      order_status
    ) values (
      ${input.providerOrderId},
      ${input.serviceId},
      ${input.serviceName},
      ${input.category || 'Tanpa Kategori'},
      ${input.targetData},
      ${input.quantity},
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
  providerOrderId: string;
  serviceId: string;
  serviceName: string;
  category: string;
  targetData: string;
  quantity: number | null;
  username: string;
  comments: string;
  orderStatus: string;
  createdAt: string;
  updatedAt: string;
};

export async function getSmmOrderHistory(limit = 40) {
  if (!isSmmConfigured()) {
    return [];
  }

  const sql = getNeonClient('smm');
  const rows = (await sql`
    select
      id,
      provider_order_id,
      service_id,
      service_name,
      category,
      target_data,
      quantity,
      username,
      comments,
      order_status,
      created_at,
      updated_at
    from smm_orders
    order by created_at desc
    limit ${Math.max(1, Math.min(limit, 100))}
  `) as Array<{
    id: number;
    provider_order_id: string | null;
    service_id: string;
    service_name: string;
    category: string;
    target_data: string;
    quantity: number | null;
    username: string | null;
    comments: string | null;
    order_status: string;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map((row): SmmOrderHistoryItem => ({
    id: Number(row.id),
    providerOrderId: String(row.provider_order_id || '').trim(),
    serviceId: row.service_id,
    serviceName: row.service_name,
    category: row.category,
    targetData: row.target_data,
    quantity: row.quantity == null ? null : Number(row.quantity),
    username: String(row.username || ''),
    comments: String(row.comments || ''),
    orderStatus: row.order_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
