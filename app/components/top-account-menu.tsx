'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

type MenuTarget = {
  label: string;
  href: string;
  external?: boolean;
};

type Props = {
  displayName?: string;
  balance: number;
  targets: MenuTarget[];
};

export function TopAccountMenu({ displayName, balance, targets }: Props) {
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
          {targets.map((target) =>
            target.external ? (
              <a
                key={target.label}
                href={target.href}
                className={target.href && target.href !== '#' ? 'site-mini-account__link' : 'site-mini-account__link site-mini-account__link--disabled'}
                onClick={(event) => {
                  if (!target.href || target.href === '#') {
                    event.preventDefault();
                    return;
                  }
                  setOpen(false);
                }}
              >
                {target.label}
              </a>
            ) : (
              <Link key={target.label} href={target.href} className="site-mini-account__link" onClick={() => setOpen(false)}>
                {target.label}
              </Link>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
