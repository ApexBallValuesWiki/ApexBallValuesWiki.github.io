// ============================================================================
// APEX VALUES & WIKI — DISCORD BOT (Cloudflare Worker)
// ============================================================================
// Deploy this as a separate Cloudflare Worker.
// It reads from your existing APEX_OVERRIDES KV namespace.
//
// SETUP:
// 1. Create a Discord Application at https://discord.com/developers/applications
// 2. Go to Bot tab → Create Bot → Copy the BOT TOKEN
// 3. Go to OAuth2 → URL Generator → Select "bot" + "applications.commands"
//    → Select permissions: "Send Messages", "Embed Links", "Use Slash Commands"
//    → Copy the generated URL → Open it to invite the bot to your server
// 4. Copy your APPLICATION ID from the General Information page
// 5. Deploy this worker with these environment variables:
//    - DISCORD_BOT_TOKEN: your bot token
//    - DISCORD_APPLICATION_ID: your application ID
//    - DISCORD_PUBLIC_KEY: your public key (from General Information)
//    - APEX_OVERRIDES: KV namespace binding (same as your main worker)
// 6. After deploying, run: POST /register-commands to register slash commands
// ============================================================================

const DISCORD_API = 'https://discord.com/api/v10';

// Slash command definitions
const COMMANDS = [
  {
    name: 'value',
    description: 'Look up a unit\'s current trade value',
    options: [
      {
        name: 'unit',
        description: 'Unit name or slug (e.g. "ball", "shiny ball", "grimreaper")',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'search',
    description: 'Search for units by name or rarity',
    options: [
      {
        name: 'query',
        description: 'Search term (e.g. "mythic", "shiny", "ball")',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'trade',
    description: 'Evaluate a trade between two sides',
    options: [
      {
        name: 'you',
        description: 'Your side: "unit:qty, unit:qty" (e.g. "ball:2, shiny ball:1")',
        type: 3,
        required: true,
      },
      {
        name: 'them',
        description: 'Their side: "unit:qty, unit:qty"',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'top',
    description: 'Show top valued units',
    options: [
      {
        name: 'count',
        description: 'How many units to show (default 10, max 25)',
        type: 4, // INTEGER
        required: false,
      },
    ],
  },
  {
    name: 'demand',
    description: 'Show demand distribution across all units',
  },
  {
    name: 'announcement',
    description: 'Send a global announcement (owner only)',
    options: [
      {
        name: 'message',
        description: 'The announcement message',
        type: 3,
        required: true,
      },
    ],
  },
];

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Clear global commands (fix doubled commands)
  if (path === '/clear-global') {
    const response = await fetch(`${DISCORD_API}/applications/${env.DISCORD_APPLICATION_ID}/commands`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([]),
    });
    return new Response(JSON.stringify({ success: true, message: 'Global commands cleared. Guild commands remain.' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Register slash commands (works with GET for browser access)
  if (path === '/register-commands') {
    const guildId = url.searchParams.get('guild_id');
    const endpoint = guildId
      ? `${DISCORD_API}/applications/${env.DISCORD_APPLICATION_ID}/guilds/${guildId}/commands`
      : `${DISCORD_API}/applications/${env.DISCORD_APPLICATION_ID}/commands`;
    
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(COMMANDS),
    });
    const data = await response.json();
    const scope = guildId ? `guild ${guildId}` : 'global';
    return new Response(JSON.stringify({ success: true, scope, commands: data.length, data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Discord interactions endpoint — requires Ed25519 signature verification
  if (path === '/interactions' && request.method === 'POST') {
    const signature = request.headers.get('X-Signature-Ed25519');
    const timestamp = request.headers.get('X-Signature-Timestamp');
    const body = await request.text();

    // Verify the request is actually from Discord
    if (signature && timestamp && env.DISCORD_PUBLIC_KEY) {
      const isValid = await verifyDiscordSignature(signature, timestamp, body, env.DISCORD_PUBLIC_KEY);
      if (!isValid) {
        return new Response('Invalid signature', { status: 401 });
      }
    }

    const payload = JSON.parse(body);

    // Discord verification PING — must respond with PONG
    if (payload.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Slash command
    if (payload.type === 2) {
      const { name, options } = payload.data;
      let response;

      try {
        switch (name) {
          case 'value':
            response = await handleValue(options, env);
            break;
          case 'search':
            response = await handleSearch(options, env);
            break;
          case 'trade':
            response = await handleTrade(options, env);
            break;
          case 'top':
            response = await handleTop(options, env);
            break;
          case 'demand':
            response = await handleDemand(env);
            break;
          case 'announcement':
            response = await handleAnnouncement(options, env);
            break;
          default:
            response = { content: 'Unknown command' };
        }
      } catch (e) {
        response = { content: `Error: ${e.message}`, flags: 64 };
      }

      return new Response(JSON.stringify({
        type: 4,
        data: response,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('OK');
  }

  return new Response('APEX Discord Bot is running!', {
    headers: { 'Content-Type': 'text/plain' },
  });
}

// Ed25519 signature verification (required by Discord)
async function verifyDiscordSignature(signature, timestamp, body, publicKeyHex) {
  try {
    // Convert hex public key to Uint8Array
    const publicKeyBytes = hexToBytes(publicKeyHex);
    const signatureBytes = hexToBytes(signature);
    const message = new TextEncoder().encode(timestamp + body);

    // Import the public key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes,
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    );

    // Verify the signature
    return await crypto.subtle.verify(
      'Ed25519',
      cryptoKey,
      signatureBytes,
      message
    );
  } catch (e) {
    console.error('Signature verification failed:', e);
    return false;
  }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Load value overrides from KV
async function loadValues(env) {
  let data = null;
  try {
    if (env.APEX_OVERRIDES) {
      data = await env.APEX_OVERRIDES.get('staticOverrides');
    }
  } catch (e) {
    console.error('Failed to read from KV:', e);
  }
  if (!data) return { valueOverrides: {}, wikiOverrides: {}, unitsLookup: {} };
  try {
    const parsed = JSON.parse(data);
    // Merge unitsLookup data into wikiOverrides for missing name/rarity
    const units = parsed.unitsLookup || {};
    const wikis = parsed.wikiOverrides || {};
    for (const [slug, unit] of Object.entries(units)) {
      if (!wikis[slug]) wikis[slug] = {};
      if (!wikis[slug].name && unit.name) wikis[slug].name = unit.name;
      if (!wikis[slug].rarity && unit.rarity) wikis[slug].rarity = unit.rarity;
      if (!wikis[slug].type && unit.type) wikis[slug].type = unit.type;
    }
    parsed.wikiOverrides = wikis;
    return parsed;
  } catch {
    return { valueOverrides: {}, wikiOverrides: {}, unitsLookup: {} };
  }
}

// Hardcoded units data (name|rarity|type) — 149 units
const _UNIT_DATA = {"ball":"Ball|Normie|DPS","eletricball":"EletricBall|Normie|DPS","fireball":"FireBall|Normie|DPS","iceball":"IceBall|Normie|DPS","poisonball":"PoisonBall|Normie|DPS","babyball":"BabyBall|Odds|DPS","ball-2-0":"Ball 2.0|Odds|DPS","grug":"Grug|Odds|DPS","policeball":"PoliceBall|Odds|DPS","survivorball":"SurvivorBall|Odds|DPS","wormball":"WormBall|Odds|DPS","backpacker":"Backpacker|Rares|DPS","boxerball":"BoxerBall|Rares|DPS","buildersclubball":"BuildersClubBall|Rares|DPS","chickball":"ChickBall|Rares|DPS","chocolateball":"ChocolateBall|Rares|DPS","coalball":"CoalBall|Rares|DPS","coinball":"CoinBall|Rares|Economy","dagrungy":"DaGrungy|Rares|Summoner","flameball":"FlameBall|Rares|DPS","frozenball":"FrozenBall|Rares|DPS","grassman":"GrassMan|Rares|DPS","heprobot":"HepRobot|Rares|Summoner","jewelryball":"JewelryBall|Rares|Economy","monkey":"Monkey|Rares|DPS","militaryball":"MilitaryBall|Rares|DPS","noob":"Noob|Rares|DPS","peasantball":"PeasantBall|Rares|Economy","raregrug":"RareGrug|Rares|DPS","rockball":"RockBall|Rares|DPS","soulball":"SoulBall|Rares|DPS","slinger":"Slinger|Rares|DPS","sniperball":"SniperBall|Rares|DPS","snowball":"SnowBall|Rares|DPS","adball":"AdBall|Awesome|Economy","bombball":"BombBall|Awesome|DPS","bubbleball":"BubbleBall|Awesome|DPS","celticball":"CelticBall|Awesome|DPS","cloverball":"CloverBall|Awesome|DPS","demonball":"DemonBall|Awesome|DPS","fancyball":"FancyBall|Awesome|Economy","fossilball":"FossilBall|Awesome|DPS","frostyball":"FrostyBall|Awesome|DPS","holoball":"HoloBall|Awesome|DPS","knight":"Knight|Awesome|DPS","laserball":"LaserBall|Awesome|DPS","minerball":"MinerBall|Awesome|DPS","presentball":"PresentBall|Awesome|Economy","skateboarder":"Skateboarder|Awesome|DPS","tartarusball":"TartarusBall|Awesome|DPS","vampireball":"VampireBall|Awesome|DPS","venomousball":"VenomousBall|Awesome|DPS","heartball":"HeartBall|Awesome|DPS","roseball":"RoseBall|Awesome|DPS","angelball":"AngelBall|Legendaries|DPS","chef":"Chef|Legendaries|Economy","crusherball":"CrusherBall|Legendaries|DPS","cryptoball":"CryptoBall|Legendaries|Economy","dartmonkey":"DartMonkey|Legendaries|DPS","druidball":"DruidBall|Legendaries|DPS","elfcommander":"ElfCommander|Legendaries|Summoner","crusher":"Crusher|Legendaries|DPS","piercer":"Piercer|Legendaries|DPS","slicer":"Slicer|Legendaries|DPS","krampusball":"KrampusBall|Transcendents|DPS","giantball":"GiantBall|Legendaries|DPS","miniballer":"MiniBaller|Legendaries|DPS","hephaestusball":"HephaestusBall|Legendaries|Summoner","paintballer":"PaintBaller|Legendaries|DPS","potogoldballs":"PotOGoldBalls|Legendaries|Summoner","princessball":"PrincessBall|Legendaries|Economy","cupidball":"CupidBall|Legendaries|DPS","mutantball":"MutantBall|Legendaries|DPS","scarecrowball":"ScarecrowBall|Awesome|DPS","awesomegrug":"AwesomeGrug|Awesome|DPS","fireworkball":"FireworkBall|Legendaries|DPS","bunnyball":"BunnyBall|Legendaries|DPS","legendary-grug":"Legendary Grug|Legendaries|DPS","railgunball":"RailgunBall|Legendaries|DPS","rainball":"RainBall|Legendaries|Summoner","reindeerball":"ReindeerBall|Legendaries|Summoner","roboball":"RoboBall|Legendaries|DPS","shaolinmonkey":"ShaolinMonkey|Legendaries|DPS","sleepyball":"SleepyBall|Legendaries|DPS","statueball":"StatueBall|Legendaries|Summoner","subzeroball":"SubZeroBall|Legendaries|DPS","turkeyball":"TurkeyBall|Legendaries|Summoner","sunball":"SunBall|Legendaries|DPS","athena":"Athena|Mythics|Support","boulder":"Boulder|Mythics|DPS","brainball":"BrainBall|Mythics|Summoner","bloxxerball":"BloxxerBall|Mythics|Economy","baller":"Baller|Mythics|DPS","cyborgball":"CyborgBall|Mythics|DPS","eastermobile":"EasterMobile|Mythics|DPS","easterballny":"EasterBallny|Mythics|DPS","fortuneball":"FortuneBall|Mythics|DPS","frostangel":"FrostAngel|Mythics|DPS","autumnball":"AutumnBall|Mythics|Summoner","hackerball":"HackerBall|Mythics|DPS","geodeball":"GeodeBall|Mythics|DPS","goldenmonkey":"GoldenMonkey|Mythics|Economy","leprechaunball":"LeprechaunBall|Mythics|DPS","kingball":"KingBall|Mythics|DPS","magicianball":"MagicianBall|Mythics|Summoner","mafiamonkey":"MafiaMonkey|Mythics|Summoner","natureball":"NatureBall|Mythics|DPS","scroogeball":"ScroogeBall|Mythics|Support","snowballer":"SnowBaller|Mythics|DPS","mythicgrug":"MythicGrug|Mythics|DPS","santaball":"SantaBall|Mythics|Summoner","snowmanbuilder":"SnowmanBuilder|Mythics|Summoner","richball":"RichBall|Mythics|Economy","robosanta":"RoboSanta|Transcendents|DPS","virusball":"VirusBall|Mythics|DPS","tangoball":"TangoBall|Mythics|DPS","powerarmorball":"PowerArmorBall|Awesome|DPS","partyman":"PartyMan|Legendaries|Support","oldball":"OldBall|Odds|DPS","beachball":"BeachBall|Odds|DPS","skeleball":"SkeleBall|Rares|DPS","forestball":"ForestBall|Omegas|Summoner","drillerball":"DrillerBall|Transcendents|DPS","mechaball":"MechaBall|Omegas|DPS","jesterball":"JesterBall|Transcendents|DPS","meteor":"Meteor|Transcendents|DPS","plasmaball":"PlasmaBall|Transcendents|DPS","reaper":"Reaper|Mythics|DPS","droneball":"DroneBall|Transcendents|DPS","overclockedoverlord-oco":"OverclockedOverlord (OCO)|Omegas|DPS","laserminigunner-lmg":"LaserMiniGunner (LMG)|Transcendents|DPS","zeusball":"ZeusBall|Omegas|DPS","poseidonball":"PoseidonBall|Transcendents|Summoner","golemball":"GolemBall|Omegas|DPS","blizzardball":"BlizzardBall|Transcendents|Summoner","mothball":"MothBall|Transcendents|Support","tabletmonkey":"TabletMonkey|Transcendents|Summoner","wukongball":"WukongBall|Omegas|Summoner","templeball":"TempleBall|Omegas|DPS","thefrozenone-tfo":"TheFrozenOne (TFO)|Omegas|DPS","voidball":"VoidBall|Omegas|DPS","heartwormball":"HeartwormBall|Mythics|Summoner","shadowball":"ShadowBall|Rares|DPS","zomball":"ZomBall|Rares|DPS","grimreaper":"GrimReaper|Mythics|DPS","shadowprince":"ShadowPrince|Omegas|DPS","omegaknight-omk":"OmegaKnight (OMK)|Omegas|Summoner","showmanball":"ShowmanBall|Transcendents|DPS","mummyball":"MummyBall|Transcendents|DPS"};

function fetchUnitsLookup() {
  const result = {};
  for (const [slug, val] of Object.entries(_UNIT_DATA)) {
    const [name, rarity, type] = val.split('|');
    result[slug] = { name, rarity, type };
  }
  return result;
}

// Compute trade value
function computeTradeValue(baseValue, demand, scarcity) {
  const DEMAND = { Abysmal: 0.94, 'Extremely Low': 0.95, 'Very Low': 0.96, Low: 0.97, 'Below Average': 0.98, 'Slightly Below Average': 0.99, Normal: 1.0, 'Slightly Above Average': 1.01, 'Above Average': 1.02, High: 1.03, 'Very High': 1.04, 'Extremely High': 1.05, Godly: 1.06 };
  const SCARCITY = { Flooded: 0.98, Common: 0.99, Standard: 1.0, Limited: 1.01, Rare: 1.02 };
  return Math.round((Number(baseValue) || 0) * (DEMAND[demand] || 1) * (SCARCITY[scarcity] || 1));
}

function formatCompact(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}


// Enrich db with unitsLookup if missing
async function ensureUnitsData(db) {
  if (!db.unitsLookup || Object.keys(db.unitsLookup).length === 0) {
    db.unitsLookup = await fetchUnitsLookup();
  }
  for (const [slug, unit] of Object.entries(db.unitsLookup || {})) {
    if (!db.wikiOverrides[slug]) db.wikiOverrides[slug] = {};
    if (!db.wikiOverrides[slug].name && unit.name) db.wikiOverrides[slug].name = unit.name;
    if (!db.wikiOverrides[slug].rarity && unit.rarity) db.wikiOverrides[slug].rarity = unit.rarity;
    if (!db.wikiOverrides[slug].type && unit.type) db.wikiOverrides[slug].type = unit.type;
  }
  return db;
}

// Find unit by name or slug (fuzzy)
function findUnit(query, db) {
  const q = query.toLowerCase().trim();
  const allValues = db.valueOverrides || {};
  const allWiki = db.wikiOverrides || {};

  // Try exact slug match first
  if (allWiki[q]) return { slug: q, ...(allValues[q] || {}), ...allWiki[q] };
  if (allValues[q]) return { slug: q, ...allValues[q], ...(allWiki[q] || {}) };

  // Try name match in wiki
  for (const [slug, wiki] of Object.entries(allWiki)) {
    if (wiki.name && wiki.name.toLowerCase() === q) {
      return { slug, ...(allValues[slug] || {}), ...wiki };
    }
  }

  // Try partial match in wiki names
  for (const [slug, wiki] of Object.entries(allWiki)) {
    if (wiki.name && wiki.name.toLowerCase().includes(q)) {
      return { slug, ...(allValues[slug] || {}), ...wiki };
    }
  }

  // Try partial match in slugs
  for (const [slug, val] of Object.entries(allValues)) {
    if (slug.includes(q)) {
      return { slug, ...val, ...(allWiki[slug] || {}) };
    }
  }

  return null;
}

async function handleValue(options, env) {
  const query = options.find(o => o.name === 'unit')?.value || '';
  let db = await loadValues(env);
    await ensureUnitsData(db);

  const unit = findUnit(query, db);

  if (!unit) {
    return { content: `❌ Could not find unit **${query}**. Try a different name or slug.`, flags: 64 };
  }

  const baseVal = Number(unit.base_value ?? unit.baseValue ?? 0);
  const baseValMax = unit.base_value_max ?? unit.baseValueMax ?? null;
  const demand = unit.demand || 'Normal';
  const scarcity = unit.scarcity || 'Standard';
  const tradeValue = computeTradeValue(baseVal, demand, scarcity);
  const tradeValueMax = baseValMax ? computeTradeValue(baseValMax, demand, scarcity) : null;

  const valueStr = tradeValueMax ? `💎 ${formatCompact(tradeValue)} — ${formatCompact(tradeValueMax)}` : `💎 ${formatCompact(tradeValue)}`;
  const gems = unit.gems ?? 0;
  const coins = unit.coins ?? 0;

  const demandColors = { Abysmal: '🔴', 'Extremely Low': '🔴', 'Very Low': '🟠', Low: '🟠', 'Below Average': '🟡', 'Slightly Below Average': '🟡', Normal: '🟢', 'Slightly Above Average': '🟢', 'Above Average': '🔵', High: '🔵', 'Very High': '🟣', 'Extremely High': '🟣', Godly: '⭐' };
  const scarcityColors = { Flooded: '🔴', Common: '🟡', Standard: '🟢', Limited: '🔵', Rare: '🟣' };

  return {
    embeds: [{
      author: { name: 'APEX Values & WIKI — Values Database',  },
      title: `${unit.name || unit.slug}`,
      description: `> ${unit.rarity || 'Unknown'} · ${unit.type || 'Unit'}`,
      color: 5814783,
      fields: [
        { name: '💰 Trade Value', value: valueStr, inline: false },
        { name: '📊 Demand', value: `${demandColors[demand] || '⚪'} **${demand}**`, inline: true },
        { name: '📈 Scarcity', value: `${scarcityColors[scarcity] || '⚪'} **${scarcity}**`, inline: true },
        { name: '📉 Trend', value: `**${unit.trend || 'stable'}**`, inline: true },
        { name: '💎 Gems', value: `**${formatCompact(gems)}**`, inline: true },
        { name: '🪙 Coins', value: `**${formatCompact(coins)}**`, inline: true },
        { name: '📋 Category', value: `**${unit.category || 'Standard'}**`, inline: true },
      ],
      thumbnail: {},
      footer: { text: 'Type /search or /trade for more' },
      timestamp: new Date().toISOString(),
    }],
  };
}

async function handleSearch(options, env) {
  const query = options.find(o => o.name === 'query')?.value || '';
  let db = await loadValues(env);
    await ensureUnitsData(db);
  const allValues = db.valueOverrides || {};
  const allWiki = db.wikiOverrides || {};
  const q = query.toLowerCase().trim();

  const matches = [];
  for (const [slug, wiki] of Object.entries(allWiki)) {
    const name = wiki.name || slug;
    const rarity = wiki.rarity || '';
    if (name.toLowerCase().includes(q) || slug.includes(q) || rarity.toLowerCase().includes(q)) {
      const val = allValues[slug] || {};
      const baseVal = Number(val.base_value ?? val.baseValue ?? 0);
      const tradeValue = computeTradeValue(baseVal, val.demand || 'Normal', val.scarcity || 'Standard');
      matches.push({ name, slug, rarity, tradeValue });
    }
  }

  if (matches.length === 0) {
    return { content: `❌ No units found matching **"${query}"**.`, flags: 64 };
  }

  matches.sort((a, b) => b.tradeValue - a.tradeValue);
  const top = matches.slice(0, 15);

  const lines = top.map((m, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
    return `${medal} ${m.name} — \`${m.rarity}\` — **${formatCompact(m.tradeValue)}**`;
  });
  const extra = matches.length > 15 ? `\n\n*...and ${matches.length - 15} more results*` : '';

  return {
    embeds: [{
      author: { name: 'APEX Values & WIKI — Unit Search',  },
      title: `🔍 Search: "${query}"`,
      description: lines.join('\n') + extra,
      color: 5814783,
      footer: { text: `${matches.length} results found` },
      timestamp: new Date().toISOString(),
    }],
  };
}

async function handleTrade(options, env) {
  const youStr = options.find(o => o.name === 'you')?.value || '';
  const themStr = options.find(o => o.name === 'them')?.value || '';
  let db = await loadValues(env);
    await ensureUnitsData(db);

  function parseSide(str) {
    return str.split(',').map(part => {
      const [name, qty] = part.trim().split(':');
      const unit = findUnit(name.trim(), db);
      if (!unit) return null;
      const baseVal = Number(unit.base_value ?? unit.baseValue ?? 0);
      const tradeValue = computeTradeValue(baseVal, unit.demand || 'Normal', unit.scarcity || 'Standard');
      return { name: unit.name || unit.slug, qty: Number(qty) || 1, tradeValue, total: tradeValue * (Number(qty) || 1) };
    }).filter(Boolean);
  }

  const youSide = parseSide(youStr);
  const themSide = parseSide(themStr);

  if (youSide.length === 0 || themSide.length === 0) {
    return { content: '❌ Could not parse one or both sides. Use format: "unit:qty, unit:qty"', flags: 64 };
  }

  const youTotal = youSide.reduce((s, e) => s + e.total, 0);
  const themTotal = themSide.reduce((s, e) => s + e.total, 0);
  const diff = themTotal - youTotal;
  const percentDiff = Math.abs(diff) / Math.min(youTotal, themTotal) * 100;

  let verdict, verdictEmoji, color;
  if (percentDiff <= 2) { verdict = 'Fair Trade'; verdictEmoji = '⚖️'; color = 16776960; }
  else if (diff > 0) { verdict = percentDiff > 10 ? 'Big Win' : 'Slight Win'; verdictEmoji = '✅'; color = 3066993; }
  else { verdict = percentDiff > 10 ? 'Big Loss' : 'Slight Loss'; verdictEmoji = '❌'; color = 16711680; }

  const youLines = youSide.map(e => `• **${e.qty}×** ${e.name} — \`${formatCompact(e.total)}\``);
  const themLines = themSide.map(e => `• **${e.qty}×** ${e.name} — \`${formatCompact(e.total)}\``);

  return {
    embeds: [{
      author: { name: 'APEX Values & WIKI — Trade Calculator',  },
      title: `${verdictEmoji} Trade Result: ${verdict}`,
      color,
      fields: [
        { name: '📤 You Give', value: youLines.join('\n') + `\n\n**Total: ${formatCompact(youTotal)}**`, inline: true },
        { name: '📥 They Give', value: themLines.join('\n') + `\n\n**Total: ${formatCompact(themTotal)}**`, inline: true },
        { name: '📊 Verdict', value: `**${formatCompact(Math.abs(diff))}** difference\n${percentDiff.toFixed(1)}% ${diff > 0 ? 'in your favor' : 'in their favor'}`, inline: false },
      ],
      footer: { text: diff > 0 ? 'You win this trade!' : diff < 0 ? 'They win this trade.' : 'Perfectly balanced.' },
      timestamp: new Date().toISOString(),
    }],
  };
}

async function handleTop(options, env) {
  const count = Math.min(25, options.find(o => o.name === 'count')?.value || 10);
  let db = await loadValues(env);
    await ensureUnitsData(db);
  const allValues = db.valueOverrides || {};
  const allWiki = db.wikiOverrides || {};

  const units = Object.entries(allValues).map(([slug, val]) => {
    const wiki = allWiki[slug] || {};
    const baseVal = Number(val.base_value ?? val.baseValue ?? 0);
    const tradeValue = computeTradeValue(baseVal, val.demand || 'Normal', val.scarcity || 'Standard');
    return { name: wiki.name || slug, rarity: wiki.rarity || val.rarity || 'Unknown', tradeValue };
  }).sort((a, b) => b.tradeValue - a.tradeValue).slice(0, count);

  const lines = units.map((u, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
    return `${medal} ${u.name} — \`${u.rarity}\` — **${formatCompact(u.tradeValue)}**`;
  });

  return {
    embeds: [{
      author: { name: 'APEX Values & WIKI — Top Valued Units',  },
      title: `🏆 Leaderboard — Top ${count}`,
      color: 16766720,
      description: lines.join('\n'),
      footer: { text: 'Ranked by trade value' },
      timestamp: new Date().toISOString(),
    }],
  };
}

async function handleDemand(env) {
  let db = await loadValues(env);
    await ensureUnitsData(db);
  const allValues = db.valueOverrides || {};
  const dist = {};

  for (const val of Object.values(allValues)) {
    const d = val.demand || 'Unknown';
    dist[d] = (dist[d] || 0) + 1;
  }

  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  const total = Object.values(dist).reduce((s, v) => s + v, 0);
  const lines = sorted.map(([label, count]) => `**${label}**: ${count} units (${((count / total) * 100).toFixed(1)}%)`);

  return {
    embeds: [{
      author: { name: 'APEX Values & WIKI — Market Analytics',  },
      title: '📊 Demand Distribution',
      color: 5814783,
      description: lines.join('\n'),
      footer: { text: `${total} total units tracked` },
      timestamp: new Date().toISOString(),
    }],
  };
}

async function handleAnnouncement(options, env) {
  const message = options.find(o => o.name === 'message')?.value || '';
  if (!message) return { content: '❌ Missing message.', flags: 64 };

  try {
    if (env.APEX_OVERRIDES) {
      const announcement = {
        id: Date.now(),
        message,
        type: 'info',
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        sentBy: 'discord-bot',
      };
      await env.APEX_OVERRIDES.put('announcements', JSON.stringify(announcement));
    }
  } catch (e) {
    return { content: `❌ Failed to save announcement: ${e.message}`, flags: 64 };
  }

  return { content: `📢 Announcement sent: ${message}`, flags: 64 };
}
