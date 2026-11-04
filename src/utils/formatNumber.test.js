import { describe, expect, it } from 'vitest';
import {
  parseCompactValue, parseCompactRange, hasCompactSuffix,
  formatRangeForInput, formatSiteNumber, formatCompactNumber,
  isSpecialBaseValue,
} from './formatNumber';

describe('compact K/M/B/T numbers', () => {
  it('parses suffixes case-insensitively', () => {
    expect(parseCompactValue('20M')).toBe(20_000_000);
    expect(parseCompactValue('1.5b')).toBe(1_500_000_000);
    expect(parseCompactValue('3K')).toBe(3000);
    expect(parseCompactValue('2T')).toBe(2_000_000_000_000);
  });

  it('still parses plain and grouped numbers', () => {
    expect(parseCompactValue('1,000')).toBe(1000);
    expect(parseCompactValue(' 500 ')).toBe(500);
    expect(parseCompactValue('$20M')).toBe(20_000_000);
  });

  it('rejects garbage without producing NaN', () => {
    expect(parseCompactValue('twenty')).toBeNull();
    expect(parseCompactValue('20M0')).toBeNull();
    expect(parseCompactValue('')).toBeNull();
  });

  it('parses admin ranges and detects suffixes', () => {
    expect(parseCompactRange('1M-2M')).toEqual({ min: 1_000_000, max: 2_000_000, valid: true });
    expect(parseCompactRange('90-100')).toEqual({ min: 90, max: 100, valid: true });
    expect(hasCompactSuffix('20M')).toBe(true);
    expect(hasCompactSuffix('20000000')).toBe(false);
  });

  it('round-trips a value through an editable input', () => {
    expect(formatRangeForInput(20_000_000, '')).toBe('20M');
    expect(formatRangeForInput(1_000_000, 2_000_000)).toBe('1M-2M');
    expect(parseCompactValue(formatRangeForInput(20_000_000, ''))).toBe(20_000_000);
  });

  it('formats every numeric surface consistently', () => {
    expect(formatSiteNumber(20_000_000)).toBe('20M');
    expect(formatSiteNumber(999)).toBe('999');
    expect(formatSiteNumber(20_000_000, { full: true })).toBe('20,000,000');
    expect(formatCompactNumber(1_500_000)).toBe('1.5M');
  });
});

describe('special market markers (O/C, N/A)', () => {
  it('normalizes case, spaces and punctuation', () => {
    expect(isSpecialBaseValue('O/C')).toBe('O/C');
    expect(isSpecialBaseValue('o/c')).toBe('O/C');
    expect(isSpecialBaseValue(' O / C ')).toBe('O/C');
    expect(isSpecialBaseValue('OC')).toBe('O/C');
    expect(isSpecialBaseValue('n.a.')).toBe('N/A');
    expect(isSpecialBaseValue('N/A')).toBe('N/A');
    expect(isSpecialBaseValue('1.3M')).toBeNull();
    expect(isSpecialBaseValue('')).toBeNull();
  });

  it('only value editors opt in to marker parsing', () => {
    expect(parseCompactRange('O/C', { allowSpecial: true }))
      .toEqual({ min: 'O/C', max: '', valid: true, special: true });
    expect(parseCompactRange('n / a', { allowSpecial: true }))
      .toEqual({ min: 'N/A', max: '', valid: true, special: true });
    expect(parseCompactRange('O/C').valid).toBe(false);
    expect(parseCompactRange('1M-2M', { allowSpecial: true })).toEqual({ min: 1_000_000, max: 2_000_000, valid: true });
  });

  it('renders a marker for editing without a bogus range', () => {
    expect(formatRangeForInput('O/C', 5_000_000)).toBe('O/C');
    expect(formatRangeForInput('N/A', null)).toBe('N/A');
    expect(formatSiteNumber('O/C')).toBe('O/C');
    expect(formatSiteNumber('N/A')).toBe('N/A');
  });
});
