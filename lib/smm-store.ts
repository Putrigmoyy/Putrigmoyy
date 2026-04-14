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
