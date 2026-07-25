const TAG_RULES = [
  ['AoE', /\bAoE\b|\bAoe\b|area/i],
  ['Melee', /melee|fist|sword|punch|smack|jab/i],
  ['Gun', /gun|cannon|shot|bullet|laser|railgun|armcannon|minigun/i],
  ['Pierce', /pierce/i],
  ['Summon', /summon|clon|spawn|unit summon/i],
  ['Boost', /boost|booster|buff/i],
  ['Economy', /cash|income|coin|money|generation|per wave|per second/i],
  ['Stun', /stun/i],
  ['Slow', /slow|frozen|ice/i],
  ['Fire DoT', /fire dot|burn|fire/i],
  ['Poison DoT', /poison dot|poison|venom/i],
  ['Ricochet', /ricochet|bounce/i],
  ['Ability', /ability/i],
  ['Health', /health|regen/i],
  ['Missile', /missile|rocket/i],
  ['Barrier', /barrier|wall|sack/i],
];

export function getUnitTags(unit) {
  const raw = `${unit?.rawType || ''} ${unit?.type || ''} ${Object.keys(unit?.minMaxStats || {}).join(' ')}`;
  const tags = TAG_RULES.filter(([, regex]) => regex.test(raw)).map(([tag]) => tag);

  if (unit?.shiny) tags.unshift('Shiny');

  return [...new Set(tags)];
}
