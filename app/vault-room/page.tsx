import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminPortalBrowser } from './admin-portal-browser';
import { getAdminPortalSnapshot, verifyAdminPortalSecret } from '@/lib/admin-portal';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  searchParams: Promise<{
    k?: string;
  }>;
};

export default async function VaultRoomPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const secret = String(resolvedSearchParams.k || '').trim();

  if (!verifyAdminPortalSecret(secret)) {
    notFound();
  }

  const snapshot = await getAdminPortalSnapshot();

  return (
    <main className="apk-app-page admin-portal-page">
      <AdminPortalBrowser initialSnapshot={snapshot} secret={secret} />
    </main>
  );
}
