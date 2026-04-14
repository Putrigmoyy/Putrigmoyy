'use client';

import { useDeferredValue, useState } from 'react';
import type { NormalizedPusatPanelService } from '@/lib/pusatpanel';

const INITIAL_VISIBLE_COUNT = 36;

type Props = {
  services: NormalizedPusatPanelService[];
  categories: string[];
};

export function SocialMediaBrowser({ services, categories }: Props) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [activeMenuType, setActiveMenuType] = useState('Semua');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredServices = services.filter((service) => {
    const matchesCategory = activeCategory === 'Semua' || service.category === activeCategory;
    const matchesMenuType = activeMenuType === 'Semua' || service.menuType === activeMenuType;
    const haystack = [
      service.name,
      service.category,
      service.note,
      service.logoType,
      service.speed,
    ].join(' ').toLowerCase();
    const matchesQuery = !deferredQuery || haystack.includes(deferredQuery);
    return matchesCategory && matchesMenuType && matchesQuery;
  });

  const visibleServices = filteredServices.slice(0, visibleCount);
  const menuTypeOptions = ['Semua', ...Array.from(new Set(services.map((service) => service.menuType).filter(Boolean)))];

  const resetVisible = () => setVisibleCount(INITIAL_VISIBLE_COUNT);

  return (
    <section className="section-block">
      <div className="section-headline">
        <span className="section-kicker">KATALOG LIVE</span>
        <h2>Daftar layanan provider yang sudah bisa kamu filter langsung dari HP</h2>
      </div>

      <div className="catalog-toolbar">
        <label className="catalog-search">
          <span>Cari layanan</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetVisible();
            }}
            placeholder="Cari nama layanan, kategori, note, atau logo"
          />
        </label>
        <div className="catalog-toolbar-side">
          <span className="catalog-chip catalog-chip--solid">{filteredServices.length} layanan</span>
          <span className="catalog-chip">{categories.length} kategori</span>
        </div>
      </div>

      <div className="chip-scroller">
        <button
          type="button"
          className={activeCategory === 'Semua' ? 'catalog-chip catalog-chip--active' : 'catalog-chip'}
          onClick={() => {
            setActiveCategory('Semua');
            resetVisible();
          }}
        >
          Semua
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={activeCategory === category ? 'catalog-chip catalog-chip--active' : 'catalog-chip'}
            onClick={() => {
              setActiveCategory(category);
              resetVisible();
            }}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="chip-scroller chip-scroller--secondary">
        {menuTypeOptions.map((menuType) => (
          <button
            key={menuType}
            type="button"
            className={activeMenuType === menuType ? 'catalog-chip catalog-chip--secondary-active' : 'catalog-chip catalog-chip--secondary'}
            onClick={() => {
              setActiveMenuType(menuType);
              resetVisible();
            }}
          >
            Menu {menuType}
          </button>
        ))}
      </div>

      <div className="services-grid">
        {visibleServices.map((service) => (
          <article key={service.id} className="service-card">
            <div className="service-card-top">
              <span className="service-logo-pill">{service.logoType}</span>
              <span className="service-id-pill">ID {service.id}</span>
            </div>
            <h3>{service.name}</h3>
            <p className="service-category">{service.category}</p>
            <div className="service-metrics">
              <div>
                <span>Harga</span>
                <strong>Rp {service.priceLabel}</strong>
              </div>
              <div>
                <span>Kecepatan</span>
                <strong>{service.speed}</strong>
              </div>
              <div>
                <span>Min</span>
                <strong>{service.min.toLocaleString('id-ID')}</strong>
              </div>
              <div>
                <span>Max</span>
                <strong>{service.max.toLocaleString('id-ID')}</strong>
              </div>
            </div>
            {service.note ? <p className="service-note">{service.note}</p> : <p className="service-note service-note--empty">Belum ada note tambahan dari provider.</p>}
          </article>
        ))}
      </div>

      {filteredServices.length === 0 ? (
        <div className="empty-state">
          Tidak ada layanan yang cocok dengan pencarian atau filter ini.
        </div>
      ) : null}

      {visibleCount < filteredServices.length ? (
        <div className="catalog-actions">
          <button type="button" className="hero-cta" onClick={() => setVisibleCount((current) => current + INITIAL_VISIBLE_COUNT)}>
            Muat lebih banyak
          </button>
        </div>
      ) : null}
    </section>
  );
}
