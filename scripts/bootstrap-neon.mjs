import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const apkSeed = [
  {
    id: 'canva',
    title: 'Canva Pro',
    subtitle: 'Desain premium untuk creator dan seller',
    category: 'Produktivitas',
    stock: 37,
    sold: 214,
    rating: '4.9/5',
    delivery: 'Auto kirim akun',
    accent: 'cyan',
    note: 'Cocok untuk desain feed, story, katalog jualan, dan kebutuhan branding cepat dari HP.',
    guarantee: 'Garansi aktif sesuai masa paket dan aturan toko.',
    variants: [
      { id: 'canva-month', title: 'Canva Member', duration: '1 Bulan', price: 7000, stock: 15, badge: 'BEST' },
      { id: 'canva-team', title: 'Canva Team Slot', duration: '30 Hari', price: 12000, stock: 12, badge: null },
      { id: 'canva-year', title: 'Canva Private', duration: '1 Tahun', price: 54000, stock: 10, badge: 'PREMIUM' },
    ],
  },
  {
    id: 'netflix',
    title: 'Netflix',
    subtitle: 'Streaming film dan series lebih hemat',
    category: 'Streaming',
    stock: 29,
    sold: 188,
    rating: '4.8/5',
    delivery: 'Auto kirim akun',
    accent: 'amber',
    note: 'Pilihan untuk pelanggan yang ingin akun sharing atau private dengan proses cepat.',
    guarantee: 'Garansi sesuai catatan produk dan penggantian mengikuti stok tersedia.',
    variants: [
      { id: 'netflix-sharing', title: 'Netflix Sharing', duration: '1 Bulan', price: 18000, stock: 16, badge: 'HOT' },
      { id: 'netflix-private', title: 'Netflix Private', duration: '1 Bulan', price: 42000, stock: 8, badge: null },
      { id: 'netflix-family', title: 'Netflix Family', duration: '1 Bulan', price: 52000, stock: 5, badge: null },
    ],
  },
  {
    id: 'yt-premium',
    title: 'YouTube Premium',
    subtitle: 'Nonton tanpa iklan dan YouTube Music',
    category: 'Streaming',
    stock: 42,
    sold: 267,
    rating: '4.9/5',
    delivery: 'Auto invite / akun',
    accent: 'emerald',
    note: 'Pilihan paket family dan invite cocok untuk pelanggan yang suka proses cepat dan minim chat ulang.',
    guarantee: 'Garansi selama masa aktif paket sesuai deskripsi varian.',
    variants: [
      { id: 'yt-invite', title: 'YT Premium Invite', duration: '1 Bulan', price: 6000, stock: 18, badge: 'FAST' },
      { id: 'yt-family', title: 'YT Premium Family', duration: '2 Bulan', price: 13000, stock: 14, badge: null },
      { id: 'yt-private', title: 'YT Premium Private', duration: '1 Bulan', price: 35000, stock: 10, badge: null },
    ],
  },
  {
    id: 'capcut',
    title: 'CapCut Pro',
    subtitle: 'Editing video premium untuk jualan dan konten',
    category: 'Editing',
    stock: 24,
    sold: 156,
    rating: '4.8/5',
    delivery: 'Auto kirim akun',
    accent: 'violet',
    note: 'Cocok untuk seller, editor mobile, dan kebutuhan template video cepat.',
    guarantee: 'Garansi mengikuti masa aktif dan stabilitas akun pengganti.',
    variants: [
      { id: 'capcut-month', title: 'CapCut Sharing', duration: '1 Bulan', price: 9000, stock: 11, badge: null },
      { id: 'capcut-private', title: 'CapCut Private', duration: '1 Bulan', price: 27000, stock: 7, badge: 'TOP' },
      { id: 'capcut-year', title: 'CapCut Private', duration: '1 Tahun', price: 99000, stock: 6, badge: null },
    ],
  },
  {
    id: 'spotify',
    title: 'Spotify Premium',
    subtitle: 'Musik premium untuk daily listener',
    category: 'Streaming',
    stock: 33,
    sold: 205,
    rating: '4.7/5',
    delivery: 'Auto invite',
    accent: 'emerald',
    note: 'Varian family dan duo disusun untuk kebutuhan personal maupun berdua.',
    guarantee: 'Garansi sesuai masa aktif paket dan syarat toko.',
    variants: [
      { id: 'spotify-invite', title: 'Spotify Invite', duration: '1 Bulan', price: 5000, stock: 16, badge: 'BEST' },
      { id: 'spotify-duo', title: 'Spotify Duo', duration: '1 Bulan', price: 9500, stock: 10, badge: null },
      { id: 'spotify-private', title: 'Spotify Private', duration: '1 Bulan', price: 22000, stock: 7, badge: null },
    ],
  },
  {
    id: 'chatgpt',
    title: 'ChatGPT Plus',
    subtitle: 'AI premium untuk kerja dan eksperimen',
    category: 'AI Tools',
    stock: 14,
    sold: 91,
    rating: '4.9/5',
    delivery: 'Manual assist + cepat',
    accent: 'cyan',
    note: 'Paket AI cocok untuk buyer yang ingin akun aktif untuk writing, coding, dan riset.',
    guarantee: 'Garansi sesuai masa aktif dan detail akses yang disepakati.',
    variants: [
      { id: 'chatgpt-slot', title: 'ChatGPT Sharing', duration: '1 Bulan', price: 39000, stock: 7, badge: null },
      { id: 'chatgpt-private', title: 'ChatGPT Private', duration: '1 Bulan', price: 149000, stock: 4, badge: 'LIMITED' },
      { id: 'chatgpt-team', title: 'ChatGPT Workspace', duration: '1 Bulan', price: 89000, stock: 3, badge: null },
    ],
  },
];

