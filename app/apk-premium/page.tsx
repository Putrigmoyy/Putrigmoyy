const points = [
  'Sinkron stok produk dan variant dengan private chat WhatsApp.',
  'Checkout Midtrans untuk website.',
  'Database akun premium terpusat di Neon.',
  'Notifikasi transaksi masuk ke aplikasi owner lalu diteruskan ke grup store.',
];

export default function ApkPremiumPage() {
  return (
    <main className="market-shell">
      <section className="section-block">
        <div className="section-headline">
          <span className="section-kicker">MODE APK PREMIUM</span>
          <h2>Store akun premium akan memakai stok pusat yang sama dengan bot WhatsApp.</h2>
        </div>
        <p>
          Fokus utamanya adalah membuat website dan private autoorder membaca data varian yang sama. Jadi sekali
          order dibayar, pengurangan stok dan pengiriman akun bisa tetap konsisten walau jalurnya berbeda.
        </p>
        <div className="trust-grid">
          <article className="trust-card">
            <h3>Produk</h3>
            <p>Nama produk, variant, harga, deskripsi, dan status aktif.</p>
          </article>
          <article className="trust-card">
            <h3>Inventory</h3>
            <p>Satu akun = satu entry, jadi lebih aman saat reserve, sold, dan delivery.</p>
          </article>
          <article className="trust-card">
            <h3>Order flow</h3>
            <p>Checkout website, pembayaran berhasil, kirim akun, dan kirim notifikasi ke owner app.</p>
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
