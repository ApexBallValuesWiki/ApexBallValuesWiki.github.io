export const TEAM_MEMBERS = {
  'gustavo.rb1410@gmail.com': { name: 'Gustavo', roleKey: 'owner', roleLabel: 'Owner', icon: '👑' },
  'bananatempest25@gmail.com': { name: 'Nemuiito', roleKey: 'admin_plus', roleLabel: 'Admin+', icon: '🎩' },
  'treymurphy3rd@gmail.com': { name: 'DancyBalls', roleKey: 'value_editor', roleLabel: 'Value Editor', icon: '💵' },
  'destroyha3@gmail.com': { name: 'Nose', roleKey: 'value_editor', roleLabel: 'Value Editor', icon: '💵' },
  'gloomy302010@gmail.com': { name: 'Gloomy', roleKey: 'admin', roleLabel: 'Admin', icon: '🔨' },
  'jiteaianis@gmail.com': { name: 'Amethyst', roleKey: 'wiki_editor', roleLabel: 'WIKI Editor', icon: '📃' },
  'dakingnub@gmail.com': { name: 'Nub', roleKey: 'wiki_editor', roleLabel: 'WIKI Editor', icon: '📃' },
  'johnmustard129@gmail.com': { name: 'Silly Goober', roleKey: 'wiki_editor', roleLabel: 'WIKI Editor', icon: '📃' },
  'alieldaw6@gmail.com': { name: 'Kron3d', roleKey: 'lead_wiki_editor', roleLabel: 'Lead WIKI Editor', icon: '👑' },
  'hungryaistukas@gmail.com': { name: 'Hungry', roleKey: 'value_editor', roleLabel: 'Value Editor', icon: '💵' },
  'luquitas290414@gmail.com': { name: 'Nooberto', roleKey: 'wiki_editor', roleLabel: 'WIKI Editor', icon: '📃' },
  'hellfiregamingytt@gmail.com': { name: 'Hellfire', roleKey: 'value_editor', roleLabel: 'Value Editor', icon: '💵' },
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
