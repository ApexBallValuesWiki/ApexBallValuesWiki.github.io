// Global-time verification for daily minigames (extracted from the
// Ball Knowledge pattern): the daily puzzle must NOT trust the PC clock,
// so we verify time against public UTC endpoints and tick from
// performance.now() between checks.

async function fetchJsonWithTimeout(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchGlobalTimeMs() {
  const endpoints = [
    {
      label: 'WorldTimeAPI UTC',
      url: 'https://worldtimeapi.org/api/timezone/Etc/UTC',
      parse: (data) => (Number.isFinite(data.unixtime) ? data.unixtime * 1000 : Date.parse(data.utc_datetime)),
    },
    {
      label: 'TimeAPI UTC',
      url: 'https://timeapi.io/api/time/current/zone?timeZone=UTC',
      parse: (data) => Date.parse(`${data.dateTime || data.date || data.time}Z`),
    },
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const data = await fetchJsonWithTimeout(endpoint.url);
      const ms = endpoint.parse(data);
      if (Number.isFinite(ms)) return { ms, source: endpoint.label };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Unable to verify global time');
}
