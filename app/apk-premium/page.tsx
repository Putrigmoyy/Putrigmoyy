const points = [
  'Sinkron stok produk dan variant dengan private chat WhatsApp.',
  'Checkout Midtrans untuk website.',
  'Database akun premium terpusat di Neon.',
  'Notifikasi transaksi masuk ke aplikasi owner lalu diteruskan ke grup store.',
];

export default function ApkPremiumPage() {
  return (
    <main className="shell">
      <section className="glass-panel">
        <span className="eyebrow">MODE APK PREMIUM</span>
        <h2>Store APK premium akan dibangun di sini.</h2>
        <p>
          Fokus utamanya adalah stok real-time yang sama antara website dan private chat bot, jadi satu penjualan
          di salah satu jalur langsung mengurangi stok pusat yang sama.
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
