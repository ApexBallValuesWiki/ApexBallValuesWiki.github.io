import { UNIT_RARITIES } from './taxonomy';
import { GENERATED_UNITS } from './generated/units.generated';
import { slugify } from '../utils/slug';
import { normalizeAttacks } from '../utils/attacks';

// ============================================================================
// UNITS DATABASE
// ----------------------------------------------------------------------------
// Data is sourced from the community "Ball TD Units stat sheet", parsed by
// scripts/parse_units.py + scripts/build_units_js.py into
// src/data/generated/units.generated.js (GENERATED_UNITS).
//
// Shiny units are generated from the base units here so the WIKI can show
// both base rarity pages and Shiny rarity pages without duplicating the giant
// stat sheet by hand.
// ============================================================================

export const UNIT_OVERRIDES = {
  // 'ball': { description: 'The original Ball. Everyone starts here.' },
};

const SHINY_DAMAGE_MULTIPLIER = 1.5;
const SHINY_PARTYMAN_RANGE_MULTIPLIER = 1.3;
const SHINY_PARTYMAN_COOLDOWN_MULTIPLIER = 0.7;

const UTILITY_MINMAX_KEYS = /cooldown|range|health|income|cash|coin|gem|amount|level|duration|multiplier|buff|wait|spawn|max|crystal|energy|count|bullet|pierce|spacing|bounce|slam|threshold/i;

