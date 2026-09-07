import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS } from './achievements';
import { REWARD_MODES, computeUnlocks, isRewardAllowed } from './themeUnlocks';

const idsOf = (category) => ACHIEVEMENTS.filter((a) => a.category === category).map((a) => a.id);
const BK = idsOf('Ball Knowledge');
const BONO = idsOf('Ballonomics');
const BALL = idsOf('Balling');
const GEN = idsOf('General');

describe('reward theme unlocks', () => {
  it('no achievements -> nothing unlocked', () => {
    const u = computeUnlocks({ unlockedIds: [], adminEmail: null });
    expect(u).toMatchObject({ knowledge: false, ballonomics: false, retro: false, premium: false, admin: false, all: false });
  });

  it('a full category unlocks exactly that reward', () => {
    const u = computeUnlocks({ unlockedIds: BONO, adminEmail: null });
    expect(u.ballonomics).toBe(true);
    expect(u.knowledge).toBe(false);
    expect(u.retro).toBe(false);
    expect(u.premium).toBe(false);
    expect(u.all).toBe(false);
  });

  it('each minigame set maps to its own reward', () => {
    expect(computeUnlocks({ unlockedIds: BK }).knowledge).toBe(true);
    expect(computeUnlocks({ unlockedIds: BALL }).retro).toBe(true);
    expect(computeUnlocks({ unlockedIds: GEN }).premium).toBe(true);
  });

  it('a partially completed category stays locked', () => {
    const partial = BK.slice(0, BK.length - 1);
    expect(computeUnlocks({ unlockedIds: partial }).knowledge).toBe(false);
  });

  it('every set complete unlocks all', () => {
    const u = computeUnlocks({ unlockedIds: [...BK, ...BONO, ...BALL, ...GEN], adminEmail: null });
    expect(u.knowledge && u.ballonomics && u.retro && u.premium).toBe(true);
    expect(u.all).toBe(true);
  });

  it('admins (owner/admin roster role) unlock everything, editors do not', () => {
    const owner = computeUnlocks({ unlockedIds: [], adminEmail: 'gustavo.rb1410@gmail.com' });
    expect(owner.admin).toBe(true);
    expect(owner.all).toBe(true);
    const admin = computeUnlocks({ unlockedIds: [], adminEmail: 'bananatempest25@gmail.com' });
    expect(admin.admin).toBe(true);
    expect(admin.all).toBe(true);
    const editor = computeUnlocks({ unlockedIds: [], adminEmail: 'destroyha3@gmail.com' });
    expect(editor.admin).toBe(false);
    expect(editor.all).toBe(false);
    const stranger = computeUnlocks({ unlockedIds: [], adminEmail: 'someone@example.com' });
    expect(stranger.admin).toBe(false);
  });

  it('isRewardAllowed gates every mode and lets admins through', () => {
    const none = computeUnlocks({ unlockedIds: [], adminEmail: null });
    expect(isRewardAllowed('none', none)).toBe(true);
    expect(isRewardAllowed('knowledge', none)).toBe(false);
    expect(isRewardAllowed('admin', none)).toBe(false);
    const boss = computeUnlocks({ unlockedIds: [], adminEmail: 'bananatempest25@gmail.com' });
    for (const mode of REWARD_MODES) {
      expect(isRewardAllowed(mode.id, boss)).toBe(true);
    }
  });

  it('unknown/undefined unlocks never allow a mode', () => {
    expect(isRewardAllowed('premium', undefined)).toBe(false);
    expect(isRewardAllowed('bogus-mode', computeUnlocks({}))).toBe(false);
  });
});
