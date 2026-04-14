import { apkPremiumProducts, type ApkPremiumProduct } from '@/lib/apk-premium';
import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getNeonClient } from '@/lib/neon-clients';

export type ApkPremiumCatalogSummary = {
  totalProducts: number;
  totalVariants: number;
  totalStock: number;
  totalSold: number;
};

export type ApkPremiumCatalogPayload = {
  dataSource: 'local-seed' | 'neon' | 'local-seed-fallback';
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

function createSeedCatalog(dataSource: ApkPremiumCatalogPayload['dataSource']): ApkPremiumCatalogPayload {
  const products = sortProducts(cloneProducts(apkPremiumProducts));
  const categories = Array.from(new Set(products.map((product) => product.category))).sort((left, right) =>
    left.localeCompare(right, 'id'),
  );

  return {
    dataSource,
    syncReady: false,
    updatedAt: new Date().toISOString(),
    categories,
    summary: buildSummary(products),
    products,
  };
}

type ApkProductRow = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  stock: number;
  sold: number;
  rating: string;
  delivery: string;
  accent: ApkPremiumProduct['accent'];
  note: string;
  guarantee: string;
};

type ApkVariantRow = {
  id: string;
  product_id: string;
  title: string;
  duration: string;
  price: number;
  stock: number;
  badge: string | null;
};

async function getApkPremiumCatalogFromNeon(): Promise<ApkPremiumCatalogPayload> {
  const sql = getNeonClient('apk');
  const productRows = (await sql`
    select
      id,
      title,
      subtitle,
      category,
      stock,
      sold,
      rating,
      delivery,
      accent,
      note,
      guarantee
    from apk_products
    where is_active = true
    order by sort_order asc, title asc
  `) as ApkProductRow[];

  const variantRows = (await sql`
    select
      id,
      product_id,
      title,
      duration,
      price,
      stock,
      badge
    from apk_product_variants
    where is_active = true
    order by sort_order asc, title asc
  `) as ApkVariantRow[];

  const variantMap = new Map<string, ApkPremiumProduct['variants']>();
  for (const row of variantRows) {
    if (!variantMap.has(row.product_id)) {
      variantMap.set(row.product_id, []);
    }
    variantMap.get(row.product_id)?.push({
      id: row.id,
      title: row.title,
      duration: row.duration,
      price: Number(row.price || 0),
      stock: Number(row.stock || 0),
      badge: row.badge || undefined,
    });
  }

  const products: ApkPremiumProduct[] = productRows.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    stock: Number(row.stock || 0),
    sold: Number(row.sold || 0),
    rating: row.rating,
    delivery: row.delivery,
    accent: ['cyan', 'amber', 'emerald', 'violet'].includes(row.accent) ? row.accent : 'cyan',
    note: row.note,
    guarantee: row.guarantee,
    variants: variantMap.get(row.id) || [],
  }));

  const categories = Array.from(new Set(products.map((product) => product.category))).sort((left, right) =>
    left.localeCompare(right, 'id'),
  );

  return {
    dataSource: 'neon',
    syncReady: true,
    updatedAt: new Date().toISOString(),
    categories,
    summary: buildSummary(products),
    products,
  };
}

export async function getApkPremiumCatalog(): Promise<ApkPremiumCatalogPayload> {
  const config = getAppDataSourceConfig();
  if (config.apk.mode === 'neon' && config.apk.databaseConfigured) {
    try {
      return await getApkPremiumCatalogFromNeon();
    } catch {
      return createSeedCatalog('local-seed-fallback');
    }
  }

  return createSeedCatalog('local-seed');
}

export async function getApkPremiumProductById(productId: string) {
  const catalog = await getApkPremiumCatalog();
  return catalog.products.find((product) => product.id === productId) || null;
}
