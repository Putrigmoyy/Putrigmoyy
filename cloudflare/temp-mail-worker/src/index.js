function clean(value) {
  return String(value ?? '').trim();
}

function normalizeAddress(value) {
  const input = clean(value).toLowerCase();
  const match = input.match(/<([^>]+)>/);
  return (match?.[1] ?? input).replace(/^mailto:/, '');
}

function getAllowedDomains(env) {
  return Array.from(
    new Set(
      clean(env.TEMP_MAIL_ALLOWED_DOMAINS)
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function getDomainFromAddress(address) {
  return normalizeAddress(address).split('@')[1] ?? '';
}

async function readRawMessage(rawStream) {
  const arrayBuffer = await new Response(rawStream).arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

async function readResponseText(response) {
  try {
    return (await response.text()).slice(0, 600);
  } catch {
    return '';
  }
}

export default {
  async email(message, env) {
    const inboundUrl = clean(env.TEMP_MAIL_INBOUND_URL);
    const inboundSecret = clean(env.TEMP_MAIL_INBOUND_SECRET);
    const fromAddress = normalizeAddress(message.from);
    const toAddress = normalizeAddress(message.to);
    const allowedDomains = getAllowedDomains(env);
    const recipientDomain = getDomainFromAddress(toAddress);

    if (!inboundUrl || !inboundSecret) {
      message.setReject('Worker temp mail belum dikonfigurasi penuh.');
      return;
    }

    if (allowedDomains.length > 0 && !allowedDomains.includes(recipientDomain)) {
      message.setReject('Domain email tidak diizinkan untuk temp mail ini.');
      return;
    }

    const rawEmail = await readRawMessage(message.raw);
    const response = await fetch(inboundUrl, {
      method: 'POST',
      headers: {
        'content-type': 'message/rfc822',
        'x-inbound-secret': inboundSecret,
        'x-temp-mail-source': 'cloudflare-email-worker',
        'x-temp-mail-envelope-from': fromAddress,
        'x-temp-mail-envelope-to': toAddress,
      },
      body: rawEmail,
    });

    if (!response.ok) {
      const body = await readResponseText(response);
      console.error('Temp mail inbound gagal.', {
        status: response.status,
        body,
        toAddress,
      });
      message.setReject('Inbox temp mail sedang sibuk. Coba kirim ulang beberapa saat lagi.');
      return;
    }

    if (clean(env.TEMP_MAIL_DEBUG).toLowerCase() === 'true') {
      console.log('Temp mail inbound tersimpan.', {
        fromAddress,
        toAddress,
      });
    }
  },
};
