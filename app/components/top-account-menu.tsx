'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

export type TopAccountMenuItem = {
  label: string;
  href: string;
  external?: boolean;
  disabled?: boolean;
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
      { label: 'Profil', href: '/apk-premium?tab=profil#profile-account' },
      { label: 'Deposit', href: '/apk-premium?tab=deposit' },
      { label: 'Riwayat Deposit', href: '/apk-premium?tab=riwayat#deposit-history' },
    ],
  },
  {
    title: 'Panduan Mulai Transaksi',
    items: [
      { label: 'Cara Deposit', href: '/apk-premium?tab=profil#guide-deposit' },
      { label: 'Informasi Status Order', href: '/apk-premium?tab=profil#guide-status' },
      { label: 'Panduan Cara Pesanan', href: '/apk-premium?tab=profil#guide-order' },
      { label: 'Kontak', href: '/apk-premium?tab=profil#guide-contact' },
    ],
  },
];

export function TopAccountMenu({ displayName, balance, sections }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initial = useMemo(() => {
    const value = String(displayName || 'Profil').trim();
    return value ? value.charAt(0).toUpperCase() : 'P';
  }, [displayName]);

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
        aria-label="Buka menu profil"
      >
        <span>{initial}</span>
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
                      {item.label}
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
                      {item.label}
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
