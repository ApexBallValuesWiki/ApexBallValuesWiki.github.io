import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BASE_UNITS } from '../data/units';
import {
  getEstParts,
  formatDateKey,
  getDailyKey,
  formatDuration,
  nextResetMs as nextResetMsBase,
  getModeDayKey as getModeDayKeyBase,
} from '../utils/ballKnowledgeTime';
import { incrementStat, setStat } from '../utils/achievements';
import { endlessConfig, pickEndlessPuzzle, loadBestLevel, saveBestLevel } from '../utils/bkEndless';
import { buildCandidates } from '../utils/bkCandidates';
import './BallKnowledge.css';

const STORAGE_PREFIX = 'apex-ball-knowledge';
const STATS_KEY = 'apex-ball-knowledge-stats-v1';
const USER_SEED_KEY = 'apex-ball-knowledge-user-seed-v1';
const DAILY_SALT = 'apex-values-ball-knowledge-v3-personalized';

const MODES = {
  normal: {
    label: 'Normal',
    icon: '⚪',
    maxGuesses: null,
    timeLimit: null,
    nightmare: false,
    oneClueOnly: false,
    startingDamage: false,
    reveal: { damage: 3, range: 5, cooldown: 7, rarity: 10 },
  },
  hard: {
    label: 'Hard',
    icon: '🔴',
    maxGuesses: 3,
    timeLimit: null,
    nightmare: false,
    oneClueOnly: false,
    startingDamage: false,
    reveal: { damage: 3, range: 99, cooldown: 99, rarity: 99 },
  },
  impossible: {
    label: 'Impossible',
    icon: '💀',
    maxGuesses: 1,
    timeLimit: null,
    nightmare: false,
    oneClueOnly: false,
    startingDamage: true,
    reveal: { damage: 0, range: 99, cooldown: 99, rarity: 99 },
  },
  nightmare: {
    label: 'Nightmare',
    icon: '☠️',
    maxGuesses: 1,
    timeLimit: 30,
    nightmare: true,
    oneClueOnly: true,
    startingDamage: false,
    reveal: { damage: 99, range: 99, cooldown: 99, rarity: 99 },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

function hasEntries(obj) {
  return obj && Object.keys(obj).length > 0;
}

function formatEntries(obj) {
  if (!hasEntries(obj)) return '—';
  return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' / ');
}

function hashString(value) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function getUserSeed() {
  try {
    let seed = localStorage.getItem(USER_SEED_KEY);
    if (!seed) {
      seed = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(USER_SEED_KEY, seed);
    }
    return seed;
  } catch {
    return 'no-storage-user';
  }
}

function nextResetMs(nowMs, mode) {
  return nextResetMsBase(nowMs, MODES[mode]);
}

function getModeDayKey(dayKey, mode) {
  return getModeDayKeyBase(dayKey, MODES[mode]);
}

function getPuzzleForDay(candidates, dayKey, mode, userSeed) {
  if (!candidates.length || !dayKey) return null;
  const modeDayKey = getModeDayKey(dayKey, mode);
  const index = hashString(`${DAILY_SALT}:${mode}:${modeDayKey}:${userSeed}`) % candidates.length;
  return candidates[index];
}

async function fetchJsonWithTimeout(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGlobalTimeMs() {
  const endpoints = [
    {
      label: 'WorldTimeAPI UTC',
      url: 'https://worldtimeapi.org/api/timezone/Etc/UTC',
      parse: (data) => (Number.isFinite(data.unixtime) ? data.unixtime * 1000 : Date.parse(data.utc_datetime)),
    },
    {
      label: 'TimeAPI UTC',
      url: 'https://timeapi.io/api/time/current/zone?timeZone=UTC',
      parse: (data) => Date.parse(`${data.dateTime || data.date || data.time}Z`),
    },
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const data = await fetchJsonWithTimeout(endpoint.url);
      const ms = endpoint.parse(data);
      if (Number.isFinite(ms)) return { ms, source: endpoint.label };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Unable to verify global time');
}

function defaultProgress() {
  return { guesses: [], won: false, lost: false, startTime: Date.now() };
}

function loadProgress(progressKey) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${progressKey}`);
    if (raw) {
      const saved = { ...defaultProgress(), ...JSON.parse(raw) };
      // Older saves have no startTime — treat "first moment we see the
      // puzzle today" as the start so Speed Demon stays earnable.
      if (!saved.startTime) saved.startTime = Date.now();
      return saved;
    }
  } catch {
    // ignore corrupted or blocked storage
  }
  return defaultProgress();
}

function saveProgress(progressKey, progress) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${progressKey}`, JSON.stringify(progress));
  } catch {
    // storage may be blocked; the daily answer still cannot be changed by PC time
  }
}

