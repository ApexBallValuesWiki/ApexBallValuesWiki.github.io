import { useEffect, useRef, useState } from 'react';
import { loadTheme } from '../config/theme';
import { getUnlockedRewards, isRewardAllowed } from '../utils/themeUnlocks';
import './RewardVfx.css';

// ============================================================================
// REWARD VFX — the visual half of the achievement-unlocked reward themes
// (see utils/themeUnlocks.js). Renders behind the page content:
//   knowledge   -> floating glowing glyphs ("?" by default) drifting upward
//                  + tiny sparkles — a quiz vibe, NOT a generic rain
//   ballonomics -> a real money grid: coins + gems procedurally drawn on a
//                  canvas lattice that matches the site's 140px background
//                  grid (same drift), tinted with the reward color
//   retro       -> blocky UI + optional Press Start 2P font (pure CSS)
//   premium     -> animated aurora backdrop + gilded cards
//   admin       -> the APEX Team exclusive: prestige rain with crown glyphs
// Particles are PAINTABLE (reward color) and the glyph is customizable,
// including emojis (rewards.glyph). Alphas are stable per particle — no
// flicker — and every animated layer fades in gently.
// ============================================================================

function currentRewardState(themeFromEvent) {
  // The theme-updated event carries the freshly applied theme in its detail —
  // use it directly, because the event fires before the new theme reaches
  // storage (ThemeStudio applies first, saves second).
  const theme = themeFromEvent || loadTheme();
  const unlocks = getUnlockedRewards();
  const mode = isRewardAllowed(theme.rewards.mode, unlocks) ? theme.rewards.mode : 'none';
  return { theme, unlocks, mode };
}

function motionEnabled() {
  try {
    const ux = JSON.parse(localStorage.getItem('apex-ux-settings-v1') || '{}');
    if (Number(ux.animSpeed) <= 0 || ux.reducedMotion) return false;
  } catch { /* ignore */ }
  return true;
}

const EMOJI_FONT = 'system-ui, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", serif';

