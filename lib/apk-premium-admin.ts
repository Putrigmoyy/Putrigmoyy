import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getNeonClient } from '@/lib/neon-clients';
import type { ApkPremiumProduct } from '@/lib/apk-premium';
import { getApkPremiumCatalog } from '@/lib/apk-premium-store';

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

type OwnerCatalogVariant = {
  id?: string;
  title?: string;
  name?: string;
  duration?: string;
  price?: number;
  stock?: number;
  badge?: string | null;
};

type OwnerCatalogProduct = {
  id?: string;
  title?: string;
  name?: string;
  subtitle?: string;
  category?: string;
  stock?: number;
  sold?: number;
  rating?: string;
  delivery?: string;
  accent?: ApkPremiumProduct['accent'] | string;
  note?: string;
  guarantee?: string;
  variants?: OwnerCatalogVariant[];
};

export type OwnerCatalogPayload = {
  updatedAt?: string;
  categories?: string[];
  products?: OwnerCatalogProduct[];
};

function cleanText(value: unknown, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function normalizeAccent(value: unknown, index: number) {
  const source = String(value || '').trim();
  if (source === 'cyan' || source === 'amber' || source === 'emerald' || source === 'violet') {
    return source;
  }
  return ['cyan', 'amber', 'emerald', 'violet'][index % 4];
}

function normalizeOwnerProducts(catalog: OwnerCatalogPayload) {
  const sourceProducts = Array.isArray(catalog.products) ? catalog.products : [];
  return sourceProducts
    .map((product, productIndex) => {
      const productId = cleanText(product.id);
      const productTitle = cleanText(product.title || product.name);
      if (!productId || !productTitle) {
        return null;
      }

      const variants = (Array.isArray(product.variants) ? product.variants : [])
        .map((variant) => {
          const variantId = cleanText(variant.id);
          const variantTitle = cleanText(variant.title || variant.name);
          if (!variantId || !variantTitle) {
            return null;
          }
          return {
            id: variantId,
            title: variantTitle,
            duration: cleanText(variant.duration, 'Sesuai deskripsi'),
            price: Math.max(0, Number(variant.price || 0)),
            stock: Math.max(0, Number(variant.stock || 0)),
            badge: cleanText(variant.badge || ''),
          };
        })
        .filter(Boolean) as Array<{
        id: string;
        title: string;
        duration: string;
        price: number;
        stock: number;
        badge: string;
      }>;

      const totalVariantStock = variants.reduce((sum, variant) => sum + variant.stock, 0);

      return {
        id: productId,
        title: productTitle,
        subtitle: cleanText(product.subtitle, 'Aplikasi premium siap order cepat.'),
        category: cleanText(product.category, 'App Premium'),
        stock: Math.max(0, Number(product.stock ?? totalVariantStock)),
        sold: Math.max(0, Number(product.sold || 0)),
        rating: cleanText(product.rating, '4.9/5'),
        delivery: cleanText(product.delivery, 'Auto kirim akun'),
        accent: normalizeAccent(product.accent, productIndex),
        note: cleanText(product.note, 'Detail produk mengikuti varian yang dipilih.'),
        guarantee: cleanText(product.guarantee, 'Garansi mengikuti ketentuan toko dan durasi varian.'),
        variants,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    title: string;
    subtitle: string;
    category: string;
    stock: number;
    sold: number;
    rating: string;
    delivery: string;
    accent: string;
    note: string;
    guarantee: string;
    variants: Array<{
      id: string;
      title: string;
      duration: string;
      price: number;
      stock: number;
      badge: string;
    }>;
  }>;
}

export async function ensureApkAdminTables() {
  const config = getAppDataSourceConfig();
  if (!config.apk.databaseConfigured) {
    throw new Error('DATABASE_URL_APK belum diisi.');
  }

  const sql = getNeonClient('apk');
  await sql`
    create table if not exists apk_products (
      id text primary key,
      title text not null default '',
      subtitle text not null default '',
      category text not null default 'App Premium',
      stock integer not null default 0,
      sold integer not null default 0,
      rating text not null default '4.9/5',
      delivery text not null default 'Auto kirim akun',
      accent text not null default 'cyan',
      note text not null default '',
      guarantee text not null default '',
      sort_order integer not null default 0,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists apk_product_variants (
      id text primary key,
      product_id text not null references apk_products(id) on delete cascade,
      title text not null default '',
      duration text not null default '',
      price integer not null default 0,
      stock integer not null default 0,
      badge text,
      sort_order integer not null default 0,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists apk_product_variants_product_idx on apk_product_variants(product_id)`;
}

export async function listAdminApkVariants() {
  await ensureApkAdminTables();
  const sql = getNeonClient('apk');
  const rows = (await sql`
    select
      variant.id as variant_id,
      product.id as product_id,
      product.title as product_title,
      product.category as category,
      variant.title as variant_title,
      variant.duration as duration,
      variant.price as price,
      variant.stock as stock,
      coalesce(variant.badge, '') as badge,
      product.updated_at as product_updated_at
    from apk_product_variants variant
    inner join apk_products product
      on product.id = variant.product_id
    where product.is_active = true
      and variant.is_active = true
    order by product.sort_order asc, product.title asc, variant.sort_order asc, variant.title asc
  `) as Array<{
    variant_id: string;
    product_id: string;
    product_title: string;
    category: string;
    variant_title: string;
    duration: string;
    price: number | null;
    stock: number | null;
    badge: string | null;
    product_updated_at: string;
  }>;

  return rows.map((row): AdminApkVariantRow => ({
    variantId: row.variant_id,
    productId: row.product_id,
    productTitle: row.product_title,
    category: row.category,
    variantTitle: row.variant_title,
    duration: row.duration,
    price: Math.max(0, Number(row.price || 0)),
    stock: Math.max(0, Number(row.stock || 0)),
    badge: String(row.badge || ''),
    productUpdatedAt: row.product_updated_at,
  }));
}

export async function adminUpdateApkVariant(input: {
  variantId: string;
  variantTitle?: string;
  duration?: string;
  price?: number;
  stockDelta?: number;
  badge?: string;
}) {
  await ensureApkAdminTables();
  const variantId = cleanText(input.variantId);
  if (!variantId) {
    throw new Error('Variant wajib dipilih.');
  }

  const sql = getNeonClient('apk');
  const currentRows = (await sql`
    select
      id,
      product_id,
      title,
      duration,
      price,
      stock,
      badge
    from apk_product_variants
    where id = ${variantId}
    limit 1
  `) as Array<{
    id: string;
    product_id: string;
    title: string;
    duration: string;
    price: number | null;
    stock: number | null;
    badge: string | null;
  }>;

  const current = currentRows[0];
  if (!current) {
    throw new Error('Variant App Premium tidak ditemukan.');
  }

  const nextTitle = cleanText(input.variantTitle, current.title);
  const nextDuration = cleanText(input.duration, current.duration || 'Sesuai deskripsi');
  const nextPrice = Math.max(0, Number(input.price ?? current.price ?? 0));
  const stockDelta = Math.trunc(Number(input.stockDelta || 0));
  const nextStock = Math.max(0, Number(current.stock || 0) + stockDelta);
  const nextBadge = cleanText(input.badge, current.badge || '');

  await sql`
    update apk_product_variants
    set
      title = ${nextTitle},
      duration = ${nextDuration},
      price = ${nextPrice},
      stock = ${nextStock},
      badge = ${nextBadge || null},
      updated_at = now()
    where id = ${variantId}
  `;

  await sql`
    update apk_products product
    set
      stock = coalesce((
        select sum(variant.stock)
        from apk_product_variants variant
        where variant.product_id = product.id
          and variant.is_active = true
      ), 0),
      updated_at = now()
    where product.id = ${current.product_id}
  `;

  const variants = await listAdminApkVariants();
  return variants.find((variant) => variant.variantId === variantId) || null;
}

export async function importOwnerCatalogToApkNeon(catalog: OwnerCatalogPayload) {
  const config = getAppDataSourceConfig();
  if (!config.apk.databaseConfigured) {
    throw new Error('DATABASE_URL_APK belum diisi.');
  }

  await ensureApkAdminTables();

  const products = normalizeOwnerProducts(catalog);
  if (products.length === 0) {
    throw new Error('Katalog owner kosong atau tidak valid.');
  }

  const sql = getNeonClient('apk');
  const productIds = products.map((product) => product.id);

  await sql.query('update apk_products set is_active = false, updated_at = now() where not (id = any($1::text[]))', [productIds]);

  for (const [productIndex, product] of products.entries()) {
    await sql.query(
      `
        insert into apk_products (
          id, title, subtitle, category, stock, sold, rating, delivery, accent, note, guarantee, sort_order, is_active
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true
        )
        on conflict (id) do update set
          title = excluded.title,
          subtitle = excluded.subtitle,
          category = excluded.category,
          stock = excluded.stock,
          sold = excluded.sold,
          rating = excluded.rating,
          delivery = excluded.delivery,
          accent = excluded.accent,
          note = excluded.note,
          guarantee = excluded.guarantee,
          sort_order = excluded.sort_order,
          is_active = true,
          updated_at = now()
      `,
      [
        product.id,
        product.title,
        product.subtitle,
        product.category,
        product.stock,
        product.sold,
        product.rating,
        product.delivery,
        product.accent,
        product.note,
        product.guarantee,
        productIndex + 1,
      ],
    );

    const variantIds = product.variants.map((variant) => variant.id);
    if (variantIds.length > 0) {
      await sql.query(
        'update apk_product_variants set is_active = false, updated_at = now() where product_id = $1 and not (id = any($2::text[]))',
        [product.id, variantIds],
      );
    } else {
      await sql.query('update apk_product_variants set is_active = false, updated_at = now() where product_id = $1', [product.id]);
    }

    for (const [variantIndex, variant] of product.variants.entries()) {
      await sql.query(
        `
          insert into apk_product_variants (
            id, product_id, title, duration, price, stock, badge, sort_order, is_active
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, true
          )
          on conflict (id) do update set
            product_id = excluded.product_id,
            title = excluded.title,
            duration = excluded.duration,
            price = excluded.price,
            stock = excluded.stock,
            badge = excluded.badge,
            sort_order = excluded.sort_order,
            is_active = true,
            updated_at = now()
        `,
        [
          variant.id,
          product.id,
          variant.title,
          variant.duration,
          variant.price,
          variant.stock,
          variant.badge || null,
          variantIndex + 1,
        ],
      );
    }
  }

  return getApkPremiumCatalog();
}
