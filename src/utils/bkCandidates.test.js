import { describe, it, expect } from 'vitest';
import { buildCandidates, upgradeContainsUnitName, unitNameStems } from './bkCandidates';

describe('unitNameStems', () => {
  it('includes the full name and its words', () => {
    const stems = unitNameStems('Legendary Grug');
    expect(stems).toContain('legendary grug');
    expect(stems).toContain('legendarygrug');
    expect(stems).toContain('legendary');
    expect(stems).toContain('grug');
  });

  it('splits compound names so partial reveals count', () => {
    const stems = unitNameStems('SnowmanBuilder');
    expect(stems).toContain('snowmanbuilder');
    expect(stems).toContain('snowman');
    expect(stems).toContain('builder');
  });

  it('drops generic parts that identify nothing on their own', () => {
    const stems = unitNameStems('WukongBall');
    expect(stems).toContain('wukong');
    expect(stems).not.toContain('ball');
  });

  it('handles empty names safely', () => {
    expect(unitNameStems('')).toEqual([]);
    expect(unitNameStems(null)).toEqual([]);
  });
});

describe('upgradeContainsUnitName', () => {
  it('catches partial name reveals in compound unit names', () => {
    expect(upgradeContainsUnitName({ name: 'WukongBall' }, { label: 'Wukong Punch' })).toBe(true);
    expect(upgradeContainsUnitName({ name: 'SnowmanBuilder' }, { description: 'Snowman throws harder' })).toBe(true);
    expect(upgradeContainsUnitName({ name: 'RainBall' }, { label: 'Upgrade 3', description: 'rain falls' })).toBe(true);
  });

  it('still catches full-name reveals', () => {
    expect(upgradeContainsUnitName({ name: 'FireBall' }, { label: 'Fireball Frenzy' })).toBe(true);
  });

  it('does not flag unrelated upgrade text', () => {
    expect(upgradeContainsUnitName({ name: 'FireBall' }, { label: 'Flame Burst', description: 'burns enemies' })).toBe(false);
    expect(upgradeContainsUnitName({ name: 'WukongBall' }, { label: 'Upgrade 1', description: 'staff spin damage' })).toBe(false);
  });
});

describe('buildCandidates pool hygiene', () => {
  const candidates = buildCandidates();

  it('still has a healthy pool of puzzles', () => {
    expect(candidates.length).toBeGreaterThan(50);
  });

  it('contains NO upgrade whose text reveals the unit name (full or partial)', () => {
    const offenders = candidates.filter(({ unit, upgrade }) => upgradeContainsUnitName(unit, upgrade));
    expect(offenders.map(({ unit, upgrade }) => `${unit.name}: ${upgrade.label || upgrade.description}`)).toEqual([]);
  });

  it('every candidate is a documented unit with usable clues', () => {
    for (const { unit, upgrade, damageRows } of candidates) {
      expect(unit.documented).toBe(true);
      expect(upgrade.range).toBeTruthy();
      expect(upgrade.cooldown).toBeTruthy();
      expect(damageRows.length).toBeGreaterThan(0);
    }
  });
});
