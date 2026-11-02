import { describe, expect, it } from 'vitest';
import { getUnitDps, getBaseStats } from './unitStats';

describe('WIKI card DPS widgets', () => {
  it('reads parsed upgrade DPS and cost per DPS', () => {
    const info = getUnitDps({
      upgrades: [{ dps: { DPS: '14.28k' }, cost: 2750, costPerDps: 192.6, cooldown: '1.75' }],
    });
    expect(info.dps).toBe(14280);
    expect(info.costPerDps).toBeCloseTo(192.6, 1);
    expect(info.cost).toBe(2750);
  });

  it('falls back to damage / cooldown and cost / dps', () => {
    const info = getUnitDps({
      upgrades: [{ cost: 1000, cooldown: '2', stats: { damage: '500' } }],
    });
    expect(info.dps).toBe(250);
    expect(info.costPerDps).toBe(4);
  });

  it('returns null when a unit has no upgrades', () => {
    expect(getUnitDps({ name: 'Ball' })).toBeNull();
    expect(getUnitDps(null)).toBeNull();
  });

  it('keeps the existing base-stat helper working', () => {
    expect(getBaseStats({ upgrades: [{ cooldown: '2', stats: { damage: '500' } }] }).damage).toBe('500');
  });
});
