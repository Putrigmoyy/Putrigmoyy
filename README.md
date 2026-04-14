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
