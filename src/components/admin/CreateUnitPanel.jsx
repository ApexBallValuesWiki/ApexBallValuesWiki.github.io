import { useState } from 'react';
import { UNIT_RARITIES, UNIT_TYPES, UNIT_CATEGORIES, getRarityGlow } from '../../data/taxonomy';
import { slugify } from '../../utils/slug';
import { uploadUnitImage, fileToUnitRenderDataUrl } from '../../utils/adminImage';
import { errorMessage } from '../../utils/adminForms';
import './CreateUnitPanel.css';

export default function CreateUnitPanel({
  session,
  supabase,
  previewMode,
  setLocalWikiOverride,
  setLocalValueOverride,
  onCreated,
  onClose,
}) {
  const [form, setForm] = useState({
    name: '',
    rarity: 'Normie',
    type: 'DPS',
    category: 'Standard',
    baseValue: 1,
  });
  const [imageFile, setImageFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const previewSrc = imageFile ? URL.createObjectURL(imageFile) : null;
  const glow = getRarityGlow(form.rarity);

  function acceptFile(file) {
    if (file?.type?.startsWith('image/')) {
      setImageFile(file);
      setError('');
    } else {
      setError('Please select an image file (PNG, JPG, WEBP).');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Type a custom unit name first.');
      return;
    }
    const slug = slugify(name);
    setSaving(true);
    setError('');

    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await fileToUnitRenderDataUrl(imageFile, 256);
      }

      const wikiPayload = {
        slug,
        name,
        rarity: form.rarity,
        custom_unit: true,
        type: form.type,
        raw_type: `${form.type} Unit`,
        category: form.category,
        obtain: ['Custom Admin Unit'],
        min_max_stats: {},
        upgrades: [],
        image_url: imageUrl,
        updated_by: session?.user?.id || 'local-preview',
        updated_at: new Date().toISOString(),
      };

      const valuePayload = {
        slug,
        kind: 'unit',
        base_value: Number(form.baseValue) || 1,
        gems: 1,
        coins: 1,
        demand: 'Normal',
        scarcity: 'Standard',
        trend: 'stable',
        notes: 'Created via Admin Studio Create Unit Panel',
        updated_by: session?.user?.id || 'local-preview',
        updated_at: new Date().toISOString(),
      };

      if (previewMode) {
        setLocalWikiOverride(slug, { ...wikiPayload, isPrvw: true, prvw: true });
        setLocalValueOverride(slug, { ...valuePayload, isPrvw: true, prvw: true });
      } else {
        const [wikiRes, valRes] = await Promise.all([
          supabase.from('unit_wiki_overrides').upsert(wikiPayload, { onConflict: 'slug' }),
          supabase.from('value_entries').upsert(valuePayload, { onConflict: 'slug' }),
        ]);
        if (wikiRes.error) throw wikiRes.error;
        if (valRes.error) throw valRes.error;
      }

      if (onCreated) {
        onCreated(slug, name);
      }
    } catch (e) {
      setError(`Could not create unit: ${errorMessage(e)}`);
      setSaving(false);
    }
  }

  return (
    <form className="create-unit-panel" onSubmit={handleSubmit} style={{ borderColor: `${glow}88` }}>
      <div className="cup-head">
        <div className="cup-title">
          <h2>
            <span>✨ Create New Unit</span>
            {previewMode && (
              <span className="badge" style={{ background: '#b679ff', color: '#fff', fontSize: '0.65rem', padding: '2px 8px' }}>
                PRVW MODE
              </span>
            )}
          </h2>
          <span>Build a brand new custom unit with initial artwork, WIKI sheet, and trade values.</span>
        </div>
        {onClose && (
          <button type="button" className="cup-btn cancel" onClick={onClose} style={{ padding: '6px 14px' }}>
            ✕ Close Panel
          </button>
        )}
      </div>

      {error && (
        <div className="badge filled" style={{ background: 'var(--danger, #ff4d4d)', color: '#fff', padding: '10px 16px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div className="cup-grid">
        <div
          className={`cup-image-drop ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); acceptFile(e.dataTransfer.files?.[0]); }}
          style={previewSrc ? { borderColor: glow } : undefined}
        >
          {previewSrc ? (
            <img src={previewSrc} alt="New unit icon preview" className="cup-preview-img" style={{ borderColor: glow, boxShadow: `0 0 16px ${glow}66` }} />
          ) : (
            <div style={{ fontSize: '2.5rem' }}>🎨</div>
          )}
          <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
            {imageFile ? imageFile.name : 'Drop Unit Icon Image Here'}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
            Squircle avatar auto-fitting &amp; compression
          </span>
          <label className="cup-upload-btn" style={{ background: glow }}>
            📸 Select Artwork
            <input type="file" accept="image/*" onChange={(e) => acceptFile(e.target.files?.[0])} />
          </label>
        </div>

        <div className="cup-fields">
          <label className="cup-field">
            <span>Unit Display Name</span>
            <input
              type="text"
              required
              placeholder="e.g. Apex Sovereign"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </label>

          <label className="cup-field">
            <span>Rarity Division</span>
            <select
              value={form.rarity}
              onChange={(e) => setForm((p) => ({ ...p, rarity: e.target.value }))}
            >
              {UNIT_RARITIES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>

          <label className="cup-field">
            <span>Gameplay Role / Type</span>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            >
              {UNIT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="cup-field">
            <span>Category Tag</span>
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            >
              {UNIT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="cup-field">
            <span>Initial Base Trade Value</span>
            <input
              type="number"
              min="1"
              required
              value={form.baseValue}
              onChange={(e) => setForm((p) => ({ ...p, baseValue: e.target.value }))}
            />
          </label>
        </div>
      </div>

      <div className="cup-actions">
        {onClose && (
          <button type="button" className="cup-btn cancel" onClick={onClose}>
            Cancel
          </button>
        )}
        <button type="submit" className="cup-btn submit" disabled={saving}>
          {saving ? 'Creating Unit…' : '+ Create & Publish Unit'}
        </button>
      </div>
    </form>
  );
}
