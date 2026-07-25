// ============================================================================
// Ball Knowledge — pure time/date helpers, extracted from the component so
// they're unit-testable. All the daily-puzzle + reset-math lives here.
// ============================================================================

export const EST_OFFSET_MS = 5 * 60 * 60 * 1000;
export const RESET_HOUR_EST = 15; // 3PM EST
export const DAY_MS = 24 * 60 * 60 * 1000;

export function getEstParts(nowMs) {
  const estDate = new Date(nowMs - EST_OFFSET_MS);
  return {
    year: estDate.getUTCFullYear(),
    month: estDate.getUTCMonth() + 1,
    day: estDate.getUTCDate(),
    hour: estDate.getUTCHours(),
    minute: estDate.getUTCMinutes(),
    second: estDate.getUTCSeconds(),
  };
}

export function formatDateKey(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function previousEstDateKey(parts) {
  const currentEstMidnightAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, 5, 0, 0);
  return formatDateKey(getEstParts(currentEstMidnightAsUtc - DAY_MS));
}

export function getDailyKey(nowMs) {
  const parts = getEstParts(nowMs);
  return parts.hour >= RESET_HOUR_EST ? formatDateKey(parts) : previousEstDateKey(parts);
}

export function isNightmareMode(modeConfig) {
  return Boolean(modeConfig?.nightmare);
}

/**
 * Returns the next reset timestamp (ms) for the given mode.
 *
 * For Nightmare (3-day cycle), the next reset is derived from the
 * reset-adjusted day (getDailyKey) — NOT the raw calendar day. Using the raw
 * day previously made the timer jump to ~4 days at EST midnight and never
 * reach zero, because the raw day rolls over at midnight while the puzzle only
 * rolls over at the 3PM EST reset.
 */
export function nextResetMs(nowMs, modeConfig) {
  const parts = getEstParts(nowMs);
  const todayResetUtc = Date.UTC(parts.year, parts.month - 1, parts.day, RESET_HOUR_EST + 5, 0, 0);
  let target = nowMs < todayResetUtc ? todayResetUtc : todayResetUtc + DAY_MS;

  if (isNightmareMode(modeConfig)) {
    const dayKey = getDailyKey(nowMs);
    const [year, month, day] = dayKey.split('-').map(Number);
    const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
    const currentGroup = Math.floor(dayNumber / 3);
    const nextGroupStartDay = (currentGroup + 1) * 3;
    target = Date.UTC(1970, 0, 1 + nextGroupStartDay, RESET_HOUR_EST + 5, 0, 0);
    if (target <= nowMs) target += 3 * DAY_MS;
  }
  return target;
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getModeDayKey(dayKey, modeConfig) {
  if (!dayKey || !isNightmareMode(modeConfig)) return dayKey;
  const [year, month, day] = dayKey.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
  return `nightmare-${Math.floor(dayNumber / 3)}`;
}
