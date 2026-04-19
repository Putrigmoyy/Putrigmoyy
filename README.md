# Putri Gmoyy Web Store

Fondasi website baru untuk:

- Social Media order
- APK premium
- OTP nomor
- Sewa bot

Stack awal:

- Next.js App Router
- Siap untuk deploy ke Vercel
- Siap untuk database Neon
- Route API awal untuk proxy `pusatpanelsmm.com`
- Route temp mail privat siap dipasang di link rahasia

## Jalankan Lokal

```bash
npm install
npm run dev
```

## Environment

Salin `.env.example` menjadi `.env.local`, lalu isi:

- `PUSATPANELSMM_API_URL`
- `PUSATPANELSMM_API_KEY`
- `PUSATPANELSMM_SECRET_KEY`
- `DATABASE_URL`
- quick links website publik via `NEXT_PUBLIC_*`

## Temp Mail Privat

Temp mail dipasang sebagai route privat di project yang sama:

- Halaman privat: `/temp-mail/<TEMP_MAIL_PRIVATE_KEY>`
- Daftar inbox API: `/api/temp-mail/inboxes`
- Webhook inbound: `/api/temp-mail/inbound`
- Cleanup manual/cron: `/api/temp-mail/cron/cleanup`

Env yang perlu diisi:

- `TEMP_MAIL_PRIVATE_KEY`
- `TEMP_MAIL_DOMAINS`
- `TEMP_MAIL_INBOUND_SECRET`
- `CRON_SECRET` untuk cleanup otomatis
- `NEXT_PUBLIC_SITE_URL` untuk membentuk link privat penuh
- `TEMP_MAIL_DATABASE_URL` opsional. Jika kosong, temp mail akan memakai `DATABASE_URL_CORE`

Kalau mau bootstrap tabel secara manual, file SQL sudah disiapkan di:

- `database/neon/temp-mail.sql`

## Bridge Inbound Email

Backend temp mail sudah siap menerima raw MIME email di endpoint:

- `/api/temp-mail/inbound`

Paket bridge inbound untuk Cloudflare Email Workers sudah disiapkan di:

- `cloudflare/temp-mail-worker`

Catatan penting:

- Website tetap bisa dideploy di Vercel seperti sekarang.
- Agar email dari luar benar-benar bisa masuk, domain email perlu diproses oleh layanan inbound email.
- Paket yang saya siapkan memakai Cloudflare Email Workers, jadi domain email harus dikelola lewat nameserver Cloudflare agar Email Routing bisa aktif.

Alur yang direkomendasikan:

1. Biarkan website utama tetap berjalan di Vercel.
2. Arahkan domain yang dipakai untuk temp mail ke Cloudflare DNS / Email Routing.
3. Deploy worker di folder `cloudflare/temp-mail-worker`.
4. Worker akan meneruskan raw email ke `https://putrigmoyy.vercel.app/api/temp-mail/inbound`.
5. Endpoint Vercel akan menyimpan email ke database temp mail yang sudah aktif.
