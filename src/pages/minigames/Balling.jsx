import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveValues } from '../../hooks/useLiveValues';
import { fetchGlobalTimeMs } from '../../utils/globalTime';
import { getDailyKey, nextResetMs, formatDuration } from '../../utils/ballKnowledgeTime';
import { getUserSeed } from '../../utils/minigameRandom';
import {
  PIXEL_STAGES,
  applyWrongGuess,
  eligiblePool,
  pickAnswer,
  stagePoints,
  loadStats,
  saveStats,
  loadProgress,
  saveProgress,
  buildShareText,
} from '../../utils/balling';
import { incrementStat } from '../../utils/achievements';
import './Minigames.css';

const STATS_KEY = 'apex-balling-stats-v1';
const USER_SEED_KEY = 'apex-balling-user-seed-v1';
const DAILY_SALT = 'apex-balling-daily-v1';
// Wrong guesses sharpen the picture; a miss at the cap loses the run.
// Quick Play shrinks the budget as the solve chain grows: pixels are lives,
// and hot streaks get fewer of them.
function quickBudget(quickChain) {
  return Math.max(3, 10 - Math.max(0, quickChain));
}

function normalizeGuess(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Draw `img` onto the display canvas at a pixel-grid resolution. */
function drawPixelated(canvas, img, stage) {
  if (!canvas) return;
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  if (!img) return;
  if (!stage) {
    // stage 0 = full resolution
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, size, size);
    return;
  }
  const tiny = document.createElement('canvas');
  tiny.width = stage;
  tiny.height = stage;
  const tctx = tiny.getContext('2d');
  tctx.drawImage(img, 0, 0, stage, stage);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tiny, 0, 0, size, size);
}