function applyOverrides(unit) {
  const override = UNIT_OVERRIDES[unit.slug];
  return override ? { ...unit, ...override } : unit;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function trimNumber(value) {
  return Number(value.toFixed(2)).toString();
}

function formatScaledNumber(value, preferredSuffix = '') {
  const abs = Math.abs(value);
  const suffix = preferredSuffix || (abs >= 1_000_000_000 ? 'B' : abs >= 1_000_000 ? 'M' : abs >= 1_000 ? 'K' : '');
  const divisor = suffix === 'B' ? 1_000_000_000 : suffix === 'M' ? 1_000_000 : suffix === 'K' ? 1_000 : 1;
  return `${trimNumber(value / divisor)}${suffix}`;
}

function scaleNumbersInString(raw, multiplier) {
  if (raw == null) return raw;
  return String(raw).replace(/(^|[^A-Za-z])(-?\d[\d,]*(?:\.\d+)?)([KMB]?)(?![A-Za-z])/gi, (match, prefix, numberPart, suffix = '') => {
    const cleaned = numberPart.replace(/,/g, '');
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return match;

    const suffixUpper = suffix.toUpperCase();
    const unitMultiplier = suffixUpper === 'B' ? 1_000_000_000 : suffixUpper === 'M' ? 1_000_000 : suffixUpper === 'K' ? 1_000 : 1;
    const scaled = parsed * unitMultiplier * multiplier;
    return `${prefix}${formatScaledNumber(scaled, suffixUpper)}`;
  });
}

function scaleObjectEntries(source, shouldScale, multiplier) {
  return Object.fromEntries(
    Object.entries(source || {}).map(([key, value]) => [key, shouldScale(key, value) ? scaleNumbersInString(value, multiplier) : value])
  );
}

function shouldScaleDamageStat(key) {
  return /damage/i.test(key);
}

function shouldScaleMinMaxDamage(key) {
  if (UTILITY_MINMAX_KEYS.test(key)) return false;
  // Most non-utility min/max keys are attack names (Melee, Aoe, Gun, Laser,
  // Pierce, etc.) whose values represent damage ranges.
  return true;
}

function createShinyUnit(baseUnit) {
  const unit = deepClone(baseUnit);
  const isPartyMan = unit.slug === 'partyman';

  unit.baseSlug = baseUnit.slug;
  unit.slug = `shiny-${baseUnit.slug}`;
  unit.name = `Shiny ${baseUnit.name}`;
  unit.rarity = `Shiny ${baseUnit.rarity}`;
  unit.shiny = true;

  if (isPartyMan) {
    unit.minMaxStats = scaleObjectEntries(unit.minMaxStats, (key) => /cooldown/i.test(key), SHINY_PARTYMAN_COOLDOWN_MULTIPLIER);
    unit.minMaxStats = scaleObjectEntries(unit.minMaxStats, (key) => /range/i.test(key), SHINY_PARTYMAN_RANGE_MULTIPLIER);
    unit.upgrades = (unit.upgrades || []).map((upgrade) => ({
      ...upgrade,
      cooldown: scaleNumbersInString(upgrade.cooldown, SHINY_PARTYMAN_COOLDOWN_MULTIPLIER),
      range: scaleNumbersInString(upgrade.range, SHINY_PARTYMAN_RANGE_MULTIPLIER),
    }));
  } else {
    unit.minMaxStats = scaleObjectEntries(unit.minMaxStats, shouldScaleMinMaxDamage, SHINY_DAMAGE_MULTIPLIER);
    unit.upgrades = (unit.upgrades || []).map((upgrade) => ({
      ...upgrade,
      stats: scaleObjectEntries(upgrade.stats, shouldScaleDamageStat, SHINY_DAMAGE_MULTIPLIER),
      attacks: normalizeAttacks(upgrade.attacks).map((attack) => ({
        name: attack.name,
        stats: scaleObjectEntries(attack.stats, shouldScaleDamageStat, SHINY_DAMAGE_MULTIPLIER),
      })),
      dps: scaleObjectEntries(upgrade.dps, () => true, SHINY_DAMAGE_MULTIPLIER),
      costPerDps: scaleNumbersInString(upgrade.costPerDps, 1 / SHINY_DAMAGE_MULTIPLIER),
    }));
  }

  return applyOverrides(unit);
}

export const EXTRA_STATIC_UNITS = [
  {
    "slug": "cube",
    "name": "Cube",
    "rarity": "???",
    "type": "DPS",
    "rawType": "Basic DPS(Range)",
    "category": "Standard",
    "categories": [
      "Standard"
    ],
    "documented": true,
    "customUnit": true,
    "valueRaw": "1",
    "coinsRaw": "N/A",
    "gemsRaw": "N/A",
    "placementLimit": "4",
    "totalCost": "15.5K$",
    "obtain": [
      "Banner Crate",
      "Abstract Crate"
    ],
    "passive": null,
    "ability": null,
    "synergy": null,
    "unavailableData": false,
    "upgrades": [
      {
        "level": 1,
        "label": "Placement",
        "isMax": false,
        "cost": 800.0,
        "costRaw": "800$",
        "description": null,
        "cooldown": "2.0",
        "range": "15",
        "stats": {},
        "attacks": [
          {
            "name": "Laser",
            "stats": {
              "Damage": "150"
            }
          }
        ],
        "dps": {
          "Laser": "75.00"
        },
        "costPerDps": "10.67$"
      },
      {
        "level": 2,
        "label": "Upgrade 1",
        "isMax": true,
        "cost": 1500.0,
        "costRaw": "1500$",
        "description": "Double Laser Blast",
        "cooldown": "1.8",
        "range": "18",
        "stats": {},
        "attacks": [
          {
            "name": "Laser",
            "stats": {
              "Damage": "300"
            }
          }
        ],
        "dps": {
          "Laser": "166.67"
        },
        "costPerDps": "9.00$"
      }
    ],
    "minMaxStats": {
      "Cooldown": "2.0 -> 1.8",
      "Range": "15 -> 18",
      "Damage": "150 -> 300"
    }
  },
  {
    "slug": "nemesis",
    "name": "Nemesis",
    "rarity": "???",
    "type": "DPS",
    "rawType": "Area DPS(AoE)",
    "category": "Standard",
    "categories": [
      "Standard"
    ],
    "documented": true,
    "customUnit": true,
    "valueRaw": "1",
    "coinsRaw": "N/A",
    "gemsRaw": "N/A",
    "placementLimit": "2",
    "totalCost": "45.0K$",
    "obtain": [
      "Royal Crate",
      "Banner Crate"
    ],
    "passive": "Inflicts doom on enemies within range",
    "ability": "Nemesis Wave",
    "synergy": null,
    "unavailableData": false,
    "upgrades": [
      {
        "level": 1,
        "label": "Placement",
        "isMax": false,
        "cost": 2500.0,
        "costRaw": "2500$",
        "description": null,
        "cooldown": "3.5",
        "range": "20",
        "stats": {},
        "attacks": [
          {
            "name": "Doom Wave",
            "stats": {
              "Damage": "800"
            }
          }
        ],
        "dps": {
          "Doom Wave": "228.57"
        },
        "costPerDps": "10.94$"
      },
      {
        "level": 2,
        "label": "Upgrade 1",
        "isMax": true,
        "cost": 5000.0,
        "costRaw": "5000$",
        "description": "Infinite Sorrow",
        "cooldown": "3.0",
        "range": "25",
        "stats": {},
        "attacks": [
          {
            "name": "Doom Wave",
            "stats": {
              "Damage": "2000"
            }
          }
        ],
        "dps": {
          "Doom Wave": "666.67"
        },
        "costPerDps": "7.50$"
      }
    ],
    "minMaxStats": {
      "Cooldown": "3.5 -> 3.0",
      "Range": "20 -> 25",
      "Damage": "800 -> 2000"
    }
  }
];

export const BASE_UNITS = [...GENERATED_UNITS.map(applyOverrides), ...EXTRA_STATIC_UNITS.map(applyOverrides)];
export const SHINY_UNITS = BASE_UNITS.map(createShinyUnit);
export const ALL_UNITS = [...BASE_UNITS, ...SHINY_UNITS];

export const UNITS_BY_RARITY = Object.fromEntries(
  UNIT_RARITIES.map((rarity) => [rarity, ALL_UNITS.filter((u) => u.rarity === rarity)])
);

export function getUnitBySlug(slug) {
  const normalized = slugify(slug);
  return ALL_UNITS.find((u) => u.slug === normalized);
}

export function getUnitsByType(type) {
  return ALL_UNITS.filter((u) => u.type === type);
}

export function getUnitsByCategory(category) {
  return ALL_UNITS.filter((u) => u.category === category);
}
