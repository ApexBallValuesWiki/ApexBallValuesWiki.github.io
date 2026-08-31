// ============================================================================
// Single source of truth for every category/rarity/section used across the
// site's navigation, WIKI pages, and Values pages. Keep this in sync with
// site structure. Colors are placeholders in the black/white theme
// (accent grayscale + rarity-tinted borders only).
// ============================================================================

// --- Unit Rarities (used in both WIKI > Units and Values > Units) ----------
// All rarities enabled to display all 148 units from the Ball TD stat sheet.
export const UNIT_RARITIES = [
  'Normie',
  'Shiny Normie',
  'Odds',
  'Shiny Odds',
  'Rares',
  'Shiny Rares',
  'Awesome',
  'Shiny Awesome',
  'Legendaries',
  'Shiny Legendaries',
  'Mythics',
  'Shiny Mythics',
  'Transcendents',
  'Shiny Transcendents',
  'Omegas',
  'Shiny Omegas',
  '???',
  'Shiny ???',
];

export const ALL_UNIT_RARITIES = [
  'Normie',
  'Shiny Normie',
  'Odds',
  'Shiny Odds',
  'Rares',
  'Shiny Rares',
  'Awesome',
  'Shiny Awesome',
  'Legendaries',
  'Shiny Legendaries',
  'Mythics',
  'Shiny Mythics',
  'Transcendents',
  'Shiny Transcendents',
  'Omegas',
  'Shiny Omegas',
  '???',
  'Shiny ???',
];

// --- Unit "type" classification (gameplay role) -----------------------------
export const UNIT_TYPES = ['DPS', 'Economy', 'Support', 'Summoner'];

// --- Unit category tags (obtainability / event status) ---------------------
export const UNIT_CATEGORIES = ['Standard', 'Seasonal', 'Exclusive', 'Unobtainable'];

// --- Items ------------------------------------------------------------------
export const ITEM_CONSUMABLES = [
  'Frost Key',
  'Hard Frost Key',
  'Moth Ball Potion',
  'V.I.P',
  '3x Speed',
  '4x Speed',
  '+50% More Gems',
  'More Storage',
];

export const ITEM_MATERIALS = [
  "Horseman's Cloak",
  'Rock',
  'Icicle',
  'Gold',
  'Perfect Circle',
  'Obsidian',
  'Pumpkin',
  'Hardened Snowflake',
  'Crooked Twig',
  'Molten Core',
  'Twig',
  'Moth Essence',
  'Magnum Opus',
  'Heart String',
  'Scribble',
  'Moth Core',
  'Eternal Snowflake',
];

export const ITEM_CURRENCIES = ['Gems', 'Coins', 'Christmas Tokens', 'Exp'];

export const ITEM_CRATES = [
  'Frozen Crate',
  'Royal Crate',
  'Mausoleum Crate',
  'Rock Crate',
  'Forest Crate',
  'Greek Crate',
  'Quest Crate',
  'Abstract Crate',
  'Holo Crate',
  'Lucky Crate',
  'Museum Crate',
  'Faberge Crate',
  'Circus Crate',
  'Baller Crate',
  'Super Present Crate',
  'Naughty Crate',
  'Christmas Crate',
  'Lovely Skin Crate',
  'Creepy Costume Crate',
  'Banner Crate',
  'Starter Crate',
  'Monkey Crate',
  'UltraBanner',
  'MapBanner',
  'Illegal Crate',
  'Super Illegal Crate',
  'Turkey Crate',
  'Valentines Crate',
];

// --- Maps --------------------------------------------------------------------
export const MAPS = [
  'DoodleMap',
  'IsleOfBalls',
  'MountainsMap',
  'ForestMap',
  'TheHallows',
  'InfernoAbyss',
  'Tundra',
  'HoloPlains',
  'Golden Castle',
  'Toxic Wasteland',
  'Railroad',
  'Skybound Isles',
  'SkyCastle',
  'Museum',
  'IsleOfBalls???',
  'SantasWorkshop',
  'Pyramids',
  'HallowManor',
];

