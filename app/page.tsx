import Link from 'next/link';

const heroSlides = [
  {
    eyebrow: 'SOCIAL MEDIA PANEL',
    title: 'Top up cepat, order rapi, dan dashboard serasa marketplace besar.',
    description: 'Gabungkan layanan social media, APK premium, OTP nomor, dan sewa bot dalam satu rumah besar yang enak dibuka dari HP.',
    href: '/social-media',
    cta: 'Masuk Social Media',
    tone: 'cyan',
  },
  {
    eyebrow: 'APK PREMIUM STORE',
    title: 'Stok akun premium dan autoorder WhatsApp dibuat satu alur pusat.',
    description: 'Satu penjualan di website atau chat private langsung menurunkan stok yang sama, jadi lebih aman dan tidak bentrok.',
    href: '/apk-premium',
    cta: 'Masuk APK Premium',
    tone: 'amber',
  },
];

const shortcutModes = [
  {
    title: 'OTP Nomor',
    subtitle: 'Quick access',
    description: 'Buka website OTP kamu langsung dari jalur yang sama tanpa keluar dari ekosistem store utama.',
    href: process.env.NEXT_PUBLIC_OTP_URL || '#',
  },
  {
    title: 'Sewa Bot',
    subtitle: 'Quick access',
    description: 'Landing cepat untuk calon penyewa bot dengan alur order dan konsultasi yang terpisah.',
    href: process.env.NEXT_PUBLIC_BOT_RENTAL_URL || '#',
  },
  {
    title: 'APK Premium',
    subtitle: 'Mode utama',
    description: 'Store akun premium dengan stok pusat yang nanti disinkronkan ke aplikasi owner dan WhatsApp.',
    href: '/apk-premium',
  },
  {
    title: 'Social Media',
    subtitle: 'Mode utama',
    description: 'Panel order jasa social media berbasis provider dan siap dibungkus UI premium.',
    href: '/social-media',
  },
];

const productCategories = [
  {
    title: 'Top Up Game',
    description: 'Landing produk game dan voucher yang padat, cepat, dan cocok untuk layar mobile.',
    accent: 'cyan',
  },
  {
    title: 'APK Premium',
    description: 'Canva, Netflix, YT Premium, CapCut, dan produk akun digital lainnya.',
    accent: 'amber',
  },
  {
    title: 'Social Media',
    description: 'Followers, likes, views, comments, package, dan layanan custom lainnya.',
    accent: 'emerald',
  },
  {
    title: 'OTP & Verifikasi',
    description: 'Masuk sebagai mode tambahan agar pelanggan punya dua jalur belanja berbeda.',
    accent: 'violet',
  },
];

const trustItems = [
  {
    title: 'Transaksi cepat',
    description: 'Alur dibuat pendek, fokus mobile, dan tetap nyaman dibuka di koneksi biasa.',
  },
  {
    title: 'Mode ganda',
    description: 'Pelanggan bisa order lewat website atau private chat tanpa stok dobel.',
  },
  {
    title: 'Kontrol owner',
    description: 'Semua pengelolaan stok, varian, dan akun tetap berpusat di aplikasi owner kamu.',
  },
];

const spotlightCards = [
  {
    badge: 'HOT',
    title: 'Social Media Fast Panel',
    copy: 'Bangun etalase layanan dengan katalog, kategori, dan checkout yang rapat seperti marketplace top up modern.',
  },
  {
    badge: 'REALTIME',
    title: 'APK Premium Center',
    copy: 'Website dan private chat memakai data stok yang sama, jadi lebih aman saat traffic mulai ramai.',
  },
  {
    badge: 'EXPAND',
    title: 'OTP + Rental Bot',
    copy: 'Tambahkan mode bisnis lain dalam satu domain, bukan situs terpisah yang bikin user bingung.',
  },
];

const faqs = [
  {
    title: 'Apakah stok website dan WhatsApp nanti bisa sama?',
    answer: 'Bisa. Fondasinya memang diarahkan supaya website dan private autoorder membaca stok pusat yang sama.',
  },
  {
    title: 'Apakah social media memakai API provider?',
    answer: 'Iya. Jalur API PusatPanelSMM sudah saya siapkan di sisi website supaya bisa berkembang ke katalog, order, dan status.',
  },
  {
    title: 'Apakah OTP dan sewa bot tetap bisa terpisah?',
    answer: 'Bisa. Dua mode itu dibuat sebagai shortcut / landing mode tambahan tanpa merusak dua mode utama.',
  },
];

