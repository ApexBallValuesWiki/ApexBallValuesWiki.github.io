// Consent for all OPTIONAL storage on this site. Essential storage (theme,
// accessibility preferences and the offline cache) never depends on consent.
// Optional local statistics and advertising default to OFF: nothing optional
// is written before the visitor (or their guardian) makes a choice.
//
// This is a first-party consent control, not a certified advertising CMP. Ads
// stay disabled until AdSense approval and a CMP review; see ENABLE-ADS.md.
export const PRIVACY_CHOICE_KEY = 'apex-privacy-choice-v2';
export const PRIVACY_CHANGE_EVENT = 'apex-privacy-choice-changed';
export const PRIVACY_OPEN_EVENT = 'apex-open-privacy-choices';

const LEGACY_STATS_KEY = 'apex-privacy-choice-v1';
const OPTIONAL_KEYS = ['apex-analytics-v1', 'apex-recent-searches-v1'];

export function getPrivacyChoice() {
  try {
    const raw = localStorage.getItem(PRIVACY_CHOICE_KEY) || localStorage.getItem(LEGACY_STATS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.localStats !== 'boolean') return null;
    return {
      version: 2,
      localStats: parsed.localStats,
      ads: parsed.ads === true,
      at: parsed.at || null,
    };
  } catch { return null; }
}

export function getStatsChoice() {
  return getPrivacyChoice()?.localStats ?? null;
}

export function localStatsAllowed() {
  return getStatsChoice() === true;
}

export function adsConsentAllowed() {
  return getPrivacyChoice()?.ads === true;
}

export function savePrivacyChoice({ localStats = false, ads = false } = {}) {
  const choice = { version: 2, localStats: Boolean(localStats), ads: Boolean(ads), at: new Date().toISOString() };
  try {
    localStorage.setItem(PRIVACY_CHOICE_KEY, JSON.stringify(choice));
    localStorage.removeItem(LEGACY_STATS_KEY);
    if (!choice.localStats) {
      // Rejecting removes optional usage history while preserving game progress.
      OPTIONAL_KEYS.forEach((key) => localStorage.removeItem(key));
      const progressKey = 'apex-achievement-progress-v1';
      const raw = localStorage.getItem(progressKey);
      if (raw) {
        const progress = JSON.parse(raw);
        for (const field of ['visited_pages', 'last_visit_date', 'visit_dates', 'daily_streak', 'days_active']) delete progress[field];
        localStorage.setItem(progressKey, JSON.stringify(progress));
      }
    }
  } catch { /* storage may be blocked */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PRIVACY_CHANGE_EVENT));
}

/** Back-compat helper used by the local-statistics callers. */
export function saveStatsChoice(allow) {
  const current = getPrivacyChoice();
  savePrivacyChoice({ localStats: Boolean(allow), ads: current?.ads === true });
}

export function openPrivacyChoices() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PRIVACY_OPEN_EVENT));
}

/** Remove this app's local keys only, not remote reports or other site data. */
export function clearApexLocalData() {
  try {
    for (const storage of [localStorage, sessionStorage]) {
      const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((key) => key?.startsWith('apex-'));
      keys.forEach((key) => storage.removeItem(key));
    }
  } catch { /* Browser storage may be unavailable. */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PRIVACY_CHANGE_EVENT));
    window.dispatchEvent(new Event('apex-admin-auth-changed'));
  }
}
