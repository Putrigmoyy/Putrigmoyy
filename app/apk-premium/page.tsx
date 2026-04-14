import { ApkPremiumBrowser } from './apk-premium-browser';
import { getApkPremiumCatalog } from '@/lib/apk-premium-store';

export const revalidate = 300;

export default async function ApkPremiumPage() {
  const catalog = await getApkPremiumCatalog();

  return (
    <main className="apk-app-page">
      <ApkPremiumBrowser products={catalog.products} categories={catalog.categories} />
    </main>
  );
}
