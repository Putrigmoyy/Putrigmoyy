import { fetchPusatPanelProfile, fetchPusatPanelServices, getPusatPanelMeta } from '@/lib/pusatpanel';
import { SocialMediaBrowser } from './social-media-browser';

const menuTypes = [
  { id: '1', title: 'Default', description: 'Pakai quantity biasa untuk likes, views, followers, dan jenis order umum lainnya.' },
  { id: '2', title: 'Custom Comments', description: 'Cocok untuk layanan yang butuh daftar komentar terpisah per baris.' },
  { id: '3', title: 'Comment Likes', description: 'Dipakai saat provider meminta quantity dan username pemilik komentar.' },
  { id: '4', title: 'Package', description: 'Untuk layanan yang cukup memakai link/data target tanpa quantity tambahan.' },
  { id: '5', title: 'SEO', description: 'Tipe layanan dengan keyword / komen tambahan selain quantity.' },
];

export const dynamic = 'force-dynamic';

export default async function SocialMediaPage() {
  const provider = getPusatPanelMeta();
  const [profileResult, servicesResult] = await Promise.allSettled([
    fetchPusatPanelProfile(),
    fetchPusatPanelServices(),
  ]);

  const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
  const services = servicesResult.status === 'fulfilled' ? servicesResult.value : [];
  const categories = Array.from(new Set(services.map((service) => service.category).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  const topCategories = categories
    .slice(0, 6)
    .map((category) => ({
      category,
      total: services.filter((service) => service.category === category).length,
    }))
    .sort((left, right) => right.total - left.total);

  const averagePrice = services.length > 0
    ? Math.round(services.reduce((total, service) => total + service.price, 0) / services.length)
    : 0;

  const serviceLogos = Array.from(new Set(services.map((service) => service.logoType).filter(Boolean))).slice(0, 8);

  return (
    <main className="market-shell">
      <section className="section-block smm-stage">
        <div className="smm-stage-main">
          <div className="section-headline">
            <span className="section-kicker">MODE SOCIAL MEDIA</span>
            <h2>Katalog layanan live dari provider sudah masuk ke website kamu.</h2>
          </div>
          <p className="smm-intro">
            Halaman ini sekarang tidak lagi placeholder. Daftar layanan langsung diambil dari `PusatPanelSMM`,
            lalu dibungkus ke model katalog yang jauh lebih nyaman untuk mobile.
          </p>
          <div className="trust-grid">
            <article className="trust-card">
              <h3>Total layanan</h3>
              <p>{services.length.toLocaleString('id-ID')} layanan aktif berhasil dimuat dari provider.</p>
            </article>
            <article className="trust-card">
              <h3>Kategori</h3>
              <p>{categories.length.toLocaleString('id-ID')} kategori siap difilter langsung dari halaman ini.</p>
            </article>
            <article className="trust-card">
              <h3>Harga rata-rata</h3>
              <p>Rp {averagePrice.toLocaleString('id-ID')} per layanan sebagai gambaran kasar katalog provider.</p>
            </article>
          </div>
        </div>

        <aside className="smm-stage-side">
          <article className="stack-card">
            <span className="stack-label">PROFIL PROVIDER</span>
            <strong>{profile?.fullName || 'Profil provider belum terbaca'}</strong>
            <p>Username : {profile?.username || '-'}</p>
            <p>Email : {profile?.email || '-'}</p>
            <p>Balance : Rp {profile?.balanceLabel || '0'}</p>
          </article>
          <article className="stack-card">
            <span className="stack-label">STATUS API</span>
            <strong>{provider.configured ? 'API key dan secret key aktif' : 'Environment provider belum lengkap'}</strong>
            <p>{provider.apiUrl}</p>
          </article>
        </aside>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <span className="section-kicker">KATEGORI TERATAS</span>
          <h2>Kategori paling ramai dari katalog provider</h2>
        </div>
        <div className="spotlight-row">
          {topCategories.map((item) => (
            <article key={item.category} className="spotlight-card">
              <span className="spotlight-badge">{item.total.toLocaleString('id-ID')} layanan</span>
              <h3>{item.category}</h3>
              <p>Kategori ini langsung dihitung dari data provider live yang sudah ditarik ke website.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <span className="section-kicker">TIPE ORDER PROVIDER</span>
          <h2>Kita sudah siapkan fondasi semua tipe order penting</h2>
        </div>
        <div className="trust-grid">
          {menuTypes.map((item) => (
            <article key={item.id} className="trust-card">
              <h3>Menu {item.id} - {item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <span className="section-kicker">LOGO / PLATFORM</span>
          <h2>Platform populer yang terdeteksi dari katalog saat ini</h2>
        </div>
        <div className="chip-scroller">
          {serviceLogos.map((logo) => (
            <span key={logo} className="catalog-chip catalog-chip--solid">{logo}</span>
          ))}
        </div>
      </section>

      <SocialMediaBrowser services={services} categories={categories} />
    </main>
  );
}
