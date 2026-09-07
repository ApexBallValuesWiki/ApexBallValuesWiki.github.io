/**
 * UX Settings — background patterns, animation speed, colorblind, accessibility
 */

const UX_STORAGE_KEY = 'apex-ux-settings-v1';

const DEFAULTS = {
  bgPattern: 'none',      // none | grid | dots | lines
  bgPatternColor: '#ffffff', // any CSS color for the pattern lines
  animSpeed: 1,           // 0 = animations off; otherwise a speed multiplier (0.25–1.5)
  colorblind: 'none',     // none | protanopia | deuteranopia | tritanopia
  highContrast: false,
  fontSize: 'normal',     // small | normal | large | xlarge
  reducedMotion: false,
};

export function loadUXSettings() {
  try {
    const raw = localStorage.getItem(UX_STORAGE_KEY);
    if (raw) {
      const parsed = { ...DEFAULTS, ...JSON.parse(raw) };
      parsed.animSpeed = normalizeAnimSpeed(parsed.animSpeed); // migrate old chip values
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

  root.dataset.bgPattern = s.bgPattern;
  root.style.setProperty('--bg-pattern-color', s.bgPatternColor || '#ffffff');

  // ONE speed control for every animation on the site: the value is a
  // multiplier (higher = faster). 0 turns animations off entirely. It drives
  // both the UI animation scale and the holographic background speed.
  const speedNum = Number(s.animSpeed);
  root.dataset.animSpeed = speedNum <= 0 ? 'none' : speedNum < 0.75 ? 'slow' : speedNum <= 1.25 ? 'normal' : 'fast';
  root.style.setProperty('--theme-speed', String(speedNum <= 0 ? 0.0001 : speedNum));
  root.style.setProperty('--anim-speed', String(speedNum <= 0 ? 0 : 1 / Math.max(speedNum, 0.0001)));
  root.dataset.colorblind = s.colorblind;
  root.dataset.highContrast = String(s.highContrast);
  root.dataset.fontSize = s.fontSize;

  if (s.reducedMotion) {
    root.dataset.reducedMotion = 'true';
  } else {
    delete root.dataset.reducedMotion;
  }
}

export const BG_PATTERNS = [
  { value: 'none', label: 'None' },
  { value: 'grid', label: 'Grid' },
  { value: 'dots', label: 'Dots' },
  { value: 'lines', label: 'Lines' },
];

// Legacy chip values kept only for migrating old saved settings.
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