export default function RewardVfx() {
  const [state, setState] = useState(() => currentRewardState());

  useEffect(() => {
    const refresh = (event) => {
      const detail = event && event.detail;
      setState(currentRewardState(detail && detail.rewards ? detail : null));
    };
    window.addEventListener('apex-theme-updated', refresh);
    window.addEventListener('apex-achievement-unlocked', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('apex-theme-updated', refresh);
      window.removeEventListener('apex-achievement-unlocked', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const { theme, mode } = state;
  const rewards = theme.rewards;

  // Drive the CSS hooks (retro UI blockiness, premium gilding) from the root.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.reward = mode;
    root.dataset.retroFont = mode === 'retro' && rewards.pixelFont ? 'on' : 'off';
    root.style.setProperty('--reward-color', rewards.color);
    // Precompute the glow rgba — color-mix() is rejected inside text-shadow.
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(rewards.color || '');
    const [r, g, b] = m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 215, 106];
    root.style.setProperty('--reward-glow', `rgba(${r}, ${g}, ${b}, 0.45)`);
    root.style.setProperty('--reward-density', String(rewards.density));
    root.style.setProperty('--reward-intensity', String(rewards.intensity));
    return () => {
      delete root.dataset.reward;
      delete root.dataset.retroFont;
    };
  }, [mode, rewards.color, rewards.density, rewards.intensity, rewards.pixelFont]);

  const glyph = (rewards.glyph || '').trim();

  return (
    <>
      {mode === 'knowledge' && (
        <KnowledgeFloat
          key={`kf-${rewards.color}-${glyph}-${rewards.density}-${rewards.intensity}`}
          color={rewards.color}
          glyph={glyph || '?'}
          density={rewards.density}
          intensity={rewards.intensity}
        />
      )}
      {mode === 'admin' && (
        <PrestigeRain
          key={`pr-${rewards.color}-${glyph}-${rewards.density}-${rewards.intensity}`}
          color={rewards.color || '#ffd76a'}
          glyph={glyph || '👑'}
          density={rewards.density}
          intensity={rewards.intensity}
        />
      )}
      {mode === 'ballonomics' && (
        <MoneyGrid
          key={`mg-${rewards.color}-${rewards.density}-${rewards.intensity}`}
          color={rewards.color}
          density={rewards.density}
          intensity={rewards.intensity}
        />
      )}
      {(mode === 'premium' || mode === 'admin') && (
        <div className={mode === 'admin' ? 'reward-aurora admin' : 'reward-aurora'} aria-hidden="true" />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// KNOWLEDGE — glowing glyphs drifting upward like rising ideas, plus sparkles
// ---------------------------------------------------------------------------
function KnowledgeFloat({ color, glyph, density, intensity }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const animate = motionEnabled();
    let raf = 0;
    let alive = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    function resize() {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    const isEmoji = /\p{Extended_Pictographic}/u.test(glyph);
    const glyphCount = Math.round(6 + density * 20);
    const sparkleCount = Math.round(16 + density * 50);
    const alphaBase = 0.16 + intensity * 0.4;

    // Stable per-particle properties — assigned ONCE, so nothing flickers.
    const glyphs = Array.from({ length: glyphCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 15 + Math.random() * 26,
      speed: 9 + Math.random() * 16,          // px/s upward — calm drift
      sway: Math.random() * Math.PI * 2,
      swayAmp: 6 + Math.random() * 14,
      swaySpeed: 0.25 + Math.random() * 0.5,
      rot: (Math.random() - 0.5) * 0.4,
      rotSpeed: (Math.random() - 0.5) * 0.25,
      alpha: alphaBase * (0.55 + Math.random() * 0.45),
    }));
    const sparkles = Array.from({ length: sparkleCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.7 + Math.random() * 1.5,
      speed: 4 + Math.random() * 10,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.3 + Math.random() * 0.6,
      alpha: alphaBase * (0.3 + Math.random() * 0.5),
      twinkle: Math.random() * Math.PI * 2,   // smooth sine phase, not random
      twinkleSpeed: 0.8 + Math.random() * 1.6,
    }));

    const start = performance.now();

    function frame(now) {
      if (!alive) return;
      const dt = Math.min(64, now - ((frame.last) || now) || 16) / 1000;
      frame.last = now;
      const t = (now - start) / 1000;
      const fade = Math.min(1, (now - start) / 900); // gentle fade-in
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      for (const g of glyphs) {
        if (animate) {
          g.y -= (g.speed / height) * dt;
          g.sway += g.swaySpeed * dt;
          g.rot += g.rotSpeed * dt;
          if (g.y < -0.08) { g.y = 1.08; g.x = Math.random(); }
        }
        const px = (g.x + Math.sin(g.sway) * (g.swayAmp / width)) * width;
        const py = g.y * height;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.sin(g.rot) * 0.18);
        ctx.font = `${Math.round(g.size * dpr)}px ${EMOJI_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = g.alpha * fade;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14 * dpr * (0.5 + intensity);
        if (!isEmoji) ctx.fillStyle = color;
        ctx.fillText(glyph, 0, 0);
        ctx.restore();
      }

      for (const s of sparkles) {
        if (animate) {
          s.y -= (s.speed / height) * dt;
          s.sway += s.swaySpeed * dt;
          s.twinkle += s.twinkleSpeed * dt;
          if (s.y < -0.05) { s.y = 1.05; s.x = Math.random(); }
        }
        const px = (s.x + Math.sin(s.sway) * 0.008) * width;
        const py = s.y * height;
        ctx.globalAlpha = s.alpha * (0.6 + 0.4 * Math.sin(s.twinkle)) * fade;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, s.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (animate && !document.hidden) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onVisible() {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; frame.last = 0; }
      else if (!document.hidden && animate && alive && !raf) { frame.last = 0; raf = requestAnimationFrame(frame); }
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [color, glyph, density, intensity]);

  return <canvas ref={canvasRef} className="reward-float-canvas" aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// ADMIN — prestige rain (stable alphas, paintable, custom glyph)
// ---------------------------------------------------------------------------
function PrestigeRain({ color, glyph, density, intensity }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const animate = motionEnabled();
    let raf = 0;
    let alive = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    function resize() {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    const count = Math.round(18 + density * 90);
    const alphaBase = 0.22 + intensity * 0.55;
    const isEmoji = /\p{Extended_Pictographic}/u.test(glyph);

    // Stable properties — assigned once (this is the no-flicker fix).
    const particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 1.2 + Math.random() * 2.6,
      speed: 45 + Math.random() * 90,          // px/s downward — rain
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.4 + Math.random() * 1.2,
      alpha: alphaBase * (0.5 + Math.random() * 0.5),
      glyph: i % 5 === 0,                       // every 5th particle is a glyph
      gSize: 13 + Math.random() * 12,
    }));

    const start = performance.now();

    function frame(now) {
      if (!alive) return;
      const dt = Math.min(64, (now - (frame.last || now)) || 16) / 1000;
      frame.last = now;
      const fade = Math.min(1, (now - start) / 700);
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        if (animate) {
          p.y += (p.speed / height) * dt;
          p.sway += p.swaySpeed * dt;
          if (p.y > 1.06) { p.y = -0.06; p.x = Math.random(); }
        }
        const px = (p.x + Math.sin(p.sway) * 0.012) * width;
        const py = p.y * height;
        if (p.glyph) {
          ctx.font = `${Math.round(p.gSize * dpr)}px ${EMOJI_FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = p.alpha * fade;
          if (!isEmoji) { ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10 * dpr; }
          ctx.fillText(glyph, px, py);
          ctx.shadowBlur = 0;
        } else {
          ctx.globalAlpha = p.alpha * fade;
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8 * dpr * (0.5 + intensity);
          ctx.beginPath();
          ctx.arc(px, py, p.r * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      ctx.globalAlpha = 1;
      if (animate && !document.hidden) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onVisible() {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; frame.last = 0; }
      else if (!document.hidden && animate && alive && !raf) { frame.last = 0; raf = requestAnimationFrame(frame); }
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [color, glyph, density, intensity]);

  return <canvas ref={canvasRef} className="reward-rain-canvas" aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// BALLONOMICS — the money grid. A canvas lattice locked to the site grid:
// 140px cells, same drift keyframes/period as HoloBackground, coins and gems
// drawn procedurally (no images), deterministically placed, tinted.
// ---------------------------------------------------------------------------
const GRID = 140; // must match HoloBackground's .holo-grid background-size

function MoneyGrid({ color, density, intensity }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // The canvas is oversized by one cell and inset by -GRID so the CSS
    // drift (translate 0 -> GRID,GRID) never reveals an empty edge.
    function resize() {
      canvas.width = Math.round((window.innerWidth + GRID) * dpr);
      canvas.height = Math.round((window.innerHeight + GRID) * dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    const cols = Math.ceil(window.innerWidth / GRID) + 2;
    const rows = Math.ceil(window.innerHeight / GRID) + 2;
    const baseAlpha = 0.35 + intensity * 0.65;
    const chance = 0.12 + density * 0.55;

    // Parse the tint once.
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color || '');
    const tint = m
      ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
      : { r: 255, g: 217, b: 77 };
    const rgba = (a) => `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${a})`;

    // Deterministic per-cell hash so placement is stable across redraws.
    const hash = (x, y) => {
      let h = (x * 73856093) ^ (y * 19349663);
      h = (h ^ (h >>> 13)) * 1274126177;
      return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    };

    function drawCoin(cx, cy, s, a) {
      ctx.strokeStyle = rgba(a);
      ctx.lineWidth = Math.max(1, s * 0.09);
      ctx.beginPath();
      ctx.arc(cx, cy, s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = rgba(a * 0.55);
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      // small shine tick
      ctx.strokeStyle = rgba(a * 0.8);
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.62, -2.4, -1.7);
      ctx.stroke();
    }

    function drawGem(cx, cy, s, a) {
      const w = s * 0.9;
      const h = s * 1.15;
      ctx.strokeStyle = rgba(a);
      ctx.lineWidth = Math.max(1, s * 0.09);
      ctx.beginPath();
      ctx.moveTo(cx, cy - h / 2);           // top
      ctx.lineTo(cx + w / 2, cy - h * 0.12); // right shoulder
      ctx.lineTo(cx + w * 0.32, cy + h / 2); // right bottom
      ctx.lineTo(cx - w * 0.32, cy + h / 2); // left bottom
      ctx.lineTo(cx - w / 2, cy - h * 0.12); // left shoulder
      ctx.closePath();
      ctx.stroke();
      // facets
      ctx.strokeStyle = rgba(a * 0.5);
      ctx.lineWidth = Math.max(1, s * 0.055);
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy - h * 0.12);
      ctx.lineTo(cx - w * 0.16, cy - h * 0.26);
      ctx.lineTo(cx + w * 0.16, cy - h * 0.26);
      ctx.lineTo(cx + w / 2, cy - h * 0.12);
      ctx.moveTo(cx - w * 0.16, cy - h * 0.26);
      ctx.lineTo(cx - w * 0.1, cy + h / 2);
      ctx.moveTo(cx + w * 0.16, cy - h * 0.26);
      ctx.lineTo(cx + w * 0.1, cy + h / 2);
      ctx.stroke();
    }

    function draw() {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      for (let iy = 0; iy < rows; iy += 1) {
        for (let ix = 0; ix < cols; ix += 1) {
          const h = hash(ix, iy);
          if (h > chance) continue;
          const cx = (ix + 0.5) * GRID * dpr;
          const cy = (iy + 0.5) * GRID * dpr;
          const a = baseAlpha * (0.45 + h * 0.55);
          const s = (9 + h * 5) * dpr;
          if ((Math.floor(h * 1000) & 1) === 0) drawCoin(cx, cy, s, a);
          else drawGem(cx, cy, s, a);
        }
      }
    }
    draw();
    window.addEventListener('resize', draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', draw);
    };
  }, [color, density, intensity]);

  return <canvas ref={canvasRef} className="reward-money-canvas" aria-hidden="true" />;
}
