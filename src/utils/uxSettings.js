/**
 * UX & Deep Architectural Customization Settings
 * Controls background patterns, surface material, corner geometry,
 * typography voice, 3D metallic finish, cursor glow intensity,
 * animation speed, colorblind modes, and accessibility.
 */

const UX_STORAGE_KEY = 'apex-ux-settings-v1';

const DEFAULTS = {
  bgPattern: 'none',         // none | grid | dots | lines
  bgPatternColor: '#ffffff',
  surfaceStyle: 'obsidian',  // obsidian | chrome | glass | wireframe
  cardRadius: 'sculpted',    // sharp | balanced | sculpted
  fontStyle: 'sans',         // Montserrat across all interfaces
  metalFinish: 'chrome',     // chrome | titanium | mercury | prismatic
  glassOpacity: 0.75,        // surface opacity, 0.35–0.95
  glassBlur: 12,             // desktop backdrop blur in pixels
  heroTint: 0.16,            // selected accent influence on hero
  smoothScroll: true,
  scrollEase: 1,            // PC-only Lenis glide: 0.6 (crisp) to 1.5 (long/soft)
  scrollScene: true,
  cursorGlow: 0.24,          // 0 to 0.8 (default subtle 0.24)
  animSpeed: 1,              // 0 = animations off; otherwise a speed multiplier (0.25–1.5)
  colorblind: 'none',        // none | protanopia | deuteranopia | tritanopia
  highContrast: false,
  fontSize: 'normal',        // small | normal | large | xlarge
  reducedMotion: false,
  // auto = honour OS + site settings | on = force smooth motion (fixes PC
  // browsers reporting reduced motion from an OS accessibility setting) |
  // off = force reduced motion.
  motionOverride: 'auto',
};

export function systemReducedMotion() {
  try { return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches); }
  catch { return false; }
}

export function loadUXSettings() {
  try {
    const raw = localStorage.getItem(UX_STORAGE_KEY);
    if (raw) {
      const parsed = { ...DEFAULTS, ...JSON.parse(raw) };
      parsed.animSpeed = normalizeAnimSpeed(parsed.animSpeed);
      parsed.fontStyle = 'sans'; // migrate older mono/serif settings
      return parsed;
    }
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function saveUXSettings(settings) {
  try {
    localStorage.setItem(UX_STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function applyUXSettings(settings) {
  const root = document.documentElement;
  const s = { ...DEFAULTS, ...settings };
  // Single source of truth for every CSS motion gate. The stylesheet's reduced
  // motion media queries are scoped to html:not([data-motion="on"]), so an
  // explicit opt-in genuinely restores durations instead of being overridden.
  const override = s.motionOverride === 'on' || s.motionOverride === 'off' ? s.motionOverride : 'auto';
  const osReduced = systemReducedMotion();
  const motionOn = override === 'on'
    || (override === 'auto' && !osReduced && s.reducedMotion !== true && Number(s.animSpeed) > 0);
  root.dataset.motion = motionOn ? 'on' : 'off';
  root.dataset.motionOverride = override;

  root.dataset.bgPattern = s.bgPattern;
  root.style.setProperty('--bg-pattern-color', s.bgPatternColor || '#ffffff');

  root.dataset.surfaceStyle = s.surfaceStyle || 'obsidian';
  root.dataset.cardRadius = s.cardRadius || 'sculpted';
  root.dataset.fontStyle = 'sans';
  root.dataset.metalFinish = s.metalFinish || 'chrome';
  const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
  root.style.setProperty('--glass-fill', `${Math.round(clamp(s.glassOpacity, 0.35, 0.95, 0.75) * 100)}%`);
  root.style.setProperty('--glass-blur', `${clamp(s.glassBlur, 0, 24, 12)}px`);
  root.style.setProperty('--hero-tint', `${Math.round(clamp(s.heroTint, 0, 0.4, 0.16) * 100)}%`);
  root.dataset.scrollScene = String(s.scrollScene !== false);
  root.dataset.smoothScroll = String(s.smoothScroll !== false);

  const glowOpacity = Number.isFinite(Number(s.cursorGlow))
    ? Math.max(0, Math.min(0.85, Number(s.cursorGlow)))
    : 0.24;
  root.style.setProperty('--cursor-glow-opacity', String(glowOpacity));

  const speedNum = Number(s.animSpeed);
  // When the visitor explicitly opted into motion, do not publish the flags
  // that would make the attribute-based CSS gates fire again.
  root.dataset.animSpeed = motionOn
    ? (speedNum < 0.75 ? 'slow' : speedNum <= 1.25 ? 'normal' : 'fast')
    : 'none';
  // Never write a near-zero epsilon: dividing a duration by 0.0001 produced
  // invalid/0s animations across every CSS keyframe. A finite floor keeps
  // calc() valid; data-anim-speed="none" disables animations in CSS instead.
  root.style.setProperty('--theme-speed', String(speedNum <= 0 ? 1 : Math.max(0.25, speedNum)));
  root.style.setProperty('--anim-speed', String(speedNum <= 0 ? 0 : 1 / Math.max(speedNum, 0.0001)));
  root.dataset.colorblind = s.colorblind;
  root.dataset.highContrast = String(s.highContrast);
  root.dataset.fontSize = s.fontSize;

  if (s.reducedMotion && !motionOn) root.dataset.reducedMotion = 'true';
  else delete root.dataset.reducedMotion;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apex-ux-updated', { detail: s }));
  }
}

export const BG_PATTERNS = [
  { value: 'none', label: 'None' },
  { value: 'grid', label: 'Grid' },
  { value: 'dots', label: 'Dots' },
  { value: 'lines', label: 'Lines' },
];

export const SURFACE_STYLES = [
  { value: 'obsidian', label: 'Obsidian Matte' },
  { value: 'chrome', label: 'Brushed Chrome' },
  { value: 'glass', label: 'Liquid Glass' },
  { value: 'wireframe', label: 'Neon Wireframe' },
];

export const CARD_RADII = [
  { value: 'sharp', label: 'Sharp (6px)' },
  { value: 'balanced', label: 'Balanced (16px)' },
  { value: 'sculpted', label: 'Sculpted (24px)' },
];

export const FONT_STYLES = [{ value: 'sans', label: 'Montserrat' }];

export const METAL_FINISHES = [
  { value: 'chrome', label: 'Liquid Chrome' },
  { value: 'titanium', label: 'Brushed Titanium' },
  { value: 'mercury', label: 'Dark Mercury' },
  { value: 'prismatic', label: 'Prismatic Alloy' },
];

export const ANIM_SPEED_LABELS = { fast: 1.5, normal: 1, slow: 0.5, none: 0 };

export function normalizeAnimSpeed(raw) {
  if (raw === null || raw === undefined) return 1;
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.min(1.5, Math.max(0, raw));
  const mapped = ANIM_SPEED_LABELS[String(raw)];
  return mapped !== undefined ? mapped : 1;
}

export const COLORBLIND_MODES = [
  { value: 'none', label: 'Off' },
  { value: 'protanopia', label: 'Protanopia (Red-blind)' },
  { value: 'deuteranopia', label: 'Deuteranopia (Green-blind)' },
  { value: 'tritanopia', label: 'Tritanopia (Blue-blind)' },
];

export const FONT_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra Large' },
];
