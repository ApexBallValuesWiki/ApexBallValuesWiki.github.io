function toStatsObject(stats) {
  if (stats && typeof stats === 'object' && !Array.isArray(stats)) return { ...stats };
  return {};
}

export function normalizeAttacks(attacks) {
  if (!attacks) return [];

  if (Array.isArray(attacks)) {
    return attacks
      .map((attack) => {
        if (!attack || typeof attack !== 'object') return null;
        if (Array.isArray(attack)) {
          const [name, stats] = attack;
          return { name: String(name || 'Stats'), stats: toStatsObject(stats) };
        }
        return {
          name: String(attack.name ?? attack.type ?? 'Stats'),
          stats: toStatsObject(attack.stats),
        };
      })
      .filter((attack) => attack && (attack.name || Object.keys(attack.stats).length > 0));
  }

  if (typeof attacks === 'object') {
    return Object.entries(attacks).map(([name, stats]) => ({ name, stats: toStatsObject(stats) }));
  }

  return [];
}

export function hasAttacks(attacks) {
  return normalizeAttacks(attacks).length > 0;
}

export function labelAttacks(attacks) {
  const list = normalizeAttacks(attacks);
  const totals = new Map();
  for (const attack of list) totals.set(attack.name, (totals.get(attack.name) || 0) + 1);

  const seen = new Map();
  return list.map((attack) => {
    const nth = (seen.get(attack.name) || 0) + 1;
    seen.set(attack.name, nth);
    const label = (totals.get(attack.name) || 0) > 1 ? `${attack.name} (${nth})` : attack.name;
    return { ...attack, label };
  });
}

export function attackKey(attack, index) {
  return `${attack?.name || 'Attack'}#${index}`;
}

export function attacksToLines(attacks) {
  return normalizeAttacks(attacks)
    .flatMap((attack) => {
      if (!attack || typeof attack !== 'object' || !attack.stats) return [];
      const safeStats = toStatsObject(attack.stats);
      return Object.entries(safeStats).map(([key, value]) => `${attack.name} / ${key}: ${value}`);
    })
    .join('\n');
}

export function linesToAttacks(text) {
  const blocks = [];
  const openByName = new Map();

  for (const rawLine of String(text || '').split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;

    const left = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    const parts = left.split('/').map((part) => part.trim()).filter(Boolean);
    const attackName = parts.length > 1 ? parts[0] : 'Stats';
    const key = parts.length > 1 ? parts.slice(1).join(' / ') : parts[0];
    if (!key) continue;

    let block = openByName.get(attackName);
    if (!block || Object.prototype.hasOwnProperty.call(block.stats, key)) {
      block = { name: attackName, stats: {} };
      blocks.push(block);
      openByName.set(attackName, block);
    }
    block.stats[key] = value;
  }

  return blocks;
}
