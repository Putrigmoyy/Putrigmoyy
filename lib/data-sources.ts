export type AppDataSource = 'seed' | 'neon' | 'provider-live' | 'remote-json';

function normalizeSource(input: string | undefined, fallback: AppDataSource) {
  const value = String(input || '')
    .trim()
    .toLowerCase();

  if (value === 'seed') return 'seed';
  if (value === 'neon') return 'neon';
  if (value === 'provider-live') return 'provider-live';
  if (value === 'remote-json') return 'remote-json';
  return fallback;
}

export function getAppDataSourceConfig() {
  const apkMode = normalizeSource(process.env.APK_PREMIUM_DATA_SOURCE, 'seed');
  const smmMode = normalizeSource(process.env.SMM_DATA_SOURCE, 'provider-live');
  const apkDatabaseUrl = String(process.env.DATABASE_URL_APK || '').trim();
  const smmDatabaseUrl = String(process.env.DATABASE_URL_SMM || '').trim();
  const apkRemoteCatalogUrl = String(process.env.APK_PREMIUM_REMOTE_CATALOG_URL || '').trim();

  return {
    apk: {
      mode: apkMode,
      databaseConfigured: Boolean(apkDatabaseUrl),
      databaseUrl: apkDatabaseUrl,
      remoteCatalogUrl: apkRemoteCatalogUrl,
    },
    smm: {
      mode: smmMode,
      databaseConfigured: Boolean(smmDatabaseUrl),
      databaseUrl: smmDatabaseUrl,
    },
  };
}
