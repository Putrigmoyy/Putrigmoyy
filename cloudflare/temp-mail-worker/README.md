# Putri Temp Mail Worker

Bridge inbound email ini dipakai untuk meneruskan email mentah dari Cloudflare Email Workers ke endpoint temp mail privat yang sudah hidup di Vercel.

## Fungsi

- menerima email masuk di Cloudflare Email Routing
- membaca raw MIME email
- meneruskan email ke endpoint `TEMP_MAIL_INBOUND_URL`
- mengamankan request dengan header `x-inbound-secret`

## Prasyarat

- domain email dikelola dengan nameserver Cloudflare
- Email Routing Cloudflare sudah aktif
- website utama sudah hidup di Vercel
- env berikut sudah aktif di Vercel:
  - `TEMP_MAIL_INBOUND_SECRET`
  - `TEMP_MAIL_DOMAINS`
  - `TEMP_MAIL_DATABASE_URL`

## File penting

- `wrangler.jsonc`
- `.dev.vars.example`
- `src/index.js`

## Setup cepat

1. Masuk ke folder worker:

```bash
cd cloudflare/temp-mail-worker
```

2. Install dependency:

```bash
npm install
```

3. Isi secret worker dengan nilai yang sama seperti `TEMP_MAIL_INBOUND_SECRET` di Vercel:

```bash
npx wrangler secret put TEMP_MAIL_INBOUND_SECRET
```

4. Jika perlu, ubah nilai berikut di `wrangler.jsonc`:

- `TEMP_MAIL_INBOUND_URL`
- `TEMP_MAIL_ALLOWED_DOMAINS`
- `TEMP_MAIL_DEBUG`

5. Deploy worker:

```bash
npx wrangler deploy
```

## Routing email

Setelah worker terdeploy:

1. Buka Cloudflare Dashboard.
2. Aktifkan Email Routing untuk domain temp mail.
3. Buat alamat atau catch-all yang diarahkan ke Email Worker ini.
4. Pastikan domain yang dipakai sama dengan isi `TEMP_MAIL_ALLOWED_DOMAINS`.

Contoh domain temp mail aktif:

- `mail.putrigmoyy.com`

Contoh inbox yang nanti bisa dipakai:

- `putriabc123@mail.putrigmoyy.com`

## Alur request

1. Email dari luar masuk ke Cloudflare.
2. Cloudflare memanggil handler `email()` di worker.
3. Worker meneruskan raw MIME ke endpoint Vercel.
4. Endpoint Vercel mem-parse email dan menyimpannya ke database Neon.
5. Halaman privat temp mail langsung bisa membaca email tersebut.

## Catatan penting

- Jika endpoint Vercel sedang gagal, worker akan menolak email agar tidak diam-diam hilang.
- Worker hanya menerima domain yang terdaftar di `TEMP_MAIL_ALLOWED_DOMAINS`.
- Untuk local test, pakai simulasi Email Routing bawaan `wrangler dev`.
