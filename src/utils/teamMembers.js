// TEAM ROSTER — must mirror TEAM_ROLES in scripts/cloudflare-proxy-worker.js
// exactly (same addresses, same roles). The worker is the source of truth
// for authentication; this file drives the client UI (role badges, gates).
// Roles: owner | admin | editor. Editors can edit both Values and WIKI;
// admins additionally manage announcements, bug reports and maintenance.
export const TEAM_MEMBERS = {
  'gustavo.rb1410@gmail.com': { name: 'Gustavo', roleKey: 'owner', roleLabel: 'Owner', icon: '👑' },
  'bananatempest25@gmail.com': { name: 'Nemuiito', roleKey: 'admin', roleLabel: 'Admin', icon: '🎩' },
  'treymurphy3rd@gmail.com': { name: 'DancyBalls', roleKey: 'admin', roleLabel: 'Admin', icon: '🎩' },
  'johnmustard129@gmail.com': { name: 'Silly Goober', roleKey: 'admin', roleLabel: 'Admin', icon: '🎩' },
  'destroyha3@gmail.com': { name: 'Nose', roleKey: 'editor', roleLabel: 'Editor', icon: '✏️' },
  'gloomy302010@gmail.com': { name: 'Gloomy', roleKey: 'editor', roleLabel: 'Editor', icon: '✏️' },
  'alieldaw6@gmail.com': { name: 'Kron3d', roleKey: 'editor', roleLabel: 'Editor', icon: '✏️' },
  'hungryaistukas@gmail.com': { name: 'Hungry', roleKey: 'editor', roleLabel: 'Editor', icon: '✏️' },
  'luquitas290414@gmail.com': { name: 'Nooberto', roleKey: 'editor', roleLabel: 'Editor', icon: '✏️' },
};

export function getTeamMember(email) {
  if (!email) return { name: 'Anonymous', roleLabel: 'Editor', icon: '👤' };
  const clean = String(email).trim().toLowerCase();
  return TEAM_MEMBERS[clean] || { name: clean.split('@')[0], roleLabel: 'Editor', icon: '👤' };
}

export function getDisplayName(email, withRole = false) {
  const m = getTeamMember(email);
  return withRole ? `${m.name} ${m.icon} (${m.roleLabel})` : `${m.name} ${m.icon}`;
}
