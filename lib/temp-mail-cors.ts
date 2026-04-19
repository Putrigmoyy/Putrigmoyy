const TEMP_MAIL_CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type, authorization, x-inbound-secret',
  'access-control-max-age': '86400',
};

export function withTempMailCors(response: Response) {
  Object.entries(TEMP_MAIL_CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export function tempMailCorsJson(data: unknown, init?: ResponseInit) {
  return withTempMailCors(Response.json(data, init));
}

export function tempMailCorsOptions() {
  return withTempMailCors(new Response(null, { status: 204 }));
}
