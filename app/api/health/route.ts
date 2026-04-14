import { NextResponse } from 'next/server';
import { getApkPremiumCatalog } from '@/lib/apk-premium-store';
import { getAppDataSourceConfig } from '@/lib/data-sources';
import { getPusatPanelMeta } from '@/lib/pusatpanel';

export async function GET() {
  const provider = getPusatPanelMeta();
  const apkCatalog = await getApkPremiumCatalog();
  const dataSources = getAppDataSourceConfig();
  return NextResponse.json({
    ok: true,
    app: 'putri-gmoyy-web-store',
    smmConfigured: provider.configured,
    smmApiUrl: provider.apiUrl,
    apkPremium: {
      dataSource: apkCatalog.dataSource,
      syncReady: apkCatalog.syncReady,
      totalProducts: apkCatalog.summary.totalProducts,
      totalVariants: apkCatalog.summary.totalVariants,
      totalStock: apkCatalog.summary.totalStock,
    },
    dataSources: {
      apk: {
        mode: dataSources.apk.mode,
        databaseConfigured: dataSources.apk.databaseConfigured,
      },
      smm: {
        mode: dataSources.smm.mode,
        databaseConfigured: dataSources.smm.databaseConfigured,
      },
    },
  });
}