export default function HomePage() {
  return (
    <main className="market-shell">
      <div className="promo-strip">
        <div className="promo-track">
          <span>PUTRI GMOYY STORE</span>
          <span>WEBSITE PREMIUM DIGITAL PRODUCT</span>
          <span>SOCIAL MEDIA</span>
          <span>APK PREMIUM</span>
          <span>OTP NOMOR</span>
          <span>SEWA BOT</span>
        </div>
      </div>

      <header className="market-header">
        <div className="brand-block">
          <div className="brand-mark">PG</div>
          <div>
            <p className="brand-name">Putri Gmoyy</p>
            <p className="brand-subtitle">Digital Store Center</p>
          </div>
        </div>
        <nav className="header-nav">
          <Link href="/social-media">Social Media</Link>
          <Link href="/apk-premium">APK Premium</Link>
          <a href={process.env.NEXT_PUBLIC_OTP_URL || '#'} target="_blank" rel="noreferrer">OTP</a>
          <a href={process.env.NEXT_PUBLIC_BOT_RENTAL_URL || '#'} target="_blank" rel="noreferrer">Sewa Bot</a>
        </nav>
      </header>

      <section className="hero-stage">
        <div className="hero-carousel">
          {heroSlides.map((slide) => (
            <article key={slide.title} className={`hero-card hero-card--${slide.tone}`}>
              <span className="hero-badge">{slide.eyebrow}</span>
              <h1>{slide.title}</h1>
              <p>{slide.description}</p>
              <Link href={slide.href} className="hero-cta">
                {slide.cta}
              </Link>
            </article>
          ))}
        </div>
        <aside className="hero-stack">
          <div className="stack-card">
            <span className="stack-label">MOBILE FIRST</span>
            <strong>Tampilan dibuat padat, rapat, dan nyaman untuk layar HP.</strong>
            <p>Strukturnya diarahkan mengikuti rasa marketplace top-up besar: promo, kategori, produk, dan CTA cepat.</p>
          </div>
          <div className="stack-card">
            <span className="stack-label">STORE FLOW</span>
            <strong>Social Media, APK Premium, OTP, dan Sewa Bot ada dalam satu ekosistem.</strong>
            <p>Kita tinggal sambungkan data pusat supaya stok, order, dan notifikasi bergerak dari sistem yang sama.</p>
          </div>
        </aside>
      </section>

      <section className="quick-shortcuts">
        {shortcutModes.map((item) => {
          const isExternal = item.href.startsWith('http') || item.href === '#';
          const content = (
            <>
              <span className="shortcut-badge">{item.subtitle}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </>
          );

          return isExternal ? (
            <a key={item.title} href={item.href} className="shortcut-card" target="_blank" rel="noreferrer">
              {content}
            </a>
          ) : (
            <Link key={item.title} href={item.href} className="shortcut-card">
              {content}
            </Link>
          );
        })}
      </section>

      <section className="section-block">
        <div className="section-headline">
          <span className="section-kicker">KATEGORI UTAMA</span>
          <h2>Susunan kategori dibuat seperti etalase digital product besar</h2>
        </div>
        <div className="category-grid">
          {productCategories.map((item) => (
            <article key={item.title} className={`category-card category-card--${item.accent}`}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <span className="section-kicker">SPOTLIGHT</span>
          <h2>Blok promosi besar agar halaman depan terasa hidup</h2>
        </div>
        <div className="spotlight-row">
          {spotlightCards.map((item) => (
            <article key={item.title} className="spotlight-card">
              <span className="spotlight-badge">{item.badge}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <span className="section-kicker">KENAPA MODEL INI COCOK</span>
          <h2>Website terasa lebih “jadi” walau backend masih kita sambung bertahap</h2>
        </div>
        <div className="trust-grid">
          {trustItems.map((item) => (
            <article key={item.title} className="trust-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-banner">
        <div>
          <span className="section-kicker">NEXT STEP</span>
          <h2>Website ini sudah siap dikembangkan ke katalog live, checkout, dan sinkron stok pusat.</h2>
        </div>
        <div className="cta-actions">
          <Link href="/social-media" className="hero-cta">Lanjut Social Media</Link>
          <Link href="/apk-premium" className="hero-ghost">Lanjut APK Premium</Link>
        </div>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <span className="section-kicker">FAQ</span>
          <h2>Poin penting sebelum kita lanjut ke katalog dan transaksi</h2>
        </div>
        <div className="faq-grid">
          {faqs.map((item) => (
            <article key={item.title} className="faq-card">
              <h3>{item.title}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <nav className="bottom-dock">
        <Link href="/">Beranda</Link>
        <Link href="/social-media">Social</Link>
        <Link href="/apk-premium">APK</Link>
        <a href={process.env.NEXT_PUBLIC_OTP_URL || '#'} target="_blank" rel="noreferrer">OTP</a>
        <a href={process.env.NEXT_PUBLIC_BOT_RENTAL_URL || '#'} target="_blank" rel="noreferrer">Bot</a>
      </nav>
    </main>
  );
}
