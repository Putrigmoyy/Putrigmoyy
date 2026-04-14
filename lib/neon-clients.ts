import { neon } from '@neondatabase/serverless';
import { getAppDataSourceConfig } from '@/lib/data-sources';

type NeonClient = ReturnType<typeof neon>;

let apkClient: NeonClient | null = null;
let smmClient: NeonClient | null = null;
let coreClient: NeonClient | null = null;

function getDatabaseUrl(kind: 'apk' | 'smm' | 'core') {
  const config = getAppDataSourceConfig();
  if (kind === 'apk') return config.apk.databaseUrl;
  if (kind === 'smm') return config.smm.databaseUrl;
  return config.core.databaseUrl;
}

export function getNeonClient(kind: 'apk' | 'smm' | 'core') {
  const databaseUrl = getDatabaseUrl(kind);
  if (!databaseUrl) {
    throw new Error(
      `DATABASE_URL_${kind === 'apk' ? 'APK' : kind === 'smm' ? 'SMM' : 'CORE'} belum diisi.`,
    );
  }

  if (kind === 'apk') {
    if (!apkClient) apkClient = neon(databaseUrl);
    return apkClient;
  }

  if (kind === 'smm') {
    if (!smmClient) smmClient = neon(databaseUrl);
    return smmClient;
  }

  if (!coreClient) coreClient = neon(databaseUrl);
  return coreClient;
}

export async function testNeonConnection(kind: 'apk' | 'smm' | 'core') {
  const sql = getNeonClient(kind);
  const result = (await sql`select 1 as ok`) as Array<{ ok?: number }>;
  return Array.isArray(result) && Number(result[0]?.ok || 0) === 1;
}
