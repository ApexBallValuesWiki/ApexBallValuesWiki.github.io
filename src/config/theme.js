export const THEME_STORAGE_KEY = 'apex-site-theme-v1';

export const DEFAULT_THEME = {
  id: 'apex-classic',
  name: 'Apex Classic',
  colors: {
    bg: '#000000',
    bgElevated: '#000000',
    bgCard: '#000000',
    bgCardHover: '#050505',
    border: '#1a1a1a',
    borderStrong: '#ffffff',
    text: '#ffffff',
    textDim: '#bfbfbf',
    textFaint: '#7a7a7a',
    accent: '#ffffff',
    accentInverse: '#000000',
    success: '#4dff88',
    danger: '#ff4d4d',
    youColor: '#4d9dff',
    themColor: '#ff4d5e',
  },
  effects: {
    glow: 0.35,
    scanlines: 0.22,
    grid: 0.14,
    vfx: 1,
    speed: 1,
  },
};

export const THEME_PRESETS = [
  DEFAULT_THEME,
  {
    id: 'holo-blue',
    name: 'Holo Blue',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#020712',
      bgElevated: '#050b18',
      bgCard: '#030914',
      bgCardHover: '#071326',
      border: '#15304f',
      borderStrong: '#7cc8ff',
      accent: '#55bfff',
      accentInverse: '#001421',
      textDim: '#b8dfff',
      textFaint: '#6d91ad',
      youColor: '#45b8ff',
      themColor: '#ff5d9e',
    },
    effects: { glow: 0.48, scanlines: 0.24, grid: 0.18, vfx: 1.15, speed: 1 },
  },
  {
    id: 'omega-purple',
    name: 'Omega Purple',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#07020f',
      bgElevated: '#0b0418',
      bgCard: '#090313',
      bgCardHover: '#120725',
      border: '#2d1550',
      borderStrong: '#b679ff',
      accent: '#b679ff',
      accentInverse: '#13001f',
      textDim: '#d7c2ff',
      textFaint: '#8c72aa',
      youColor: '#8f7aff',
      themColor: '#ff5d8f',
    },
    effects: { glow: 0.55, scanlines: 0.26, grid: 0.16, vfx: 1.25, speed: 0.95 },
  },
  {
    id: 'mythic-red',
    name: 'Mythic Red',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#0d0101',
      bgElevated: '#120303',
      bgCard: '#0f0202',
      bgCardHover: '#1c0505',
      border: '#441111',
      borderStrong: '#ff6b6b',
      accent: '#ff4d4d',
      accentInverse: '#1c0000',
      textDim: '#ffc4c4',
      textFaint: '#a66f6f',
      youColor: '#ff9e4d',
      themColor: '#ff3d55',
    },
    effects: { glow: 0.5, scanlines: 0.2, grid: 0.12, vfx: 1.2, speed: 1.05 },
  },
  {
    id: 'toxic-green',
    name: 'Toxic Green',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#010900',
      bgElevated: '#031100',
      bgCard: '#020d00',
      bgCardHover: '#061c02',
      border: '#16400c',
      borderStrong: '#78ff5c',
      accent: '#58ff42',
      accentInverse: '#001600',
      textDim: '#c4ffbd',
      textFaint: '#70a66a',
      success: '#58ff42',
      youColor: '#36ff8a',
      themColor: '#ff5d5d',
    },
    effects: { glow: 0.5, scanlines: 0.3, grid: 0.18, vfx: 1.25, speed: 1 },
  },
  {
    id: 'royal-gold',
    name: 'Royal Gold',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#0b0700',
      bgElevated: '#120d02',
      bgCard: '#0f0a01',
      bgCardHover: '#1c1304',
      border: '#4d3610',
      borderStrong: '#ffc94d',
      accent: '#ffc94d',
      accentInverse: '#1c1200',
      textDim: '#ffe3a1',
      textFaint: '#a88a48',
      youColor: '#ffd35c',
      themColor: '#ff6b6b',
    },
    effects: { glow: 0.45, scanlines: 0.18, grid: 0.12, vfx: 1.05, speed: 1 },
  },
  {
    id: 'icebound',
    name: 'Icebound',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#00090d',
      bgElevated: '#021117',
      bgCard: '#011017',
      bgCardHover: '#042333',
      border: '#10445c',
      borderStrong: '#7ff4ff',
      accent: '#7ff4ff',
      accentInverse: '#00191d',
      textDim: '#c3fbff',
      textFaint: '#73a8ad',
      youColor: '#7ff4ff',
      themColor: '#b28cff',
    },
    effects: { glow: 0.42, scanlines: 0.2, grid: 0.16, vfx: 1.1, speed: 0.9 },
  },

  {
    id: 'bloodmoon',
    name: 'Bloodmoon',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#000000',
      bgElevated: '#030006',
      bgCard: '#020004',
      bgCardHover: '#190000',
      border: '#140000',
      borderStrong: '#420000',
      text: '#ff0000',
      textDim: '#8c1717',
      textFaint: '#4d0000',
      accent: '#ff0000',
      accentInverse: '#03000a',
      success: '#00ff55',
      danger: '#ff0000',
      youColor: '#ff0000',
      themColor: '#380000',
    },
    effects: { glow: 0.75, scanlines: 0.14, grid: 0.22, vfx: 2, speed: 0.5 },
  },
  {
    id: 'party-pink',
    name: 'Party Pink',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#000000',
      bgElevated: '#000000',
      bgCard: '#000000',
      bgCardHover: '#050505',
      border: '#24001f',
      borderStrong: '#c800ff',
      text: '#ff9ee0',
      textDim: '#b48da8',
      textFaint: '#865b82',
      accent: '#ff00a2',
      accentInverse: '#000000',
      success: '#00ff91',
      danger: '#ff0059',
      youColor: '#0073ff',
      themColor: '#ff00dd',
    },
    effects: { glow: 0.35, scanlines: 0.22, grid: 0.14, vfx: 1, speed: 1 },
  },
  {
    id: 'void',
    name: 'Void',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#000000',
      bgElevated: '#030006',
      bgCard: '#020004',
      bgCardHover: '#09000e',
      border: '#160026',
      borderStrong: '#5e2eff',
      accent: '#5e2eff',
      accentInverse: '#03000a',
      textDim: '#b6a8ff',
      textFaint: '#57506f',
      youColor: '#5e2eff',
      themColor: '#ff2ea6',
    },
    effects: { glow: 0.32, scanlines: 0.14, grid: 0.08, vfx: 0.9, speed: 0.85 },
  },
  {
    id: 'neon-cyan',
    name: 'Neon Cyan',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#000a0d',
      bgElevated: '#001217',
      bgCard: '#000e13',
      bgCardHover: '#012029',
      border: '#0a3a4a',
      borderStrong: '#00e5ff',
      accent: '#00e5ff',
      accentInverse: '#001a1f',
      textDim: '#a0f0ff',
      textFaint: '#5a9aaa',
      youColor: '#00e5ff',
      themColor: '#ff6ec7',
    },
    effects: { glow: 0.5, scanlines: 0.22, grid: 0.16, vfx: 1.2, speed: 1 },
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#0d0500',
      bgElevated: '#150800',
      bgCard: '#100600',
      bgCardHover: '#230e02',
      border: '#4d2008',
      borderStrong: '#ff8c42',
      accent: '#ff6b1a',
      accentInverse: '#1c0a00',
      textDim: '#ffc9a3',
      textFaint: '#a87050',
      youColor: '#ff8c42',
      themColor: '#ff3d7f',
    },
    effects: { glow: 0.45, scanlines: 0.18, grid: 0.12, vfx: 1.1, speed: 1 },
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#000d04',
      bgElevated: '#001508',
      bgCard: '#001006',
      bgCardHover: '#012510',
      border: '#0a4020',
      borderStrong: '#2eff7a',
      accent: '#00cc66',
      accentInverse: '#001a0a',
      textDim: '#a3ffd0',
      textFaint: '#5aaa78',
      success: '#2eff7a',
      youColor: '#00cc66',
      themColor: '#ff66aa',
    },
    effects: { glow: 0.4, scanlines: 0.2, grid: 0.14, vfx: 1.05, speed: 1 },
  },
  {
    id: 'midnight-teal',
    name: 'Midnight Teal',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#000a0a',
      bgElevated: '#001414',
      bgCard: '#000f0f',
      bgCardHover: '#012626',
      border: '#0a3e3e',
      borderStrong: '#4dd9d9',
      accent: '#33cccc',
      accentInverse: '#001a1a',
      textDim: '#a3ecec',
      textFaint: '#5a9e9e',
      youColor: '#33cccc',
      themColor: '#cc66ff',
    },
    effects: { glow: 0.38, scanlines: 0.2, grid: 0.14, vfx: 1.05, speed: 0.95 },
  },
  {
    id: 'arctic-white',
    name: 'Arctic White',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#0a0a0f',
      bgElevated: '#12121a',
      bgCard: '#0e0e16',
      bgCardHover: '#1a1a26',
      border: '#2a2a3a',
      borderStrong: '#e0e0ff',
      accent: '#c8c8ff',
      accentInverse: '#0a0a14',
      text: '#eeeeff',
      textDim: '#b0b0cc',
      textFaint: '#6a6a88',
      youColor: '#8888ff',
      themColor: '#ff88cc',
    },
    effects: { glow: 0.28, scanlines: 0.12, grid: 0.1, vfx: 0.95, speed: 1 },
  },
  {
    id: 'lava-core',
    name: 'Lava Core',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#0d0000',
      bgElevated: '#180202',
      bgCard: '#110101',
      bgCardHover: '#250505',
      border: '#3a0a0a',
      borderStrong: '#ff4422',
      accent: '#ff3300',
      accentInverse: '#1a0000',
      text: '#ffe0d0',
      textDim: '#ffaa88',
      textFaint: '#aa6644',
      success: '#44ff66',
      danger: '#ff2200',
      youColor: '#ff6622',
      themColor: '#ff0066',
    },
    effects: { glow: 0.6, scanlines: 0.16, grid: 0.1, vfx: 1.35, speed: 0.9 },
  },
  {
    id: 'sakura-pink',
    name: 'Sakura Pink',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#0d0008',
      bgElevated: '#15000d',
      bgCard: '#100009',
      bgCardHover: '#220014',
      border: '#3d0a28',
      borderStrong: '#ff66aa',
      accent: '#ff4499',
      accentInverse: '#1a0010',
      text: '#ffe0f0',
      textDim: '#ffaacc',
      textFaint: '#aa6688',
      youColor: '#ff66aa',
      themColor: '#66aaff',
    },
    effects: { glow: 0.42, scanlines: 0.18, grid: 0.12, vfx: 1.1, speed: 1 },
  },
  {
    id: 'storm-grey',
    name: 'Storm Grey',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#08080a',
      bgElevated: '#0e0e12',
      bgCard: '#0a0a0e',
      bgCardHover: '#16161c',
      border: '#222230',
      borderStrong: '#8888aa',
      accent: '#6666aa',
      accentInverse: '#0a0a10',
      text: '#d0d0e0',
      textDim: '#9090a8',
      textFaint: '#505068',
      youColor: '#5577cc',
      themColor: '#cc5577',
    },
    effects: { glow: 0.2, scanlines: 0.14, grid: 0.1, vfx: 0.85, speed: 1 },
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#0a0800',
      bgElevated: '#120e02',
      bgCard: '#0f0b01',
      bgCardHover: '#1f1804',
      border: '#3d2e0a',
      borderStrong: '#ffdd00',
      accent: '#ffcc00',
      accentInverse: '#1a1500',
      text: '#fff8d0',
      textDim: '#ddcc88',
      textFaint: '#887744',
      youColor: '#ffcc00',
      themColor: '#ff4466',
    },
    effects: { glow: 0.5, scanlines: 0.2, grid: 0.14, vfx: 1.2, speed: 1 },
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    colors: {
      ...DEFAULT_THEME.colors,
      bg: '#000408',
      bgElevated: '#000812',
      bgCard: '#000610',
      bgCardHover: '#001225',
      border: '#0a2040',
      borderStrong: '#4488ff',
      accent: '#2266dd',
      accentInverse: '#000a1a',
      text: '#d0e0ff',
      textDim: '#88aadd',
      textFaint: '#446688',
      youColor: '#2266dd',
      themColor: '#dd44aa',
    },
    effects: { glow: 0.38, scanlines: 0.2, grid: 0.16, vfx: 1.05, speed: 0.9 },
  },
  {
    id: 'daylight',
    name: 'Daylight ☀️',
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
    effects: { glow: 0.12, scanlines: 0, grid: 0.05, vfx: 0.6, speed: 1 },
  },
];


