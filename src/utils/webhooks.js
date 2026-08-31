/**
 * Webhook System — notify external services of changes
 */

const WEBHOOK_KEY = 'apex-webhooks-v1';

export function loadWebhooks() {
  try {
    const raw = localStorage.getItem(WEBHOOK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveWebhooks(hooks) {
  try {
    localStorage.setItem(WEBHOOK_KEY, JSON.stringify(hooks));
  } catch { /* ignore */ }
}

export function addWebhook(url, events = ['value_change', 'wiki_change']) {
  const hooks = loadWebhooks();
  hooks.push({ url, events, id: Date.now() });
  saveWebhooks(hooks);
}

export function removeWebhook(id) {
  const hooks = loadWebhooks().filter(h => h.id !== id);
  saveWebhooks(hooks);
}

export async function triggerWebhooks(event, data) {
  const hooks = loadWebhooks().filter(h => h.events.includes(event));
  
  for (const hook of hooks) {
    try {
      await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
      });
    } catch (e) {
      console.warn(`Webhook failed for ${hook.url}:`, e);
    }
  }
}
