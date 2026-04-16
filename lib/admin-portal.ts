import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import type { AdminPortalSnapshot } from '@/lib/admin-portal-types';
import { getApkPremiumPricingSettings, updateApkPremiumPricingSettings } from '@/lib/apk-premium-pricing';
import {
  addAdminApkVariantAccounts,
  listAdminApkAccountsByVariant,
  adminDeleteApkAccount,
  adminUpdateApkAccount,
  adminUpdateApkProduct,
  adminUpdateApkVariant,
  createAdminApkProduct,
  createAdminApkVariant,
  listAdminApkProducts,
  listAdminApkVariants,
} from '@/lib/apk-premium-admin';
import { adminDeleteCoreWalletUser, adminUpdateCoreWalletUser, getCoreMinimumDeposit, listAdminCoreWalletUsers, updateCoreMinimumDeposit } from '@/lib/core-store';
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
  const [smmPricing, apkPricing, minimumDeposit, users, apkProducts, apkVariants] = await Promise.all([
    getSmmPricingSettings(),
    getApkPremiumPricingSettings(),
    getCoreMinimumDeposit(),
    listAdminCoreWalletUsers(),
    listAdminApkProducts(),
    listAdminApkVariants(),
  ]);

  return {
    smmPricing,
    apkPricing,
    minimumDeposit,
    users,
    apkProducts,
    apkVariants,
    summary: {
      totalUsers: users.length,
      totalProducts: apkProducts.length,
      totalVariants: apkVariants.length,
      totalPremiumStock: apkVariants.reduce((sum, variant) => sum + variant.stock, 0),
    },
  };
}

export async function saveAdminSmmPricing(input: { profitPercent: number }) {
  return updateSmmPricingSettings(input);
}

export async function saveAdminApkPricing(input: { adminFee: number }) {
  return updateApkPremiumPricingSettings(input);
}

export async function saveAdminMinimumDeposit(input: { minimumDeposit: number }) {
  return updateCoreMinimumDeposit(input);
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

export async function deleteAdminUser(input: { currentUsername: string }) {
  return adminDeleteCoreWalletUser(input);
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

export async function saveAdminApkProductEdit(input: {
  productId: string;
  title?: string;
  subtitle?: string;
  category?: string;
  delivery?: string;
  note?: string;
  guarantee?: string;
  imageUrl?: string;
}) {
  return adminUpdateApkProduct(input);
}

export async function saveAdminApkProduct(input: {
  title: string;
  subtitle?: string;
  category?: string;
  delivery?: string;
  note?: string;
  guarantee?: string;
  imageUrl?: string;
}) {
  return createAdminApkProduct(input);
}

export async function saveAdminApkCreateVariant(input: {
  productId: string;
  variantTitle: string;
  duration?: string;
  price?: number;
  badge?: string;
}) {
  return createAdminApkVariant(input);
}

export async function saveAdminApkAccounts(input: {
  variantId: string;
  entries: string[];
  adminNote?: string;
}) {
  return addAdminApkVariantAccounts(input);
}

export async function getAdminApkAccounts(input: { variantId: string }) {
  return listAdminApkAccountsByVariant(input.variantId);
}

export async function saveAdminApkAccountEdit(input: {
  accountId: number;
  accountData?: string;
  adminNote?: string;
  variantId?: string;
}) {
  return adminUpdateApkAccount(input);
}

export async function deleteAdminApkAccount(input: { accountId: number }) {
  return adminDeleteApkAccount(input);
}
