/**
 * Achievement System — tracks progress and unlocks badges
 */

const ACHIEVEMENTS_KEY = 'apex-achievements-v1';
const PROGRESS_KEY = 'apex-achievement-progress-v1';

// All trackable pages for Explorer achievement
const ALL_PAGES = [
  '/', '/wiki', '/wiki/units/Normie', '/wiki/maps', '/wiki/crates',
  '/values', '/values/units/Normie', '/values/calculator', '/values/crates',
  '/minigames', '/minigames/ball-knowledge', '/minigames/ballonomics', '/minigames/balling',
  '/achievements', '/credits',
];

// Achievement definitions
export const ACHIEVEMENTS = [
  // Ball Knowledge
  { id: 'bk-beginner', name: 'Beginner', desc: 'Get 1 correct Ball Knowledge answer', icon: '🧠', category: 'Ball Knowledge', goal: 1, stat: 'bk_correct' },
  { id: 'bk-skilled', name: 'Skilled', desc: 'Get 10 correct Ball Knowledge answers', icon: '🧠', category: 'Ball Knowledge', goal: 10, stat: 'bk_correct' },
  { id: 'bk-pro', name: 'Pro', desc: 'Get 35 correct Ball Knowledge answers', icon: '🧠', category: 'Ball Knowledge', goal: 35, stat: 'bk_correct' },
  { id: 'bk-legend', name: 'Legend', desc: 'Get 50 correct Ball Knowledge answers', icon: '🧠', category: 'Ball Knowledge', goal: 50, stat: 'bk_correct' },
  { id: 'bk-master', name: 'Master', desc: 'Get 75 correct Ball Knowledge answers', icon: '🧠', category: 'Ball Knowledge', goal: 75, stat: 'bk_correct' },
  { id: 'bk-champion', name: 'Champion', desc: 'Get 100 correct Ball Knowledge answers', icon: '🧠', category: 'Ball Knowledge', goal: 100, stat: 'bk_correct' },

  // Ball Knowledge Special
  { id: 'bk-speed', name: 'Speed Demon', desc: 'Complete Ball Knowledge in under 10 seconds', icon: '⚡', category: 'Ball Knowledge', goal: 1, stat: 'bk_speed_run' },
  { id: 'bk-perfect', name: 'Perfectionist', desc: 'Get 5 Ball Knowledge answers in a row', icon: '🔥', category: 'Ball Knowledge', goal: 1, stat: 'bk_streak_5' },
  { id: 'bk-200', name: 'Encyclopedia', desc: 'Get 200 correct Ball Knowledge answers', icon: '📚', category: 'Ball Knowledge', goal: 200, stat: 'bk_correct' },
  { id: 'bk-impossible-win', name: 'Down to the Wire', desc: 'Solve an Impossible Ball Knowledge puzzle', icon: '💀', category: 'Ball Knowledge', goal: 1, stat: 'bk_impossible_win' },
  { id: 'bk-nightmare-win', name: 'Nightmare Slayer', desc: 'Solve a Nightmare Ball Knowledge puzzle', icon: '☠️', category: 'Ball Knowledge', goal: 1, stat: 'bk_nightmare_win' },
  { id: 'bk-endless-5', name: 'Endless V', desc: 'Reach level 5 in Ball Knowledge Endless', icon: '♾️', category: 'Ball Knowledge', goal: 5, stat: 'bk_endless_best' },
  { id: 'bk-endless-15', name: 'Endless XV', desc: 'Reach level 15 in Ball Knowledge Endless', icon: '🌀', category: 'Ball Knowledge', goal: 15, stat: 'bk_endless_best' },

  // Ballonomics
  { id: 'bono-first', name: 'First Call', desc: 'Make your first correct Ballonomics call', icon: '📈', category: 'Ballonomics', goal: 1, stat: 'bono_correct' },
  { id: 'bono-sense', name: 'Market Sense', desc: 'Make 25 correct Ballonomics calls', icon: '📊', category: 'Ballonomics', goal: 25, stat: 'bono_correct' },
  { id: 'bono-master', name: 'Market Master', desc: 'Make 100 correct Ballonomics calls', icon: '💼', category: 'Ballonomics', goal: 100, stat: 'bono_correct' },
  { id: 'bono-perfect', name: 'Perfect Market', desc: 'Score 9/9 on a Ballonomics daily', icon: '🎯', category: 'Ballonomics', goal: 1, stat: 'bono_daily_perfect' },
  { id: 'bono-streak', name: 'Hot Hand', desc: 'Reach a 10 chain in Ballonomics Endless', icon: '🔥', category: 'Ballonomics', goal: 1, stat: 'bono_endless_streak_10' },

  // Balling
  { id: 'ball-first', name: 'Sharp Eye', desc: 'Solve your first Balling puzzle', icon: '👁️', category: 'Balling', goal: 1, stat: 'balling_solved' },
  { id: 'ball-ten', name: 'Blurred Lines', desc: 'Solve 10 Balling puzzles', icon: '🟪', category: 'Balling', goal: 10, stat: 'balling_solved' },
  { id: 'ball-eagle', name: 'Eagle Eye', desc: 'Solve 25 Balling puzzles', icon: '🦅', category: 'Balling', goal: 25, stat: 'balling_solved' },
  { id: 'ball-pixel', name: 'Pixel Perfect', desc: 'Solve a Balling puzzle at the very first pixel stage', icon: '🔎', category: 'Balling', goal: 1, stat: 'balling_pixel_perfect' },
  { id: 'ball-chain-5', name: 'Chain Reaction', desc: 'Solve 5 Balling Quick Play rounds in a row', icon: '⛓️', category: 'Balling', goal: 1, stat: 'balling_quick_streak_5' },

  // Theme
  { id: 'theme-pioneer', name: 'Theme Pioneer', desc: 'Create your first custom theme', icon: '🎨', category: 'Theme', goal: 1, stat: 'themes_created' },
  { id: 'theme-designer', name: 'Theme Designer', desc: 'Create and share a theme', icon: '🎨', category: 'Theme', goal: 1, stat: 'themes_shared' },
  { id: 'theme-collector', name: 'Theme Collector', desc: 'Import/export 5+ themes', icon: '🎨', category: 'Theme', goal: 5, stat: 'themes_imported' },

  // Social
  { id: 'social-butterfly', name: 'Social Butterfly', desc: 'Share 10 trades', icon: '🦋', category: 'Social', goal: 10, stat: 'trades_shared' },
  { id: 'bug-hunter', name: 'Bug Hunter', desc: 'Report 5 bugs', icon: '🐛', category: 'Social', goal: 5, stat: 'bugs_reported' },

  // General
  { id: 'gen-explorer', name: 'Explorer', desc: 'Visit every page on the site', icon: '🗺️', category: 'General', goal: ALL_PAGES.length, stat: 'pages_visited_all' },
  { id: 'gen-veteran', name: 'Veteran', desc: 'Use the site for 30+ days', icon: '🏅', category: 'General', goal: 30, stat: 'days_active' },
  { id: 'gen-devotee', name: 'Daily Devotee', desc: 'Visit 7 days in a row', icon: '📅', category: 'General', goal: 7, stat: 'daily_streak' },
  { id: 'gen-completionist', name: 'Completionist', desc: 'Unlock all achievements', icon: '🏆', category: 'General', goal: 0, stat: 'achievements_unlocked' },
];

