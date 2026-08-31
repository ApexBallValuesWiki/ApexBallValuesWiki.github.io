#!/usr/bin/env python3
"""
Parses the raw "Ball TD Units stat sheet.txt" dump into structured JSON
matching the site's unit schema.

Usage: python3 scripts/parse_units.py <input.txt> <output.json>
"""
import json
import re
import sys
from collections import Counter

RARITY_MAP = {
    'Normie': 'Normie',
    'Odd': 'Odds',
    'Odds': 'Odds',
    'Rare': 'Rares',
    'Awesome': 'Awesome',
    'Legendary': 'Legendaries',
    'Mythic': 'Mythics',
    'Transcendent': 'Transcendents',
    'Transcendant': 'Transcendents',
    'Omega': 'Omegas',
}

KNOWN_RARITIES = (
    'Normie',
    'Odds',
    'Rares',
    'Awesome',
    'Legendaries',
    'Mythics',
    'Transcendents',
    'Omegas',
)


def slugify(name):
    s = name.lower().strip()
    s = s.replace('+', 'plus')
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s


def parse_num(raw):
    """Parse numbers like '150$', '2K$', '1.5M$', '0.05', '5' -> float."""
    if raw is None:
        return None
    s = str(raw).strip().replace(',', '').replace('$', '').strip()
    if s in ('N/A', '???', '-', '', 'false', 'true'):
        return None
    mult = 1
    if s.upper().endswith('K'):
        mult = 1_000
        s = s[:-1]
    elif s.upper().endswith('M'):
        mult = 1_000_000
        s = s[:-1]
    elif s.upper().endswith('B'):
        mult = 1_000_000_000
        s = s[:-1]
    try:
        return float(s) * mult
    except ValueError:
        return None


def clean_line(line, remove_bullet=False):
    """Remove Discord quote markup and optionally one leading markdown bullet."""
    s = line.rstrip('\r').strip()
    if s.startswith('>'):
        s = s[1:].strip()
    if remove_bullet:
        if s.startswith('-#'):
            # Keep the header marker intact for section detection elsewhere.
            return s
        if s.startswith('-'):
            s = s[1:].strip()
    return s


def field_from_block(block, label):
    m = re.search(rf'(?m)^\s*>?\s*{re.escape(label)}:\s*([^\n\r]+)', block)
    return m.group(1).strip() if m else None


def header_field_from_block(block, header_label):
    # Matches stat-sheet headers like "> -# Total Cost: 1M$" and
    # "> -# Total Cost (so far): 617.5K$".
    m = re.search(
        rf'(?m)^\s*>?\s*-#\s*{re.escape(header_label)}(?:\s*\([^)]*\))?:\s*([^\n\r]+)',
        block,
    )
    return m.group(1).strip() if m else None


def add_unique(target, key, value):
    """Add key/value without overwriting duplicate labels from the stat sheet."""
    key = key.strip()
    if key not in target:
        target[key] = value
        return key
    idx = 2
    while f'{key} ({idx})' in target:
        idx += 1
    unique = f'{key} ({idx})'
    target[unique] = value
    return unique


def unique_group_name(groups, base):
    """Legacy helper — kept for backwards compatibility. Attack blocks are now
    stored as an ordered list (see parse_upgrade_chunk), so two attacks that
    share the same in-game type (e.g. 'AoE' and 'AoE') are kept as separate
    entries instead of being renamed 'AoE (2)' or silently merged."""
    if base not in groups:
        return base
    idx = 2
    while f'{base} ({idx})' in groups:
        idx += 1
    return f'{base} ({idx})'


def parse_rarity_line(line):
    """Parse lines like '## Rare 🟦 (Seasonal)/(Exclusive)' into rarity/categories."""
    line = line.lstrip('#').strip()
    m = re.match(r'^([A-Za-z]+)', line)
    base_word = m.group(1) if m else None
    rarity = RARITY_MAP.get(base_word, base_word)

    categories = []
    if 'Seasonal' in line:
        categories.append('Seasonal')
    if 'Exclusive' in line:
        categories.append('Exclusive')
    if 'Unobtainable' in line:
        categories.append('Unobtainable')
    if not categories:
        categories.append('Standard')
    return rarity, categories


