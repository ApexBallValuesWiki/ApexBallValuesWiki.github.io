/**
 * Search history — recent searches and suggestions
 */

const RECENT_KEY = 'apex-recent-searches-v1';
const MAX_RECENT = 8;

export function loadRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveRecentSearch(query) {
  if (!query || !query.trim()) return;
  const q = query.trim();
  try {
    const recent = loadRecentSearches().filter(s => s !== q);
    recent.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

export function clearRecentSearches() {
  try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
}

export function getSuggestions(query, allItems, maxResults = 6) {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  
  const scored = allItems
    .map(item => {
      const name = (item.name || '').toLowerCase();
      const slug = (item.slug || '').toLowerCase();
      const rarity = (item.rarity || '').toLowerCase();
      
      let score = 0;
      if (name === q || slug === q) score = 100;
      else if (name.startsWith(q) || slug.startsWith(q)) score = 80;
      else if (name.includes(q) || slug.includes(q)) score = 60;
      else if (rarity.includes(q)) score = 40;
      
      return { item, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.item);
    
  return scored;
}
