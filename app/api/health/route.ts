import { NextResponse } from 'next/server';
import { getApkPremiumCatalog } from '@/lib/apk-premium-store';
import { getAppDataSourceConfig } from '@/lib/data-sources';
import { testNeonConnection } from '@/lib/neon-clients';
import { getPusatPanelMeta } from '@/lib/pusatpanel';

export async function GET() {
  const provider = getPusatPanelMeta();
  const apkCatalog = await getApkPremiumCatalog();
  const dataSources = getAppDataSourceConfig();
  const apkConnected = dataSources.apk.databaseConfigured ? await testNeonConnection('apk').catch(() => false) : false;
  const smmConnected = dataSources.smm.databaseConfigured ? await testNeonConnection('smm').catch(() => false) : false;
  const coreConnected = dataSources.core.databaseConfigured ? await testNeonConnection('core').catch(() => false) : false;

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
        databaseConnected: apkConnected,
      },
      smm: {
        mode: dataSources.smm.mode,
        databaseConfigured: dataSources.smm.databaseConfigured,
        databaseConnected: smmConnected,
      },
      core: {
        mode: dataSources.core.mode,
        databaseConfigured: dataSources.core.databaseConfigured,
        databaseConnected: coreConnected,
      },
    },
  });
}