function sanitizeHexColor(value, fallback) {
  const cleaned = String(value || '').trim().replace(/,+$/g, '');
  return /^#[0-9a-fA-F]{6}$/.test(cleaned) ? cleaned : fallback;
}

function sanitizeTheme(theme) {
  const merged = {
    ...DEFAULT_THEME,
    ...theme,
    colors: { ...DEFAULT_THEME.colors, ...(theme?.colors || {}) },
    effects: { ...DEFAULT_THEME.effects, ...(theme?.effects || {}) },
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

  // Compute actual, vivid glowing multi-layer halos scaled directly by Glow slider and VFX Power
  const rawGlow = Math.max(Number(effects.glow) || 0, 0);
  const rawVfx = Math.max(Number(effects.vfx) || 1, 0);
  const rawScanlines = Math.max(Number(effects.scanlines) || 0, 0);
  const rawGrid = Math.max(Number(effects.grid) || 0, 0);
  const rawSpeed = Math.max(Number(effects.speed) || 1, 0.1);

  const effectiveGlow = rawGlow * rawVfx;
  const softRadius = Math.round(26 * effectiveGlow);
  const strongRadius = Math.round(52 * effectiveGlow);
  const softAlpha = Math.min(Math.round(effectiveGlow * 85), 98);
  const strongAlpha = Math.min(Math.round(effectiveGlow * 100), 100);

  root.style.setProperty('--theme-glow-alpha', String(rawGlow));
  root.style.setProperty('--theme-scanline-opacity', String(rawScanlines * rawVfx));
  root.style.setProperty('--theme-grid-opacity', String(rawGrid * rawVfx));
  root.style.setProperty('--theme-vfx', String(rawVfx));
  root.style.setProperty('--theme-speed', String(rawSpeed));

  // Actual glowing double-layer halos that glow intensely when Glow or VFX Power is increased
  const glowSoftCss = effectiveGlow <= 0 ? 'none' : `0 0 ${softRadius}px color-mix(in srgb, var(--accent) ${softAlpha}%, transparent), 0 0 ${Math.max(2, Math.round(softRadius / 3))}px color-mix(in srgb, var(--accent) ${Math.min(100, Math.round(softAlpha * 1.3))}%, transparent)`;
  const glowStrongCss = effectiveGlow <= 0 ? 'none' : `0 0 ${strongRadius}px color-mix(in srgb, var(--accent) ${strongAlpha}%, transparent), 0 0 ${Math.max(4, Math.round(strongRadius / 3))}px color-mix(in srgb, var(--accent) 100%, transparent)`;

  root.style.setProperty('--glow-soft', glowSoftCss);
  root.style.setProperty('--glow-strong', glowStrongCss);

  root.dataset.apexTheme = merged.id || 'custom';
  return merged;
}
