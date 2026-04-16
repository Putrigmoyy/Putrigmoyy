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
  accent: ApkPremiumProduct['accent'];
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
  imageUrl?: string;
  image_url?: string;
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

function stripWrappedImageQuotes(value: string) {
  return String(value || '')
    .trim()
    .replace(/^[\s"'â€œâ€â€˜â€™]+|[\s"'â€œâ€â€˜â€™]+$/g, '');
}

function normalizeImageUrlInput(value: unknown) {
  const raw = String(value || '')
    .trim()
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '');

  if (!raw) {
    return '';
  }

  if (raw.startsWith('/')) {
    return raw;
  }

  try {
    return encodeURI(raw);
  } catch {
    return raw.replace(/\s+/g, '%20');
  }
}

function normalizePremiumImageUrl(value: unknown) {
  const raw = stripWrappedImageQuotes(String(value || ''));

  if (!raw) {
    return '';
  }

  if (raw.startsWith('data:image/') || raw.startsWith('/')) {
    return raw;
  }

  try {
    const url = new URL(raw);

    if (url.hostname.includes('drive.google.com')) {
      const driveIdFromPath = url.pathname.match(/\/file\/d\/([^/]+)/i)?.[1];
      const driveId = driveIdFromPath || url.searchParams.get('id') || '';
      if (driveId) {
        return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`;
      }
    }

    if (url.hostname.endsWith('dropbox.com')) {
      url.searchParams.delete('dl');
      url.searchParams.set('raw', '1');
      return url.toString();
    }

    if (url.hostname === 'github.com' && url.pathname.includes('/blob/')) {
      const rawPath = url.pathname.replace(/^\/+/, '').replace('/blob/', '/');
      return `https://raw.githubusercontent.com/${rawPath}`;
    }

    return encodeURI(url.toString());
  } catch {
    return normalizeImageUrlInput(raw);
  }
}

function normalizeAccent(value: unknown, index: number) {
  const source = String(value || '').trim();
  if (source === 'cyan' || source === 'amber' || source === 'emerald' || source === 'violet') {
    return source;
  }
  return ['cyan', 'amber', 'emerald', 'violet'][index % 4];
}

function slugifyIdentifier(value: string, fallback: string) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return normalized || fallback;
}

async function syncProductStock(productId: string) {
  const sql = getNeonClient('apk');
  await sql`
    update apk_products product
    set
      stock = coalesce((
        select count(account.id)
        from apk_variant_accounts account
        inner join apk_product_variants variant
          on variant.id = account.variant_id
        where variant.product_id = product.id
          and variant.is_active = true
          and account.delivery_status = 'available'
          and coalesce(account.assigned_order_code, '') = ''
      ), 0),
      sold = coalesce((
        select count(account.id)
        from apk_variant_accounts account
        inner join apk_product_variants variant
          on variant.id = account.variant_id
        where variant.product_id = product.id
          and variant.is_active = true
          and account.delivery_status = 'delivered'
      ), 0),
      updated_at = now()
    where product.id = ${productId}
  `;
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
        imageUrl: cleanText(product.imageUrl || product.image_url),
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
    imageUrl: string;
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
      image_url text not null default '',
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
  await sql`
    create table if not exists apk_variant_accounts (
      id bigserial primary key,
      variant_id text not null references apk_product_variants(id) on delete cascade,
      account_data text not null default '',
      admin_note text not null default '',
      delivery_status text not null default 'available',
      assigned_order_code text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`alter table apk_products add column if not exists image_url text not null default ''`;
  await sql`create index if not exists apk_variant_accounts_variant_idx on apk_variant_accounts(variant_id)`;
  await sql`create index if not exists apk_variant_accounts_order_idx on apk_variant_accounts(assigned_order_code)`;
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
      count(account.id) filter (
        where account.delivery_status = 'available'
          and coalesce(account.assigned_order_code, '') = ''
      ) as stock,
      count(account.id) filter (
        where account.delivery_status = 'available'
          and coalesce(account.assigned_order_code, '') = ''
      ) as available_account_count,
      coalesce(variant.badge, '') as badge,
      product.updated_at as product_updated_at
    from apk_product_variants variant
    inner join apk_products product
      on product.id = variant.product_id
    left join apk_variant_accounts account
      on account.variant_id = variant.id
    where product.is_active = true
      and variant.is_active = true
    group by
      variant.id,
      product.id,
      product.title,
      product.category,
      variant.title,
      variant.duration,
      variant.price,
      variant.badge,
      product.updated_at
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
    available_account_count: number | string | null;
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
    availableAccountCount: Math.max(0, Number(row.available_account_count || 0)),
    badge: String(row.badge || ''),
    productUpdatedAt: row.product_updated_at,
  }));
}

export async function listAdminApkProducts() {
  await ensureApkAdminTables();
  const sql = getNeonClient('apk');
  const rows = (await sql`
    select
      product.id,
      product.title,
      product.subtitle,
      product.category,
      product.delivery,
      product.note,
      product.guarantee,
      product.image_url,
      count(account.id) filter (
        where account.delivery_status = 'available'
          and coalesce(account.assigned_order_code, '') = ''
      ) as stock,
      count(account.id) filter (where account.delivery_status = 'delivered') as sold,
      product.accent
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
      product.category,
      product.delivery,
      product.note,
      product.guarantee,
      product.image_url,
      product.accent,
      product.sort_order
    order by product.sort_order asc, product.title asc
  `) as Array<{
    id: string;
    title: string;
    subtitle: string;
    category: string;
    delivery: string;
    note: string;
    guarantee: string;
    image_url: string | null;
    stock: number | null;
    sold: number | null;
    accent: string | null;
  }>;

  return rows.map((row): AdminApkProductRow => ({
    productId: row.id,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    delivery: row.delivery,
    note: row.note,
    guarantee: row.guarantee,
    imageUrl: String(row.image_url || ''),
    stock: Math.max(0, Number(row.stock || 0)),
    sold: Math.max(0, Number(row.sold || 0)),
    accent: ['cyan', 'amber', 'emerald', 'violet'].includes(String(row.accent || ''))
      ? (row.accent as ApkPremiumProduct['accent'])
      : 'cyan',
  }));
}

export async function listAdminApkAccountsByVariant(variantId: string) {
  await ensureApkAdminTables();
  const normalizedVariantId = cleanText(variantId);
  if (!normalizedVariantId) {
    return [] as AdminApkAccountRow[];
  }

  const sql = getNeonClient('apk');
  const rows = (await sql`
    select
      id,
      variant_id,
      account_data,
      admin_note,
      delivery_status,
      assigned_order_code,
      created_at
    from apk_variant_accounts
    where variant_id = ${normalizedVariantId}
    order by created_at desc, id desc
    limit 60
  `) as Array<{
    id: number;
    variant_id: string;
    account_data: string;
    admin_note: string;
    delivery_status: string;
    assigned_order_code: string | null;
    created_at: string;
  }>;

  return rows.map((row): AdminApkAccountRow => ({
    id: Number(row.id),
    variantId: row.variant_id,
    accountData: row.account_data,
    adminNote: row.admin_note,
    deliveryStatus:
      row.delivery_status === 'delivered' ? 'delivered' : row.delivery_status === 'reserved' ? 'reserved' : 'available',
    assignedOrderCode: String(row.assigned_order_code || ''),
    createdAt: row.created_at,
  }));
}

export async function createAdminApkProduct(input: {
  title: string;
  subtitle?: string;
  category?: string;
  delivery?: string;
  note?: string;
  guarantee?: string;
  imageUrl?: string;
}) {
  await ensureApkAdminTables();

  const title = cleanText(input.title);
  if (!title) {
    throw new Error('Nama produk wajib diisi.');
  }

  const sql = getNeonClient('apk');
  const productIdBase = slugifyIdentifier(title, `produk-${Date.now()}`);
  const existingRows = (await sql`
    select id
    from apk_products
    where id like ${`${productIdBase}%`}
  `) as Array<{ id: string }>;
  const productId = existingRows.some((row) => row.id === productIdBase)
    ? `${productIdBase}-${existingRows.length + 1}`
    : productIdBase;
  const sortRows = (await sql`select coalesce(max(sort_order), 0) as max_sort from apk_products`) as Array<{ max_sort?: number | null }>;
  const nextSort = Math.max(0, Number(sortRows[0]?.max_sort || 0)) + 1;

  await sql`
    insert into apk_products (
      id,
      title,
      subtitle,
      image_url,
      category,
      stock,
      sold,
      rating,
      delivery,
      accent,
      note,
      guarantee,
      sort_order,
      is_active
    ) values (
      ${productId},
      ${title},
      ${cleanText(input.subtitle, 'Aplikasi premium siap order cepat.')},
      ${normalizePremiumImageUrl(input.imageUrl)},
      ${cleanText(input.category, 'App Premium')},
      ${0},
      ${0},
      ${'4.9/5'},
      ${cleanText(input.delivery, 'Auto kirim akun')},
      ${normalizeAccent('', nextSort)},
      ${cleanText(input.note, 'Detail produk mengikuti varian yang dipilih.')},
      ${cleanText(input.guarantee, 'Garansi mengikuti ketentuan toko dan durasi varian.')},
      ${nextSort},
      ${true}
    )
  `;

  const products = await listAdminApkProducts();
  return products.find((product) => product.productId === productId) || null;
}

export async function adminUpdateApkProduct(input: {
  productId: string;
  title?: string;
  subtitle?: string;
  category?: string;
  delivery?: string;
  note?: string;
  guarantee?: string;
  imageUrl?: string;
}) {
  await ensureApkAdminTables();
  const productId = cleanText(input.productId);
  if (!productId) {
    throw new Error('Produk wajib dipilih.');
  }

  const sql = getNeonClient('apk');
  const rows = (await sql`
    select
      id,
      title,
      subtitle,
      category,
      delivery,
      note,
      guarantee,
      image_url
    from apk_products
    where id = ${productId}
      and is_active = true
    limit 1
  `) as Array<{
    id: string;
    title: string;
    subtitle: string;
    category: string;
    delivery: string;
    note: string;
    guarantee: string;
    image_url: string | null;
  }>;
  const current = rows[0];
  if (!current) {
    throw new Error('Produk App Premium tidak ditemukan.');
  }

  await sql`
    update apk_products
    set
      title = ${cleanText(input.title, current.title)},
      subtitle = ${cleanText(input.subtitle, current.subtitle || 'Aplikasi premium siap order cepat.')},
      category = ${cleanText(input.category, current.category || 'App Premium')},
      delivery = ${cleanText(input.delivery, current.delivery || 'Auto kirim akun')},
      note = ${cleanText(input.note, current.note || 'Detail produk mengikuti varian yang dipilih.')},
      guarantee = ${cleanText(input.guarantee, current.guarantee || 'Garansi mengikuti ketentuan toko dan durasi varian.')},
      image_url = ${normalizePremiumImageUrl(input.imageUrl || current.image_url || '')},
      updated_at = now()
    where id = ${productId}
  `;

  const products = await listAdminApkProducts();
  return products.find((product) => product.productId === productId) || null;
}

export async function createAdminApkVariant(input: {
  productId: string;
  variantTitle: string;
  duration?: string;
  price?: number;
  badge?: string;
}) {
  await ensureApkAdminTables();
  const productId = cleanText(input.productId);
  const variantTitle = cleanText(input.variantTitle);
  if (!productId || !variantTitle) {
    throw new Error('Produk dan nama varian wajib diisi.');
  }

  const sql = getNeonClient('apk');
  const productRows = (await sql`
    select id
    from apk_products
    where id = ${productId}
      and is_active = true
    limit 1
  `) as Array<{ id: string }>;
  if (!productRows[0]) {
    throw new Error('Produk App Premium belum ditemukan.');
  }

  const variantIdBase = slugifyIdentifier(`${productId}-${variantTitle}`, `variant-${Date.now()}`);
  const existingRows = (await sql`
    select id
    from apk_product_variants
    where id like ${`${variantIdBase}%`}
  `) as Array<{ id: string }>;
  const variantId = existingRows.some((row) => row.id === variantIdBase)
    ? `${variantIdBase}-${existingRows.length + 1}`
    : variantIdBase;
  const sortRows = (await sql`
    select coalesce(max(sort_order), 0) as max_sort
    from apk_product_variants
    where product_id = ${productId}
  `) as Array<{ max_sort?: number | null }>;
  const nextSort = Math.max(0, Number(sortRows[0]?.max_sort || 0)) + 1;

  await sql`
    insert into apk_product_variants (
      id,
      product_id,
      title,
      duration,
      price,
      stock,
      badge,
      sort_order,
      is_active
    ) values (
      ${variantId},
      ${productId},
      ${variantTitle},
      ${cleanText(input.duration, 'Sesuai deskripsi')},
      ${Math.max(0, Number(input.price || 0))},
      ${0},
      ${cleanText(input.badge) || null},
      ${nextSort},
      ${true}
    )
  `;

  await syncProductStock(productId);
  const variants = await listAdminApkVariants();
  return variants.find((variant) => variant.variantId === variantId) || null;
}

export async function addAdminApkVariantAccounts(input: {
  variantId: string;
  entries: string[];
  adminNote?: string;
}) {
  await ensureApkAdminTables();
  const variantId = cleanText(input.variantId);
  const entries = (Array.isArray(input.entries) ? input.entries : [])
    .map((entry) => cleanText(entry))
    .filter(Boolean);
  const adminNote = cleanText(input.adminNote);

  if (!variantId) {
    throw new Error('Variant wajib dipilih.');
  }
  if (!entries.length) {
    throw new Error('Data akun belum diisi.');
  }

  const sql = getNeonClient('apk');
  const variantRows = (await sql`
    select id, product_id
    from apk_product_variants
    where id = ${variantId}
      and is_active = true
    limit 1
  `) as Array<{
    id: string;
    product_id: string;
  }>;
  const variant = variantRows[0];
  if (!variant) {
    throw new Error('Variant App Premium tidak ditemukan.');
  }

  for (const entry of entries) {
    await sql`
      insert into apk_variant_accounts (
        variant_id,
        account_data,
        admin_note,
        delivery_status,
        assigned_order_code,
        updated_at
      ) values (
        ${variantId},
        ${entry},
        ${adminNote},
        ${'available'},
        ${''},
        now()
      )
    `;
  }

  await syncProductStock(variant.product_id);

  return {
    added: entries.length,
    accounts: await listAdminApkAccountsByVariant(variantId),
    variant: (await listAdminApkVariants()).find((item) => item.variantId === variantId) || null,
  };
}

export async function adminUpdateApkAccount(input: {
  accountId: number;
  accountData?: string;
  adminNote?: string;
  variantId?: string;
}) {
  await ensureApkAdminTables();
  const accountId = Math.trunc(Number(input.accountId || 0));
  if (accountId <= 0) {
    throw new Error('Data akun wajib dipilih.');
  }

  const sql = getNeonClient('apk');
  const currentRows = (await sql`
    select
      account.id,
      account.variant_id,
      account.account_data,
      account.admin_note,
      account.delivery_status,
      variant.product_id
    from apk_variant_accounts account
    inner join apk_product_variants variant
      on variant.id = account.variant_id
    where account.id = ${accountId}
    limit 1
  `) as Array<{
    id: number;
    variant_id: string;
    account_data: string;
    admin_note: string;
    delivery_status: string;
    product_id: string;
  }>;
  const current = currentRows[0];
  if (!current) {
    throw new Error('Data akun premium tidak ditemukan.');
  }

  const nextVariantId = cleanText(input.variantId, current.variant_id);
  const nextAccountData = cleanText(input.accountData, current.account_data);
  const nextAdminNote = cleanText(input.adminNote, current.admin_note);

  if (!nextAccountData) {
    throw new Error('Isi data akun tidak boleh kosong.');
  }

  let nextProductId = current.product_id;
  if (nextVariantId !== current.variant_id) {
    if (current.delivery_status !== 'available') {
      throw new Error('Data akun yang sudah reserved atau delivered tidak bisa dipindahkan varian.');
    }

    const variantRows = (await sql`
      select id, product_id
      from apk_product_variants
      where id = ${nextVariantId}
        and is_active = true
      limit 1
    `) as Array<{
      id: string;
      product_id: string;
    }>;
    const targetVariant = variantRows[0];
    if (!targetVariant) {
      throw new Error('Varian tujuan tidak ditemukan.');
    }
    nextProductId = targetVariant.product_id;
  }

  await sql`
    update apk_variant_accounts
    set
      variant_id = ${nextVariantId},
      account_data = ${nextAccountData},
      admin_note = ${nextAdminNote},
      updated_at = now()
    where id = ${accountId}
  `;

  await syncProductStock(current.product_id);
  if (nextProductId !== current.product_id) {
    await syncProductStock(nextProductId);
  }

  const accounts = await listAdminApkAccountsByVariant(nextVariantId);
  return accounts.find((account) => account.id === accountId) || null;
}

export async function adminDeleteApkAccount(input: { accountId: number }) {
  await ensureApkAdminTables();
  const accountId = Math.trunc(Number(input.accountId || 0));
  if (accountId <= 0) {
    throw new Error('Data akun wajib dipilih.');
  }

  const sql = getNeonClient('apk');
  const rows = (await sql`
    select
      account.id,
      account.variant_id,
      account.delivery_status,
      variant.product_id
    from apk_variant_accounts account
    inner join apk_product_variants variant
      on variant.id = account.variant_id
    where account.id = ${accountId}
    limit 1
  `) as Array<{
    id: number;
    variant_id: string;
    delivery_status: string;
    product_id: string;
  }>;
  const current = rows[0];
  if (!current) {
    throw new Error('Data akun premium tidak ditemukan.');
  }

  if (current.delivery_status !== 'available') {
    throw new Error('Data akun yang sudah reserved atau delivered tidak bisa dihapus.');
  }

  await sql`
    delete from apk_variant_accounts
    where id = ${accountId}
  `;
  await syncProductStock(current.product_id);

  return {
    deletedId: accountId,
    variantId: current.variant_id,
  };
}

export async function getDeliveredApkAccounts(orderCode: string) {
  await ensureApkAdminTables();
  const normalizedOrderCode = cleanText(orderCode);
  if (!normalizedOrderCode) {
    return [] as AdminApkAccountRow[];
  }

  const sql = getNeonClient('apk');
  const rows = (await sql`
    select
      id,
      variant_id,
      account_data,
      admin_note,
      delivery_status,
      assigned_order_code,
      created_at
    from apk_variant_accounts
    where assigned_order_code = ${normalizedOrderCode}
    order by id asc
  `) as Array<{
    id: number;
    variant_id: string;
    account_data: string;
    admin_note: string;
    delivery_status: string;
    assigned_order_code: string;
    created_at: string;
  }>;

  return rows.map((row): AdminApkAccountRow => ({
    id: Number(row.id),
    variantId: row.variant_id,
    accountData: row.account_data,
    adminNote: row.admin_note,
    deliveryStatus:
      row.delivery_status === 'delivered' ? 'delivered' : row.delivery_status === 'reserved' ? 'reserved' : 'available',
    assignedOrderCode: row.assigned_order_code,
    createdAt: row.created_at,
  }));
}

export async function assignApkAccountsToOrder(input: { orderCode: string; variantId: string; quantity: number }) {
  await ensureApkAdminTables();
  const orderCode = cleanText(input.orderCode);
  const variantId = cleanText(input.variantId);
  const quantity = Math.max(0, Math.trunc(Number(input.quantity || 0)));
  if (!orderCode || !variantId || quantity <= 0) {
    return [] as AdminApkAccountRow[];
  }

  const existing = await getDeliveredApkAccounts(orderCode);
  if (existing.length >= quantity) {
    return existing;
  }

  const sql = getNeonClient('apk');
  let needed = quantity - existing.length;
  if (needed > 0) {
    const reservedRows = (await sql`
      select id
      from apk_variant_accounts
      where variant_id = ${variantId}
        and delivery_status = 'reserved'
        and assigned_order_code = ${orderCode}
      order by id asc
      limit ${needed}
    `) as Array<{ id: number }>;

    if (reservedRows.length) {
      const ids = reservedRows.map((row) => Number(row.id));
      await sql`
        update apk_variant_accounts
        set
          delivery_status = 'delivered',
          updated_at = now()
        where id = any(${ids})
      `;
      needed -= ids.length;
    }
  }

  if (needed > 0) {
    const availableRows = (await sql`
      select id
      from apk_variant_accounts
      where variant_id = ${variantId}
        and delivery_status = 'available'
        and assigned_order_code = ''
      order by id asc
      limit ${needed}
    `) as Array<{ id: number }>;

    if (availableRows.length) {
      const ids = availableRows.map((row) => Number(row.id));
      await sql`
        update apk_variant_accounts
        set
          delivery_status = 'delivered',
          assigned_order_code = ${orderCode},
          updated_at = now()
        where id = any(${ids})
      `;
    }
  }

  return getDeliveredApkAccounts(orderCode);
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
          id, title, subtitle, image_url, category, stock, sold, rating, delivery, accent, note, guarantee, sort_order, is_active
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true
        )
        on conflict (id) do update set
          title = excluded.title,
          subtitle = excluded.subtitle,
          image_url = excluded.image_url,
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
        product.imageUrl,
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
