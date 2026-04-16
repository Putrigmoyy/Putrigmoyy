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
  dataSource: 'local-seed' | 'neon' | 'local-seed-fallback' | 'remote-json';
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

type RemoteOwnerCatalogVariant = {
  id?: string;
  title?: string;
  name?: string;
  duration?: string;
  price?: number;
  stock?: number;
  badge?: string | null;
};

type RemoteOwnerCatalogProduct = {
  id?: string;
  title?: string;
  name?: string;
  subtitle?: string;
  imageUrl?: string;
  image_url?: string;
  category?: string;
  stock?: number;
  sold?: number;
  rating?: string;
  delivery?: string;
  accent?: ApkPremiumProduct['accent'];
  note?: string;
  guarantee?: string;
  variants?: RemoteOwnerCatalogVariant[];
};

function mapRemoteCatalogProduct(raw: RemoteOwnerCatalogProduct, index: number): ApkPremiumProduct {
  const variants = Array.isArray(raw.variants)
    ? raw.variants.map((variant, variantIndex) => ({
        id: String(variant.id || `variant-${index + 1}-${variantIndex + 1}`),
        title: String(variant.title || variant.name || `Varian ${variantIndex + 1}`),
        duration: String(variant.duration || '').trim() || 'Sesuai deskripsi',
        price: Number(variant.price || 0),
        stock: Number(variant.stock || 0),
        badge: variant.badge ? String(variant.badge) : undefined,
      }))
    : [];

  return {
    id: String(raw.id || `product-${index + 1}`),
    title: String(raw.title || raw.name || `Produk ${index + 1}`),
    subtitle: String(raw.subtitle || '').trim() || 'Aplikasi premium siap order cepat.',
    imageUrl: String(raw.imageUrl || raw.image_url || '').trim() || undefined,
    category: String(raw.category || '').trim() || 'App Premium',
    stock: Number(raw.stock || 0),
    sold: Number(raw.sold || 0),
    rating: String(raw.rating || '').trim() || '4.9/5',
    delivery: String(raw.delivery || '').trim() || 'Auto kirim akun',
    accent: ['cyan', 'amber', 'emerald', 'violet'].includes(String(raw.accent || ''))
      ? (raw.accent as ApkPremiumProduct['accent'])
      : (['cyan', 'amber', 'emerald', 'violet'][index % 4] as ApkPremiumProduct['accent']),
    note: String(raw.note || '').trim() || 'Detail produk mengikuti varian yang dipilih.',
    guarantee: String(raw.guarantee || '').trim() || 'Garansi mengikuti ketentuan toko dan durasi varian.',
    variants,
  };
}

async function getApkPremiumCatalogFromRemote(remoteCatalogUrl: string): Promise<ApkPremiumCatalogPayload> {
  const response = await fetch(remoteCatalogUrl, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Gagal mengambil katalog Apprem dari owner bridge.');
  }

  const rawPayload = (await response.json()) as unknown;
  const catalogSource =
    rawPayload &&
    typeof rawPayload === 'object' &&
    'catalog' in rawPayload &&
    rawPayload.catalog &&
    typeof rawPayload.catalog === 'object'
      ? rawPayload.catalog
      : rawPayload;

  const catalog = (catalogSource && typeof catalogSource === 'object' ? catalogSource : {}) as {
    updatedAt?: string;
    categories?: string[];
    products?: RemoteOwnerCatalogProduct[];
  };
  const products = sortProducts(
    (Array.isArray(catalog.products) ? catalog.products : []).map((product, index) =>
      mapRemoteCatalogProduct(product, index),
    ),
  );
  const categories = Array.from(
    new Set(
      (catalog.categories && catalog.categories.length > 0
        ? catalog.categories
        : products.map((product) => product.category)
      ).filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, 'id'));

  return {
    dataSource: 'remote-json',
    syncReady: true,
    updatedAt: String(catalog.updatedAt || new Date().toISOString()),
    categories,
    summary: buildSummary(products),
    products,
  };
}

type ApkProductRow = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string | null;
  category: string;
  stock: number | string | null;
  sold: number | string | null;
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
  stock: number | string | null;
  badge: string | null;
};

async function getApkPremiumCatalogFromNeon(): Promise<ApkPremiumCatalogPayload> {
  const sql = getNeonClient('apk');
  const productRows = (await sql`
    select
      product.id,
      product.title,
      product.subtitle,
      product.image_url,
      product.category,
      count(account.id) filter (
        where account.delivery_status = 'available'
          and coalesce(account.assigned_order_code, '') = ''
      ) as stock,
      count(account.id) filter (where account.delivery_status = 'delivered') as sold,
      product.rating,
      product.delivery,
      product.accent,
      product.note,
      product.guarantee
    from apk_products product
    left join apk_product_variants variant
      on variant.product_id = product.id
      and variant.is_active = true
    left join apk_variant_accounts account
      on account.variant_id = variant.id
    where product.is_active = true
    group by
      product.id,
      product.title,
      product.subtitle,
      product.image_url,
      product.category,
      product.rating,
      product.delivery,
      product.accent,
      product.note,
      product.guarantee,
      product.sort_order
    order by product.sort_order asc, product.title asc
  `) as ApkProductRow[];

  const variantRows = (await sql`
    select
      variant.id,
      variant.product_id,
      variant.title,
      variant.duration,
      variant.price,
      count(account.id) filter (
        where account.delivery_status = 'available'
          and coalesce(account.assigned_order_code, '') = ''
      ) as stock,
      variant.badge
    from apk_product_variants variant
    left join apk_variant_accounts account
      on account.variant_id = variant.id
    where variant.is_active = true
    group by
      variant.id,
      variant.product_id,
      variant.title,
      variant.duration,
      variant.price,
      variant.badge,
      variant.sort_order
    order by variant.sort_order asc, variant.title asc
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
    imageUrl: String(row.image_url || '').trim() || undefined,
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
  if (config.apk.mode === 'remote-json' && config.apk.remoteCatalogUrl) {
    try {
      return await getApkPremiumCatalogFromRemote(config.apk.remoteCatalogUrl);
    } catch {
      return createSeedCatalog('local-seed-fallback');
    }
  }

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
