/**
 * Analytics — page views, feature usage, search tracking (owner only)
 */

const ANALYTICS_KEY = 'apex-analytics-v1';
const MAX_ENTRIES = 5000;

function loadAnalytics() {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    return raw ? JSON.parse(raw) : { pageViews: [], searches: [], features: [], editors: [] };
  } catch { return { pageViews: [], searches: [], features: [], editors: [] }; }
}

function saveAnalytics(data) {
  try {
    // Trim to max size
    if (data.pageViews.length > MAX_ENTRIES) data.pageViews = data.pageViews.slice(-MAX_ENTRIES);
    if (data.searches.length > MAX_ENTRIES) data.searches = data.searches.slice(-MAX_ENTRIES);
    if (data.features.length > MAX_ENTRIES) data.features = data.features.slice(-MAX_ENTRIES);
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function trackPageView(path) {
  const data = loadAnalytics();
  data.pageViews.push({ path, at: Date.now() });
  saveAnalytics(data);
}

export function trackSearch(query) {
  if (!query || !query.trim()) return;
  const data = loadAnalytics();
  data.searches.push({ query: query.trim(), at: Date.now() });
  saveAnalytics(data);
}

export function trackFeature(feature) {
  const data = loadAnalytics();
  data.features.push({ feature, at: Date.now() });
  saveAnalytics(data);
}

export function trackEditorAction(editor, action) {
  const data = loadAnalytics();
  data.editors.push({ editor, action, at: Date.now() });
  saveAnalytics(data);
}

// Aggregate stats for the analytics dashboard
export function getAnalyticsStats() {
  const data = loadAnalytics();
  const now = Date.now();
  const day = 86400000;
  const week = day * 7;

  // Page views
  const totalViews = data.pageViews.length;
  const weekViews = data.pageViews.filter(v => now - v.at < week).length;
  const dayViews = data.pageViews.filter(v => now - v.at < day).length;

  // Top pages
  const pageCount = {};
  data.pageViews.forEach(v => { pageCount[v.path] = (pageCount[v.path] || 0) + 1; });
  const topPages = Object.entries(pageCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Searches
  const searchCount = {};
  data.searches.forEach(s => { searchCount[s.query] = (searchCount[s.query] || 0) + 1; });
  const topSearches = Object.entries(searchCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Features
  const featureCount = {};
  data.features.forEach(f => { featureCount[f.feature] = (featureCount[f.feature] || 0) + 1; });
  const topFeatures = Object.entries(featureCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Editor activity
  const editorCount = {};
  data.editors.forEach(e => { editorCount[e.editor] = (editorCount[e.editor] || 0) + 1; });
  const topEditors = Object.entries(editorCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return {
    totalViews, weekViews, dayViews,
    topPages, topSearches, topFeatures, topEditors,
    totalSearches: data.searches.length,
    totalFeatures: data.features.length,
    totalEdits: data.editors.length,
  };
}
