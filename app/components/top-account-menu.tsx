'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export type TopAccountMenuItem = {
  label: string;
  href: string;
  external?: boolean;
  disabled?: boolean;
  icon?: 'profil' | 'deposit' | 'riwayat';
};

export type TopAccountMenuSection = {
  title?: string;
  items: TopAccountMenuItem[];
};

type Props = {
  displayName?: string;
  balance: number;
  sections: TopAccountMenuSection[];
};

export const STORE_ACCOUNT_MENU_SECTIONS: TopAccountMenuSection[] = [
  {
    title: 'Menu Utama',
    items: [
      { label: 'Profil', href: '/account-center?tab=profil#profile-account', icon: 'profil' },
      { label: 'Deposit', href: '/account-center?tab=deposit', icon: 'deposit' },
      { label: 'Riwayat Deposit', href: '/account-center?tab=riwayat#deposit-history', icon: 'riwayat' },
    ],
  },
  {
    title: 'Panduan Mulai Transaksi',
    items: [
      { label: 'Cara Deposit', href: '/account-center?tab=profil#guide-deposit' },
      { label: 'Informasi Status Order', href: '/account-center?tab=profil#guide-status' },
      { label: 'Panduan Cara Pesanan', href: '/account-center?tab=profil#guide-order' },
      { label: 'Kontak', href: '/account-center?tab=profil#guide-contact' },
    ],
  },
];

function TopAccountMenuLinkIcon({ type }: { type: NonNullable<TopAccountMenuItem['icon']> }) {
  if (type === 'deposit') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.8 8.2h14.4v9.1a1.8 1.8 0 0 1-1.8 1.8H6.6a1.8 1.8 0 0 1-1.8-1.8V8.2Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="M4.8 10.2h14.4M8.2 6.1h7.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      </svg>
    );
  }

  if (type === 'riwayat') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 7.1v4.75l2.8 1.85" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="M19.4 12a7.4 7.4 0 1 1-2.2-5.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="M19.45 5.75V8.6H16.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8.4" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6.8 18.25a5.2 5.2 0 0 1 10.4 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

export function TopAccountMenu({ displayName, balance, sections }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  const balanceLabel = `Rp ${Math.max(0, Number(balance || 0)).toLocaleString('id-ID')}`;

  return (
    <div ref={containerRef} className="site-mini-account">
      <div className="site-mini-account__balance">
        <span>Saldo</span>
        <strong>{balanceLabel}</strong>
      </div>

      <button
        type="button"
        className={open ? 'site-mini-account__profile site-mini-account__profile--open' : 'site-mini-account__profile'}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={`Buka menu ${String(displayName || 'profil').trim() || 'profil'}`}
      >
        <svg className="site-mini-account__gear" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 8.45a3.55 3.55 0 1 0 0 7.1 3.55 3.55 0 0 0 0-7.1Zm8.25 3.55-.12-.88 1.6-1.25-1.6-2.76-1.97.5-.67-.57-.2-2.03H14.1l-.8 1.86-.84.1-.94-1.58L8.3 6.06l.42 1.97-.62.6-2.01-.48-1.6 2.76 1.56 1.24-.08.85-1.48 1.33 1.59 2.75 1.95-.5.65.56.2 2.04h3.2l.8-1.87.83-.09.95 1.58 3.22-1.86-.42-1.98.62-.58 2 .48 1.6-2.75-1.57-1.3Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
        </svg>
      </button>

      {open ? (
        <div className="site-mini-account__menu">
          {sections.map((section) => (
            <div key={section.title || section.items.map((item) => item.label).join('-')} className="site-mini-account__section">
              {section.title ? <span className="site-mini-account__section-title">{section.title}</span> : null}
              <div className="site-mini-account__section-links">
                {section.items.map((item) =>
                  item.external ? (
                    <a
                      key={item.label}
                      href={item.href}
                      className={item.href && item.href !== '#' && !item.disabled ? 'site-mini-account__link' : 'site-mini-account__link site-mini-account__link--disabled'}
                      onClick={(event) => {
                        if (!item.href || item.href === '#' || item.disabled) {
                          event.preventDefault();
                          return;
                        }
                        setOpen(false);
                      }}
                    >
                      {item.icon ? (
                        <span className="site-mini-account__link-icon">
                          <TopAccountMenuLinkIcon type={item.icon} />
                        </span>
                      ) : null}
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={item.disabled ? 'site-mini-account__link site-mini-account__link--disabled' : 'site-mini-account__link'}
                      onClick={(event) => {
                        if (item.disabled) {
                          event.preventDefault();
                          return;
                        }
                        setOpen(false);
                      }}
                    >
                      {item.icon ? (
                        <span className="site-mini-account__link-icon">
                          <TopAccountMenuLinkIcon type={item.icon} />
                        </span>
                      ) : null}
                      <span>{item.label}</span>
                    </Link>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