// --- Traits --------------------------------------------------------------------
export const TRAITS = [
  'Strength',
  'Sizeup2x',
  'Sizeup',
  'Shiny',
  'Reflexes',
  'Ranger',
  'Party Hat',
  'Money Printer',
  'Money Bags',
  'Merged',
  'Melee',
  'Lightning',
  'Explody',
  'Divine',
  "Crone's eye",
  'Cool',
  'Binoculars',
];

// --- Skins (per-rarity skin lists; identical lists reused for Shiny Skins) --
export const SKIN_CATEGORIES = [
  'Normie',
  'Odd',
  'Rare',
  'Awesome',
  'Legendary',
  'Mythic',
  'Deluxe',
  '???',
];

export const SKINS = {
  Normie: [
    'Alaballster',
    'Battle Scarred Ball',
    'Bone Psycho',
    'Chimney Ball',
    'DaZomby',
    'Enlightened Ball',
    'Fallen Angel Ball',
    'Franken Grug',
    'Goop Ball',
    'Holy Water Ball',
    'IcySurvivor',
    "Jack O' Ball",
    'Jolly Ball',
    'Poison Bauballe',
    'Polluted Beach Ball',
    'Snow Globall',
    'Spooky Lights Ball',
    'Super Scary Ball',
  ],
  Odd: [
    'Abandoned CyborgBall',
    'Ball but with a huge hat',
    'Chained Overseer',
    'Covid Ball',
    'Desert Rose',
    'Hiker',
    'Ice Noob',
    'M80 Firecracker',
    'Mini the MiniBaller',
    'Party Clown',
    'Role Reversal',
    'Snowman Snowman Builder',
    'Toy Cadet',
    'Wreath Man',
  ],
  Rare: [
    'Disco Contender',
    'Dummy Man',
    'Frost Demon',
    'Frycook',
    'Heartbreaker',
    'Jolly Chimp',
    'Love Master',
    'Meat Ball',
    'Pilot 2.0',
    'Sinister MB',
    'Wilted Ball',
    'Witch of Misfortune',
    'Zombrain Ball',
  ],
  Awesome: ['Crypt Pumpking', 'Darkness Ball', 'Healing Ball', 'Mime Jester', 'Trampoline Kid'],
  Legendary: [
    'Abominable Snow Golem',
    'Backwoodsman',
    'Blood Moon Ball',
    'Dusty Rose',
    'Mausoleum Ball',
    'Xenon Crusader',
    'Puppet Man',
    'Queen Of Shattered Hearts',
    'The Roaring Ball',
    'Sinister Drill MechaBall',
    'Sinister LMG',
  ],
  Mythic: [
    'Bit Crusher',
    'Creeking Whisp',
    'Cursed King',
    'Mecha Santa',
    'Soul Collector',
    'The Ghastly One',
  ],
  Deluxe: ['God Of Hats', 'Hat Bank', 'Hat Trick'],
  '???': ['Chud Worm', 'Mr. Clark', 'Present Of Doom', 'The Spoon Man', 'True Ooze Master'],
};

// ============================================================================
// TRADE CALCULATOR — FORMULA CONSTANTS
// TradeValue = BaseValue × DemandMultiplier × ScarcityMultiplier
// ============================================================================
export const DEMAND = {
  Abysmal: 0.94,
  'Extremely Low': 0.95,
  'Very Low': 0.96,
  Low: 0.97,
  'Below Average': 0.98,
  'Slightly Below Average': 0.99,
  Normal: 1.0,
  'Slightly Above Average': 1.01,
  'Above Average': 1.02,
  High: 1.03,
  'Very High': 1.04,
  'Extremely High': 1.05,
  Godly: 1.06,
};

export const SCARCITY = {
  Flooded: 0.98,
  Common: 0.99,
  Standard: 1.0,
  Limited: 1.01,
  Rare: 1.02,
};

export const DEMAND_LABELS = Object.keys(DEMAND);
export const SCARCITY_LABELS = Object.keys(SCARCITY);