def extract_section(lines, start_predicate, stop_predicate):
    started = False
    out = []
    for line in lines:
        s = clean_line(line)
        if not started:
            if start_predicate(s):
                started = True
            continue
        if stop_predicate(s):
            break
        out.append(line)
    return out


def parse_upgrade_chunk(chunk_lines, level):
    header = clean_line(chunk_lines[0])
    header_match = re.match(r'-\s*(Placement|Upgrade\s*\d+(?:\(MAX\))?)\s*:?\s*([^\n\r]*)', header)
    if not header_match:
        return None

    label = header_match.group(1).strip()
    cost_raw = header_match.group(2).strip()
    cost = parse_num(cost_raw)

    description = None
    cooldown = None
    range_val = None
    stats = {}
    # Ordered list of attack blocks: [{'name': 'AoE', 'stats': {...}}, ...].
    # A list (not a dict keyed by type) so a unit with two attacks of the SAME
    # type keeps both — a dict would silently overwrite the first one.
    attacks = []
    dps_entries = {}
    cost_per_dps = None
    current_block = None

    for raw in chunk_lines[1:]:
        cleaned_with_bullet = clean_line(raw)
        if not cleaned_with_bullet or cleaned_with_bullet == '——×——':
            continue
        # Hard-stop guard in case a malformed chunk ever includes section headers.
        if cleaned_with_bullet.startswith('-#'):
            continue

        s = clean_line(raw, remove_bullet=True)
        if not s or s == '——×——':
            continue

        if s.startswith('Upgrade Description:'):
            description = s.split(':', 1)[1].strip()
            continue

        if ':' not in s:
            continue

        key, val = s.split(':', 1)
        key = key.strip()
        val = val.strip()
        key_lower = key.lower()
        indent = len(raw.expandtabs(8)) - len(raw.expandtabs(8).lstrip(' '))

        # A blank value means this line starts a stat group/attack block, e.g. "Melee:".
        # Two blocks with the same name are both kept (a unit can have, say,
        # two different AoE attacks).
        if val == '':
            current_block = {'name': key, 'stats': {}}
            attacks.append(current_block)
            continue

        # Attack blocks can legitimately contain keys named Cooldown/Range/etc.
        # Capture those inside the block before treating same-named top-level
        # fields as the upgrade's main cooldown/range.
        if current_block and indent >= 8:
            add_unique(current_block['stats'], key, val)
            continue

        if key_lower == 'cooldown':
            cooldown = val
            continue
        if key_lower == 'range':
            range_val = val
            continue
        if key_lower == 'cost per dps':
            if cost_per_dps is None:
                cost_per_dps = val
            elif val not in cost_per_dps:
                cost_per_dps = f'{cost_per_dps} / {val}'
            continue
        if key_lower.endswith('dps') and key_lower != 'cost per dps':
            add_unique(dps_entries, key, val)
            continue

        # Top-level upgrade stat not under an attack block, such as Health,
        # Max Crystals, Crystal Cooldown, Event Cooldown, etc.
        current_block = None
        add_unique(stats, key, val)

    return {
        'level': level,
        'label': label,
        'isMax': '(MAX)' in label,
        'cost': cost,
        'costRaw': cost_raw,
        'description': description,
        'cooldown': cooldown,
        'range': range_val,
        'stats': stats,
        'attacks': attacks,
        'dps': dps_entries,
        'costPerDps': cost_per_dps,
    }


def parse_upgrades(block):
    lines = block.split('\n')
    section_lines = extract_section(
        lines,
        lambda s: s.startswith('-# Upgrades & Costs:'),
        lambda s: s.startswith('-# Total Cost') or s.startswith('-# Minimum - Maximum Stats'),
    )

    chunks = []
    current = []
    for line in section_lines:
        s = clean_line(line)
        if re.match(r'-\s*(?:Placement|Upgrade\s*\d+)', s):
            if current:
                chunks.append(current)
            current = [line]
        elif current:
            current.append(line)
    if current:
        chunks.append(current)

    upgrades = []
    for idx, chunk in enumerate(chunks, start=1):
        parsed = parse_upgrade_chunk(chunk, idx)
        if parsed:
            upgrades.append(parsed)
    return upgrades


