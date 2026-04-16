import { ApkPremiumBrowser } from './apk-premium-browser';
import { getApkPremiumPricingSettings } from '@/lib/apk-premium-pricing';
import { getApkPremiumCatalog } from '@/lib/apk-premium-store';
import { getCoreMinimumDeposit } from '@/lib/core-store';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    tab?: string | string[];
  }>;
};

export default async function ApkPremiumPage({ searchParams }: PageProps) {
  const [catalog, minimumDeposit, pricing] = await Promise.all([
    getApkPremiumCatalog(),
    getCoreMinimumDeposit(),
    getApkPremiumPricingSettings(),
  ]);
  const resolvedSearchParams = await searchParams;
  const requestedTab = Array.isArray(resolvedSearchParams.tab)
    ? resolvedSearchParams.tab[0] || null
    : resolvedSearchParams.tab || null;

  return (
    <main className="apk-app-page">
      <ApkPremiumBrowser
        products={catalog.products}
        categories={catalog.categories}
        minimumDeposit={minimumDeposit}
        adminFee={pricing.adminFee}
        requestedTab={requestedTab}
      />
    </main>
  );
}
