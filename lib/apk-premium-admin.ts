import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getNeonClient } from '@/lib/neon-clients';
import type { ApkPremiumProduct } from '@/lib/apk-premium';
import { getApkPremiumCatalog } from '@/lib/apk-premium-store';

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

export async function importOwnerCatalogToApkNeon(catalog: OwnerCatalogPayload) {
  const config = getAppDataSourceConfig();
  if (!config.apk.databaseConfigured) {
    throw new Error('DATABASE_URL_APK belum diisi.');
  }

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
