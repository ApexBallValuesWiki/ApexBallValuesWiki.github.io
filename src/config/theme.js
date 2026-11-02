export const THEME_STORAGE_KEY = 'apex-site-theme-v1';

export const DEFAULT_THEME = {
  id: 'apex-classic',
  name: 'Apex Classic',
  colors: {
    bg: '#000000',
    bgElevated: '#08080b',
    bgCard: '#050507',
    bgCardHover: '#0c0c10',
    border: '#191920',
    borderStrong: '#ffffff',
    text: '#ffffff',
    textDim: '#b8b8c2',
    textFaint: '#72727e',
    accent: '#ffffff',
    accentInverse: '#000000',
    success: '#34d399',
    danger: '#f87171',
    youColor: '#38bdf8',
    themColor: '#fb7185',
  },
  effects: {
    glow: 0.22,
    scanlines: 0.06,
    grid: 0.07,
    vfx: 0.9,
    speed: 1,
    metallic: 0.85,
  },
  rewards: {
    mode: 'none',
    color: '#7cff45',
    density: 0.5,
    intensity: 0.5,
    pixelFont: true,
  },
};

// Curated, non-redundant preset catalog: each preset has a distinct hue,
// contrast profile, and surface identity (no duplicate shade variations).
export const THEME_PRESETS = [
  DEFAULT_THEME,
  {
    id: 'cyber-cyan',
    name: 'Cyber Cyan',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#00080c',
      bgElevated: '#021218',
      bgCard: '#010d12',
      bgCardHover: '#031d26',
      border: '#0d3b4c',
      borderStrong: '#00e5ff',
      accent: '#00e5ff',
      accentInverse: '#00181f',
      textDim: '#a6f2ff',
      textFaint: '#5a99a8',
      youColor: '#00e5ff',
      themColor: '#ff5d9e',
    },
    effects: { glow: 0.42, scanlines: 0.14, grid: 0.12, vfx: 1.1, speed: 1, metallic: 0.9 },
  },
  {
    id: 'omega-violet',
    name: 'Omega Violet',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#05010c',
      bgElevated: '#0a0317',
      bgCard: '#080212',
      bgCardHover: '#120624',
      border: '#2d1452',
      borderStrong: '#b679ff',
      accent: '#a855f7',
      accentInverse: '#11001f',
      textDim: '#d8c4ff',
      textFaint: '#8a70aa',
      youColor: '#9366ff',
      themColor: '#ff4d94',
    },
    effects: { glow: 0.46, scanlines: 0.16, grid: 0.12, vfx: 1.15, speed: 0.95, metallic: 0.88 },
  },
  {
    id: 'crimson-eclipse',
    name: 'Crimson Eclipse',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#090002',
      bgElevated: '#120205',
      bgCard: '#0d0103',
      bgCardHover: '#1d0409',
      border: '#450d17',
      borderStrong: '#ff4d66',
      accent: '#ff2e4c',
      accentInverse: '#1c0005',
      textDim: '#ffc2cb',
      textFaint: '#a66872',
      youColor: '#ff854d',
      themColor: '#ff2e4c',
    },
    effects: { glow: 0.45, scanlines: 0.14, grid: 0.1, vfx: 1.15, speed: 1, metallic: 0.92 },
  },
  {
    id: 'venom-matrix',
    name: 'Venom Matrix',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#000803',
      bgElevated: '#021208',
      bgCard: '#010d05',
      bgCardHover: '#041f0e',
      border: '#0c3f1e',
      borderStrong: '#4dff91',
      accent: '#2eff7a',
      accentInverse: '#001708',
      textDim: '#b8ffd2',
      textFaint: '#5ea378',
      success: '#2eff7a',
      youColor: '#2eff7a',
      themColor: '#ff5d6c',
    },
    effects: { glow: 0.4, scanlines: 0.18, grid: 0.14, vfx: 1.1, speed: 1, metallic: 0.85 },
  },
  {
    id: 'sovereign-gold',
    name: 'Sovereign Gold',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#090600',
      bgElevated: '#120c02',
      bgCard: '#0e0901',
      bgCardHover: '#1c1304',
      border: '#4d350f',
      borderStrong: '#ffd25c',
      accent: '#ffc94d',
      accentInverse: '#1c1200',
      textDim: '#ffe4a3',
      textFaint: '#a88a48',
      youColor: '#ffd25c',
      themColor: '#ff6b6b',
    },
    effects: { glow: 0.42, scanlines: 0.12, grid: 0.1, vfx: 1.05, speed: 1, metallic: 0.95 },
  },
  {
    id: 'sakura-neon',
    name: 'Sakura Neon',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#090006',
      bgElevated: '#13010d',
      bgCard: '#0e0009',
      bgCardHover: '#200215',
      border: '#420b2d',
      borderStrong: '#ff70b8',
      accent: '#ff4da6',
      accentInverse: '#1a000f',
      textDim: '#ffc4e1',
      textFaint: '#a86888',
      youColor: '#ff66b2',
      themColor: '#55bfff',
    },
    effects: { glow: 0.4, scanlines: 0.14, grid: 0.1, vfx: 1.1, speed: 1, metallic: 0.88 },
  },
  {
    id: 'daylight',
    name: 'Daylight Studio ☀️',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#f2f5fa',
      bgElevated: '#ffffff',
      bgCard: '#ffffff',
      bgCardHover: '#eef2f9',
      border: '#d5dcea',
      borderStrong: '#aab6cc',
      accent: '#2563eb',
      accentInverse: '#ffffff',
      text: '#101522',
      textDim: '#3c465c',
      textFaint: '#6d7891',
    },
    effects: { glow: 0.12, scanlines: 0, grid: 0.05, vfx: 0.6, speed: 1, metallic: 0.75 },
  },
];

