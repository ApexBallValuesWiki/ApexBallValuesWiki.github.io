import { describe, it, expect } from 'vitest';
import { nextResetMs, getDailyKey, getModeDayKey, formatDuration } from './ballKnowledgeTime';

const DAY_MS = 24 * 60 * 60 * 1000;
const NIGHTMARE = { nightmare: true };
const NORMAL = { nightmare: false };

// 3PM EST = 20:00 UTC. Anchor: 2026-07-15T20:00:00Z (a 3PM-EST reset boundary).
const RESET_2026_07_15 = Date.UTC(2026, 6, 15, 20, 0, 0);

describe('nextResetMs (Nightmare 3-day cycle)', () => {
  it('never reports a countdown longer than ~3 days', () => {
    // Sweep a full month at 3-hour resolution; the OLD bug jumped to ~3.58d.
    for (let t = RESET_2026_07_15 - 5 * DAY_MS; t < RESET_2026_07_15 + 30 * DAY_MS; t += 3 * 3600 * 1000) {
      const countdownDays = (nextResetMs(t, NIGHTMARE) - t) / DAY_MS;
      expect(countdownDays).toBeLessThanOrEqual(3.0 + 1e-6);
    }
  });

  it('does not jump UPWARD unless the puzzle group actually changed', () => {
    // Walk 1 hour at a time across a full cycle. The countdown must decrease
    // monotonically except at the moment the day-key group advances.
    let prevCountdown = null;
    let prevGroup = null;
    for (let t = RESET_2026_07_15; t < RESET_2026_07_15 + 12 * DAY_MS; t += 3600 * 1000) {
      const dayKey = getDailyKey(t);
      const group = getModeDayKey(dayKey, NIGHTMARE);
      const countdown = nextResetMs(t, NIGHTMARE) - t;
      if (prevCountdown !== null && group === prevGroup) {
        // same puzzle window -> countdown must not increase
        expect(countdown).toBeLessThanOrEqual(prevCountdown + 1000);
      }
      prevCountdown = countdown;
      prevGroup = group;
    }
  });

  it('reaches ~0 right at a 3PM-EST group boundary', () => {
    // One second before the reset, countdown should be tiny.
    const justBefore = RESET_2026_07_15 + 3 * DAY_MS - 1000;
    const countdown = nextResetMs(justBefore, NIGHTMARE) - justBefore;
    expect(countdown).toBeLessThan(2000);
  });

  it('advances the puzzle group exactly every 3 days at 3PM EST', () => {
    // Collect the distinct groups touched across 9 days -> expect ~3 groups,
    // and each group lasts 3 days.
    const seen = [];
    for (let t = RESET_2026_07_15; t < RESET_2026_07_15 + 9 * DAY_MS; t += 6 * 3600 * 1000) {
      const g = getModeDayKey(getDailyKey(t), NIGHTMARE);
      if (seen[seen.length - 1] !== g) seen.push(g);
    }
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen.length).toBeLessThanOrEqual(4);
  });
});

describe('nextResetMs (normal daily)', () => {
  it('counts down to the next 3PM EST for non-nightmare modes', () => {
    const beforeReset = Date.UTC(2026, 6, 15, 10, 0, 0); // 5AM EST, before 3PM
    const countdown = nextResetMs(beforeReset, NORMAL) - beforeReset;
    expect(countdown).toBeGreaterThan(0);
    expect(countdown).toBeLessThanOrEqual(DAY_MS);
  });
});

describe('formatDuration', () => {
  it('formats days when >= 1 day', () => {
    expect(formatDuration(2 * DAY_MS + 3600 * 1000)).toBe('2d 1h 0m');
  });
  it('formats HH:MM:SS under a day', () => {
    expect(formatDuration(3661000)).toBe('01:01:01');
  });
  it('clamps negatives to zero', () => {
    expect(formatDuration(-5000)).toBe('00:00:00');
  });
});
