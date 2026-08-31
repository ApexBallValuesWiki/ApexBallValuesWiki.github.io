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

export function createShinyUnit(baseUnit) {
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

// ============================================================================
// REAL UNITS ADDED MANUALLY
// ----------------------------------------------------------------------------
// These exist in the game but were once managed by the (now removed) custom
// unit system — they are ordinary units now, same as the generated ones.
// Images/descriptions still come from their live WIKI overrides in KV.
// (Cube and Nemesis were removed from the site by owner decision.)
// ============================================================================
export const EXTRA_STATIC_UNITS = [
  {
    "slug": "lifeguardball",
    "name": "LifeguardBall",
    "rarity": "Mythics",
    "type": "DPS + Support",
    "rawType": "DPS + Support",
    "category": "Standard",
    "categories": [
      "Standard"
    ],
    "documented": true,
    "valueRaw": "1",
    "placementLimit": "1",
    "totalCost": "$1.49M",
    "obtain": [
      "Beach Crate"
    ],
    "passive": null,
    "ability": "Save:\n- 20s cooldown\n- 2s stun shield",
    "synergy": null,
    "unavailableData": false,
    "upgrades": [
      {
        "dps": {
          "DPS": "14.28k"
        },
        "cost": 2750,
        "isMax": false,
        "label": "Placement",
        "level": 1,
        "range": "10",
        "stats": {
          "Pierce": "2",
          "Bullets": "1"
        },
        "attacks": [
          {
            "name": "Gun",
            "stats": {
              "Damage": "25k"
            }
          }
        ],
        "costRaw": "$2.75k",
        "cooldown": "1.75",
        "costPerDps": "$0.19",
        "description": null
      },
      {
        "dps": {
          "DPS": "14.28k →  28.97k"
        },
        "cost": 20000,
        "isMax": false,
        "label": "Upgrade 1",
        "level": 2,
        "range": "10 → 13",
        "stats": {
          "Pierce": "2",
          "Bullets": "1"
        },
        "attacks": [
          {
            "name": "Gun",
            "stats": {
              "Damage": "25k → 50.7k"
            }
          }
        ],
        "costRaw": "$20k",
        "cooldown": "1.75",
        "costPerDps": "$0.79",
        "description": "Lifeguard on duty!"
      },
      {
        "dps": {
          "DPS": "28.97k → 46.11k"
        },
        "cost": 42500,
        "isMax": false,
        "label": "Upgrade 2",
        "level": 3,
        "range": "13 → 14",
        "stats": {
          "Pierce": "2",
          "Bullets": "1"
        },
        "attacks": [
          {
            "name": "Gun",
            "stats": {
              "Damage": "50.7k → 80.7k"
            }
          }
        ],
        "costRaw": "$42.5k",
        "cooldown": "1.75",
        "costPerDps": "$1.41",
        "description": "Always on the lookout."
      },
      {
        "dps": {
          "DPS": "46.11k → 74.57k"
        },
        "cost": 67500,
        "isMax": false,
        "label": "Upgrade 3",
        "level": 4,
        "range": "14",
        "stats": {
          "Pierce": "2",
          "Bullets": "1"
        },
        "attacks": [
          {
            "name": "Gun",
            "stats": {
              "Damage": "80.7k → 130.5k"
            }
          }
        ],
        "costRaw": "$67.5k",
        "cooldown": "1.75",
        "costPerDps": "$1.78",
        "description": "Safety is my top priority."
      },
      {
        "dps": {
          "DPS": "74.57k → 128.4k"
        },
        "cost": 167000,
        "isMax": false,
        "label": "Upgrade 4",
        "level": 5,
        "range": "14",
        "stats": {
          "Pierce": "2",
          "Bullets": "1"
        },
        "attacks": [
          {
            "name": "Gun",
            "stats": {
              "Damage": "130.5k → 160.5k"
            }
          }
        ],
        "costRaw": "$167k",
        "cooldown": "1.75 → 1.25",
        "costPerDps": "$2.33",
        "description": "Don’t do anything dumb now!"
      },
      {
        "dps": {
          "DPS": "128.4k → 160.4k"
        },
        "cost": 295000,
        "isMax": false,
        "label": "Upgrade 5",
        "level": 6,
        "range": "14 → 16",
        "stats": {
          "Pierce": "2",
          "Bullets": "1"
        },
        "attacks": [
          {
            "name": "Gun",
            "stats": {
              "Damage": "160.5k → 200.5k"
            }
          }
        ],
        "costRaw": "$295k",
        "cooldown": "1.25",
        "costPerDps": "$3.71",
        "description": "Always apply that sunscreen!"
      },
      {
        "dps": {
          "DPS": "160.4k → 192.4k"
        },
        "cost": 375000,
        "isMax": false,
        "label": "Upgrade 6",
        "level": 7,
        "range": "16 → 18",
        "stats": {
          "Pierce": "2",
          "Bullets": "1"
        },
        "attacks": [
          {
            "name": "Gun",
            "stats": {
              "Damage": "200.5k → 240.5k"
            }
          }
        ],
        "costRaw": "$375k",
        "cooldown": "1.25",
        "costPerDps": "$5.04",
        "description": "Get those extra-floaty floaties!"
      },
      {
        "dps": {
          "DPS": "192.4k → 300.5k"
        },
        "cost": 525000,
        "isMax": true,
        "label": "Upgrade 7(MAX)",
        "level": 8,
        "range": "18 → 20",
        "stats": {
          "Pierce": "2",
          "Bullets": "1"
        },
        "attacks": [
          {
            "name": "Gun",
            "stats": {
              "Damage": "240.5k → 300.5k"
            }
          }
        ],
        "costRaw": "525k",
        "cooldown": "1.25 → 1",
        "costPerDps": "$4.97",
        "description": "Hey hey HEY DON’T CROSS THAT TAPE!!!"
      }
    ],
    "minMaxStats": {
      "Range": "10 -> 20",
      "Pierce": "2 -> 2",
      "Bullets": "1 -> 1",
      "Cooldown": "1.75 -> 1",
      "Gun/Damage": "25k -> 300.5k"
    }
  },
  {
    "slug": "jellyfishball",
    "name": "JellyFishBall",
    "rarity": "Mythics",
    "type": "DPS ",
    "rawType": "AoE cone",
    "category": "Standard",
    "categories": [
      "Standard"
    ],
    "documented": true,
    "valueRaw": "1",
    "placementLimit": "2",
    "totalCost": "$790.25k",
    "obtain": [
      "Illegals",
      "Super Illegals",
      "Beach crate"
    ],
    "passive": "Poison\n",
    "ability": "N/A",
    "synergy": "N/A",
    "unavailableData": false,
    "upgrades": [
      {
        "dps": {
          "DPS": "6.25k",
          "DoT DPS": "110"
        },
        "cost": 1750,
        "isMax": false,
        "label": "Placement",
        "level": 1,
        "range": "10",
        "stats": {},
        "attacks": [
          {
            "name": "AoE",
            "stats": {
              "Damage": "12.5k"
            }
          }
        ],
        "costRaw": "$1.75k",
        "cooldown": "2",
        "costPerDps": "$0.28",
        "description": null
      },
      {
        "dps": {
          "DPS": "9.25k",
          "DoT DPS": "100"
        },
        "cost": 17500,
        "isMax": false,
        "label": "Upgrade 1",
        "level": 2,
        "range": "15",
        "stats": {},
        "attacks": [
          {
            "name": "AoE",
            "stats": {
              "Damage": "18.5k"
            }
          }
        ],
        "costRaw": "$17.5k",
        "cooldown": "2",
        "costPerDps": "$2.06",
        "description": "Spotted Jelly"
      },
      {
        "dps": {
          "DPS": "15.42k",
          "DoT DPS": "110"
        },
        "cost": 32750,
        "isMax": false,
        "label": "Upgrade 2",
        "level": 3,
        "range": "15",
        "stats": {},
        "attacks": [
          {
            "name": "AoE",
            "stats": {
              "Damage": "27k"
            }
          }
        ],
        "costRaw": "$32.75k",
        "cooldown": "1.75",
        "costPerDps": "$2.11",
        "description": "Moon Jelly"
      },
      {
        "dps": {
          "DPS": "26k",
          "DoT DPS": "110"
        },
        "cost": 65000,
        "isMax": false,
        "label": "Upgrade 3",
        "level": 4,
        "range": "16",
        "stats": {},
        "attacks": [
          {
            "name": "AoE",
            "stats": {
              "Damage": "45.5k"
            }
          }
        ],
        "costRaw": "$65k",
        "cooldown": "1.75",
        "costPerDps": "$3.55",
        "description": "Atlantic Sea Nettle"
      },
      {
        "dps": {
          "DPS": "43.3k",
          "DoT DPS": "110"
        },
        "cost": 95000,
        "isMax": false,
        "label": "Upgrade 4",
        "level": 5,
        "range": "18",
        "stats": {},
        "attacks": [
          {
            "name": "AoE",
            "stats": {
              "Damage": "65k"
            }
          }
        ],
        "costRaw": "$95k",
        "cooldown": "1.5",
        "costPerDps": "$4.27",
        "description": "Lion's Mane Jelly"
      },
      {
        "dps": {
          "DPS": "60k",
          "DoT DPS": "110"
        },
        "cost": 125000,
        "isMax": false,
        "label": "Upgrade 5",
        "level": 6,
        "range": "18",
        "stats": {},
        "attacks": [
          {
            "name": "AoE",
            "stats": {
              "Damage": "90k"
            }
          }
        ],
        "costRaw": "$125k",
        "cooldown": "1.5",
        "costPerDps": "$5.16",
        "description": "Man O'War"
      },
      {
        "dps": {
          "DPS": "83.3k",
          "DoT DPS": "110"
        },
        "cost": 195000,
        "isMax": false,
        "label": "Upgrade 6",
        "level": 7,
        "range": "20",
        "stats": {},
        "attacks": [
          {
            "name": "AoE",
            "stats": {
              "Damage": "125k"
            }
          }
        ],
        "costRaw": "$195k",
        "cooldown": "1.5",
        "costPerDps": "$6.06",
        "description": "Irukanji Jelly"
      },
      {
        "dps": {
          "DPS": "100k",
          "DoT DPS": "110"
        },
        "cost": 285000,
        "isMax": false,
        "label": "Upgrade 7",
        "level": 8,
        "range": "20",
        "stats": {},
        "attacks": [
          {
            "name": "AoE",
            "stats": {
              "Damage": "150k"
            }
          }
        ],
        "costRaw": "$285k",
        "cooldown": "1.5",
        "costPerDps": "$7.89",
        "description": "Sea Wasp"
      }
    ],
    "minMaxStats": {
      "Aoe": "12.5k → 150k",
      "Range": "10 → 20",
      "Cooldown": "2 → 1.5"
    }
  },
  {
    "slug": "kingofhearts",
    "name": "KingOfHearts",
    "rarity": "Transcendents",
    "type": "DPS",
    "rawType": "Unit",
    "category": "Standard",
    "categories": [
      "Standard"
    ],
    "documented": true,
    "valueRaw": "1",
    "placementLimit": null,
    "totalCost": null,
    "obtain": [],
    "passive": null,
    "ability": null,
    "synergy": null,
    "unavailableData": false,
    "upgrades": [],
    "minMaxStats": {}
  },
  {
    "slug": "nightmareball",
    "name": "NightmareBall",
    "rarity": "Omegas",
    "type": "DPS",
    "rawType": "Basic DPS(Melee) + Basic DPS(Melee) + AoE",
    "category": "Seasonal",
    "categories": [
      "Seasonal"
    ],
    "documented": true,
    "valueRaw": "1",
    "placementLimit": "1",
    "totalCost": null,
    "obtain": [],
    "passive": "N/A",
    "ability": "N/A",
    "synergy": "N/A",
    "unavailableData": false,
    "upgrades": [],
    "minMaxStats": {}
  },
  {
    "slug": "sandcastleball",
    "name": "SandcastleBall",
    "rarity": "Legendaries",
    "type": "DPS",
    "rawType": "Unit",
    "category": "Standard",
    "categories": [
      "Standard"
    ],
    "documented": true,
    "valueRaw": "1",
    "placementLimit": null,
    "totalCost": null,
    "obtain": [],
    "passive": null,
    "ability": null,
    "synergy": null,
    "unavailableData": false,
    "upgrades": [],
    "minMaxStats": {}
  },
  {
    "slug": "frutigerball",
    "name": "FrutigerBall",
    "rarity": "Transcendents",
    "type": "DPS",
    "rawType": "Custom Unit",
    "category": "Standard",
    "categories": [
      "Standard"
    ],
    "documented": true,
    "valueRaw": "1",
    "placementLimit": "1",
    "totalCost": "2,067,500",
    "obtain": [
      "Beach Crate"
    ],
    "passive": "Every 5th attack, shoots water instead; deals less damage but temporarily slows enemies",
    "ability": null,
    "synergy": "Level 2: Ocean power. Grantes 7% attack speed and 10% range to water, ocean, and beach-themed units",
    "unavailableData": false,
    "upgrades": [
      {
        "dps": {
          "DPS": "55,250"
        },
        "cost": 5000,
        "isMax": false,
        "label": "Placement",
        "level": 1,
        "range": "10",
        "stats": {},
        "attacks": [
          {
            "name": "Aoe",
            "stats": {
              "Damage": "45.5k"
            }
          },
          {
            "name": "Melee",
            "stats": {
              "Damage": "65k"
            }
          },
          {
            "name": "Aoe (2)",
            "stats": {
              "Damage": "30k"
            }
          }
        ],
        "costRaw": "5k",
        "cooldown": "2",
        "costPerDps": "0.09",
        "description": null
      },
      {
        "dps": {
          "Dps": "76,250"
        },
        "cost": 27500,
        "isMax": false,
        "label": "Upgrade 1",
        "level": 2,
        "range": "15",
        "stats": {},
        "attacks": [
          {
            "name": "Aoe",
            "stats": {
              "Damage": "67.5k"
            }
          },
          {
            "name": "Melee",
            "stats": {
              "Damage": "85k"
            }
          },
          {
            "name": "Aoe (2)",
            "stats": {
              "Damage": "40.5K"
            }
          }
        ],
        "costRaw": "27.5k",
        "cooldown": "2",
        "costPerDps": "0.36",
        "description": "Soaked!"
      },
      {
        "dps": {
          "Dps": "127,142",
          "Passive": "Gains Ocean Power buff"
        },
        "cost": 45000,
        "isMax": false,
        "label": "Upgrade 2",
        "level": 3,
        "range": "15",
        "stats": {},
        "attacks": [
          {
            "name": "Aoe",
            "stats": {
              "Damage": "97.5k"
            }
          },
          {
            "name": "Melee",
            "stats": {
              "Damage": "125k"
            }
          },
          {
            "name": "Aoe (2)",
            "stats": {
              "Damage": "55.5k"
            }
          }
        ],
        "costRaw": "45k",
        "cooldown": "1.75",
        "costPerDps": "0.35",
        "description": "Greater bubble impact!"
      },
      {
        "dps": {
          "Dps": "177,142"
        },
        "cost": 150000,
        "isMax": false,
        "label": "Upgrade 3",
        "level": 4,
        "range": "15",
        "stats": {},
        "attacks": [
          {
            "name": "Aoe",
            "stats": {
              "Damage": "145k"
            }
          },
          {
            "name": "Melee",
            "stats": {
              "Damage": "165k"
            }
          },
          {
            "name": "Aoe (2)",
            "stats": {
              "Damage": "67.5k"
            }
          }
        ],
        "costRaw": "150k",
        "cooldown": "1.75",
        "costPerDps": "0.85",
        "description": "More bubbles? Got it."
      },
      {
        "dps": {
          "Dps": "285,714"
        },
        "cost": 265000,
        "isMax": false,
        "label": "Upgrade 4",
        "level": 5,
        "range": "15",
        "stats": {},
        "attacks": [
          {
            "name": "Aoe",
            "stats": {
              "Damage": "225k"
            }
          },
          {
            "name": "Melee",
            "stats": {
              "Damage": "275k"
            }
          },
          {
            "name": "Aoe (2)",
            "stats": {
              "Damage": "92.5k"
            }
          }
        ],
        "costRaw": "265k",
        "cooldown": "1.75",
        "costPerDps": "0.93",
        "description": "Increased cyclone pressure!"
      },
      {
        "dps": {
          "Dps": "440k"
        },
        "cost": 575000,
        "isMax": false,
        "label": "Upgrade 5",
        "level": 6,
        "range": "15",
        "stats": {},
        "attacks": [
          {
            "name": "Aoe",
            "stats": {
              "Damage": "325k"
            }
          },
          {
            "name": "Melee",
            "stats": {
              "Damage": "445k"
            }
          },
          {
            "name": "Aoe (2)",
            "stats": {
              "Damage": "125k"
            }
          }
        ],
        "costRaw": "575k",
        "cooldown": "1.75",
        "costPerDps": "1.3",
        "description": "Heavier water!"
      },
      {
        "dps": {
          "Dps": "671,428"
        },
        "cost": 1000000,
        "isMax": false,
        "label": "Upgrade 6",
        "level": 7,
        "range": "15",
        "stats": {},
        "attacks": [
          {
            "name": "Aoe",
            "stats": {
              "Damage": "525k"
            }
          },
          {
            "name": "Melee",
            "stats": {
              "Damage": "650k"
            }
          },
          {
            "name": "Aoe (2)",
            "stats": {
              "Damage": "275k"
            }
          }
        ],
        "costRaw": "1M",
        "cooldown": "1.75",
        "costPerDps": "1.5",
        "description": "The ocean's at its most powerful!"
      }
    ],
    "minMaxStats": {
      "Aoe": "45.5k → 525k",
      "Melee": "30k → 275k",
      "Range": "10 → 15",
      "Aoe (2)": "30k → 275k",
      "Cooldown": "2 → 1.5"
    }
  },
  {
    "slug": "urchinball",
    "name": "UrchinBall",
    "rarity": "Awesome",
    "type": "DPS",
    "rawType": "Unit",
    "category": "Standard",
    "categories": [
      "Standard"
    ],
    "documented": true,
    "valueRaw": "1",
    "placementLimit": null,
    "totalCost": null,
    "obtain": [],
    "passive": null,
    "ability": null,
    "synergy": null,
    "unavailableData": false,
    "upgrades": [],
    "minMaxStats": {}
  },
  {
    "slug": "fabledsurfer",
    "name": "FabledSurfer",
    "rarity": "Omegas",
    "type": "DPS",
    "rawType": "AoE",
    "category": "Standard",
    "categories": [
      "Standard"
    ],
    "documented": true,
    "valueRaw": "1",
    "placementLimit": "1",
    "totalCost": "-",
    "obtain": [
      "Beach Crate"
    ],
    "passive": "N/A",
    "ability": "AOE 2 ability (UNSURE OF HOW LONG)",
    "synergy": "N/A",
    "unavailableData": false,
    "upgrades": [
      {
        "dps": {},
        "cost": null,
        "isMax": false,
        "label": "Placement",
        "level": 1,
        "range": null,
        "stats": {},
        "attacks": [],
        "costRaw": null,
        "cooldown": null,
        "costPerDps": null,
        "description": null
      },
      {
        "dps": {},
        "cost": null,
        "isMax": false,
        "label": "Upgrade 1",
        "level": 2,
        "range": "16",
        "stats": {},
        "attacks": [],
        "costRaw": null,
        "cooldown": "2",
        "costPerDps": null,
        "description": null
      },
      {
        "dps": {},
        "cost": null,
        "isMax": false,
        "label": "Upgrade 2",
        "level": 3,
        "range": "16 -> 18",
        "stats": {},
        "attacks": [
          {
            "name": "Stats",
            "stats": {
              "AOE": "",
              "damage": "425K -> 655K"
            }
          }
        ],
        "costRaw": "150000 (150k)",
        "cooldown": "2 -> 2",
        "costPerDps": null,
        "description": "Cowabunga."
      },
      {
        "dps": {},
        "cost": null,
        "isMax": false,
        "label": "Upgrade 3",
        "level": 4,
        "range": "20 -> 20",
        "stats": {},
        "attacks": [
          {
            "name": "Stats",
            "stats": {
              "AOE": "",
              "damage": "345K -> 485K"
            }
          }
        ],
        "costRaw": "275000 (275k)",
        "cooldown": "2 -> 2",
        "costPerDps": null,
        "description": null
      },
      {
        "dps": {},
        "cost": null,
        "isMax": false,
        "label": "Upgrade 4",
        "level": 5,
        "range": "20 -> 20",
        "stats": {},
        "attacks": [],
        "costRaw": "525000 (525k)",
        "cooldown": "2 -> 2",
        "costPerDps": null,
        "description": null
      },
      {
        "dps": {},
        "cost": 750000,
        "isMax": false,
        "label": "Upgrade 5",
        "level": 6,
        "range": "20 -> 20",
        "stats": {},
        "attacks": [],
        "costRaw": "750k",
        "cooldown": "2 -> 2",
        "costPerDps": null,
        "description": null
      },
      {
        "dps": {},
        "cost": 1650000,
        "isMax": false,
        "label": "Upgrade 6",
        "level": 7,
        "range": "20 -> 20",
        "stats": {},
        "attacks": [],
        "costRaw": "1.65M",
        "cooldown": "2 -> 2",
        "costPerDps": null,
        "description": null
      },
      {
        "dps": {},
        "cost": 2150000,
        "isMax": false,
        "label": "Upgrade 7",
        "level": 8,
        "range": "20 -> 20",
        "stats": {},
        "attacks": [],
        "costRaw": "2.15M",
        "cooldown": "2 -> 1.75",
        "costPerDps": null,
        "description": null
      },
      {
        "dps": {},
        "cost": 3750000,
        "isMax": false,
        "label": "Upgrade 8",
        "level": 9,
        "range": "20 -> 20",
        "stats": {},
        "attacks": [],
        "costRaw": "3.75M",
        "cooldown": "1.75 -> 1.5",
        "costPerDps": null,
        "description": null
      },
      {
        "dps": {},
        "cost": 6500000,
        "isMax": false,
        "label": "Upgrade 9",
        "level": 10,
        "range": "20 -> 20",
        "stats": {},
        "attacks": [
          {
            "name": "Stats",
            "stats": {
              "AOE": "",
              "Damage": "3.25M -> 4.5M"
            }
          }
        ],
        "costRaw": "6.5M",
        "cooldown": "1.5 -> 1",
        "costPerDps": null,
        "description": null
      }
    ],
    "minMaxStats": {
      "Range": "15 → 20",
      "Cone_Aoe": "165K → 3.65M",
      "Cooldown": "2 → 1",
      "Full_Aoe (2)": "150K → 4.25M"
    }
  },
  {
    "slug": "fishball",
    "name": "FishBall",
    "rarity": "Rares",
    "type": "DPS",
    "rawType": "Basic DPS ( Melee)",
    "category": "Standard",
    "categories": [
      "Standard"
    ],
    "documented": true,
    "valueRaw": "1",
    "placementLimit": "5",
    "totalCost": "25k",
    "obtain": [
      "Beach Crate"
    ],
    "passive": null,
    "ability": null,
    "synergy": "Fishballs buff each other with a limit of 8\nRange: increases by 1.125x per Fishball\nCooldown: becomes faster by 0.975x per Fishball\nDamage: increases by 1.07x~ per Fishball",
    "unavailableData": false,
    "upgrades": [
      {
        "dps": {
          "DPS": "83.33"
        },
        "cost": 300,
        "isMax": false,
        "label": "Placement",
        "level": 1,
        "range": "10",
        "stats": {},
        "attacks": [
          {
            "name": "Melee",
            "stats": {
              "Damage": "50"
            }
          }
        ],
        "costRaw": "$300",
        "cooldown": "0.6",
        "costPerDps": "3.6",
        "description": null
      },
      {
        "dps": {
          "DPS": "125"
        },
        "cost": 400,
        "isMax": false,
        "label": "Upgrade 1",
        "level": 2,
        "range": "10",
        "stats": {},
        "attacks": [
          {
            "name": "Melee",
            "stats": {
              "Damage": "75"
            }
          }
        ],
        "costRaw": "$400",
        "cooldown": "0.6",
        "costPerDps": "$5.6",
        "description": "Fishy business "
      },
      {
        "dps": {
          "DPS": "125 → 141.67"
        },
        "cost": 650,
        "isMax": false,
        "label": "Upgrade 2",
        "level": 3,
        "range": "10",
        "stats": {},
        "attacks": [
          {
            "name": "Melee",
            "stats": {
              "Damage": "75 → 85"
            }
          }
        ],
        "costRaw": "$650",
        "cooldown": "0.6",
        "costPerDps": "$9.53",
        "description": "Spitty business"
      },
      {
        "dps": {
          "DPS": "141.67 → 150"
        },
        "cost": 900,
        "isMax": false,
        "label": "Upgrade 3",
        "level": 4,
        "range": "10",
        "stats": {},
        "attacks": [
          {
            "name": "Melee",
            "stats": {
              "Damage": "85 → 90"
            }
          }
        ],
        "costRaw": "$900",
        "cooldown": "0.6",
        "costPerDps": "$15",
        "description": "Slimy business"
      },
      {
        "dps": {
          "DPS": "150 → 175"
        },
        "cost": 1750,
        "isMax": false,
        "label": "Upgrade 4",
        "level": 5,
        "range": "10",
        "stats": {},
        "attacks": [
          {
            "name": "Melee",
            "stats": {
              "Damage": "90 → 105"
            }
          }
        ],
        "costRaw": "1.75k",
        "cooldown": "0.6",
        "costPerDps": "$22.86",
        "description": "Wet business"
      },
      {
        "dps": {
          "DPS": "183.33"
        },
        "cost": 4500,
        "isMax": false,
        "label": "Upgrade 5",
        "level": 6,
        "range": "10",
        "stats": {},
        "attacks": [
          {
            "name": "Melee",
            "stats": {
              "Damage": "105 → 110"
            }
          }
        ],
        "costRaw": "4.5k",
        "cooldown": "0.6",
        "costPerDps": "$46.36",
        "description": "Floody business"
      },
      {
        "dps": {
          "DPS": "183.33 → 200"
        },
        "cost": 6500,
        "isMax": false,
        "label": "Upgrade 6",
        "level": 7,
        "range": "10",
        "stats": {},
        "attacks": [
          {
            "name": "Melee",
            "stats": {
              "Damage": "110 → 120"
            }
          }
        ],
        "costRaw": "$6.5K",
        "cooldown": "0.6",
        "costPerDps": "$75",
        "description": "Pressurized business "
      },
      {
        "dps": {
          "DPS": "272.73"
        },
        "cost": 10000,
        "isMax": false,
        "label": "Upgrade 7",
        "level": 8,
        "range": "10 → 12",
        "stats": {},
        "attacks": [
          {
            "name": "Melee",
            "stats": {
              "Damage": "120 → 150"
            }
          }
        ],
        "costRaw": "$10k",
        "cooldown": "0.6 → 0.55",
        "costPerDps": "$91.67",
        "description": "Cyclonic business"
      }
    ],
    "minMaxStats": {
      "Melee": "50 → 150",
      "Range": "10 → 12",
      "Cooldown": "0.6 → 0.55"
    }
  },
  {
    "slug": "footballer",
    "name": "FootBaller",
    "rarity": "Mythics",
    "type": "DPS",
    "rawType": "Unit",
    "category": "Exclusive",
    "categories": [
      "Exclusive"
    ],
    "documented": true,
    "valueRaw": "1",
    "placementLimit": "1",
    "totalCost": "1.005M",
    "obtain": [
      "Vote for the Argentina vs Spain"
    ],
    "passive": "Ability Slows",
    "ability": "Super Strike - 60s",
    "synergy": null,
    "unavailableData": false,
    "upgrades": [
      {
        "dps": {
          "DPS": "2100"
        },
        "cost": 800,
        "isMax": false,
        "label": "Placement",
        "level": 1,
        "range": "14",
        "stats": {
          "Bounces": "2",
          "Ability AOE Range": "14 (Circle)"
        },
        "attacks": [
          {
            "name": "Football",
            "stats": {
              "Damage": "9K"
            }
          },
          {
            "name": "Super Strike (Ability)",
            "stats": {
              "Damage": "18K"
            }
          }
        ],
        "costRaw": "800",
        "cooldown": "5",
        "costPerDps": "0.38",
        "description": null
      },
      {
        "dps": {
          "DPS": "12.4K"
        },
        "cost": 15000,
        "isMax": false,
        "label": "Upgrade 1",
        "level": 2,
        "range": "14",
        "stats": {
          "Bounces": "2 -> 8",
          "Ability AOE Range": "14 -> 16 (Circle)"
        },
        "attacks": [
          {
            "name": "Football",
            "stats": {
              "Damage": "9K -> 36K"
            }
          },
          {
            "name": "Super Strike (Ability)",
            "stats": {
              "Damage": "18K -> 24K"
            }
          }
        ],
        "costRaw": "15K",
        "cooldown": "5 -> 3",
        "costPerDps": "1.27",
        "description": "World cup, we all say yup!"
      },
      {
        "dps": {
          "DPS": "27.83K"
        },
        "cost": 40000,
        "isMax": false,
        "label": "Upgrade 2",
        "level": 3,
        "range": "14 -> 15",
        "stats": {
          "Bounces": "8 -> 10",
          "Ability AOE Range": "16 -> 17 (Circle)"
        },
        "attacks": [
          {
            "name": "Football",
            "stats": {
              "Damage": "36K -> 54K"
            }
          },
          {
            "name": "Super Strike (Ability)",
            "stats": {
              "Damage": "24K -> 50K"
            }
          }
        ],
        "costRaw": "40K",
        "cooldown": "3 -> 2",
        "costPerDps": "2",
        "description": "World cup, everyone shut up!"
      },
      {
        "dps": {
          "DPS": "91.2K"
        },
        "cost": 135000,
        "isMax": false,
        "label": "Upgrade 3",
        "level": 4,
        "range": "15 -> 19",
        "stats": {
          "Bounces": "10 -> 15",
          "Ability AOE Range": "17 -> 18 (Circle)"
        },
        "attacks": [
          {
            "name": "Football",
            "stats": {
              "Damage": "54K -> 157.5K"
            }
          },
          {
            "name": "Super Strike (Ability)",
            "stats": {
              "Damage": "50K -> 72K"
            }
          }
        ],
        "costRaw": "135K",
        "cooldown": "2 -> 1.75",
        "costPerDps": "2.09",
        "description": "World cup, nobody's a grump!"
      },
      {
        "dps": {
          "DPS": "121.4K"
        },
        "cost": 315000,
        "isMax": false,
        "label": "Upgrade 4",
        "level": 5,
        "range": "19 -> 20",
        "stats": {
          "Bounces": "15 -> 20",
          "Ability AOE Range": "18 -> 19 (Circle)"
        },
        "attacks": [
          {
            "name": "Football",
            "stats": {
              "Damage": "157.5K -> 180K"
            }
          },
          {
            "name": "Super Strike (Ability)",
            "stats": {
              "Damage": "72K -> 88K"
            }
          }
        ],
        "costRaw": "315K",
        "cooldown": "1.75-1.5",
        "costPerDps": "4.95",
        "description": "World cup, I'm bouta blow up!"
      },
      {
        "dps": {
          "DPS": "182K"
        },
        "cost": 500000,
        "isMax": false,
        "label": "Upgrade 5",
        "level": 6,
        "range": "20",
        "stats": {
          "Bounces": "20 -> 30",
          "Ability AOE Range": "19 -> 20 (Circle)"
        },
        "attacks": [
          {
            "name": "Football",
            "stats": {
              "Damage": "180K -> 225K"
            }
          },
          {
            "name": "Super Strike (Ability)",
            "stats": {
              "Damage": "88K -> 124K"
            }
          }
        ],
        "costRaw": "500K",
        "cooldown": "1.5 -> 1.25",
        "costPerDps": "5.52",
        "description": "Two teams, one world cup!"
      }
    ],
    "minMaxStats": {
      "Range": "14 -> 20",
      "Damage": "9k + 18K -> 225K + 124K",
      "Bounces": "2 -> 30",
      "Cooldown": "5 -> 1.25"
    }
  },
  {
    "slug": "nemisisball",
    "name": "NemisisBall",
    "rarity": "???",
    "type": "DPS",
    "rawType": "DPS Unit",
    "category": "Unobtainable",
    "categories": [
      "Unobtainable"
    ],
    "documented": true,
    "valueRaw": "1",
    "placementLimit": null,
    "totalCost": null,
    "obtain": [
      "Custom Admin Unit"
    ],
    "passive": null,
    "ability": null,
    "synergy": null,
    "unavailableData": false,
    "upgrades": [],
    "minMaxStats": {}
  }
];

// Shiny variant with no base unit in the dataset — added directly so she
// keeps her own page instead of vanishing with the custom-unit system.
export const EXTRA_STATIC_SHINY_UNITS = [
  {
    "slug": "shiny-queenofhearts",
    "name": "Shiny QueenOfHearts",
    "rarity": "Shiny Transcendents",
    "type": "DPS",
    "rawType": "Unit",
    "category": "Standard",
    "categories": [
      "Standard"
    ],
    "documented": true,
    "valueRaw": "1",
    "placementLimit": null,
    "totalCost": null,
    "obtain": [],
    "passive": null,
    "ability": null,
    "synergy": null,
    "unavailableData": false,
    "upgrades": [],
    "minMaxStats": {}
  }
];

export const BASE_UNITS = [...GENERATED_UNITS.map(applyOverrides), ...EXTRA_STATIC_UNITS.map(applyOverrides)];
export const SHINY_UNITS = [...BASE_UNITS.map(createShinyUnit), ...EXTRA_STATIC_SHINY_UNITS.map(applyOverrides)];
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
