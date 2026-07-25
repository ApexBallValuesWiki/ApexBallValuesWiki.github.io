import { describe, expect, it } from 'vitest';
import {
  attacksToLines,
  hasAttacks,
  labelAttacks,
  linesToAttacks,
  normalizeAttacks,
} from './attacks';

describe('normalizeAttacks', () => {
  it('passes through the new ordered-list shape', () => {
    const list = [
      { name: 'AoE', stats: { Damage: '500' } },
      { name: 'AoE', stats: { Damage: '950' } },
    ];
    expect(normalizeAttacks(list)).toEqual(list);
  });

  it('converts the legacy object shape preserving order', () => {
    expect(normalizeAttacks({ Melee: { Damage: '25' }, AoE: { Burn: '5' } })).toEqual([
      { name: 'Melee', stats: { Damage: '25' } },
      { name: 'AoE', stats: { Burn: '5' } },
    ]);
  });

  it('handles null/undefined/garbage', () => {
    expect(normalizeAttacks(null)).toEqual([]);
    expect(normalizeAttacks(undefined)).toEqual([]);
    expect(normalizeAttacks('nope')).toEqual([]);
    expect(hasAttacks({})).toBe(false);
  });
});

describe('labelAttacks', () => {
  it('numbers repeated attack types and keeps single names plain', () => {
    const labels = labelAttacks([
      { name: 'AoE', stats: {} },
      { name: 'Melee', stats: {} },
      { name: 'AoE', stats: {} },
    ]).map((a) => a.label);
    expect(labels).toEqual(['AoE (1)', 'Melee', 'AoE (2)']);
  });
});

describe('linesToAttacks (the two-same-type-attacks bug)', () => {
  it('keeps BOTH attacks when a unit has two attacks of the same type', () => {
    const out = linesToAttacks('AoE / Damage: 500\nAoE / Damage: 950');
    expect(out).toEqual([
      { name: 'AoE', stats: { Damage: '500' } },
      { name: 'AoE', stats: { Damage: '950' } },
    ]);
  });

  it('groups distinct keys under the same open block', () => {
    const out = linesToAttacks('Melee / Damage: 25\nMelee / Bleed: 3\nAoE / Damage: 100');
    expect(out).toEqual([
      { name: 'Melee', stats: { Damage: '25', Bleed: '3' } },
      { name: 'AoE', stats: { Damage: '100' } },
    ]);
  });

  it('supports keyless lines as a Stats block', () => {
    expect(linesToAttacks('Damage: 25')).toEqual([{ name: 'Stats', stats: { Damage: '25' } }]);
  });
});

describe('attacksToLines round-trip', () => {
  it('survives duplicate same-type attacks through the admin textarea', () => {
    const original = [
      { name: 'AoE', stats: { Damage: '500', Burn: '10' } },
      { name: 'AoE', stats: { Damage: '950' } },
    ];
    expect(linesToAttacks(attacksToLines(original))).toEqual(original);
  });

  it('round-trips legacy object data', () => {
    const legacy = { Melee: { Damage: '25' } };
    expect(linesToAttacks(attacksToLines(legacy))).toEqual([{ name: 'Melee', stats: { Damage: '25' } }]);
  });
});
