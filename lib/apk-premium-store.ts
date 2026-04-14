import { apkPremiumProducts, type ApkPremiumProduct } from '@/lib/apk-premium';

export type ApkPremiumCatalogSummary = {
  totalProducts: number;
  totalVariants: number;
  totalStock: number;
  totalSold: number;
};

export type ApkPremiumCatalogPayload = {
  dataSource: 'local-seed';
  syncReady: boolean;
  updatedAt: string;
  categories: string[];
  summary: ApkPremiumCatalogSummary;
  products: ApkPremiumProduct[];
};

function cloneProducts(products: ApkPremiumProduct[]) {
  return products.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => ({ ...variant })),
  }));
}

function sortProducts(products: ApkPremiumProduct[]) {
  return [...products].sort((left, right) => left.title.localeCompare(right.title, 'id'));
}

function buildSummary(products: ApkPremiumProduct[]): ApkPremiumCatalogSummary {
  return {
    totalProducts: products.length,
    totalVariants: products.reduce((sum, product) => sum + product.variants.length, 0),
    totalStock: products.reduce((sum, product) => sum + product.stock, 0),
    totalSold: products.reduce((sum, product) => sum + product.sold, 0),
  };
}

export async function getApkPremiumCatalog(): Promise<ApkPremiumCatalogPayload> {
  const products = sortProducts(cloneProducts(apkPremiumProducts));
  const categories = Array.from(new Set(products.map((product) => product.category))).sort((left, right) =>
    left.localeCompare(right, 'id'),
  );

  return {
    dataSource: 'local-seed',
    syncReady: false,
    updatedAt: new Date().toISOString(),
    categories,
    summary: buildSummary(products),
    products,
  };
}

export async function getApkPremiumProductById(productId: string) {
  const catalog = await getApkPremiumCatalog();
  return catalog.products.find((product) => product.id === productId) || null;
}
