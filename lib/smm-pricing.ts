import 'server-only';

import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getNeonClient } from '@/lib/neon-clients';
import { ensureCoreTables } from '@/lib/core-store';

export type SmmPricingSettings = {
  profitPercent: number;
};

const SMM_PRICING_KEY = 'smm_pricing';

function isCoreConfigured() {
  return getAppDataSourceConfig().core.databaseConfigured;
}

async function ensureAdminSettingsTable() {
  if (!isCoreConfigured()) {
    return;
  }

  await ensureCoreTables();
  const sql = getNeonClient('core');
  await sql`
    create table if not exists core_admin_settings (
      setting_key text primary key,
      value_json jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    )
  `;
}

function normalizeProfitPercent(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(500, Math.round(numeric * 100) / 100));
}

export async function getSmmPricingSettings(): Promise<SmmPricingSettings> {
  if (!isCoreConfigured()) {
    return {
      profitPercent: 0,
    };
  }

  await ensureAdminSettingsTable();
  const sql = getNeonClient('core');
  const rows = (await sql`
    select value_json
    from core_admin_settings
    where setting_key = ${SMM_PRICING_KEY}
    limit 1
  `) as Array<{
    value_json?: {
      profitPercent?: number;
    } | null;
  }>;

  return {
    profitPercent: normalizeProfitPercent(rows[0]?.value_json?.profitPercent),
  };
}

export async function updateSmmPricingSettings(input: { profitPercent: number }) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  await ensureAdminSettingsTable();
  const settings = {
    profitPercent: normalizeProfitPercent(input.profitPercent),
  };
  const sql = getNeonClient('core');
  await sql`
    insert into core_admin_settings (
      setting_key,
      value_json,
      updated_at
    ) values (
      ${SMM_PRICING_KEY},
      ${JSON.stringify(settings)}::jsonb,
      now()
    )
    on conflict (setting_key) do update set
      value_json = excluded.value_json,
      updated_at = now()
  `;

  return settings;
}

export function applySmmPricingProfit(basePrice: number, profitPercent: number) {
  const safeBasePrice = Math.max(0, Number(basePrice || 0));
  const safeProfitPercent = normalizeProfitPercent(profitPercent);
  return Math.max(0, Math.ceil(safeBasePrice * (1 + safeProfitPercent / 100)));
}
