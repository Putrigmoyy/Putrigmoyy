import { AccountCenterBrowser } from './account-center-browser';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{
    tab?: string | string[];
  }>;
};

export default async function AccountCenterPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedTab = Array.isArray(resolvedSearchParams?.tab)
    ? resolvedSearchParams?.tab[0] || null
    : resolvedSearchParams?.tab || null;

  return (
    <main className="apk-app-page">
      <AccountCenterBrowser requestedTab={requestedTab} />
    </main>
  );
}
