// Daily-minigame clock. The worker exposes a same-origin UTC endpoint so no
// third-party time service receives a visitor's IP address. If the worker is
// unreachable we degrade to the device clock instead of breaking the games.
import { APEX_KV_URL } from './apexClient';

export async function fetchGlobalTimeMs() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let response = null;
    try {
      response = await fetch(`${APEX_KV_URL}/time`, { cache: 'no-store', signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (response?.ok) {
      const data = await response.json();
      if (Number.isFinite(data?.ms)) return { ms: data.ms, source: 'APEX worker (UTC)' };
    }
  } catch { /* fall through to the local clock */ }
  return { ms: Date.now(), source: 'Device clock (fallback)' };
}
