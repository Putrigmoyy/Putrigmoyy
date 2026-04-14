import { neon } from '@neondatabase/serverless';
import { getAppDataSourceConfig } from '@/lib/data-sources';

type NeonClient = ReturnType<typeof neon>;

let apkClient: NeonClient | null = null;
let smmClient: NeonClient | null = null;

function getDatabaseUrl(kind: 'apk' | 'smm') {
  const config = getAppDataSourceConfig();
  return kind === 'apk' ? config.apk.databaseUrl : config.smm.databaseUrl;
}

export function getNeonClient(kind: 'apk' | 'smm') {
  const databaseUrl = getDatabaseUrl(kind);
  if (!databaseUrl) {
    throw new Error(`DATABASE_URL_${kind === 'apk' ? 'APK' : 'SMM'} belum diisi.`);
  }

  if (kind === 'apk') {
    if (!apkClient) apkClient = neon(databaseUrl);
    return apkClient;
  }

  if (!smmClient) smmClient = neon(databaseUrl);
  return smmClient;
}
