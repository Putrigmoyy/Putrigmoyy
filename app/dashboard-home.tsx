import Image from 'next/image';
import Link from 'next/link';

type DashboardItem = {
  title: string;
  description: string;
  href: string;
  image: string;
  external: boolean;
};

type Props = {
  items: DashboardItem[];
};

export function DashboardHome({ items }: Props) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-loading-layer">
        <div className="dashboard-loading-card">
          <Image
            src="/loading-double-ring.svg"
            alt="Loading"
            width={110}
            height={110}
            priority
            className="dashboard-loading-image"
          />
        </div>
      </div>

      <section className="dashboard-mobile">
        <div className="dashboard-head">
          <span className="dashboard-kicker">PUTRI GMOYY STORE</span>
          <h1>Dashboard Katalog</h1>
          <p>Pilih salah satu katalog untuk masuk ke menu mereka masing-masing.</p>
        </div>

        <div className="dashboard-grid">
          {items.map((item) => {
            const card = (
              <>
                <div className="dashboard-card-media">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 380px"
                    className="dashboard-card-image"
                  />
                </div>
                <div className="dashboard-card-copy">
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </div>
              </>
            );

            return item.external ? (
              <a
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="dashboard-card"
              >
                {card}
              </a>
            ) : (
              <Link key={item.title} href={item.href} className="dashboard-card">
                {card}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
