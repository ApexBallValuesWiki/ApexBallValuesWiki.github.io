/**
 * UX Settings — background patterns, animation speed, colorblind, accessibility
 */

const UX_STORAGE_KEY = 'apex-ux-settings-v1';

const DEFAULTS = {
  bgPattern: 'none',      // none | grid | dots | lines
  bgPatternColor: '#ffffff', // any CSS color for the pattern lines
  animSpeed: 'normal',    // fast | normal | slow | none
  colorblind: 'none',     // none | protanopia | deuteranopia | tritanopia
  highContrast: false,
  fontSize: 'normal',     // small | normal | large | xlarge
  reducedMotion: false,
};

export function loadUXSettings() {
  try {
    const raw = localStorage.getItem(UX_STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
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
  root.dataset.animSpeed = s.animSpeed;
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

export const ANIM_SPEEDS = [
  { value: 'fast', label: 'Fast' },
  { value: 'normal', label: 'Normal' },
  { value: 'slow', label: 'Slow' },
  { value: 'none', label: 'None' },
];

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
