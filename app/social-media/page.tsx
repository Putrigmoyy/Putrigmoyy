import { getPusatPanelMeta } from '@/lib/pusatpanel';

const points = [
  'Tarik katalog layanan dari PusatPanelSMM.',
  'Filter kategori, service, min, max, dan note provider.',
  'Buat order tipe default, custom comments, comment likes, package, dan SEO.',
  'Cek status order provider dari website.',
];

export const dynamic = 'force-dynamic';

export default function SocialMediaPage() {
  const provider = getPusatPanelMeta();

  return (
    <main className="market-shell">
      <section className="section-block">
        <div className="section-headline">
          <span className="section-kicker">MODE SOCIAL MEDIA</span>
          <h2>Panel layanan social media siap berkembang dari API provider.</h2>
        </div>
        <p>
          Jalur provider `profile`, `services`, `order`, dan `status` sudah disiapkan di website ini. Jadi langkah
          berikutnya kita tinggal membangun katalog layanan dan checkout langsung dari data `PusatPanelSMM`.
        </p>
        <div className="trust-grid">
          <article className="trust-card">
            <h3>Provider API</h3>
            <p>{provider.apiUrl}</p>
          </article>
          <article className="trust-card">
            <h3>Status koneksi</h3>
            <p>{provider.configured ? 'API key dan secret key sudah terbaca di environment.' : 'Credential belum lengkap di environment website.'}</p>
          </article>
          <article className="trust-card">
            <h3>Langkah berikutnya</h3>
            <p>Tarik daftar layanan live lalu buat halaman order per kategori.</p>
          </article>
        </div>
        <ul className="roadmap-list" style={{ marginTop: 18 }}>
          {points.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
