import { useEffect, useMemo, useState } from 'react';
import { applyTheme, DEFAULT_THEME, loadTheme, saveTheme, THEME_PRESETS } from '../config/theme';
import { useOverflowScroll } from '../hooks/useOverflowScroll';
import Dropdown from './Dropdown';
import './ThemeEditor.css';

const COLOR_FIELDS = [
  ['accent', 'Accent'],
  ['bg', 'Background'],
  ['bgCard', 'Cards'],
  ['bgCardHover', 'Card Hover'],
  ['bgElevated', 'Panels'],
  ['border', 'Border'],
  ['borderStrong', 'Strong Border'],
  ['text', 'Text'],
  ['textDim', 'Dim Text'],
  ['textFaint', 'Faint Text'],
  ['success', 'Success'],
  ['danger', 'Danger'],
  ['youColor', 'Calculator You'],
  ['themColor', 'Calculator Them'],
];

const EFFECT_FIELDS = [
  ['glow', 'Glow', 0, 0.75, 0.01],
  ['scanlines', 'Scanlines', 0, 0.35, 0.01],
  ['grid', 'Grid', 0, 0.22, 0.01],
  ['vfx', 'VFX Power', 0, 2, 0.05],
  ['speed', 'Animation Speed', 0.5, 1.5, 0.05],
];

function randomHex() {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
}

function darken(hex, factor = 0.2) {
  const value = hex.replace('#', '');
  const r = Math.round(parseInt(value.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(value.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(value.slice(4, 6), 16) * factor);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

export default function ThemeEditor({ open, onClose }) {
  const [theme, setTheme] = useState(() => loadTheme());
  const panelRef = useOverflowScroll([open]);

  useEffect(() => {
    const loaded = loadTheme();
    setTheme(loaded);
    applyTheme(loaded);
  }, []);

  useEffect(() => {
    if (!open) return;
    const loaded = loadTheme();
    setTheme(loaded);
  }, [open]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape' && open) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const presetId = useMemo(() => {
    const match = THEME_PRESETS.find((preset) => preset.id === theme.id);
    return match ? match.id : 'custom';
  }, [theme.id]);

  function commit(nextTheme) {
    const applied = applyTheme(nextTheme);
    setTheme(applied);
    saveTheme(applied);
  }

  function applyPreset(id) {
    const preset = THEME_PRESETS.find((entry) => entry.id === id) || DEFAULT_THEME;
    commit(preset);
  }

  function updateColor(key, value) {
    commit({ ...theme, id: 'custom', name: 'Custom', colors: { ...theme.colors, [key]: value } });
  }

  function updateEffect(key, value) {
    commit({ ...theme, id: 'custom', name: theme.name || 'Custom', effects: { ...theme.effects, [key]: Number(value) } });
  }

  function updateName(value) {
    commit({ ...theme, id: 'custom', name: value || 'Custom' });
  }

  function randomizeTheme() {
    const accent = randomHex();
    const bg = darken(accent, 0.08);
    const card = darken(accent, 0.14);
    commit({
      ...theme,
      id: 'custom',
      name: 'Random Apex',
      colors: {
        ...theme.colors,
        bg,
        bgElevated: darken(accent, 0.18),
        bgCard: card,
        bgCardHover: darken(accent, 0.28),
        border: darken(accent, 0.42),
        borderStrong: accent,
        accent,
        text: '#ffffff',
        textDim: '#d7d7d7',
        textFaint: darken(accent, 0.72),
      },
      effects: { ...theme.effects, glow: 0.5, scanlines: 0.22, grid: 0.14, vfx: 1.25 },
    });
  }

  function resetColors() {
    commit({ ...theme, id: 'custom', colors: DEFAULT_THEME.colors });
  }

  function resetVfx() {
    commit({ ...theme, id: 'custom', effects: DEFAULT_THEME.effects });
  }

  function copyThemeCode() {
    const encoded = btoa(encodeURIComponent(JSON.stringify(theme)));
    navigator.clipboard?.writeText(encoded);
  }

  function importThemeCode() {
    const code = window.prompt('Paste Testing theme code:');
    if (!code) return;
    try {
      let decoded = decodeURIComponent(atob(code.trim()));
      // Repair a common pasted-code typo where a hex color accidentally keeps
      // the separator comma inside the string, e.g. "#2b0c50,"accent...".
      decoded = decoded.replace(/(#[0-9a-fA-F]{6}),(")/g, '$1$2,');
      const parsed = JSON.parse(decoded);
      commit({ ...parsed, id: 'custom', name: parsed.name || 'Imported Theme' });
    } catch {
      window.alert('Invalid theme code.');
    }
  }

  if (!open) return null;

  return (
    <div className="theme-overlay" onClick={onClose}>
      <aside ref={panelRef} className="theme-panel" data-lenis-prevent onTouchMove={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
        <div className="theme-head">
          <div>
            <div className="theme-kicker">Testing Interface</div>
            <h2>Theme Editor</h2>
          </div>
          <button type="button" className="theme-close" onClick={onClose} aria-label="Close theme editor">
            ✕
          </button>
        </div>

        <label className="theme-field full">
          <span>Preset</span>
          <Dropdown
            value={presetId}
            onChange={applyPreset}
            options={[
              ...THEME_PRESETS.map((preset) => ({ value: preset.id, label: preset.name })),
              { value: 'custom', label: 'Custom' },
            ]}
            ariaLabel="Theme preset"
          />
        </label>

        <label className="theme-field full">
          <span>Theme Name</span>
          <input className="theme-name-input" value={theme.name || 'Custom'} onChange={(event) => updateName(event.target.value)} />
        </label>

        <div className="theme-preview">
          <div className="theme-preview-orb" />
          <div>
            <strong>{theme.name || 'Custom Theme'}</strong>
            <span>Local only — shared trades use the viewer&apos;s own theme.</span>
            <div className="theme-preview-swatches">
              {['accent', 'bgCard', 'borderStrong', 'youColor', 'themColor'].map((key) => (
                <i key={key} style={{ background: theme.colors[key] }} />
              ))}
            </div>
          </div>
        </div>

        <section className="theme-section">
          <h3>Colors</h3>
          <div className="theme-grid">
            {COLOR_FIELDS.map(([key, label]) => (
              <label key={key} className="theme-field">
                <span>{label}</span>
                <input type="color" value={theme.colors[key]} onChange={(event) => updateColor(key, event.target.value)} />
              </label>
            ))}
          </div>
        </section>

        <section className="theme-section">
          <h3>VFX</h3>
          <div className="theme-sliders">
            {EFFECT_FIELDS.map(([key, label, min, max, step]) => (
              <label key={key} className="theme-slider">
                <span>{label} <b>{theme.effects[key]}</b></span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={theme.effects[key]}
                  onChange={(event) => updateEffect(key, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        <div className="theme-actions">
          <button type="button" onClick={randomizeTheme}>Randomize</button>
          <button type="button" onClick={resetColors}>Reset Colors</button>
          <button type="button" onClick={resetVfx}>Reset VFX</button>
          <button type="button" onClick={() => commit(DEFAULT_THEME)}>Full Reset</button>
          <button type="button" onClick={importThemeCode}>Import</button>
          <button type="button" onClick={copyThemeCode}>Copy Theme Code</button>
        </div>
      </aside>
    </div>
  );
}
