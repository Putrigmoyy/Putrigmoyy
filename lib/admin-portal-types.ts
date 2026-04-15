export type AdminSmmPricingSettings = {
  profitPercent: number;
};

export type AdminCoreWalletUser = {
  id: number;
  name: string;
  username: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
  historyCount: number;
  lastHistoryAt: string;
  loggedInReady: boolean;
};

export type AdminApkVariantRow = {
  variantId: string;
  productId: string;
  productTitle: string;
  category: string;
  variantTitle: string;
  duration: string;
  price: number;
  stock: number;
  badge: string;
  productUpdatedAt: string;
};

export type AdminPortalSnapshot = {
  smmPricing: AdminSmmPricingSettings;
  users: AdminCoreWalletUser[];
  apkVariants: AdminApkVariantRow[];
  summary: {
    totalUsers: number;
    totalVariants: number;
    totalPremiumStock: number;
  };
};
