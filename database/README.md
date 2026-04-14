# Neon split database plan

Website ini disiapkan untuk 2 database Neon terpisah supaya lebih hemat limit dan lebih gampang dikelola:

- `DATABASE_URL_APK`
  - khusus produk APK premium, varian, stock akun, dan order premium
- `DATABASE_URL_SMM`
  - khusus cache layanan social media dan order provider

Mode env yang dipakai:

- `APK_PREMIUM_DATA_SOURCE=seed|neon`
- `SMM_DATA_SOURCE=provider-live|neon`

Saran penggunaan awal:

1. Mulai dengan `APK_PREMIUM_DATA_SOURCE=seed`
2. Jalankan SQL `database/neon/apk-premium.sql` di project Neon APK
3. Isi `DATABASE_URL_APK`
4. Setelah tabel siap, ubah `APK_PREMIUM_DATA_SOURCE=neon`
5. Lakukan hal yang sama terpisah untuk SMM

Dengan pola ini storefront tetap hidup walau database belum siap penuh.
