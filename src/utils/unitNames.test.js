import { describe, expect, it } from 'vitest';
import { unitDisplayName, withUnitDisplayName } from './unitNames';

describe('display-name corrections', () => {
  it('adds the short codes to the base units', () => {
    expect(unitDisplayName({ slug: 'shadowprince', name: 'ShadowPrince' })).toBe('ShadowPrince (SP)');
    expect(unitDisplayName({ slug: 'nightmareball', name: 'NightmareBall' })).toBe('NightmareBall (NM)');
  });

  it('drops the redundant Shiny prefix from the named variants', () => {
    expect(unitDisplayName({ slug: 'shiny-nightmareball', name: 'Shiny NightmareBall' })).toBe('NightmareBall');
    expect(unitDisplayName({ slug: 'shiny-corruptmalware', name: 'Shiny CorruptMalware' })).toBe('CorruptMalware');
  });

  it('fixes live/wiki entries that lost their Shiny prefix by slug', () => {
    expect(unitDisplayName({ slug: 'shiny-corruptmalware', name: 'CorruptMalware' })).toBe('CorruptMalware');
    expect(unitDisplayName({ slug: 'shiny-nightmareball', name: 'NightmareBall' })).toBe('NightmareBall');
  });

  it('never changes slugs or unrelated units', () => {
    const unit = { slug: 'ball', name: 'Ball', rarity: 'Normie' };
    expect(withUnitDisplayName(unit)).toBe(unit);
    const fixed = withUnitDisplayName({ slug: 'shadowprince', name: 'ShadowPrince' });
    expect(fixed.slug).toBe('shadowprince');
    expect(fixed.name).toBe('ShadowPrince (SP)');
  });
});
