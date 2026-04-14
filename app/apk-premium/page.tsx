import { ApkPremiumBrowser } from './apk-premium-browser';
import { apkPremiumProducts } from '@/lib/apk-premium';

export const dynamic = 'force-static';

export default function ApkPremiumPage() {
  const categories = Array.from(new Set(apkPremiumProducts.map((product) => product.category))).sort((left, right) =>
    left.localeCompare(right, 'id'),
  );

  return (
    <main className="market-shell">
      <ApkPremiumBrowser products={apkPremiumProducts} categories={categories} />
    </main>
  );
}
