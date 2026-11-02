import { describe, expect, it } from 'vitest';
import { motionIsAllowed, motionPauseReason } from './motionPreference';

describe('motion preferences', () => {
  it('allows default and legacy nonzero speed values', () => {
    expect(motionIsAllowed()).toBe(true);
    expect(motionIsAllowed({ animSpeed: 'normal' })).toBe(true);
    expect(motionIsAllowed({ animSpeed: 'slow' })).toBe(true);
  });

  it('honors OS reduction, the site reduction option, and animation off', () => {
    expect(motionIsAllowed({}, true)).toBe(false);
    expect(motionIsAllowed({ reducedMotion: true })).toBe(false);
    expect(motionIsAllowed({ animSpeed: 0 })).toBe(false);
    expect(motionIsAllowed({ animSpeed: 'none' })).toBe(false);
  });

  it('lets a desktop visitor explicitly opt back into smooth motion', () => {
    // This is the fix for Firefox/Brave on Windows with "animation effects"
    // disabled: the OS reports reduce, but the visitor asked for motion.
    expect(motionIsAllowed({ motionOverride: 'on' }, true)).toBe(true);
    expect(motionIsAllowed({ motionOverride: 'on', animSpeed: 0, reducedMotion: true }, true)).toBe(true);
  });

  it('still lets a visitor force reduced motion', () => {
    expect(motionIsAllowed({ motionOverride: 'off' }, false)).toBe(false);
  });

  it('explains why motion is paused', () => {
    expect(motionPauseReason({}, true)).toMatch(/computer/i);
    expect(motionPauseReason({ animSpeed: 0 })).toMatch(/speed/i);
    expect(motionPauseReason({ motionOverride: 'off' })).toMatch(/manually/i);
  });
});
