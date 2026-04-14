const points = [
  'Tarik katalog layanan dari PusatPanelSMM.',
  'Filter kategori, service, min-max, dan status.',
  'Buat order social media dari website.',
  'Cek status order secara real-time.',
];

export default function SocialMediaPage() {
  return (
    <main className="shell">
      <section className="glass-panel">
        <span className="eyebrow">MODE SOCIAL MEDIA</span>
        <h2>Fondasi panel SMM sedang kita siapkan.</h2>
        <p>
          Halaman ini akan menjadi clone modern dari alur website lama kamu, tetapi lebih rapi untuk Vercel,
          lebih siap dipadukan dengan Neon, dan lebih gampang disinkronkan ke aplikasi owner.
        </p>
        <ul className="roadmap-list">
          {points.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
