import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { applyTheme, DEFAULT_THEME, loadTheme, saveTheme, THEME_PRESETS } from '../config/theme';
import PageShell from '../components/PageShell';
import PageIntro from '../components/PageIntro';
import { useData } from '../context/DataContext';
import UnitValueCard from '../components/UnitValueCard';
import UnitIcon from '../components/UnitIcon';
import { formatCompactNumber, formatFullNumber } from '../utils/formatNumber';
import { loadUXSettings, saveUXSettings, applyUXSettings, BG_PATTERNS, COLORBLIND_MODES, FONT_SIZES } from '../utils/uxSettings';
import { incrementStat } from '../utils/achievements';
import { REWARD_MODES, getUnlockedRewards, isRewardAllowed, remainingFor } from '../utils/themeUnlocks';
import './ThemeStudio.css';

const ACCENT_SWATCHES = [
  '#4d9dff', '#00ff91', '#ffc94d', '#ff4d4d', '#c04dff',
  '#ff7ad9', '#00e5ff', '#7cff45', '#ff9d3b', '#ffffff',
];

// Glyph options for particle reward themes (knowledge / APEX Team).
const PARTICLE_GLYPHS = ['?', '❓', '🧠', '💡', '📚', '⭐', '💎', '🔥', '🎯', '👑'];

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