function sanitizeHexColor(value, fallback) {
  const cleaned = String(value || '').trim().replace(/,+$/g, '');
  return /^#[0-9a-fA-F]{6}$/.test(cleaned) ? cleaned : fallback;
}

const REWARD_MODE_IDS = ['none', 'knowledge', 'ballonomics', 'retro', 'premium', 'admin'];

function sanitizeRewards(rewards) {
  const r = { ...DEFAULT_THEME.rewards, ...(rewards || {}) };
  r.mode = REWARD_MODE_IDS.includes(r.mode) ? r.mode : 'none';
  r.color = sanitizeHexColor(r.color, DEFAULT_THEME.rewards.color);
  const clamp01 = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
  };
  r.density = clamp01(r.density);
  r.intensity = clamp01(r.intensity);
  r.pixelFont = Boolean(r.pixelFont);
  r.glyph = typeof r.glyph === 'string' ? [...r.glyph.trim()].slice(0, 3).join('') : '';
  return r;
}

function sanitizeTheme(theme) {
  const merged = {
    ...DEFAULT_THEME,
    ...theme,
    colors: { ...DEFAULT_THEME.colors, ...(theme?.colors || {}) },
    effects: { ...DEFAULT_THEME.effects, ...(theme?.effects || {}) },
    rewards: sanitizeRewards(theme?.rewards),
  };

  Object.keys(DEFAULT_THEME.colors).forEach((key) => {
    merged.colors[key] = sanitizeHexColor(merged.colors[key], DEFAULT_THEME.colors[key]);
  });

  Object.keys(DEFAULT_THEME.effects).forEach((key) => {
    const value = Number(merged.effects[key]);
    merged.effects[key] = Number.isFinite(value) ? value : DEFAULT_THEME.effects[key];
  });

  return merged;
}

export function mergeTheme(theme) {
  return sanitizeTheme(theme);
}

export function loadTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) return mergeTheme(JSON.parse(raw));
  } catch {
    // ignore corrupt storage
  }
  return DEFAULT_THEME;
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(mergeTheme(theme)));
  } catch {
    // ignore blocked storage
  }
}

export function applyTheme(theme) {
  const merged = mergeTheme(theme);
  const root = document.documentElement;
  const { colors, effects } = merged;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apex-theme-updated', { detail: merged }));
  }

  root.style.setProperty('--bg', colors.bg);
  root.style.setProperty('--bg-elevated', colors.bgElevated);
  root.style.setProperty('--bg-card', colors.bgCard);
  root.style.setProperty('--bg-card-hover', colors.bgCardHover);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--border-strong', colors.borderStrong);
  root.style.setProperty('--text', colors.text);
  root.style.setProperty('--text-dim', colors.textDim);
  root.style.setProperty('--text-faint', colors.textFaint);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-inverse', colors.accentInverse);
  root.style.setProperty('--danger', colors.danger);
  root.style.setProperty('--success', colors.success);
  root.style.setProperty('--you-color-theme', colors.youColor);
  root.style.setProperty('--them-color-theme', colors.themColor);

  const rawGlow = Math.max(Number(effects.glow) || 0, 0);
  const rawVfx = Math.max(Number(effects.vfx) || 1, 0);
  const rawScanlines = Math.max(Number(effects.scanlines) || 0, 0);
  const rawGrid = Math.max(Number(effects.grid) || 0, 0);
  const rawSpeed = Math.max(Number(effects.speed) || 1, 0.1);
  const rawMetallic = Math.max(0, Math.min(1.5, Number(effects.metallic ?? 0.85)));

  const effectiveGlow = rawGlow * rawVfx;
  const softRadius = Math.round(24 * effectiveGlow);
  const strongRadius = Math.round(46 * effectiveGlow);
  const softAlpha = Math.min(Math.round(effectiveGlow * 80), 95);
  const strongAlpha = Math.min(Math.round(effectiveGlow * 95), 98);

  root.style.setProperty('--theme-glow-alpha', String(rawGlow));
  root.style.setProperty('--theme-scanline-opacity', String(rawScanlines * rawVfx));
  root.style.setProperty('--theme-grid-opacity', String(rawGrid * rawVfx));
  root.style.setProperty('--theme-vfx', String(rawVfx));
  // --theme-speed is owned by utils/uxSettings.js (single writer). Writing
  // it here too caused the animation speed to flip whenever a theme changed.
  root.style.setProperty('--theme-metallic', String(rawMetallic));

  const glowSoftCss =
    effectiveGlow <= 0
      ? 'none'
      : `0 0 ${softRadius}px color-mix(in srgb, var(--accent) ${softAlpha}%, transparent), 0 0 ${Math.max(2, Math.round(softRadius / 3))}px color-mix(in srgb, var(--accent) ${Math.min(100, Math.round(softAlpha * 1.25))}%, transparent)`;
  const glowStrongCss =
    effectiveGlow <= 0
      ? 'none'
      : `0 0 ${strongRadius}px color-mix(in srgb, var(--accent) ${strongAlpha}%, transparent), 0 0 ${Math.max(4, Math.round(strongRadius / 3))}px color-mix(in srgb, var(--accent) 100%, transparent)`;

  root.style.setProperty('--glow-soft', glowSoftCss);
  root.style.setProperty('--glow-strong', glowStrongCss);

  root.dataset.apexTheme = merged.id || 'custom';
  return merged;
}
