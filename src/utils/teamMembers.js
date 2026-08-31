// ============================================================================
// APEX TEAM ROSTER + ROLE CAPABILITIES
// ----------------------------------------------------------------------------
// Single source of truth for who is on the team and what each role may do.
// The KV worker keeps its own TEAM_ROLES map (server side); these keys must
// match it exactly, otherwise an editor passes login and is still blocked
// from Create/Delete by the capability check below.
// ============================================================================

// What each role is allowed to do. 'values' = Value Editor, 'wiki' = WIKI
// Editor + Create hub + unit/map/crate/skin/material deletion, 'fanart' =
// FanArt moderation.
export const ROLE_CAPS = {
  owner: ['values', 'wiki', 'fanart'],
  admin: ['values', 'wiki', 'fanart'],
  editor: ['values'],
};

export const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', editor: 'Editor' };
export const ROLE_ICONS = { owner: '👑', admin: '🛡️', editor: '✏️' };

export const TEAM_MEMBERS = {
  'gustavo.rb1410@gmail.com': 'owner',
  'bananatempest25@gmail.com': 'admin',
  'treymurphy3rd@gmail.com': 'admin',
  'johnmustard129@gmail.com': 'admin',
  'destroyha3@gmail.com': 'editor',
  'gloomy302010@gmail.com': 'editor',
  'alieldaw6@gmail.com': 'editor',
  'hungryaistukas@gmail.com': 'editor',
  'luquitas290414@gmail.com': 'editor',
};

export function cleanTeamEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/** Role key for an email, or null when the address is not on the roster. */
export function getTeamRole(email) {
  const clean = cleanTeamEmail(email);
  return TEAM_MEMBERS[clean] || null;
}

/** true when `role` holds the capability, false for unknown/missing roles. */
export function roleCan(role, cap) {
  if (!role || !cap) return false;
  const caps = ROLE_CAPS[String(role).toLowerCase()];
  return Array.isArray(caps) && caps.includes(cap);
}

/** Display record for the roster: name comes from the email local-part. */
export function getTeamMember(email) {
  const clean = cleanTeamEmail(email);
  const role = TEAM_MEMBERS[clean];
  if (!role) return { name: clean ? clean.split('@')[0] : 'Anonymous', role: null, roleLabel: 'Editor', icon: '👤' };
  return { name: clean.split('@')[0], role, roleLabel: ROLE_LABELS[role], icon: ROLE_ICONS[role] };
}

export function getDisplayName(email, withRole = false) {
  const m = getTeamMember(email);
  return withRole ? `${m.name} ${m.icon} (${m.roleLabel})` : `${m.name} ${m.icon}`;
}
