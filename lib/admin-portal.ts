import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import type { AdminApkVariantRow, AdminCoreWalletUser, AdminPortalSnapshot } from '@/lib/admin-portal-types';
import { adminUpdateApkVariant, listAdminApkVariants } from '@/lib/apk-premium-admin';
import { adminUpdateCoreWalletUser, listAdminCoreWalletUsers } from '@/lib/core-store';
import { getSmmPricingSettings, updateSmmPricingSettings } from '@/lib/smm-pricing';

export function resolveAdminPortalSecret() {
  return String(process.env.ADMIN_PORTAL_SECRET || process.env.OWNER_APP_TOKEN || '').trim();
}

export function verifyAdminPortalSecret(candidate: string) {
  const secret = resolveAdminPortalSecret();
  const input = String(candidate || '').trim();
  if (!secret || !input) {
    return false;
  }

  const secretBuffer = Buffer.from(secret);
  const inputBuffer = Buffer.from(input);
  if (secretBuffer.length !== inputBuffer.length) {
    return false;
  }

  return timingSafeEqual(secretBuffer, inputBuffer);
}

export async function getAdminPortalSnapshot(): Promise<AdminPortalSnapshot> {
  const [smmPricing, users, apkVariants] = await Promise.all([
    getSmmPricingSettings(),
    listAdminCoreWalletUsers(),
    listAdminApkVariants(),
  ]);

  return {
    smmPricing,
    users,
    apkVariants,
    summary: {
      totalUsers: users.length,
      totalVariants: apkVariants.length,
      totalPremiumStock: apkVariants.reduce((sum, variant) => sum + variant.stock, 0),
    },
  };
}

export async function saveAdminSmmPricing(input: { profitPercent: number }) {
  return updateSmmPricingSettings(input);
}

export async function saveAdminUser(input: {
  currentUsername: string;
  displayName?: string;
  nextUsername?: string;
  newPassword?: string;
  balanceDelta?: number;
}) {
  return adminUpdateCoreWalletUser(input);
}

export async function saveAdminApkVariant(input: {
  variantId: string;
  variantTitle?: string;
  duration?: string;
  price?: number;
  stockDelta?: number;
  badge?: string;
}) {
  return adminUpdateApkVariant(input);
}
