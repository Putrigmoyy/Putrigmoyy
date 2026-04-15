import { fetchPusatPanelProfile, fetchPusatPanelServices, getPusatPanelMeta } from '@/lib/pusatpanel';
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
  const [profileResult, servicesResult] = await Promise.allSettled([
    fetchPusatPanelProfile(),
    fetchPusatPanelServices(),
  ]);

  const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
  const services = servicesResult.status === 'fulfilled' ? servicesResult.value : [];
  const categories = Array.from(new Set(services.map((service) => service.category).filter(Boolean))).sort((left, right) => left.localeCompare(right));

  return (
    <main className="market-shell">
      <SocialMediaBrowser
        profile={profile}
        providerMeta={provider}
        services={services}
        categories={categories}
        requestedTab={resolvedSearchParams?.tab || null}
      />
    </main>
  );
}