function createSqlClient(url, label) {
  if (!url) {
    throw new Error(`Environment variable untuk ${label} belum diisi.`);
  }
  return neon(url);
}

function readSqlFile(relativePath) {
  return readFileSync(join(projectRoot, relativePath), 'utf8');
}

function splitSqlStatements(sqlText) {
  return sqlText
    .split(/;\s*(?:\r?\n|$)/g)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function runSqlFile(client, relativePath) {
  const sqlText = readSqlFile(relativePath);
  const statements = splitSqlStatements(sqlText);
  for (const statement of statements) {
    await client.query(statement);
  }
}

async function seedApkProducts(client) {
  for (const [productIndex, product] of apkSeed.entries()) {
    await client.query(
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

    for (const [variantIndex, variant] of product.variants.entries()) {
      await client.query(
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
          variant.badge,
          variantIndex + 1,
        ],
      );
    }
  }
}

async function main() {
  const apkClient = createSqlClient(process.env.DATABASE_URL_APK, 'DATABASE_URL_APK');
  const smmClient = createSqlClient(process.env.DATABASE_URL_SMM, 'DATABASE_URL_SMM');
  const coreClient = createSqlClient(process.env.DATABASE_URL_CORE, 'DATABASE_URL_CORE');

  console.log('Menyiapkan schema APK...');
  await runSqlFile(apkClient, 'database/neon/apk-premium.sql');
  console.log('Schema APK selesai.');

  console.log('Menyiapkan schema SMM...');
  await runSqlFile(smmClient, 'database/neon/social-media.sql');
  console.log('Schema SMM selesai.');

  console.log('Menyiapkan schema CORE...');
  await runSqlFile(coreClient, 'database/neon/core.sql');
  console.log('Schema CORE selesai.');

  console.log('Mengisi seed awal katalog APK...');
  await seedApkProducts(apkClient);
  console.log(`Seed APK selesai. Total produk: ${apkSeed.length}, total varian: ${apkSeed.reduce((sum, product) => sum + product.variants.length, 0)}.`);

  console.log('Bootstrap Neon selesai.');
}

main().catch((error) => {
  console.error('Bootstrap gagal.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
