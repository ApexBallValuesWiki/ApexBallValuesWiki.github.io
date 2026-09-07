import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveValues } from '../../hooks/useLiveValues';
import UnitIcon from '../../components/UnitIcon';
import { getRarityGlow } from '../../data/taxonomy';
import { formatCompactNumber, formatFullNumber } from '../../utils/formatNumber';
import { fetchGlobalTimeMs } from '../../utils/globalTime';
import { getDailyKey, nextResetMs, formatDuration } from '../../utils/ballKnowledgeTime';
import { getUserSeed, rngFromSeed, randInt } from '../../utils/minigameRandom';
import {
  eligiblePool,
  buildChain,
  correctCall,
  endlessBand,
  nextEndlessPair,
  loadStats,
  saveStats,
  loadProgress,
  saveProgress,
  buildShareText,
} from '../../utils/ballonomics';
import { incrementStat } from '../../utils/achievements';
import './Minigames.css';

const STATS_KEY = 'apex-ballonomics-stats-v1';
const USER_SEED_KEY = 'apex-ballonomics-user-seed-v1';
const DAILY_SALT = 'apex-ballonomics-daily-v1';
const CHAIN_LENGTH = 10; // 10 cards -> 9 comparisons
const WIN_THRESHOLD = 6; // 6/9 or better keeps the daily streak alive
const REVEAL_MS = 950;