// ============================================================================
// RARITY COLORS
// ----------------------------------------------------------------------------
// Each rarity has a 6-stop palette (light → dark). `glow` (the brightest
// stop) is used as the solid glow color for rarity name/labels. The full
// array is used as a left-to-right gradient for card accent borders/stripes.
// "Shiny <Rarity>" variants reuse their base rarity's palette.
// ============================================================================
export const RARITY_PALETTES = {
  Normie: ['#C0C0C0', '#BDBDBD', '#B0B0B0', '#A8A8A8', '#959595', '#8F8F8F'],
  Odd: ['#33A033', '#2E8B2E', '#238B23', '#206B20', '#155A15', '#0F4F0F'],
  Rare: ['#0CEDE8', '#08E9E4', '#08E6E1', '#08DAD6', '#06D2CE', '#04C9C5'],
  Awesome: ['#C04DFF', '#B42EFF', '#A81AF5', '#9A00E8', '#8A00D0', '#7500B5'],
  Legendary: ['#FFB84D', '#FFAA33', '#FF9E1F', '#F59010', '#E08000', '#C56E00'],
  Mythic: ['#FF6B6B', '#F55A5A', '#EB4848', '#E03838', '#C82828', '#B01E1E'],
  Transcendent: ['#5FE8A8', '#48E098', '#33D888', '#20C878', '#18B068', '#109858'],
  Omega: ['#3020B0', '#2818A0', '#201090', '#180880', '#100470', '#080060'],
};

// Maps a full rarity name (as used in UNIT_RARITIES, including "Shiny X" and
// "???" variants) to its base palette key above.
const RARITY_ALIAS = {
  Normie: 'Normie',
  'Shiny Normie': 'Normie',
  Normies: 'Normie',
  'Shiny Normies': 'Normie',
  Odds: 'Odd',
  'Shiny Odds': 'Odd',
  Rares: 'Rare',
  'Shiny Rares': 'Rare',
  Awesome: 'Awesome',
  'Shiny Awesome': 'Awesome',
  Legendaries: 'Legendary',
  'Shiny Legendaries': 'Legendary',
  Mythics: 'Mythic',
  'Shiny Mythics': 'Mythic',
  Transcendents: 'Transcendent',
  'Shiny Transcendents': 'Transcendent',
  Omegas: 'Omega',
  'Shiny Omegas': 'Omega',
  '???': 'Omega',
  'Shiny ???': 'Omega',
};

export function getRarityPalette(rarityName) {
  const key = RARITY_ALIAS[rarityName] || rarityName;
  return RARITY_PALETTES[key] || RARITY_PALETTES.Normie;
}

export function getRarityGlow(rarityName) {
  return getRarityPalette(rarityName)[0];
}

export function isShinyRarity(rarityName) {
  return typeof rarityName === 'string' && rarityName.startsWith('Shiny');
}

// ============================================================================
// DEMAND / SCARCITY BAR COLORS
// ----------------------------------------------------------------------------
// Demand runs dark red (Abysmal, worst) through the spectrum to purple
// (Godly, best). Scarcity runs red (Flooded — lots of copies) to purple
// (Rare — very few copies). Both power the filled progress bars on unit
// value cards.
// ============================================================================
export const DEMAND_COLORS = {
  Abysmal: '#4d0000',
  'Extremely Low': '#7a0000',
  'Very Low': '#a30000',
  Low: '#c92a00',
  'Below Average': '#e05a00',
  'Slightly Below Average': '#e8890a',
  Normal: '#e0c400',
  'Slightly Above Average': '#a8d400',
  'Above Average': '#55c93e',
  High: '#14bf7a',
  'Very High': '#14a3bf',
  'Extremely High': '#4d6fe0',
  Godly: '#9b30ff',
};

export const SCARCITY_COLORS = {
  Flooded: '#a30000',
  Common: '#e05a00',
  Standard: '#e0c400',
  Limited: '#55c93e',
  Rare: '#9b30ff',
};

// Percent fill (0-100) for each tier, used to size the progress bar fill.
export const DEMAND_PERCENT = Object.fromEntries(
  DEMAND_LABELS.map((label, i) => [label, Math.round(((i + 1) / DEMAND_LABELS.length) * 100)])
);

export const SCARCITY_PERCENT = Object.fromEntries(
  SCARCITY_LABELS.map((label, i) => [label, Math.round(((i + 1) / SCARCITY_LABELS.length) * 100)])
);