'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type DashboardItem = {
  title: string;
  description: string;
  href: string;
  image: string;
  external: boolean;
  imagePosition?: string;
  overlayTone?: 'default' | 'soft-gray';
};

type Props = {
  items: DashboardItem[];
};

export function DashboardHome({ items }: Props) {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPaddingBottom = document.body.style.paddingBottom;

    document.body.style.overflow = 'hidden';
    document.body.style.paddingBottom = '0';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingBottom = previousPaddingBottom;
    };
  }, []);

  const handleOpen = (item: DashboardItem) => {
    if (activeItem) return;
    setActiveItem(item.title);

    window.setTimeout(() => {
      if (item.external) {
        if (item.href && item.href !== '#') {
          window.location.href = item.href;
        } else {
          setActiveItem(null);
        }
        return;
      }

      router.push(item.href);
    }, 420);
  };

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
        <div className="dashboard-grid">
          {items.map((item) => (
            <button
              key={item.title}
              type="button"
              className={activeItem === item.title ? 'dashboard-card dashboard-card--active' : 'dashboard-card'}
              onClick={() => handleOpen(item)}
            >
              <div className="dashboard-card-media">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 220px"
                  className="dashboard-card-image"
                  style={item.imagePosition ? { objectPosition: item.imagePosition } : undefined}
                  priority
                />
                <div
                  className={
                    item.overlayTone === 'soft-gray'
                      ? 'dashboard-card-overlay dashboard-card-overlay--soft-gray'
                      : 'dashboard-card-overlay'
                  }
                >
                  <h2>{item.title}</h2>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