export default function Ballonomics() {
  const { allValueEntries } = useLiveValues();
  const [mode, setMode] = useState('daily');
  const [timeState, setTimeState] = useState({ status: 'loading' });
  const [dayKey, setDayKey] = useState(null);
  const [countdown, setCountdown] = useState('—');
  const userSeed = useMemo(() => getUserSeed(USER_SEED_KEY), []);

  const pool = useMemo(() => eligiblePool(allValueEntries), [allValueEntries]);

  // daily run
  const dailyChain = useMemo(
    () => (dayKey ? buildChain(pool, `${DAILY_SALT}:${dayKey}:${userSeed}`, CHAIN_LENGTH) : []),
    [pool, dayKey, userSeed]
  );
  const dailyStorageKey = dayKey ? `apex-ballonomics-daily:${dayKey}:${userSeed}` : null;
  const [daily, setDaily] = useState({ calls: [], done: false, lost: false });

  useEffect(() => {
    if (dailyStorageKey) setDaily(loadProgress(dailyStorageKey));
  }, [dailyStorageKey]);

  // endless run (in-memory; only the best is persisted)
  // Progressive: the next unit is drawn from a value band that tightens as
  // the chain grows (endlessBand) — calls get harder the longer you survive.
  const [endlessSeed, setEndlessSeed] = useState(null);
  const [endless, setEndless] = useState({ calls: [], current: null, next: null, done: false, lost: false });

  const [stats, setStats] = useState(() => loadStats(STATS_KEY));
  const [reveal, setReveal] = useState(null); // { call, correct, value }
  const [shareMessage, setShareMessage] = useState('');
  const revealTimer = useRef(null);

  // global time (daily key + reset countdown)
  useEffect(() => {
    let cancelled = false;
    fetchGlobalTimeMs()
      .then(({ ms }) => {
        if (cancelled) return;
        setTimeState({ status: 'ready', verifiedMs: ms, verifiedPerf: performance.now() });
      })
      .catch(() => !cancelled && setTimeState({ status: 'error' }));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (timeState.status !== 'ready') return undefined;
    function tick() {
      const nowMs = timeState.verifiedMs + (performance.now() - timeState.verifiedPerf);
      setDayKey((prev) => (prev === getDailyKey(nowMs) ? prev : getDailyKey(nowMs)));
      setCountdown(formatDuration(nextResetMs(nowMs, {}) - nowMs));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timeState]);

  useEffect(() => () => clearTimeout(revealTimer.current), []);

  const isDaily = mode === 'daily';
  const run = isDaily ? daily : endless;
  const correctCount = run.calls.filter(Boolean).length;
  const finished = run.done || run.lost;
  const left = isDaily ? dailyChain[run.calls.length] : endless.current;
  const right = isDaily ? dailyChain[run.calls.length + 1] : endless.next;

  function commitDaily(next) {
    setDaily(next);
    if (dailyStorageKey) saveProgress(dailyStorageKey, next);
  }

  function finishDaily(finalCalls) {
    const correct = finalCalls.filter(Boolean).length;
    const wonDaily = correct >= WIN_THRESHOLD;
    setStats((prev) => {
      const streak = wonDaily ? prev.currentStreak + 1 : 0;
      const next = {
        ...prev,
        played: prev.played + 1,
        dailyBest: Math.max(prev.dailyBest, correct),
        currentStreak: streak,
        maxStreak: Math.max(prev.maxStreak, streak),
        lastSolvedDay: dayKey || prev.lastSolvedDay || null,
      };
      saveStats(STATS_KEY, next);
      return next;
    });
    if (correct === CHAIN_LENGTH - 1) incrementStat('bono_daily_perfect', 1);
  }

  function makeCall(call) {
    if (!left || !right || finished || reveal) return;
    const answer = correctCall(left, right);
    const good = call === answer;

    setReveal({ call, correct: good, value: right.tradeValue });

    if (good) incrementStat('bono_correct', 1);

    const nextCalls = [...run.calls, good];
    const wrongEnds = !good; // classic rules: one wrong call ends the run

    revealTimer.current = setTimeout(() => {
      setReveal(null);
      if (isDaily) {
        const chainComplete = nextCalls.length >= dailyChain.length - 1;
        const next = { calls: nextCalls, done: chainComplete, lost: wrongEnds };
        commitDaily(next);
        if (chainComplete || wrongEnds) finishDaily(nextCalls);
      } else if (good) {
        const streak = nextCalls.filter(Boolean).length;
        const current = endless.next;
        const next = nextEndlessPair(pool, endlessSeed, streak, current);
        setEndless({ calls: nextCalls, current, next, done: !next, lost: false });
        if (streak === 10) incrementStat('bono_endless_streak_10', 1);
      } else {
        const streak = nextCalls.filter(Boolean).length;
        setEndless((prev) => ({ ...prev, calls: nextCalls, lost: true }));
        setStats((prev) => {
          const next = { ...prev, endlessBest: Math.max(prev.endlessBest, streak) };
          saveStats(STATS_KEY, next);
          return next;
        });
        if (streak === 10) incrementStat('bono_endless_streak_10', 1);
      }
    }, REVEAL_MS);
  }

  function startEndless() {
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setEndlessSeed(seed);
    const rng = rngFromSeed(seed);
    const current = pool[randInt(rng, pool.length)];
    setEndless({ calls: [], current, next: nextEndlessPair(pool, seed, 0, current), done: false, lost: false });
    setReveal(null);
    setShareMessage('');
  }

  async function shareResult() {
    const text = buildShareText({
      dayKey,
      correct: daily.calls.filter(Boolean).length,
      total: CHAIN_LENGTH - 1,
      streak: stats.currentStreak,
    });
    try {
      await navigator.clipboard.writeText(text);
      setShareMessage('Copied share result.');
    } catch {
      setShareMessage('Could not copy result.');
    }
  }

  if (timeState.status === 'loading') {
    return (
      <main className="mg-page">
        <div className="mg-panel"><h1>Ballonomics</h1><p>Verifying global time…</p></div>
      </main>
    );
  }
  if (timeState.status === 'error') {
    return (
      <main className="mg-page">
        <div className="mg-panel">
          <h1>Ballonomics</h1>
          <p className="mg-error">Couldn&apos;t verify global time, so today&apos;s puzzle is locked. This game does not use your PC clock. Check your connection and reload.</p>
        </div>
      </main>
    );
  }
  if (pool.length < 2) {
    return (
      <main className="mg-page">
        <div className="mg-panel"><h1>Ballonomics</h1><p>No valued units available yet.</p></div>
      </main>
    );
  }

  return (
    <main className="mg-page">
      <header className="mg-hero">
        <Link className="mg-backlink" to="/minigames">← Minigames</Link>
        <p className="mg-kicker">Higher or Lower</p>
        <h1>BALLONOMICS</h1>
        <p className="mg-tagline">Call the market: is the next ball worth more or less? One wrong call ends the run.</p>
        <p className="mg-time-note">Daily resets at 3PM EST. Daily streak needs {WIN_THRESHOLD}/{CHAIN_LENGTH - 1} or better.</p>
      </header>

      <section className="mg-mode-bar">
        <button type="button" className={mode === 'daily' ? 'mg-mode active' : 'mg-mode'} onClick={() => { setMode('daily'); setReveal(null); }}>
          📅 Daily
        </button>
        <button type="button" className={mode === 'endless' ? 'mg-mode active' : 'mg-mode'} onClick={() => { setMode('endless'); setReveal(null); }}>
          ♾️ Endless
        </button>
      </section>

      <section className="mg-stats-strip">
        <div className="mg-stat-tile"><strong>{isDaily ? `${correctCount}/${CHAIN_LENGTH - 1}` : correctCount}</strong><span>{isDaily ? 'Today' : 'Run'}</span></div>
        <div className="mg-stat-tile"><strong>{stats.dailyBest}/{CHAIN_LENGTH - 1}</strong><span>Daily Best</span></div>
        <div className="mg-stat-tile"><strong>{stats.endlessBest}</strong><span>Endless Best</span></div>
        <div className="mg-stat-tile"><strong>{stats.currentStreak}</strong><span>Daily Streak</span></div>
        <div className="mg-stat-tile"><strong>{countdown}</strong><span>Next Reset</span></div>
      </section>

      <section className="mg-panel">
        {isDaily && (
          <div className="bono-history">
            {Array.from({ length: CHAIN_LENGTH - 1 }, (_, i) => {
              const result = daily.calls[i];
              const cls = result === undefined ? 'bono-history-chip' : result ? 'bono-history-chip good' : 'bono-history-chip bad';
              return <span key={i} className={cls}>{i + 1}</span>;
            })}
          </div>
        )}

        {isDaily && finished && (
          <div className="ball-result">
            <div className="ball-result-name">{daily.calls.filter(Boolean).length}/{CHAIN_LENGTH - 1}</div>
            <div className="ball-result-sub">
              {daily.calls.filter(Boolean).length >= WIN_THRESHOLD
                ? `Market read — daily streak is now ${stats.currentStreak}.`
                : 'The market humbled you today. Back at 3PM EST.'}
            </div>
            <div className="ball-actions-row">
              <button type="button" className="mg-link" onClick={shareResult}>Share Result</button>
            </div>
            {shareMessage && <div className="mg-message">{shareMessage}</div>}
            <div className="bono-review">
              {dailyChain.slice(0, -1).map((entry, i) => (
                dailyChain[i + 1] && (
                  <div key={`${entry.slug}-${i}`} className="bono-review-row">
                    <span>{entry.name} vs {dailyChain[i + 1].name}</span>
                    <span className="values">
                      {formatCompactNumber(entry.tradeValue)} → {formatCompactNumber(dailyChain[i + 1].tradeValue)}
                      {daily.calls[i] !== undefined && (daily.calls[i] ? ' ✓' : ' ×')}
                    </span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {!isDaily && !endlessSeed && (
          <div className="ball-result">
            <div className="ball-result-sub">Chain correct calls. Every card is a real unit at its real value.</div>
            <button type="button" className="ball-again" onClick={startEndless}>Start Run</button>
          </div>
        )}

        {!isDaily && endlessSeed && finished && (
          <div className="ball-result">
            <div className="ball-result-name">{endless.calls.filter(Boolean).length}</div>
            <div className="ball-result-sub">chain — best {stats.endlessBest}</div>
            <button type="button" className="ball-again" onClick={startEndless}>Run It Again</button>
          </div>
        )}

        {left && right && !finished && (
          <>
            <div className="bono-arena">
              <div className="bono-card" key={left.slug}>
                <span className="bono-card-label">Known</span>
                <UnitIcon
                  slug={left.slug}
                  name={left.name}
                  glowColor={getRarityGlow(left.rarity)}
                  size={56}
                  imageUrl={left.image_url || left.imageUrl}
                />
                <span className="bono-card-name">{left.name}</span>
                <span className="bono-card-rarity" style={{ color: getRarityGlow(left.rarity) || undefined }}>{left.rarity}</span>
                <span className="bono-card-value" title={`${formatFullNumber(left.tradeValue)} exact`}>
                  {formatCompactNumber(left.tradeValue)}
                </span>
              </div>

              <span className="bono-card-vs">VS</span>

              <div className={reveal
                ? `bono-card ${reveal.correct ? 'reveal-good' : 'reveal-bad'}`
                : 'bono-card mystery'}
              >
                <span className="bono-card-label">{reveal ? 'Revealed' : 'Mystery'}</span>
                <UnitIcon
                  slug={right.slug}
                  name={right.name}
                  glowColor={getRarityGlow(right.rarity)}
                  size={56}
                  imageUrl={right.image_url || right.imageUrl}
                />
                <span className="bono-card-name">{right.name}</span>
                <span className="bono-card-rarity" style={{ color: getRarityGlow(right.rarity) || undefined }}>{right.rarity}</span>
                <span
                  className={reveal ? 'bono-card-value' : 'bono-card-value hidden'}
                  style={reveal && !reveal.correct ? { color: 'var(--danger, #ff5566)' } : undefined}
                  title={reveal ? `${formatFullNumber(right.tradeValue)} exact` : undefined}
                >
                  {reveal ? formatCompactNumber(right.tradeValue) : '?'}
                </span>
              </div>
            </div>

            <div className="bono-buttons">
              <button type="button" className="bono-btn" onClick={() => makeCall('higher')} disabled={!!reveal}>
                ⬆ HIGHER
              </button>
              <button type="button" className="bono-btn" onClick={() => makeCall('lower')} disabled={!!reveal}>
                ⬇ LOWER
              </button>
            </div>
            {reveal && (
              <div className={reveal.correct ? 'mg-message success' : 'mg-message'} style={{ textAlign: 'center' }}>
                {reveal.correct ? 'Called it.' : 'Missed — run over.'}
              </div>
            )}
            {!isDaily && (
              <div className="mg-time-note" style={{ textAlign: 'center', marginTop: 10 }}>
                Values now within {endlessBand(correctCount).toFixed(2)}× — the gap tightens as you chain
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
