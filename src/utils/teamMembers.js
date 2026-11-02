// TEAM ROSTER — must mirror TEAM_ROLES in scripts/cloudflare-proxy-worker.js
// exactly (same addresses, same roles). The worker is the source of truth
// for authentication; this file drives the client UI (role badges, gates).
// Roles: owner | admin | editor. Editors can edit both Values and WIKI;
// admins additionally manage announcements, bug reports and maintenance.
// Verified against the worker by src/utils/teamMembers.test.js.
export const TEAM_MEMBERS = {
  'gustavo.rb1410@gmail.com': { name: 'Gustavo', roleKey: 'owner', roleLabel: 'Owner', icon: '👑' },
  'bananatempest25@gmail.com': { name: 'Nemuiito', roleKey: 'admin', roleLabel: 'Co-Owner', icon: '👑' },
  'johnmustard129@gmail.com': { name: 'Silly Goober', roleKey: 'admin', roleLabel: 'Admin', icon: '🎩' },
  'isaacconnan@gmail.com': { name: 'Izak', roleKey: 'admin', roleLabel: 'Admin', icon: '🎩' },
  'bigbig4780@gmail.com': { name: 'Horren Balls', roleKey: 'editor', roleLabel: 'Editor', icon: '📃' },
  'mnlghtapexhelper@gmail.com': { name: 'Moonlight', roleKey: 'editor', roleLabel: 'Editor', icon: '🌙' },
  'knwasdo@gmail.com': { name: 'Knwasdo', roleKey: 'editor', roleLabel: 'Editor', icon: '📝' },
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