def parse_min_max(block):
    lines = block.split('\n')
    section_lines = extract_section(
        lines,
        lambda s: s.startswith('-# Minimum - Maximum Stats'),
        lambda s: s == '——×——' or s.startswith('-# Special:'),
    )

    min_max = {}
    for line in section_lines:
        s = clean_line(line, remove_bullet=True)
        if not s or ':' not in s:
            continue
        key, val = s.split(':', 1)
        add_unique(min_max, key.strip(), val.strip())
    return min_max


def parse_obtain(block):
    lines = block.split('\n')
    section_lines = extract_section(
        lines,
        lambda s: s.startswith('-# How to Obtain:'),
        lambda s: False,
    )
    obtain = []
    for line in section_lines:
        s = clean_line(line, remove_bullet=True)
        if s and clean_line(line).startswith('-'):
            obtain.append(s)
    return obtain


def parse_block(block):
    lines = block.split('\n')
    name = lines[0].lstrip('#').strip()

    rarity = None
    categories = ['Standard']
    for line in lines[1:8]:
        if line.startswith('##'):
            rarity, categories = parse_rarity_line(line)
            break

    raw_type = field_from_block(block, '-# Type')
    placement_limit = field_from_block(block, 'Placement Count')
    value_raw = field_from_block(block, 'Value')
    coins_raw = field_from_block(block, 'Coins')
    gems_raw = field_from_block(block, 'Gems')
    total_cost = header_field_from_block(block, 'Total Cost')

    passive = field_from_block(block, 'Passive')
    ability = field_from_block(block, 'Ability')
    synergy = field_from_block(block, 'Synergy')
    passive = passive if passive and passive != '-' else None
    ability = ability if ability and ability != '-' else None
    synergy = synergy if synergy and synergy != '-' else None

    unavailable = '⚠️ UNAVAILABLE DATA ⚠️' in block or 'UNAVAILABLE DATA' in block

    upgrades = [] if unavailable else parse_upgrades(block)

    return {
        'slug': slugify(name),
        'name': name,
        'rarity': rarity,
        'categories': categories,
        'category': categories[0] if len(categories) == 1 else '/'.join(categories),
        'type': raw_type,
        'valueRaw': value_raw,
        'coinsRaw': coins_raw,
        'gemsRaw': gems_raw,
        'placementLimit': placement_limit,
        'totalCost': total_cost,
        'obtain': parse_obtain(block),
        'passive': passive,
        'ability': ability,
        'synergy': synergy,
        'unavailableData': unavailable,
        'upgrades': upgrades,
        'minMaxStats': parse_min_max(block),
    }


def main():
    infile = sys.argv[1] if len(sys.argv) > 1 else 'uploads/Ball TD Units stat sheet.txt'
    outfile = sys.argv[2] if len(sys.argv) > 2 else 'units_parsed.json'

    content = open(infile, encoding='utf-8').read()
    blocks = re.split(r'\n(?=# [^#\n])', content)
    blocks = [b for b in blocks if b.strip().startswith('#')]

    results = []
    errors = []
    for b in blocks:
        try:
            parsed = parse_block(b)
            results.append(parsed)
        except Exception as e:
            first_line = b.split('\n')[0]
            errors.append(f'{first_line}: {e}')

    print(f'Parsed {len(results)} units, {len(errors)} errors', file=sys.stderr)
    for e in errors:
        print(f'  ERROR: {e}', file=sys.stderr)

    with open(outfile, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    rarity_counts = Counter(r['rarity'] for r in results)
    print('Rarity distribution:', dict(rarity_counts), file=sys.stderr)

    unknown = [r['name'] for r in results if r['rarity'] not in KNOWN_RARITIES]
    if unknown:
        print('Unknown rarity units:', unknown, file=sys.stderr)

    upgrade_rows = sum(len(r.get('upgrades', [])) for r in results)
    documented = sum(not r.get('unavailableData', False) for r in results)
    print(f'Documented units: {documented}; upgrade/placement rows: {upgrade_rows}', file=sys.stderr)


if __name__ == '__main__':
    main()
