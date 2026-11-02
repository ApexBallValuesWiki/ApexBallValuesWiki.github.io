import { describe, expect, it } from 'vitest';
import { getUnitIcon } from './unitIcons';

describe('original unit image mapping', () => {
  it('does not substitute optional website icons for unit artwork', () => {
    const supplied = ['baller', 'showmanball', 'omegaknight-omk', 'golemball', 'dictatorball', 'plasmaball', 'mummyball', 'frutigerball', 'brainball', 'fancyball', 'hephaestusball', 'autumnball', 'wukongball'];
    for (const slug of supplied) {
      expect(getUnitIcon(slug, false)).toBeNull();
      expect(getUnitIcon(`shiny-${slug}`, true)).toBeNull();
    }
  });
  it('keeps original dedicated and shiny fallback images', () => {
    expect(getUnitIcon('ball', false)).toBeTruthy();
    expect(getUnitIcon('shiny-ball', true)).toBeTruthy();
    expect(getUnitIcon('shiny-ball', true)).not.toBe(getUnitIcon('ball', false));
  });
});
