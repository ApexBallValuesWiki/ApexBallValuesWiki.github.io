import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { applyTheme, DEFAULT_THEME, loadTheme, saveTheme, THEME_PRESETS } from '../config/theme';
import PageShell from '../components/PageShell';
import PageIntro from '../components/PageIntro';
import { useData } from '../context/DataContext';
import UnitValueCard from '../components/UnitValueCard';
import UnitIcon from '../components/UnitIcon';
import { formatCompactNumber, formatFullNumber } from '../utils/formatNumber';
import './ThemeStudio.css';

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

function hsvToHex(h, s, v) {
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = 0; g = 0; b = 0; break;
  }
  const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function ThemeStudio() {
  const { unitValues } = useData();
  const [theme, setTheme] = useState(() => loadTheme());
  const [importText, setImportText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const actualUnits = useMemo(() => {
    const mythic = unitValues.find((u) => u.rarity === 'Mythics' || u.rarity === 'Legendaries' || u.rarity === 'Mythic' || u.rarity === 'Legendary') || unitValues[0];
    const legendary = unitValues.find((u) => (u.rarity === 'Legendaries' || u.rarity === 'Awesome' || u.rarity === 'Legendary') && u.slug !== mythic?.slug) || unitValues[1] || unitValues[0];
    const ball = unitValues.find((u) => u.slug === 'ball') || unitValues[0];
    return { mythic, legendary, ball };
  }, [unitValues]);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  function handleSelectPreset(preset) {
    setTheme(preset);
    showStatus(`Applied preset "${preset.name}"!`);
  }

  function handleColorChange(key, hex) {
    setTheme((prev) => ({
      ...prev,
      id: 'custom',
      name: 'Custom Theme',
      colors: { ...prev.colors, [key]: hex },
    }));
  }

  function handleEffectChange(key, val) {
    setTheme((prev) => ({
      ...prev,
      id: 'custom',
      name: 'Custom Theme',
      effects: { ...prev.effects, [key]: Number(val) },
    }));
  }

  function showStatus(msg) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 2500);
  }

  function handleExportBase64() {
    try {
      const json = JSON.stringify(theme);
      const b64 = btoa(encodeURIComponent(json));
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(b64);
      }
      showStatus('✓ Exported Base64 theme to clipboard!');
    } catch {
      showStatus('❌ Failed to export theme');
    }
  }

  function handleExportJson() {
    try {
      const json = JSON.stringify(theme, null, 2);
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(json);
      }
      showStatus('✓ Exported JSON theme to clipboard!');
    } catch {
      showStatus('❌ Failed to export JSON');
    }
  }

  function handleImport() {
    if (!importText.trim()) {
      showStatus('❌ Paste Base64 or JSON first.');
      return;
    }
    try {
      let raw = importText.trim();
      // Try decoding Base64 if not starting with {
      if (!raw.startsWith('{')) {
        try {
          raw = decodeURIComponent(atob(raw));
        } catch {
          // ignore
        }
      }
      const parsed = JSON.parse(raw);
      if (!parsed.colors || !parsed.effects) {
        throw new Error('Missing colors or effects object');
      }
      setTheme({
        ...DEFAULT_THEME,
        ...parsed,
        id: 'custom-imported',
        name: parsed.name || 'Imported Theme',
        colors: { ...DEFAULT_THEME.colors, ...parsed.colors },
        effects: { ...DEFAULT_THEME.effects, ...parsed.effects },
      });
      setImportText('');
      showStatus('✓ Successfully imported custom theme!');
    } catch {
      showStatus('❌ Invalid theme format. Check Base64 / JSON string.');
    }
  }

  function handleRandomHarmony() {
    const baseHue = Math.random();
    const accentHue = (baseHue + 0.618033988749895) % 1; // Golden ratio color harmony
    const youHue = (baseHue + 0.33) % 1;
    const themHue = (baseHue + 0.66) % 1;

    const accentHex = hsvToHex(accentHue, 0.85, 1.0);
    const borderStrongHex = hsvToHex(accentHue, 0.6, 0.95);
    const youHex = hsvToHex(youHue, 0.8, 1.0);
    const themHex = hsvToHex(themHue, 0.85, 0.95);
    const borderHex = hsvToHex(baseHue, 0.6, 0.28);
    const bgElevatedHex = hsvToHex(baseHue, 0.7, 0.1);
    const bgCardHex = hsvToHex(baseHue, 0.75, 0.07);
    const bgHex = hsvToHex(baseHue, 0.8, 0.03);

    setTheme({
      id: 'custom-harmony',
      name: 'Harmonic Random',
      colors: {
        ...DEFAULT_THEME.colors,
        bg: bgHex,
        bgCard: bgCardHex,
        bgCardHover: bgElevatedHex,
        bgElevated: bgElevatedHex,
        border: borderHex,
        borderStrong: borderStrongHex,
        accent: accentHex,
        youColor: youHex,
        themColor: themHex,
      },
      effects: {
        glow: Number((0.35 + Math.random() * 0.35).toFixed(2)),
        scanlines: Number((0.15 + Math.random() * 0.15).toFixed(2)),
        grid: Number((0.08 + Math.random() * 0.12).toFixed(2)),
        vfx: Number((0.9 + Math.random() * 0.4).toFixed(2)),
        speed: Number((0.8 + Math.random() * 0.4).toFixed(2)),
      },
    });
    showStatus('🎲 Generated harmonious theme!');
  }

  function handleResetDefault() {
    setTheme(DEFAULT_THEME);
    showStatus('✓ Reset to Apex Classic default.');
  }

  return (
    <PageShell sidebarTitle="THEME STUDIO" navTree={[]}>
      <PageIntro eyebrow="CUSTOMIZE APEX" title="Theme Studio">
        <p>
          Design your personal holographic experience. Every color, glow intensity, and visual
          effect transforms live across all tables, unit cards, and trade tools.
        </p>
      </PageIntro>

      {statusMsg && (
        <motion.div
          className="badge filled"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: 'var(--accent)', color: 'var(--accent-inverse)', alignSelf: 'flex-start', padding: '8px 16px', fontSize: '0.85rem' }}
        >
          {statusMsg}
        </motion.div>
      )}

      <div className="theme-studio-page">
        <div className="theme-studio-grid">
          {/* LEFT: CONTROLS */}
          <div className="theme-studio-controls">
            {/* PRESETS */}
            <div className="theme-section-card">
              <h2>Preset Catalog</h2>
              <div className="theme-presets-grid">
                {THEME_PRESETS.map((p) => {
                  const isActive = theme.id === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      className={isActive ? 'preset-chip active' : 'preset-chip'}
                      onClick={() => handleSelectPreset(p)}
                    >
                      <span className="preset-dot" style={{ background: p.colors.accent }} />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COLOR HARMONY RANDOMIZER & ACTIONS */}
            <div className="theme-section-card">
              <h2>Harmonic Generator & Actions</h2>
              <div className="theme-actions-bar">
                <button type="button" className="theme-btn primary" onClick={handleRandomHarmony}>
                  🎲 Color Harmony Randomizer
                </button>
                <button type="button" className="theme-btn" onClick={handleExportBase64}>
                  📋 Export Base64
                </button>
                <button type="button" className="theme-btn" onClick={handleExportJson}>
                  💾 Export JSON
                </button>
                <button type="button" className="theme-btn danger" onClick={handleResetDefault}>
                  ⚡ Reset Default
                </button>
              </div>
              <div className="theme-import-box">
                <textarea
                  placeholder="Paste exported Base64 or JSON theme string here to import..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
                <button type="button" className="theme-btn" onClick={handleImport} style={{ alignSelf: 'flex-start' }}>
                  📥 Import Theme
                </button>
              </div>
            </div>

            {/* VFX SLIDERS */}
            <div className="theme-section-card">
              <h2>Holographic VFX Sliders</h2>
              <div className="theme-sliders-list">
                {EFFECT_FIELDS.map(([key, label, min, max, step]) => (
                  <div key={key} className="theme-slider-item">
                    <div className="theme-slider-head">
                      <span>{label}</span>
                      <strong>{theme.effects?.[key] ?? 0}</strong>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={theme.effects?.[key] ?? min}
                      onChange={(e) => handleEffectChange(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* GRANULAR COLOR PICKERS */}
            <div className="theme-section-card">
              <h2>Granular Color Palette</h2>
              <div className="theme-colors-grid">
                {COLOR_FIELDS.map(([key, label]) => {
                  const val = theme.colors?.[key] || '#ffffff';
                  return (
                    <div key={key} className="color-picker-row">
                      <span className="color-picker-label">{label}</span>
                      <div className="color-picker-wrap">
                        <input
                          type="color"
                          value={val.length === 7 ? val : '#ffffff'}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                        />
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE PREVIEW SANDBOX */}
          <div className="theme-studio-preview">
            <div className="theme-section-card">
              <h2>Live Component Preview Sandbox</h2>
              <div className="live-preview-box">
                {/* Sample Alert Banner */}
                <div style={{ background: 'var(--accent)', color: 'var(--accent-inverse)', padding: '10px 16px', borderRadius: 'var(--radius-pill)', fontWeight: 800, fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>⚡ LIVE BROADCAST: Global Market Update Live across all servers!</span>
                  <span style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem' }}>NEW</span>
                </div>

                {/* Sample Badges & Buttons */}
                <div className="preview-badge-row">
                  <span className="badge filled">MYTHIC</span>
                  <span className="badge">DPS UNIT</span>
                  <span className="badge dim">Standard Category</span>
                  <button type="button" className="badge filled" style={{ border: 'none', cursor: 'pointer' }}>
                    Sample Action Button
                  </button>
                </div>

                {/* ACTUAL REAL UNIT CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                  {actualUnits.mythic && <UnitValueCard unit={actualUnits.mythic} linkBase="/values/units/Mythics" />}
                  {actualUnits.legendary && <UnitValueCard unit={actualUnits.legendary} linkBase="/values/units/Legendaries" />}
                </div>

                {/* Sample Trade Side Comparison using Actual Units */}
                <div className="preview-calc-row">
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', display: 'block', textTransform: 'uppercase' }}>YOU GIVE</span>
                    <span className="preview-side-you">2× {actualUnits.mythic?.name || 'Unit'} ({formatCompactNumber((actualUnits.mythic?.tradeValue || 1) * 2)})</span>
                  </div>
                  <span className="badge" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>YOU WIN (+500K)</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', display: 'block', textTransform: 'uppercase' }}>THEY GIVE</span>
                    <span className="preview-side-them">5× {actualUnits.legendary?.name || 'Unit'} ({formatCompactNumber((actualUnits.legendary?.tradeValue || 1) * 5)})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