// NOTE: animation speed is NOT a theme effect anymore — one slider in
// UX & Accessibility controls every animation site-wide.
const EFFECT_FIELDS = [
  ['glow', 'Glow', 0, 0.75, 0.01],
  ['scanlines', 'Scanlines', 0, 0.35, 0.01],
  ['grid', 'Grid', 0, 0.22, 0.01],
  ['vfx', 'VFX Power', 0, 2, 0.05],
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
  const [uxSettings, setUXSettings] = useState(() => loadUXSettings());
  const [rewardUnlocks, setRewardUnlocks] = useState(() => getUnlockedRewards());
  const rewardRemaining = useMemo(
    () => Object.fromEntries(REWARD_MODES.map((m) => [m.id, remainingFor(m.id)])),
    [rewardUnlocks]
  );

  useEffect(() => {
    const refresh = () => setRewardUnlocks(getUnlockedRewards());
    window.addEventListener('apex-achievement-unlocked', refresh);
    return () => window.removeEventListener('apex-achievement-unlocked', refresh);
  }, []);

  const actualUnits = useMemo(() => {
    const mythic = unitValues.find((u) => u.rarity === 'Mythics' || u.rarity === 'Legendaries' || u.rarity === 'Mythic' || u.rarity === 'Legendary') || unitValues[0];
    const legendary = unitValues.find((u) => (u.rarity === 'Legendaries' || u.rarity === 'Awesome' || u.rarity === 'Legendary') && u.slug !== mythic?.slug) || unitValues[1] || unitValues[0];
    const ball = unitValues.find((u) => u.slug === 'ball') || unitValues[0];
    return { mythic, legendary, ball };
  }, [unitValues]);

  useEffect(() => {
    saveTheme(theme);   // save first: applyTheme's event must expose the new state
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyUXSettings(uxSettings);
    saveUXSettings(uxSettings);
  }, [uxSettings]);

  function updateUX(key, value) {
    setUXSettings(prev => ({ ...prev, [key]: value }));
  }

  function randomizeTheme() {
    const hue = Math.floor(Math.random() * 360);
    const baseHue = (hue + 40) % 360;
    const acc = `hsl(${hue} 90% 62%)`;
    const bg = `hsl(${baseHue} 30% 4%)`;
    const elev = `hsl(${baseHue} 28% 9%)`;
    const card = `hsl(${baseHue} 28% 6%)`;
    const border = `hsl(${baseHue} 32% 24%)`;
    setTheme(prev => ({ ...prev, colors: { ...prev.colors, accent: acc, bg, bgElevated: elev, bgCard: card, bgCardHover: elev, border } }));
    showStatus('Randomized! Tweak any color below.');
  }

  function handleSelectPreset(preset) {
    // Presets swap COLORS only. Effect sliders (glow, grid, VFX…) are the
    // user's personal settings and must never reset when browsing themes —
    // same for UX settings (animation speed, pattern…), which live separately.
    setTheme((prev) => ({
      ...preset,
      effects: { ...prev.effects },
      rewards: { ...prev.rewards },
    }));
    showStatus(`Applied "${preset.name}" — your effect sliders were kept.`);
  }

  function handleColorChange(key, hex) {
    setTheme((prev) => ({
      ...prev,
      id: 'custom',
      name: 'Custom Theme',
      colors: { ...prev.colors, [key]: hex },
    }));
    incrementStat('themes_created', 1);
  }

  function handleEffectChange(key, val) {
    setTheme((prev) => ({
      ...prev,
      id: 'custom',
      name: 'Custom Theme',
      effects: { ...prev.effects, [key]: Number(val) },
    }));
  }

  function handleRewardMode(mode) {
    if (!isRewardAllowed(mode.id, rewardUnlocks)) {
      showStatus(mode.adminOnly ? '🎩 APEX Team is for team admins.' : `🔒 Locked — ${mode.category} set incomplete.`);
      return;
    }
    setTheme((prev) => ({ ...prev, rewards: { ...prev.rewards, mode: mode.id, color: mode.color || prev.rewards.color } }));
    showStatus(mode.id === 'none' ? 'Reward theme off.' : `${mode.icon} ${mode.label} on — tweak it below.`);
  }

  function handleRewardChange(key, value) {
    setTheme((prev) => ({ ...prev, rewards: { ...prev.rewards, [key]: value } }));
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
      incrementStat('themes_shared', 1);
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
      incrementStat('themes_imported', 1);
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

    setTheme((prev) => ({
      rewards: { ...prev.rewards },
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
    }));
    showStatus('🎲 Generated harmonious theme!');
  }

  function handleResetDefault() {
    // Colors return to stock; personal effect sliders are kept (they are
    // user settings, not part of the default theme's identity).
    setTheme((prev) => ({ ...DEFAULT_THEME, effects: { ...prev.effects }, rewards: { ...prev.rewards } }));
    showStatus('✓ Reset to Apex Classic default — your sliders were kept.');
  }

  return (
    <PageShell sidebarTitle="THEME STUDIO" navTree={[]}>
      <PageIntro eyebrow="CUSTOMIZE TESTING" title="Theme Studio">
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
              <h2>🎨 Preset Catalog</h2>
              <p className="theme-card-hint">Tap a theme to recolor the whole site. Your effect sliders and accessibility settings are never touched.</p>
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
              <h2>🎲 Generator &amp; Sharing</h2>
              <p className="theme-card-hint">Roll a harmonious palette or export your theme to share.</p>
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
              <h2>✨ Holographic VFX</h2>
              <p className="theme-card-hint">Dial in how strong the background effects feel. Live everywhere on the site.</p>
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

            {/* REWARD THEMES */}
            <div className="theme-section-card">
              <h2>🏆 Reward Themes</h2>
              <p className="theme-card-hint">Special looks earned by completing achievement sets — still fully customizable. Team admins unlock everything.</p>
              <div className="theme-presets-grid">
                {REWARD_MODES.map((mode) => {
                  const allowed = isRewardAllowed(mode.id, rewardUnlocks);
                  const active = theme.rewards.mode === mode.id;
                  const remaining = allowed ? 0 : (rewardRemaining[mode.id] || 0);
                  return (
                    <button
                      type="button"
                      key={mode.id}
                      className={active ? 'preset-chip active' : 'preset-chip'}
                      onClick={() => handleRewardMode(mode)}
                      title={allowed ? mode.desc : mode.adminOnly ? 'Team admins only' : `Complete every ${mode.category} achievement (${remaining} to go)`}
                    >
                      <span>{mode.icon}</span>
                      <span>{mode.label}</span>
                      {!allowed && mode.id !== 'none' && (
                        <span className="reward-lock">{mode.adminOnly ? '🎩' : `🔒${remaining}`}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {(() => {
                const mode = REWARD_MODES.find((m) => m.id === theme.rewards.mode);
                if (!mode || mode.id === 'none') return null;
                return (
                  <div className="theme-sliders-list" style={{ marginTop: 12 }}>
                    <p className="theme-card-hint" style={{ marginBottom: 8 }}>{mode.desc}</p>
                    <div className="theme-slider-item">
                      <div className="theme-slider-head"><span>Reward Color</span></div>
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(theme.rewards.color) ? theme.rewards.color : '#7cff45'}
                        onChange={(e) => handleRewardChange('color', e.target.value)}
                        style={{ width: 52, height: 32, padding: 0, border: '1px solid var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer' }}
                      />
                    </div>
                    <div className="theme-slider-item">
                      <div className="theme-slider-head">
                        <span>{mode.id === 'ballonomics' ? 'Texture Size' : 'Density'}</span>
                        <strong>{Math.round(theme.rewards.density * 100)}%</strong>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={theme.rewards.density} onChange={(e) => handleRewardChange('density', Number(e.target.value))} />
                    </div>
                    <div className="theme-slider-item">
                      <div className="theme-slider-head">
                        <span>Intensity</span>
                        <strong>{Math.round(theme.rewards.intensity * 100)}%</strong>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={theme.rewards.intensity} onChange={(e) => handleRewardChange('intensity', Number(e.target.value))} />
                    </div>
                    {mode.particles && (
                      <div className="theme-slider-item">
                        <div className="theme-slider-head"><span>Particle Glyph</span></div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {PARTICLE_GLYPHS.map((g) => {
                            const effective = theme.rewards.glyph || (mode.id === 'admin' ? '👑' : '?');
                            return (
                              <button
                                type="button"
                                key={g}
                                className={effective === g ? 'preset-chip active' : 'preset-chip'}
                                onClick={() => handleRewardChange('glyph', g)}
                                style={{ fontSize: '1rem', padding: '4px 9px' }}
                              >
                                {g}
                              </button>
                            );
                          })}
                          <input
                            type="text"
                            value={theme.rewards.glyph}
                            placeholder="custom…"
                            maxLength={8}
                            onChange={(e) => handleRewardChange('glyph', e.target.value)}
                            style={{ width: 90, padding: '5px 9px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: '0.85rem' }}
                          />
                        </div>
                        <p className="theme-card-hint" style={{ margin: '6px 0 0' }}>Pick or type any emoji — particles get painted in your Reward Color.</p>
                      </div>
                    )}
                    {mode.id === 'retro' && (
                      <div className="theme-slider-item">
                        <div className="theme-slider-head"><span>Retro Font</span></div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className={theme.rewards.pixelFont ? 'preset-chip active' : 'preset-chip'} onClick={() => handleRewardChange('pixelFont', true)}>On</button>
                          <button type="button" className={!theme.rewards.pixelFont ? 'preset-chip active' : 'preset-chip'} onClick={() => handleRewardChange('pixelFont', false)}>Off</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* UX SETTINGS */}
            <div className="theme-section-card">
              <h2>🧩 UX &amp; Accessibility</h2>
              <p className="theme-card-hint">Personal settings — they apply to every theme and never reset.</p>
              <div className="theme-sliders-list">
                <div className="theme-slider-item">
                  <div className="theme-slider-head"><span>Background Pattern</span></div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {BG_PATTERNS.map(p => (
                      <button key={p.value} type="button" className={uxSettings.bgPattern === p.value ? 'preset-chip active' : 'preset-chip'} onClick={() => updateUX('bgPattern', p.value)}>{p.label}</button>
                    ))}
                  </div>
                  {uxSettings.bgPattern !== 'none' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 800 }}>Pattern color</span>
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(uxSettings.bgPatternColor) ? uxSettings.bgPatternColor : '#ffffff'}
                        onChange={(e) => updateUX('bgPatternColor', e.target.value)}
                        style={{ width: 42, height: 30, padding: 0, border: '1px solid var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer' }}
                      />
                    </div>
                  )}
                </div>
                <div className="theme-slider-item">
                  <div className="theme-slider-head">
                    <span>Animation Speed</span>
                    <strong>{Number(uxSettings.animSpeed) <= 0 ? 'Off' : `${Number(uxSettings.animSpeed).toFixed(2)}×`}</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={Number(uxSettings.animSpeed) || 0}
                    onChange={(e) => updateUX('animSpeed', Number(e.target.value))}
                  />
                  <div className="theme-slider-ticks"><span>Off</span><span>0.75×</span><span>1.5×</span></div>
                </div>
                <div className="theme-slider-item">
                  <div className="theme-slider-head"><span>Font Size</span></div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {FONT_SIZES.map(f => (
                      <button key={f.value} type="button" className={uxSettings.fontSize === f.value ? 'preset-chip active' : 'preset-chip'} onClick={() => updateUX('fontSize', f.value)}>{f.label}</button>
                    ))}
                  </div>
                </div>
                <div className="theme-slider-item">
                  <div className="theme-slider-head"><span>Colorblind Mode</span></div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {COLORBLIND_MODES.map(c => (
                      <button key={c.value} type="button" className={uxSettings.colorblind === c.value ? 'preset-chip active' : 'preset-chip'} onClick={() => updateUX('colorblind', c.value)}>{c.label}</button>
                    ))}
                  </div>
                </div>
                <div className="theme-slider-item">
                  <div className="theme-slider-head"><span>High Contrast</span><strong>{uxSettings.highContrast ? 'ON' : 'OFF'}</strong></div>
                  <button type="button" className={uxSettings.highContrast ? 'preset-chip active' : 'preset-chip'} onClick={() => updateUX('highContrast', !uxSettings.highContrast)}>{uxSettings.highContrast ? 'Enabled' : 'Disabled'}</button>
                </div>
              </div>
            </div>

            {/* GRANULAR COLOR PICKERS */}
            <div className="theme-section-card">
              <h2>🌈 Granular Color Palette</h2>
              <p className="theme-card-hint">Fine-tune any single color. Typing a hex works too.</p>
              <div className="theme-quick-row">
                <span className="theme-quick-label">Quick Accent</span>
                <div className="accent-swatches">
                  {ACCENT_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="accent-swatch"
                      style={{ background: c }}
                      title={`Accent ${c}`}
                      onClick={() => setTheme(prev => ({ ...prev, colors: { ...prev.colors, accent: c } }))}
                    />
                  ))}
                </div>
                <button type="button" className="preset-chip" onClick={randomizeTheme}>🎲 Random Theme</button>
              </div>
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
              <h2>👀 Live Preview</h2>
              <p className="theme-card-hint">Real components with your theme applied — updates as you tweak.</p>
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
