'use client';

import Link from 'next/link';

type Props = {
  displayName?: string;
  balance: number;
};

export function TopAccountMenu({ displayName, balance }: Props) {
  const balanceLabel = `Rp ${Math.max(0, Number(balance || 0)).toLocaleString('id-ID')}`;

  return (
    <div className="site-mini-account">
      <div className="site-mini-account__balance">
        <span>Saldo</span>
        <strong>{balanceLabel}</strong>
      </div>

      <Link
        href="/"
        className="site-mini-account__profile"
        aria-label={`Kembali ke dashboard utama dari ${String(displayName || 'profil').trim() || 'profil'}`}
      >
        <svg className="site-mini-account__gear" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4.9 5.2h5.5v5.5H4.9Zm8.7 0h5.5v5.5h-5.5Zm-8.7 8.1h5.5v5.5H4.9Zm8.7 0h5.5v5.5h-5.5Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
        </svg>
      </Link>
    </div>
  );
}