// Completionist must always track "every OTHER achievement" — derive the goal
// from the list itself so it can never go stale again.
ACHIEVEMENTS.find((a) => a.id === 'gen-completionist').goal = ACHIEVEMENTS.length - 1;

// Load progress from localStorage
function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// Save progress to localStorage
function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch { /* ignore */ }
}

// Load unlocked achievements
function loadUnlocked() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// Save unlocked achievements
function saveUnlocked(unlocked) {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
  } catch { /* ignore */ }
}

// Increment a stat and check for unlocks
export function incrementStat(stat, amount = 1) {
  const progress = loadProgress();
  progress[stat] = (progress[stat] || 0) + amount;
  saveProgress(progress);
  checkUnlocks();
}

// Set a stat to a specific value
export function setStat(stat, value) {
  const progress = loadProgress();
  progress[stat] = value;
  saveProgress(progress);
  checkUnlocks();
}

// Check if any achievements should be unlocked
export function checkUnlocks() {
  const progress = loadProgress();
  const unlocked = loadUnlocked();
  const unlockedIds = new Set(unlocked.map(a => a.id));
  let newUnlocks = [];

  for (const ach of ACHIEVEMENTS) {
    if (unlockedIds.has(ach.id)) continue;

    // Special: Completionist checks if all others are unlocked
    if (ach.id === 'gen-completionist') {
      const otherAchs = ACHIEVEMENTS.filter(a => a.id !== 'gen-completionist');
      const allUnlocked = otherAchs.every(a => unlockedIds.has(a.id));
      if (allUnlocked) {
        newUnlocks.push({ ...ach, unlockedAt: new Date().toISOString() });
      }
      continue;
    }

    // Special: Explorer checks if all pages visited
    if (ach.stat === 'pages_visited_all') {
      const visited = progress.visited_pages || [];
      if (ALL_PAGES.every(p => visited.includes(p))) {
        newUnlocks.push({ ...ach, unlockedAt: new Date().toISOString() });
      }
      continue;
    }

    // Standard stat check
    const current = progress[ach.stat] || 0;
    if (current >= ach.goal) {
      newUnlocks.push({ ...ach, unlockedAt: new Date().toISOString() });
    }
  }

  if (newUnlocks.length > 0) {
    const updated = [...unlocked, ...newUnlocks];
    saveUnlocked(updated);

    // Dispatch event for UI to show notification
    for (const ach of newUnlocks) {
      window.dispatchEvent(new CustomEvent('apex-achievement-unlocked', { detail: ach }));
    }
  }

  return newUnlocks;
}

