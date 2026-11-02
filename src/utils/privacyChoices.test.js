import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { clearApexLocalData, getStatsChoice, saveStatsChoice } from './privacyChoices';
import { getAnalyticsStats, trackPageView, trackSearch } from './analytics';
import { loadRecentSearches, saveRecentSearch } from './searchHistory';
import { trackDailyVisit, trackPageVisit } from './achievements';

function storage() {
  const data = new Map();
  return {
    get length() { return data.size; },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', storage());
  vi.stubGlobal('sessionStorage', storage());
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe('local privacy choices', () => {
  it('does not record optional statistics or recent searches before opt-in', () => {
    expect(getStatsChoice()).toBeNull();
    trackPageView('/');
    trackSearch('unit');
    saveRecentSearch('unit');
    trackDailyVisit();
    trackPageVisit('/wiki');
    expect(localStorage.getItem('apex-analytics-v1')).toBeNull();
    expect(localStorage.getItem('apex-recent-searches-v1')).toBeNull();
    expect(localStorage.getItem('apex-achievement-progress-v1')).toBeNull();
    expect(getAnalyticsStats().totalSearches).toBe(0);
  });

  it('records when allowed, and removes optional history but preserves game progress after rejection', () => {
    localStorage.setItem('apex-achievement-progress-v1', JSON.stringify({ bk_correct: 9 }));
    saveStatsChoice(true);
    trackPageView('/wiki');
    trackSearch('ball');
    saveRecentSearch('Ball');
    trackDailyVisit();
    trackPageVisit('/wiki');
    expect(getAnalyticsStats().totalSearches).toBe(1);
    expect(loadRecentSearches()).toEqual(['Ball']);
    saveStatsChoice(false);
    expect(getStatsChoice()).toBe(false);
    expect(localStorage.getItem('apex-analytics-v1')).toBeNull();
    expect(localStorage.getItem('apex-recent-searches-v1')).toBeNull();
    expect(JSON.parse(localStorage.getItem('apex-achievement-progress-v1'))).toEqual({ bk_correct: 9 });
  });

  it('clears only this app’s local and session keys', () => {
    localStorage.setItem('apex-theme', 'dark');
    sessionStorage.setItem('apex-reload', '1');
    localStorage.setItem('unrelated-site-key', 'keep');
    clearApexLocalData();
    expect(localStorage.getItem('apex-theme')).toBeNull();
    expect(sessionStorage.getItem('apex-reload')).toBeNull();
    expect(localStorage.getItem('unrelated-site-key')).toBe('keep');
  });
});
