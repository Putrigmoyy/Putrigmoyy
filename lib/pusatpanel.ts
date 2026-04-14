type PusatPanelResponse<T> = {
  status: boolean;
  data: T | {
    msg?: string;
  };
};

type ProviderPayload = Record<string, string>;

const DEFAULT_API_URL = 'https://pusatpanelsmm.com/api/json.php';

function getProviderConfig() {
  const apiUrl = String(process.env.PUSATPANELSMM_API_URL || DEFAULT_API_URL).trim() || DEFAULT_API_URL;
  const apiKey = String(process.env.PUSATPANELSMM_API_KEY || '').trim();
  const secretKey = String(process.env.PUSATPANELSMM_SECRET_KEY || '').trim();
  return {
    apiUrl,
    apiKey,
    secretKey,
    configured: Boolean(apiKey && secretKey),
  };
}

export function getPusatPanelMeta() {
  return getProviderConfig();
}

export async function requestPusatPanel<T>(payload: ProviderPayload): Promise<PusatPanelResponse<T>> {
  const config = getProviderConfig();
  if (!config.configured) {
    throw new Error('PUSATPANELSMM credentials belum diisi.');
  }

  const body = new URLSearchParams({
    api_key: config.apiKey,
    secret_key: config.secretKey,
    ...payload,
  });

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Provider error ${response.status}`);
  }

  const json = await response.json() as PusatPanelResponse<T>;
  return json;
}
