import 'server-only';

import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getNeonClient } from '@/lib/neon-clients';
import { ensureCoreTables } from '@/lib/core-store';

export type ApkPremiumPricingSettings = {
  adminFee: number;
};

const APK_PREMIUM_PRICING_KEY = 'apk_premium_pricing';

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

function normalizeAdminFee(value: unknown) {
  const numeric = Math.trunc(Number(value || 0));
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(500000, numeric));
}

export async function getApkPremiumPricingSettings(): Promise<ApkPremiumPricingSettings> {
  if (!isCoreConfigured()) {
    return {
      adminFee: 0,
    };
  }

  await ensureAdminSettingsTable();
  const sql = getNeonClient('core');
  const rows = (await sql`
    select value_json
    from core_admin_settings
    where setting_key = ${APK_PREMIUM_PRICING_KEY}
    limit 1
  `) as Array<{
    value_json?: {
      adminFee?: number;
    } | null;
  }>;

  return {
    adminFee: normalizeAdminFee(rows[0]?.value_json?.adminFee),
  };
}

export async function updateApkPremiumPricingSettings(input: { adminFee: number }) {
  if (!isCoreConfigured()) {
    throw new Error('DATABASE_URL_CORE belum diisi.');
  }

  await ensureAdminSettingsTable();
  const settings = {
    adminFee: normalizeAdminFee(input.adminFee),
  };
  const sql = getNeonClient('core');
  await sql`
    insert into core_admin_settings (
      setting_key,
      value_json,
      updated_at
    ) values (
      ${APK_PREMIUM_PRICING_KEY},
      ${JSON.stringify(settings)}::jsonb,
      now()
    )
    on conflict (setting_key) do update set
      value_json = excluded.value_json,
      updated_at = now()
  `;

  return settings;
}

export function applyApkPremiumAdminFee(subtotal: number, adminFee: number) {
  const safeSubtotal = Math.max(0, Math.trunc(Number(subtotal || 0)));
  const safeAdminFee = normalizeAdminFee(adminFee);
  if (safeSubtotal <= 0) {
    return 0;
  }
  return safeSubtotal + safeAdminFee;
}
