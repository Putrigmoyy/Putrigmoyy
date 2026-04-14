import Link from 'next/link';
import { getPusatPanelMeta } from '@/lib/pusatpanel';

const modeCards = [
  {
    title: 'Mode Social Media',
    description: 'Panel order jasa social media berbasis API PusatPanelSMM dengan katalog layanan, order, dan cek status.',
    href: '/social-media',
    badge: 'Mode Utama 1',
  },
  {
    title: 'Mode APK Premium',
    description: 'Store autoorder APK premium yang nanti tersambung real-time dengan stok private chat WhatsApp.',
    href: '/apk-premium',
    badge: 'Mode Utama 2',
  },
];

const shortcutCards = [
  {
    title: 'OTP Nomor',
    description: 'Quick launch ke website OTP yang sudah jadi, tinggal sambungkan link final.',
    href: process.env.NEXT_PUBLIC_OTP_URL || '#',
  },
  {
    title: 'Sewa Bot',
    description: 'Mode terpisah untuk calon penyewa bot dengan landing singkat, FAQ, dan form order.',
    href: process.env.NEXT_PUBLIC_BOT_RENTAL_URL || '#',
  },
];

const roadmapItems = [
  'Sinkron stok APK premium antara website dan private chat WhatsApp.',
  'Masuk notifikasi transaksi website ke aplikasi owner lalu diteruskan ke grup store.',
  'Order social media via PusatPanelSMM dengan status real-time.',
  'Sambungan Neon untuk produk, varian, order, pembayaran, dan riwayat akun.',
];

export default function HomePage() {
  const provider = getPusatPanelMeta();
  const quickLinks = {
    social: process.env.NEXT_PUBLIC_SOCIAL_MEDIA_URL || '#',
    premium: process.env.NEXT_PUBLIC_APK_PREMIUM_URL || '#',
    otp: process.env.NEXT_PUBLIC_OTP_URL || '#',
    rental: process.env.NEXT_PUBLIC_BOT_RENTAL_URL || '#',
  };

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">PUTRI GMOYY STORE</span>
          <h1>Website pusat untuk Social Media, APK Premium, OTP Nomor, dan Sewa Bot.</h1>
          <p>
            Fondasi web baru sudah dipisah dari aplikasi owner. Jadi kita bisa kembangkan website dengan aman,
            lalu sambungkan ke Vercel, Neon, Midtrans, dan bot WhatsApp tanpa mengganggu engine yang sudah stabil.
          </p>
          <div className="hero-actions">
            <Link className="primary-link" href="/social-media">Buka Mode Social Media</Link>
            <Link className="secondary-link" href="/apk-premium">Buka Mode APK Premium</Link>
          </div>
        </div>
        <div className="hero-panel">
          <div className="status-card">
            <span className="status-label">Provider Social Media</span>
            <strong>{provider.configured ? 'PusatPanelSMM siap dihubungkan' : 'API belum diisi'}</strong>
            <p>{provider.apiUrl}</p>
          </div>
          <div className="status-card">
            <span className="status-label">Integrasi berikutnya</span>
            <strong>Neon + Midtrans + sinkron stok WA</strong>
            <p>Kita tinggal sambungkan data pusat agar website dan private chat memakai stok yang sama.</p>
          </div>
        </div>
      </section>

      <section className="section-grid">
        <div className="section-header">
          <span className="eyebrow">MODE UTAMA</span>
          <h2>Dua alur utama sesuai rencana kamu</h2>
        </div>
        <div className="card-grid">
          {modeCards.map((item) => (
            <Link key={item.title} href={item.href} className="feature-card">
              <span className="badge">{item.badge}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-grid">
        <div className="section-header">
          <span className="eyebrow">SHORTCUT MODE</span>
          <h2>Slot cepat untuk website OTP dan sewa bot</h2>
        </div>
        <div className="card-grid">
          {shortcutCards.map((item) => (
            <a key={item.title} href={item.href} className="feature-card" target="_blank" rel="noreferrer">
              <span className="badge">Quick Access</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="split-layout">
        <div className="glass-panel">
          <span className="eyebrow">QUICK LINKS</span>
          <h2>Tautan publik yang nanti bisa kamu ganti dari aplikasi owner</h2>
          <ul className="link-list">
            <li><span>Social Media</span><code>{quickLinks.social}</code></li>
            <li><span>APK Premium</span><code>{quickLinks.premium}</code></li>
            <li><span>OTP Nomor</span><code>{quickLinks.otp}</code></li>
            <li><span>Sewa Bot</span><code>{quickLinks.rental}</code></li>
          </ul>
        </div>
        <div className="glass-panel">
          <span className="eyebrow">ROADMAP TERDEKAT</span>
          <h2>Arah build yang langsung nyambung ke aplikasi kamu</h2>
          <ul className="roadmap-list">
            {roadmapItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
