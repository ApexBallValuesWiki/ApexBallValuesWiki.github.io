// ============================================================================
// Fuzzy search — typo-tolerant suggestions for unit lookup.
// "krampuss" → KrampusBall, "shiny kramp" → shiny-krampusball, etc.
// ============================================================================

/** Strip everything that gets in the way of matching (case, spaces, symbols). */
export function normalizeText(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Classic Levenshtein distance with an early exit once past `max`. */
export function editDistance(a, b, max = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array(b.length + 1);
  const cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j += 1) prev[j] = cur[j];
  }
  return prev[b.length];
}

/**
 * Score a candidate against the query (higher = better). Typos allowed:
 * distance ≤ 2 on the normalized strings still matches, just ranked lower.
 */
function scoreCandidate(query, candidate) {
  const q = normalizeText(query);
  const name = normalizeText(candidate.name);
  const slug = normalizeText(candidate.slug);
  if (!q) return 0;
  if (name === q || slug === q) return 1000;
  if (name.startsWith(q) || slug.startsWith(q)) return 800 - name.length;
  const word = (candidate.name || '').toLowerCase().split(/[^a-z0-9]+/).find((w) => w && w.startsWith(q));
  if (word) return 700 - name.length;
  if (name.includes(q) || slug.includes(q)) return 600 - name.length;
  // Typo tolerance: small strings need a tighter bound, big ones looser.
  const tolerance = q.length <= 3 ? 0 : q.length <= 5 ? 1 : 2;
  if (tolerance > 0) {
    const d = Math.min(
      editDistance(q, name, tolerance),
      editDistance(q, slug, tolerance),
    );
    if (d <= tolerance) return 500 - d * 100 - name.length;
  }
  // Suffix-tolerant match: the query is (nearly) the unit's PREFIX —
  // "krampuss" ≈ "krampus" + trailing typo, even though the full name
  // "krampusball" is 4 edits away. Compare against the name truncated
  // to the query's length.
  if (tolerance > 0 && name.length > q.length) {
    const pd = editDistance(q, name.slice(0, q.length), tolerance);
    if (pd <= tolerance) return 450 - pd * 100 - name.length;
  }
  // Subsequence: every query char appears in order ("krmus" → KrampusBall)
  if (q.length >= 4) {
    let ni = 0;
    for (const ch of q) {
      ni = name.indexOf(ch, ni);
      if (ni === -1) { ni = -1; break; }
      ni += 1;
    }
    if (ni !== -1) return 300 - name.length;
  }
  return 0;
}

/**
 * Rank suggestions for a query. `items` need { name, slug, ... } (extra fields
 * like rarity/imageUrl pass through untouched for rendering).
 * Returns the top `limit` matches sorted best-first. Empty query → [].
 */
export function fuzzySuggest(query, items, limit = 8) {
  const q = String(query || '').trim();
  if (!q) return [];
  const scored = [];
  for (const item of items) {
    const score = scoreCandidate(q, item);
    if (score > 0) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score || String(a.item.name).localeCompare(String(b.item.name)));
  return scored.slice(0, limit).map((s) => ({ ...s.item, _matchedByTypo: s.score < 600 }));
}