export default function Balling() {
  const { allValueEntries } = useLiveValues();
  const [mode, setMode] = useState('daily');
  const [timeState, setTimeState] = useState({ status: 'loading' });
  const [dayKey, setDayKey] = useState(null);
  const [countdown, setCountdown] = useState('—');
  const userSeed = useMemo(() => getUserSeed(USER_SEED_KEY), []);

  const pool = useMemo(() => eligiblePool(allValueEntries), [allValueEntries]);
  const nameIndex = useMemo(
    () => pool.map((entry) => ({ slug: entry.slug, name: entry.name, normal: normalizeGuess(entry.name) })),
    [pool]
  );

  const dailyAnswer = useMemo(
    () => (dayKey ? pickAnswer(pool, `${DAILY_SALT}:${dayKey}:${userSeed}`) : null),
    [pool, dayKey, userSeed]
  );
  const dailyStorageKey = dayKey ? `apex-balling-daily:${dayKey}:${userSeed}` : null;

  const [daily, setDaily] = useState({ solved: false, lost: false, guesses: [], stageIndex: null, startTime: Date.now() });
  const [quick, setQuick] = useState(null); // { answer, solved, lost, guesses }
  const [stageIndex, setStageIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [quickChain, setQuickChain] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [stats, setStats] = useState(() => loadStats(STATS_KEY));

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const answer = mode === 'daily' ? dailyAnswer : quick?.answer;
  const run = mode === 'daily' ? daily : (quick || { solved: false, lost: false, guesses: [] });
  const finished = Boolean(run.solved || run.lost);

  useEffect(() => {
    if (dailyStorageKey) setDaily(loadProgress(dailyStorageKey));
  }, [dailyStorageKey]);

  // global time
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

  // image loading + pixel stage advance
  useEffect(() => {
    if (!answer || finished) return undefined;
    setStageIndex(0);
    setMessage('');
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      drawPixelated(canvasRef.current, image, PIXEL_STAGES[0]);
    };
    image.onerror = () => setMessage('Unit art failed to load.');
    image.src = answer.image_url;
    return () => { imageRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer?.slug, finished]);

  // The picture sharpens per WRONG GUESS (no timer): redraw whenever the
  // stage changes.
  useEffect(() => {
    if (!answer || finished) return;
    drawPixelated(canvasRef.current, imageRef.current, PIXEL_STAGES[stageIndex]);
  }, [stageIndex, answer, finished]);

  useEffect(() => {
    if (!finished) drawPixelated(canvasRef.current, imageRef.current, 0);
  }, [finished]);

  function recordDailyResult(solved, stageIdx = null) {
    setStats((prev) => {
      const streak = solved ? prev.currentStreak + 1 : 0;
      const points = solved ? stagePoints(stageIdx) : 0;
      const next = {
        ...prev,
        played: prev.played + 1,
        solved: prev.solved + (solved ? 1 : 0),
        currentStreak: streak,
        maxStreak: Math.max(prev.maxStreak, streak),
        bestPoints: Math.max(prev.bestPoints, points),
        lastSolvedDay: dayKey || prev.lastSolvedDay || null,
      };
      saveStats(STATS_KEY, next);
      return next;
    });
  }

  function submitGuess(event) {
    event.preventDefault();
    if (!answer || finished) return;
    const normalized = normalizeGuess(guess);
    const match = nameIndex.find((entry) => entry.normal === normalized || entry.slug === normalized.replace(/\s+/g, '-'));
    if (!match) {
      setMessage('Pick a unit from the list.');
      return;
    }
    const wrongCount = run.guesses.length;
    if (run.guesses.some((g) => g.slug === match.slug)) {
      setMessage('Already guessed that one.');
      setGuess('');
      return;
    }

    const correct = match.slug === answer.slug;
    const guesses = [...run.guesses, { slug: match.slug, name: match.name, correct }];
    const allowed = mode === 'quick' ? quickBudget(quickChain) : PIXEL_STAGES.length;

    if (correct) {
      if (mode === 'quick') {
        const nextChain = quickChain + 1;
        setQuickChain(nextChain);
        if (nextChain >= 5) incrementStat('balling_quick_streak_5', 1);
      }
      if (mode === 'daily') {
        const next = { solved: true, lost: false, guesses, stageIndex, startTime: daily.startTime };
        setDaily(next);
        if (dailyStorageKey) saveProgress(dailyStorageKey, next);
        recordDailyResult(true, stageIndex);
      } else {
        setQuick({ ...quick, solved: true, guesses });
        setStats((prev) => {
          const streak = prev.currentStreak + 1;
          const next = {
            ...prev,
            solved: prev.solved + 1,
            currentStreak: streak,
            maxStreak: Math.max(prev.maxStreak, streak),
            bestPoints: Math.max(prev.bestPoints, stagePoints(stageIndex)),
          };
          saveStats(STATS_KEY, next);
          return next;
        });
      }
      incrementStat('balling_solved', 1);
      if (stageIndex === 0) incrementStat('balling_pixel_perfect', 1);
      setMessage(`Spotted it at ${PIXEL_STAGES[stageIndex] || 'full'}px — ${stagePoints(stageIndex)} points.`);
      setGuess('');
      setDropdownOpen(false);
      return;
    }

    const afterWrong = applyWrongGuess(stageIndex, allowed - 1);
    if (afterWrong.lost) {
      if (mode === 'daily') {
        const next = { ...daily, lost: true, guesses, stageIndex: null };
        setDaily(next);
        if (dailyStorageKey) saveProgress(dailyStorageKey, next);
        recordDailyResult(false);
      } else {
        setQuick({ ...quick, lost: true, guesses });
        setQuickChain(0);
      }
      setMessage(`Out of pixels — it was ${answer.name}.`);
    } else {
      setStageIndex(afterWrong.stageIndex);
      if (mode === 'daily') {
        const next = { ...daily, guesses };
        setDaily(next);
        if (dailyStorageKey) saveProgress(dailyStorageKey, next);
      } else {
        setQuick({ ...quick, guesses });
      }
      const pxNow = PIXEL_STAGES[afterWrong.stageIndex];
      const remaining = allowed - wrongCount - 1;
      setMessage(`Not ${match.name} — sharpening to ${pxNow}px. ${remaining} ${remaining === 1 ? 'guess' : 'guesses'} left.`);
    }
    setGuess('');
    setDropdownOpen(false);
  }

  function startQuick() {
    setQuick({
      answer: pickAnswer(pool, `quick:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      solved: false,
      lost: false,
      guesses: [],
    });
    setGuess('');
    setMessage('');
    setShareMessage('');
    setDropdownOpen(false);
  }

  function nextQuick() {
    // a solved quick round continues the streak chain
    startQuick();
  }

  async function shareResult() {
    const text = buildShareText({
      dayKey,
      solved: daily.solved,
      stageIndex: daily.stageIndex ?? 0,
      guesses: daily.guesses.length,
      streak: stats.currentStreak,
    });
    try {
      await navigator.clipboard.writeText(text);
      setShareMessage('Copied share result.');
    } catch {
      setShareMessage('Could not copy result.');
    }
  }

  const suggestions = useMemo(() => {
    const q = normalizeGuess(guess);
    const guessedSlugs = new Set(run.guesses.map((g) => g.slug));
    const available = nameIndex.filter((entry) => !guessedSlugs.has(entry.slug));
    if (!q) return available.slice(0, 24);
    return available.filter((entry) => entry.normal.includes(q) || entry.slug.includes(q.replace(/\s+/g, '-'))).slice(0, 32);
  }, [guess, run.guesses, nameIndex]);

  if (timeState.status === 'loading') {
    return <main className="mg-page"><div className="mg-panel"><h1>Balling</h1><p>Verifying global time…</p></div></main>;
  }
  if (timeState.status === 'error') {
    return (
      <main className="mg-page">
        <div className="mg-panel">
          <h1>Balling</h1>
          <p className="mg-error">Couldn&apos;t verify global time, so today&apos;s puzzle is locked. This game does not use your PC clock. Check your connection and reload.</p>
        </div>
      </main>
    );
  }
  if (pool.length === 0) {
    return <main className="mg-page"><div className="mg-panel"><h1>Balling</h1><p>No unit art available yet.</p></div></main>;
  }

  return (
    <main className="mg-page">
      <header className="mg-hero">
        <Link className="mg-backlink" to="/minigames">← Minigames</Link>
        <p className="mg-kicker">Pixel Reveal</p>
        <h1>BALLING</h1>
        <p className="mg-tagline">Name the ball: every wrong guess sharpens the picture. Miss at full resolution and it escapes.</p>
        <p className="mg-time-note">Daily resets at 3PM EST. Solve at fewer pixels = more points.</p>
      </header>

      <section className="mg-mode-bar">
        <button type="button" className={mode === 'daily' ? 'mg-mode active' : 'mg-mode'} onClick={() => { setMode('daily'); setShareMessage(''); }}>
          📅 Daily
        </button>
        <button type="button" className={mode === 'quick' ? 'mg-mode active' : 'mg-mode'} onClick={() => { setMode('quick'); setShareMessage(''); }}>
          ⚡ Quick Play
        </button>
      </section>

      <section className="mg-stats-strip">
        <div className="mg-stat-tile"><strong>{stats.solved}</strong><span>Solves</span></div>
        <div className="mg-stat-tile"><strong>{stats.bestPoints}</strong><span>Best Points</span></div>
        <div className="mg-stat-tile"><strong>{stats.currentStreak}</strong><span>Streak</span></div>
        <div className="mg-stat-tile"><strong>{countdown}</strong><span>Next Reset</span></div>
      </section>

      <section className="mg-panel">
        {mode === 'daily' && finished && (
          <div className="ball-result">
            <div className="ball-result-name">{daily.solved ? answer?.name : 'Missed It'}</div>
            <div className="ball-result-sub">
              {daily.solved
                ? `Solved at ${PIXEL_STAGES[daily.stageIndex] || 'full'}px — ${stagePoints(daily.stageIndex)} points · streak ${stats.currentStreak}`
                : `It was ${answer?.name}. Streak reset.`}
            </div>
            <div className="ball-actions-row">
              <button type="button" className="mg-link" onClick={shareResult}>Share Result</button>
            </div>
            {shareMessage && <div className="mg-message">{shareMessage}</div>}
          </div>
        )}

        {mode === 'quick' && !quick && (
          <div className="ball-result">
            <div className="ball-result-sub">Random units, one after another — build a solve streak.</div>
            <button type="button" className="ball-again" onClick={startQuick}>Start</button>
          </div>
        )}

        {mode === 'quick' && quick && quick.solved && (
          <div className="ball-result">
            <div className="ball-result-name">{answer?.name}</div>
            <div className="ball-result-sub">Solved at {PIXEL_STAGES[stageIndex] || 'full'}px — {stagePoints(stageIndex)} points · chain {quickChain}</div>
            <button type="button" className="ball-again" onClick={nextQuick}>Next Ball →</button>
          </div>
        )}

        {mode === 'quick' && quick && quick.lost && (
          <div className="ball-result">
            <div className="ball-result-name">It was {answer?.name}</div>
            <button type="button" className="ball-again" onClick={startQuick}>Try Another</button>
          </div>
        )}

        {answer && !finished && (
          <>
            <div className="ball-stage-wrap">
              <canvas ref={canvasRef} width={300} height={300} className="ball-canvas" aria-label="Pixelated unit art" />
              <div className="ball-stage-meta">
                <span>{PIXEL_STAGES[stageIndex] || 'full'}px</span>
                <span className="ball-stage-pips" aria-hidden="true">
                  {PIXEL_STAGES.map((px, i) => (
                    <i key={px || 'full'} className={i <= stageIndex ? 'past' : ''} />
                  ))}
                </span>
                <span>{run.guesses.length}/{mode === 'quick' ? quickBudget(quickChain) : PIXEL_STAGES.length} used</span>
              </div>
            </div>

            <form className="ball-guess-form" onSubmit={submitGuess}>
              <div className="ball-guess-row">
                <input
                  value={guess}
                  onChange={(e) => { setGuess(e.target.value); setDropdownOpen(true); }}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 120)}
                  placeholder="Name that ball…"
                  autoComplete="off"
                  aria-label="Your guess"
                />
                <button type="submit">Guess</button>
                {dropdownOpen && (
                  <div className="ball-suggestion-menu" data-lenis-prevent>
                    {suggestions.length > 0 ? suggestions.map((entry) => (
                      <button
                        type="button"
                        key={entry.slug}
                        className="ball-suggestion-option"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setGuess(entry.name); setDropdownOpen(false); }}
                      >
                        <span>{entry.name}</span>
                      </button>
                    )) : <div className="ball-suggestion-empty">No matching units.</div>}
                  </div>
                )}
              </div>
            </form>
          </>
        )}

        {message && <div className={run.solved ? 'mg-message success' : 'mg-message'}>{message}</div>}

        {run.guesses.length > 0 && !finished && (
          <div className="bono-history" style={{ marginTop: 14 }}>
            {run.guesses.map((entry) => (
              <span key={entry.slug} className={entry.correct ? 'bono-history-chip good' : 'bono-history-chip bad'}>
                {entry.correct ? '✓' : '×'} {entry.name}
              </span>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