function defaultStats() {
  return { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, lastSolvedDay: null, totalGuesses: 0, guessDistribution: {} };
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? { ...defaultStats(), ...JSON.parse(raw) } : defaultStats();
  } catch {
    return defaultStats();
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore blocked storage
  }
}

function previousDayKeyFromKey(dayKey) {
  const [year, month, day] = dayKey.split('-').map(Number);
  const parts = getEstParts(Date.UTC(year, month - 1, day, 5, 0, 0) - 24 * 60 * 60 * 1000);
  return formatDateKey(parts);
}

function recordWin(stats, dayKey, guessCount) {
  if (!dayKey || stats.lastSolvedDay === dayKey) return stats;
  const previousDay = previousDayKeyFromKey(dayKey);
  const currentStreak = stats.lastSolvedDay === previousDay ? stats.currentStreak + 1 : 1;
  const nextStats = {
    ...stats,
    played: stats.played + 1,
    wins: stats.wins + 1,
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    lastSolvedDay: dayKey,
    totalGuesses: stats.totalGuesses + guessCount,
    guessDistribution: { ...stats.guessDistribution, [guessCount]: (stats.guessDistribution?.[guessCount] || 0) + 1 },
  };
  saveStats(nextStats);
  return nextStats;
}

function normalizeGuess(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function confettiPieces() {
  return Array.from({ length: 42 }, (_, i) => ({
    id: i,
    x: Math.round(Math.cos(i * 1.7) * (70 + (i % 6) * 18)),
    y: Math.round(Math.sin(i * 2.1) * (62 + (i % 5) * 16)),
    delay: `${(i % 8) * 0.035}s`,
  }));
}

export default function BallKnowledge() {
  const candidates = useMemo(() => buildCandidates(), []);
  const units = useMemo(() => BASE_UNITS.filter((u) => u.documented && !u.unavailableData), []);
  const userSeed = useMemo(() => getUserSeed(), []);
  const [mode, setMode] = useState(() => localStorage.getItem('apex-ball-knowledge-mode') || 'normal');
  const modeConfig = MODES[mode] || MODES.normal;
  const [timeState, setTimeState] = useState({ status: 'loading', nowMs: null, source: null, error: null });
  const [dayKey, setDayKey] = useState(null);
  const [countdown, setCountdown] = useState('—');
  const [progress, setProgress] = useState(defaultProgress());
  const [stats, setStats] = useState(() => loadStats());
  const [shareMessage, setShareMessage] = useState('');
  const [guess, setGuess] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [nightmareRemaining, setNightmareRemaining] = useState(modeConfig.timeLimit);
  const verifiedAtRef = useRef(null);
  // Endless chain mode: fresh puzzle per level, details trim as levels rise.
  const [endless, setEndless] = useState(null); // { seed, level, usedSlugs, round, over }
  const endlessTimer = useRef(null);

  useEffect(() => () => clearTimeout(endlessTimer.current), []);

  useEffect(() => {
    try { localStorage.setItem('apex-ball-knowledge-mode', mode); } catch { /* ignore */ }
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    fetchGlobalTimeMs()
      .then(({ ms, source }) => {
        if (cancelled) return;
        verifiedAtRef.current = { ms, perf: performance.now() };
        setTimeState({ status: 'ready', nowMs: ms, source, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setTimeState({ status: 'error', nowMs: null, source: null, error });
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (timeState.status !== 'ready' || !verifiedAtRef.current) return undefined;
    function tick() {
      const verified = verifiedAtRef.current;
      const nowMs = verified.ms + (performance.now() - verified.perf);
      const nextDayKey = getDailyKey(nowMs);
      setTimeState((prev) => ({ ...prev, nowMs }));
      setDayKey((prev) => (prev === nextDayKey ? prev : nextDayKey));
      setCountdown(formatDuration(nextResetMs(nowMs, mode) - nowMs));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timeState.status, mode]);

  const progressKey = useMemo(() => {
    if (!dayKey) return null;
    return `${getModeDayKey(dayKey, mode)}:${mode}:${userSeed}`;
  }, [dayKey, mode, userSeed]);

  useEffect(() => {
    if (mode === 'endless' && !endless) {
      setEndless({
        seed: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        level: 1,
        usedSlugs: [],
        round: { guesses: [], won: false, lost: false },
        over: false,
      });
      setMessage('');
    }
  }, [mode, endless]);

  useEffect(() => {
    if (!progressKey) return;
    setProgress(loadProgress(progressKey));
    setGuess('');
    setDropdownOpen(false);
    setMessage('');
    setShareMessage('');
    setNightmareRemaining(modeConfig.timeLimit);
  }, [progressKey, modeConfig.timeLimit]);

  useEffect(() => {
    if (!modeConfig.timeLimit || !progressKey || progress.won || progress.lost) return undefined;
    setNightmareRemaining(modeConfig.timeLimit);
    const interval = setInterval(() => {
      setNightmareRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          const nextProgress = { ...progress, lost: true };
          setProgress(nextProgress);
          saveProgress(progressKey, nextProgress);
          setMessage('Time is up. Nightmare claimed this run.');
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, progressKey, progress.won, progress.lost]);

  const puzzle = useMemo(() => getPuzzleForDay(candidates, dayKey, mode, userSeed), [candidates, dayKey, mode, userSeed]);
  const endlessCfg = useMemo(() => endlessConfig(endless?.level || 1), [endless?.level]);
  const endlessPuzzle = useMemo(
    () => (endless ? pickEndlessPuzzle(candidates, endless.seed, endless.level, endless.usedSlugs) : null),
    [endless, candidates]
  );
  const endlessRound = endless?.round || { guesses: [], won: false, lost: false };
  const suggestions = useMemo(() => {
    const q = normalizeGuess(guess);
    const guessedSlugs = new Set([
      ...progress.guesses.map((g) => g.slug),
      ...(mode === 'endless' ? endlessRound.guesses.map((g) => g.slug) : []),
    ]);
    const availableUnits = units.filter((unit) => !guessedSlugs.has(unit.slug));
    if (!q) return availableUnits.slice(0, 24);
    return availableUnits.filter((unit) => normalizeGuess(unit.name).includes(q) || unit.slug.includes(q.replace(/\s+/g, '-'))).slice(0, 32);
  }, [guess, progress.guesses, units, mode, endlessRound.guesses]);

  const wrongGuesses = progress.guesses.filter((g) => !g.correct).length;
  const showDamage = modeConfig.startingDamage || wrongGuesses >= modeConfig.reveal.damage || progress.won || progress.lost;
  const showRange = wrongGuesses >= modeConfig.reveal.range || progress.won || progress.lost;
  const showCooldown = wrongGuesses >= modeConfig.reveal.cooldown || progress.won || progress.lost;
  const showRarity = wrongGuesses >= modeConfig.reveal.rarity || progress.won || progress.lost;
  const guessesLeft = modeConfig.maxGuesses ? Math.max(0, modeConfig.maxGuesses - progress.guesses.length) : null;
  const maxUnlockableGuesses = modeConfig.maxGuesses || Infinity;
  const renderDamage = modeConfig.reveal.damage <= maxUnlockableGuesses || showDamage;
  const renderRange = modeConfig.reveal.range <= maxUnlockableGuesses || showRange;
  const renderCooldown = modeConfig.reveal.cooldown <= maxUnlockableGuesses || showCooldown;
  const renderRarity = modeConfig.reveal.rarity <= maxUnlockableGuesses || showRarity;

  function commitProgress(nextProgress) {
    setProgress(nextProgress);
    if (progressKey) saveProgress(progressKey, nextProgress);
  }

  function restartEndless() {
    clearTimeout(endlessTimer.current);
    setEndless({
      seed: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level: 1,
      usedSlugs: [],
      round: { guesses: [], won: false, lost: false },
      over: false,
    });
    setGuess('');
    setDropdownOpen(false);
    setMessage('');
  }

  function submitEndlessGuess(event) {
    event.preventDefault();
    if (!endless || endless.over || endlessRound.won || !endlessPuzzle) return;

    const normalized = normalizeGuess(guess);
    const guessedUnit = units.find((u) => normalizeGuess(u.name) === normalized || u.slug === normalized.replace(/\s+/g, '-'));
    if (!guessedUnit) {
      setMessage('Pick a unit from the unit list.');
      return;
    }
    if (endlessRound.guesses.some((g) => g.slug === guessedUnit.slug)) {
      setMessage('You already guessed that unit this level.');
      setGuess('');
      return;
    }

    const correct = guessedUnit.slug === endlessPuzzle.unit.slug;
    const nextGuesses = [...endlessRound.guesses, { slug: guessedUnit.slug, name: guessedUnit.name, correct }];

    if (correct) {
      incrementStat('bk_correct', 1);
      const reached = endless.level;
      if (reached > loadBestLevel()) {
        saveBestLevel(reached);
        setStat('bk_endless_best', reached);
      }
      setMessage(`Correct — level ${reached} cleared. The clues are thinning…`);
      setEndless((prev) => ({ ...prev, round: { guesses: nextGuesses, won: true, lost: false } }));
      clearTimeout(endlessTimer.current);
      endlessTimer.current = setTimeout(() => {
        setEndless((prev) => ({
          ...prev,
          level: prev.level + 1,
          usedSlugs: [...prev.usedSlugs, endlessPuzzle.unit.slug],
          round: { guesses: [], won: false, lost: false },
        }));
        setGuess('');
        setDropdownOpen(false);
        setMessage('');
      }, 1000);
    } else if (nextGuesses.length >= endlessCfg.maxGuesses) {
      setEndless((prev) => ({ ...prev, over: true, round: { guesses: nextGuesses, won: false, lost: true } }));
      setMessage(`Run over at level ${endless.level}. The answer is revealed below.`);
    } else {
      setEndless((prev) => ({ ...prev, round: { guesses: nextGuesses, won: false, lost: false } }));
      setMessage('Not that unit. New clue may have unlocked.');
    }
    setGuess('');
    setDropdownOpen(false);
  }

  function submitGuess(event) {
    event.preventDefault();
    if (!puzzle || progress.won || progress.lost) return;

    const normalized = normalizeGuess(guess);
    const guessedUnit = units.find((u) => normalizeGuess(u.name) === normalized || u.slug === normalized.replace(/\s+/g, '-'));
    if (!guessedUnit) {
      setMessage('Pick a unit from the unit list.');
      return;
    }
    if (progress.guesses.some((g) => g.slug === guessedUnit.slug)) {
      setMessage('You already guessed that unit today.');
      setGuess('');
      return;
    }

    const correct = guessedUnit.slug === puzzle.unit.slug;
    const nextGuesses = [...progress.guesses, { slug: guessedUnit.slug, name: guessedUnit.name, correct }];
    const lost = !correct && modeConfig.maxGuesses && nextGuesses.length >= modeConfig.maxGuesses;
    const nextProgress = { ...progress, won: progress.won || correct, lost: progress.lost || lost, guesses: nextGuesses };

    if (correct && !progress.won) {
      setStats((prev) => recordWin(prev, dayKey, nextProgress.guesses.length));
      incrementStat('bk_correct', 1);
      if (mode === 'impossible') incrementStat('bk_impossible_win', 1);
      if (mode === 'nightmare') incrementStat('bk_nightmare_win', 1);
      // Speed Demon: solved within 10 seconds of the day's first load
      if (progress.startTime && (Date.now() - progress.startTime) < 10000) {
        incrementStat('bk_speed_run', 1);
      }
      // Perfectionist: 5 correct daily puzzles IN A ROW (persisted across days)
      try {
        const streak = (Number(localStorage.getItem('apex-bk-win-streak')) || 0) + 1;
        localStorage.setItem('apex-bk-win-streak', String(streak));
        nextProgress.streak = streak;
        if (streak >= 5) incrementStat('bk_streak_5', 1);
      } catch { /* ignore */ }
    }
    if (lost) {
      // A lost day breaks the win streak.
      try { localStorage.setItem('apex-bk-win-streak', '0'); } catch { /* ignore */ }
      nextProgress.streak = 0;
    }
    commitProgress(nextProgress);
    setGuess('');
    setDropdownOpen(false);
    setMessage(correct ? 'Correct — your Ball TD knowledge is verified.' : lost ? 'Out of guesses. The answer is revealed.' : 'Not that unit. New clue may have unlocked.');
  }

  function pickSuggestion(unitName) {
    setGuess(unitName);
    setDropdownOpen(false);
  }

  async function shareResult() {
    const guessCount = progress.guesses.length;
    const wrong = Math.max(0, guessCount - 1);
    const blocks = progress.won ? `${'⬛'.repeat(wrong)}🟩` : `${'⬛'.repeat(guessCount)}🟥`;
    const text = [
      `Ball Knowledge ${dayKey} — ${modeConfig.icon} ${modeConfig.label}`,
      progress.won ? `Solved in ${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'}` : 'Failed',
      blocks,
      `Streak: ${stats.currentStreak}`,
      'apex-values.github.io',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setShareMessage('Copied share result.');
    } catch {
      setShareMessage('Could not copy result.');
    }
  }

  if (mode !== 'endless' && timeState.status === 'loading') {
    return <main className="bk-page"><div className="bk-panel card"><h1>Ball Knowledge</h1><p>Verifying global time…</p></div></main>;
  }
  if (mode !== 'endless' && timeState.status === 'error') {
    return <main className="bk-page"><div className="bk-panel card"><h1>Ball Knowledge</h1><p className="bk-error">Couldn&apos;t verify global time, so today&apos;s puzzle is locked. This game does not use your PC clock. Check your connection and reload.</p></div></main>;
  }
  if (mode !== 'endless' && !puzzle) {
    return <main className="bk-page"><div className="bk-panel card"><h1>Ball Knowledge</h1><p>No eligible upgrade clues found.</p></div></main>;
  }

  if (mode === 'endless') {
    const wrongs = endlessRound.guesses.filter((g) => !g.correct).length;
    const eLocked = endlessRound.won || endless?.over;
    const eShowDamage = wrongs >= endlessCfg.reveal.damage || eLocked;
    const eShowRange = wrongs >= endlessCfg.reveal.range || eLocked;
    const eShowCooldown = wrongs >= endlessCfg.reveal.cooldown || eLocked;
    const eShowRarity = wrongs >= endlessCfg.reveal.rarity || eLocked;
    const eRenderDamage = endlessCfg.reveal.damage <= endlessCfg.maxGuesses || eShowDamage;
    const eRenderRange = endlessCfg.reveal.range <= endlessCfg.maxGuesses || eShowRange;
    const eRenderCooldown = endlessCfg.reveal.cooldown <= endlessCfg.maxGuesses || eShowCooldown;
    const eRenderRarity = endlessCfg.reveal.rarity <= endlessCfg.maxGuesses || eShowRarity;
    const guessesLeft = Math.max(0, endlessCfg.maxGuesses - endlessRound.guesses.length);
    const eTitle = endlessPuzzle ? (endlessPuzzle.upgrade.description || endlessPuzzle.upgrade.label) : '';

    return (
      <main className="bk-page">
        <motion.section className="bk-hero" variants={fadeUp} initial="initial" animate="animate">
          <p className="bk-kicker">Endless Chain</p>
          <h1>Ball Knowledge</h1>
          <p className="bk-tagline">One puzzle per level. Every few levels the details trim: fewer guesses, fewer clues.</p>
          <p className="bk-time-note">Level 7 loses DPS · 10 loses cost/DPS · 13 loses the level label · 16 is upgrade-name-only with a single guess.</p>
        </motion.section>

        <motion.section className="bk-mode-bar" variants={fadeUp} initial="initial" animate="animate" custom={0.05}>
          {Object.entries(MODES).map(([id, cfg]) => (
            <button key={id} type="button" className="bk-mode" onClick={() => setMode(id)}>
              <span>{cfg.icon}</span> {cfg.label}
            </button>
          ))}
          <button type="button" className="bk-mode active"><span>♾️</span> Endless</button>
        </motion.section>

        <motion.section className="bk-stats-strip" variants={fadeUp} initial="initial" animate="animate" custom={0.08}>
          <StatTile label="Level" value={endless?.level || 1} />
          <StatTile label="Best Level" value={loadBestLevel()} />
          <StatTile label="Guesses Left" value={guessesLeft} />
          <StatTile label="Cleared" value={(endless?.level || 1) - 1} />
        </motion.section>

        <motion.section className="bk-panel card" variants={fadeUp} initial="initial" animate="animate" custom={0.12}>
          <div className="bk-panel-head">
            <div>
              <div className="bk-day">♾️ Endless · Level {endless?.level || 1} · {endlessCfg.maxGuesses} {endlessCfg.maxGuesses === 1 ? 'guess' : 'guesses'}</div>
              <h2>Guess the unit</h2>
            </div>
          </div>

          {endlessPuzzle && (
            <div className="bk-clues">
              <ClueCard label="Upgrade Name" value={eTitle} always />
              {!endlessCfg.oneClueOnly && endlessCfg.showLevel && <ClueCard label="Level" value={endlessPuzzle.upgrade.label} always />}
              {!endlessCfg.oneClueOnly && endlessCfg.showDps && <ClueCard label="DPS" value={formatEntries(endlessPuzzle.upgrade.dps)} always />}
              {!endlessCfg.oneClueOnly && endlessCfg.showCostPerDps && <ClueCard label="Cost Per DPS" value={endlessPuzzle.upgrade.costPerDps} always />}
              {!endlessCfg.oneClueOnly && eRenderDamage && <ClueCard label="Damage" value={endlessPuzzle.damageRows.map((r) => `${r.label}: ${r.value}`).join(' / ')} revealed={eShowDamage} lockedText={`Unlocks after ${endlessCfg.reveal.damage} wrong`} />}
              {!endlessCfg.oneClueOnly && eRenderRange && <ClueCard label="Range" value={endlessPuzzle.upgrade.range} revealed={eShowRange} lockedText={`Unlocks after ${endlessCfg.reveal.range} wrong`} />}
              {!endlessCfg.oneClueOnly && eRenderCooldown && <ClueCard label="Cooldown" value={endlessPuzzle.upgrade.cooldown} revealed={eShowCooldown} lockedText={`Unlocks after ${endlessCfg.reveal.cooldown} wrong`} />}
              {!endlessCfg.oneClueOnly && eRenderRarity && <ClueCard label="Rarity" value={endlessPuzzle.unit.rarity} revealed={eShowRarity} lockedText={`Unlocks after ${endlessCfg.reveal.rarity} wrong`} />}
            </div>
          )}

          {endless?.over ? (
            <div className="bk-success bk-loss">
              <div className="bk-result-label">Run Over — Reached Level {endless.level}</div>
              <div className="bk-result-name">{endlessPuzzle ? endlessPuzzle.unit.name : '—'}</div>
              <div className="bk-success-actions">
                <button type="button" className="bk-link" onClick={restartEndless}>Restart Endless</button>
              </div>
            </div>
          ) : (
            <form className="bk-guess-form" onSubmit={submitEndlessGuess}>
              <label htmlFor="bk-guess-endless">Your guess</label>
              <div className="bk-guess-row">
                <div className="bk-combobox">
                  <input
                    id="bk-guess-endless"
                    value={guess}
                    onChange={(e) => { setGuess(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 120)}
                    placeholder="Type a unit name…"
                    autoComplete="off"
                  />
                  {dropdownOpen && (
                    <div className="bk-suggestion-menu" data-lenis-prevent>
                      {suggestions.length > 0 ? suggestions.map((unit) => (
                        <button type="button" key={unit.slug} className="bk-suggestion-option" onMouseDown={(e) => e.preventDefault()} onClick={() => pickSuggestion(unit.name)}>
                          <span>{unit.name}</span><small>{unit.rarity}</small>
                        </button>
                      )) : <div className="bk-suggestion-empty">No matching units.</div>}
                    </div>
                  )}
                </div>
                <button type="submit">Guess</button>
              </div>
            </form>
          )}

          {message && <div className={endlessRound.won ? 'bk-message success' : 'bk-message'}>{message}</div>}
          {endlessRound.guesses.length > 0 && (
            <div className="bk-guesses">
              <h3>This level</h3>
              <div className="bk-guess-list">
                {endlessRound.guesses.map((entry) => <span key={entry.slug} className={entry.correct ? 'bk-guess-chip correct' : 'bk-guess-chip'}>{entry.correct ? '✓' : '×'} {entry.name}</span>)}
              </div>
            </div>
          )}
        </motion.section>
      </main>
    );
  }

  const upgradeTitle = puzzle.upgrade.description || puzzle.upgrade.label;
  const locked = progress.won || progress.lost;

  return (
    <main className="bk-page">
      <motion.section className="bk-hero" variants={fadeUp} initial="initial" animate="animate">
        <p className="bk-kicker">Daily Unit Guess</p>
        <h1>Ball Knowledge</h1>
        <p className="bk-tagline">Test your Ball TD unit knowledge.</p>
        <p className="bk-time-note">Personalized puzzle verified by global time. Normal/Hard/Impossible reset at 3PM EST. Nightmare resets every 3 days.</p>
      </motion.section>

      <motion.section className="bk-mode-bar" variants={fadeUp} initial="initial" animate="animate" custom={0.05}>
        {Object.entries(MODES).map(([id, cfg]) => (
          <button key={id} type="button" className={mode === id ? 'bk-mode active' : 'bk-mode'} onClick={() => setMode(id)}>
            <span>{cfg.icon}</span> {cfg.label}
          </button>
        ))}
        <button type="button" className={mode === 'endless' ? 'bk-mode active' : 'bk-mode'} onClick={() => setMode('endless')}>
          <span>♾️</span> Endless
        </button>
      </motion.section>

      <motion.section className="bk-stats-strip" variants={fadeUp} initial="initial" animate="animate" custom={0.08}>
        <StatTile label="Current Streak" value={stats.currentStreak} />
        <StatTile label="Max Streak" value={stats.maxStreak} />
        <StatTile label="Wins" value={stats.wins} />
        <StatTile label="Next Reset" value={countdown} />
      </motion.section>

      <motion.section className={progress.won ? 'bk-panel card bk-panel-won' : 'bk-panel card'} variants={fadeUp} initial="initial" animate="animate" custom={0.12}>
        {progress.won && <CorrectVfx />}
        <div className="bk-panel-head">
          <div>
            <div className="bk-day">{modeConfig.icon} {modeConfig.label} · Puzzle {getModeDayKey(dayKey, mode)}</div>
            <h2>Guess the unit</h2>
          </div>
          <div className="bk-limits">
            {guessesLeft !== null && <span>{guessesLeft} guesses left</span>}
            {modeConfig.timeLimit && <span className={nightmareRemaining <= 10 ? 'danger' : ''}>{nightmareRemaining}s</span>}
          </div>
        </div>

        <div className="bk-clues">
          <ClueCard label="Upgrade Name" value={upgradeTitle} always />
          {!modeConfig.oneClueOnly && <ClueCard label="Level" value={puzzle.upgrade.label} always />}
          {!modeConfig.oneClueOnly && <ClueCard label="DPS" value={formatEntries(puzzle.upgrade.dps)} always />}
          {!modeConfig.oneClueOnly && <ClueCard label="Cost Per DPS" value={puzzle.upgrade.costPerDps} always />}
          {!modeConfig.oneClueOnly && renderDamage && <ClueCard label="Damage" value={puzzle.damageRows.map((r) => `${r.label}: ${r.value}`).join(' / ')} revealed={showDamage} lockedText={`Unlocks after ${modeConfig.reveal.damage} wrong`} />}
          {!modeConfig.oneClueOnly && renderRange && <ClueCard label="Range" value={puzzle.upgrade.range} revealed={showRange} lockedText={`Unlocks after ${modeConfig.reveal.range} wrong`} />}
          {!modeConfig.oneClueOnly && renderCooldown && <ClueCard label="Cooldown" value={puzzle.upgrade.cooldown} revealed={showCooldown} lockedText={`Unlocks after ${modeConfig.reveal.cooldown} wrong`} />}
          {!modeConfig.oneClueOnly && renderRarity && <ClueCard label="Rarity" value={puzzle.unit.rarity} revealed={showRarity} lockedText={`Unlocks after ${modeConfig.reveal.rarity} wrong`} />}
        </div>

        {locked ? (
          <div className={progress.won ? 'bk-success' : 'bk-success bk-loss'}>
            <div className="bk-result-label">{progress.won ? 'Answer' : 'Answer Revealed'}</div>
            <div className="bk-result-name">{puzzle.unit.name}</div>
            <div className="bk-success-actions">
              <Link to={`/wiki/units/${encodeURIComponent(puzzle.unit.rarity)}/${puzzle.unit.slug}`} className="bk-link">Open unit page →</Link>
              <button type="button" className="bk-link" onClick={shareResult}>Share Result</button>
            </div>
            {shareMessage && <div className="bk-share-message">{shareMessage}</div>}
          </div>
        ) : (
          <form className="bk-guess-form" onSubmit={submitGuess}>
            <label htmlFor="bk-guess">Your guess</label>
            <div className="bk-guess-row">
              <div className="bk-combobox">
                <input
                  id="bk-guess"
                  value={guess}
                  onChange={(e) => { setGuess(e.target.value); setDropdownOpen(true); }}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 120)}
                  placeholder="Type a unit name…"
                  autoComplete="off"
                />
                {dropdownOpen && (
                  <div className="bk-suggestion-menu" data-lenis-prevent>
                    {suggestions.length > 0 ? suggestions.map((unit) => (
                      <button type="button" key={unit.slug} className="bk-suggestion-option" onMouseDown={(e) => e.preventDefault()} onClick={() => pickSuggestion(unit.name)}>
                        <span>{unit.name}</span><small>{unit.rarity}</small>
                      </button>
                    )) : <div className="bk-suggestion-empty">No matching units.</div>}
                  </div>
                )}
              </div>
              <button type="submit">Guess</button>
            </div>
          </form>
        )}

        {message && <div className={progress.won ? 'bk-message success' : 'bk-message'}>{message}</div>}
        {progress.guesses.length > 0 && (
          <div className="bk-guesses">
            <h3>Today&apos;s guesses</h3>
            <div className="bk-guess-list">
              {progress.guesses.map((entry) => <span key={entry.slug} className={entry.correct ? 'bk-guess-chip correct' : 'bk-guess-chip'}>{entry.correct ? '✓' : '×'} {entry.name}</span>)}
            </div>
          </div>
        )}
        {stats.wins > 0 && <GuessDistribution distribution={stats.guessDistribution} max={Math.max(...Object.values(stats.guessDistribution || {}), 1)} />}
      </motion.section>
    </main>
  );
}

function CorrectVfx() {
  return (
    <div className="bk-correct-vfx" aria-hidden="true">
      <div className="bk-green-explosion" />
      {confettiPieces().map((piece) => <i key={piece.id} style={{ '--x': `${piece.x}px`, '--y': `${piece.y}px`, '--delay': piece.delay }} />)}
    </div>
  );
}

function StatTile({ label, value }) {
  return <div className="bk-stat-tile card"><strong>{value}</strong><span>{label}</span></div>;
}

function GuessDistribution({ distribution, max }) {
  return (
    <div className="bk-distribution">
      <h3>Guess Distribution</h3>
      {[1, 2, 3, 4, 5, 6].map((guessNumber) => {
        const count = distribution?.[guessNumber] || 0;
        const width = count ? Math.max(10, (count / max) * 100) : 4;
        return (
          <div key={guessNumber} className="bk-dist-row">
            <span>{guessNumber}</span>
            <div className="bk-dist-track"><div className="bk-dist-fill" style={{ width: `${width}%` }}>{count}</div></div>
          </div>
        );
      })}
    </div>
  );
}

function ClueCard({ label, value, always = false, revealed = false, lockedText }) {
  const isVisible = always || revealed;
  return (
    <div className={isVisible ? 'bk-clue revealed' : 'bk-clue'}>
      <div className="bk-clue-label">{label}</div>
      <div className="bk-clue-value">{isVisible ? value : lockedText}</div>
    </div>
  );
}
