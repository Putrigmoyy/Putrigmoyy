import { fetchPusatPanelProfile, fetchPusatPanelServices, getPusatPanelMeta } from '@/lib/pusatpanel';
import { getCoreMinimumDeposit } from '@/lib/core-store';
import { getCachedSmmServices } from '@/lib/smm-store';
import { SocialMediaBrowser } from './social-media-browser';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

export default async function SocialMediaPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const provider = getPusatPanelMeta();
  const [profileResult, servicesResult, cachedServicesResult, minimumDepositResult] = await Promise.allSettled([
    fetchPusatPanelProfile(),
    fetchPusatPanelServices(),
    getCachedSmmServices(),
    getCoreMinimumDeposit(),
  ]);

  const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
  const services =
    servicesResult.status === 'fulfilled' && servicesResult.value.length
      ? servicesResult.value
      : cachedServicesResult.status === 'fulfilled'
        ? cachedServicesResult.value
        : [];
  const minimumDeposit = minimumDepositResult.status === 'fulfilled' ? minimumDepositResult.value : 10000;
  const categories = Array.from(new Set(services.map((service) => service.category).filter(Boolean))).sort((left, right) => left.localeCompare(right));

  return (
    <main className="market-shell">
      <SocialMediaBrowser
        profile={profile}
        providerMeta={provider}
        services={services}
        categories={categories}
        minimumDeposit={minimumDeposit}
        requestedTab={resolvedSearchParams?.tab || null}
      />
    </main>
  );
}
