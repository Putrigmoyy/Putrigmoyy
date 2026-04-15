import { ApkPremiumBrowser } from './apk-premium-browser';
import { getApkPremiumCatalog } from '@/lib/apk-premium-store';

export const revalidate = 300;

type PageProps = {
  searchParams: Promise<{
    tab?: string | string[];
  }>;
};

export default async function ApkPremiumPage({ searchParams }: PageProps) {
  const catalog = await getApkPremiumCatalog();
  const resolvedSearchParams = await searchParams;
  const requestedTab = Array.isArray(resolvedSearchParams.tab)
    ? resolvedSearchParams.tab[0] || null
    : resolvedSearchParams.tab || null;

  return (
    <main className="apk-app-page">
      <ApkPremiumBrowser products={catalog.products} categories={catalog.categories} requestedTab={requestedTab} />
    </main>
  );
}
