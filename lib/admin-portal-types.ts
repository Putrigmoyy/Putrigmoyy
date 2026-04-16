export type AdminSmmPricingSettings = {
  profitPercent: number;
};

export type AdminApkPricingSettings = {
  adminFee: number;
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
  availableAccountCount: number;
  badge: string;
  productUpdatedAt: string;
};

export type AdminApkProductRow = {
  productId: string;
  title: string;
  subtitle: string;
  category: string;
  delivery: string;
  note: string;
  guarantee: string;
  imageUrl: string;
  stock: number;
  sold: number;
  accent: 'cyan' | 'amber' | 'emerald' | 'violet';
};

export type AdminApkAccountRow = {
  id: number;
  variantId: string;
  accountData: string;
  adminNote: string;
  deliveryStatus: 'available' | 'reserved' | 'delivered';
  assignedOrderCode: string;
  createdAt: string;
};

export type AdminPortalSnapshot = {
  smmPricing: AdminSmmPricingSettings;
  apkPricing: AdminApkPricingSettings;
  minimumDeposit: number;
  users: AdminCoreWalletUser[];
  apkProducts: AdminApkProductRow[];
  apkVariants: AdminApkVariantRow[];
  summary: {
    totalUsers: number;
    totalProducts: number;
    totalVariants: number;
    totalPremiumStock: number;
  };
};
