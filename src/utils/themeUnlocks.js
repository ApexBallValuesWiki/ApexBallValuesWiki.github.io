// ============================================================================
// REWARD THEMES — special themes/VFX unlocked by completing achievement
// sets. Admins (owner/admin on the roster) unlock everything, including the
// exclusive APEX Team theme. Pure logic lives in computeUnlocks so it is
// unit-testable without a browser; getUnlockedRewards reads live state.
// ============================================================================

import { ACHIEVEMENTS } from './achievements';
import { TEAM_MEMBERS } from './teamMembers';

export const REWARD_MODES = [
  { id: 'none', label: 'None', icon: '🚫', desc: 'No reward theme — just your colors and effects.' },
  { id: 'knowledge', label: 'Knowledge Rise', icon: '🧠', category: 'Ball Knowledge', color: '#7cff45', particles: true, desc: 'Glowing question marks rise up the background — pick any glyph.' },
  { id: 'ballonomics', label: 'Money Grid', icon: '📈', category: 'Ballonomics', color: '#ffd94d', desc: 'Coins + gems drawn onto the background grid itself.' },
  { id: 'retro', label: 'Retro Ball', icon: '🟪', category: 'Balling', color: '#ff7ad9', desc: 'Blocky UI with the Press Start 2P arcade font.' },
  { id: 'premium', label: 'Premium Aura', icon: '👑', category: 'General', color: '#ffd76a', desc: 'An aurora backdrop and gilded cards. The absolute beast.' },
  { id: 'admin', label: 'APEX Team', icon: '🎩', adminOnly: true, color: '#ffd76a', particles: true, desc: 'Exclusive for the team running this site — prestige rain and aura.' },
];

export const ACHIEVEMENTS_KEY = 'apex-achievements-v1';
export const ADMIN_EMAIL_KEY = 'apex-admin-email-v1';

function isCategoryComplete(unlocked, category) {
  return ACHIEVEMENTS
    .filter((a) => a.category === category)
    .every((a) => unlocked.has(a.id));
}

/** Pure: which reward themes are unlocked, given achievement ids + email. */
export function computeUnlocks({ unlockedIds = [], adminEmail = null } = {}) {
  const unlocked = new Set(unlockedIds);
  const member = adminEmail ? TEAM_MEMBERS[String(adminEmail).trim().toLowerCase()] : null;
  const isAdmin = Boolean(member && (member.roleKey === 'owner' || member.roleKey === 'admin'));

  const knowledge = isCategoryComplete(unlocked, 'Ball Knowledge');
  const ballonomics = isCategoryComplete(unlocked, 'Ballonomics');
  const retro = isCategoryComplete(unlocked, 'Balling');
  const premium = isCategoryComplete(unlocked, 'General');

  return {
    knowledge,
    ballonomics,
    retro,
    premium,
    admin: isAdmin,
    // Admins receive every theme's customization, unlocked or not.
    all: isAdmin || (knowledge && ballonomics && retro && premium),
  };
}

/** True when `mode` may be applied right now. */
export function isRewardAllowed(mode, unlocks) {
  if (!mode || mode === 'none') return true;
  const u = unlocks;
  if (!u) return false;
  if (mode === 'admin') return u.admin;
  // Admins (or a 100% completionist) may use every reward theme.
  return Boolean(u.all || u[mode]);
}

/** How many achievements remain in a reward's category (for lock labels). */
export function remainingFor(modeId) {
  const mode = REWARD_MODES.find((m) => m.id === modeId);
  if (!mode?.category) return 0;
  let unlocked = new Set();
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (raw) unlocked = new Set((JSON.parse(raw) || []).map((a) => a.id || a));
  } catch { /* storage unavailable */ }
  return ACHIEVEMENTS.filter((a) => a.category === mode.category && !unlocked.has(a.id)).length;
}

/** Live unlock state from localStorage (achievements + saved admin email). */
export function getUnlockedRewards() {
  let unlockedIds = [];
  let adminEmail = null;
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (raw) unlockedIds = (JSON.parse(raw) || []).map((a) => a.id || a);
  } catch { /* storage unavailable */ }
  try {
    adminEmail = localStorage.getItem(ADMIN_EMAIL_KEY);
  } catch { /* storage unavailable */ }
  return computeUnlocks({ unlockedIds, adminEmail });
}