// Get all achievements with their current progress
export function getAchievements() {
  const progress = loadProgress();
  const unlocked = loadUnlocked();
  const unlockedMap = new Map(unlocked.map(a => [a.id, a]));

  return ACHIEVEMENTS.map(ach => {
    const isUnlocked = unlockedMap.has(ach.id);
    const unlockedData = unlockedMap.get(ach.id);

    let current = 0;
    if (ach.stat === 'pages_visited_all') {
      const visited = new Set(progress.visited_pages || []);
      current = ALL_PAGES.filter((page) => visited.has(page)).length;
    } else if (ach.id === 'gen-completionist') {
      current = unlocked.length;
    } else {
      current = progress[ach.stat] || 0;
    }

    return {
      ...ach,
      current: Math.min(current, ach.goal),
      progress: Math.min(1, current / ach.goal),
      isUnlocked,
      unlockedAt: unlockedData?.unlockedAt || null,
    };
  });
}

// Track a page visit
export function trackPageVisit(path) {
  const progress = loadProgress();
  if (!progress.visited_pages) progress.visited_pages = [];
  const cleanPath = path.split('?')[0].split('#')[0];
  if (!progress.visited_pages.includes(cleanPath)) {
    progress.visited_pages.push(cleanPath);
  }
  saveProgress(progress);
  checkUnlocks();
}

// Track daily visit and streak
export function trackDailyVisit() {
  const progress = loadProgress();
  const today = new Date().toISOString().slice(0, 10);

  if (!progress.last_visit_date) {
    progress.last_visit_date = today;
    progress.daily_streak = 1;
    progress.days_active = 1;
    progress.visit_dates = [today];
  } else {
    if (!progress.visit_dates) progress.visit_dates = [];
    if (!progress.visit_dates.includes(today)) {
      progress.visit_dates.push(today);
      progress.days_active = (progress.days_active || 0) + 1;

      // Check if yesterday was visited (streak continues)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (progress.last_visit_date === yesterday) {
        progress.daily_streak = (progress.daily_streak || 0) + 1;
      } else if (progress.last_visit_date !== today) {
        progress.daily_streak = 1; // Reset streak
      }
      progress.last_visit_date = today;
    }
  }

  saveProgress(progress);
  checkUnlocks();
}

// Get unlocked count
export function getUnlockedCount() {
  return loadUnlocked().length;
}

// Get total achievement count
export function getTotalCount() {
  return ACHIEVEMENTS.length;
}
