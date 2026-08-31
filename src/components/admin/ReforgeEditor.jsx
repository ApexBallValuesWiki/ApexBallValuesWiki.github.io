import { useState } from 'react';
import { AdminInput, EditorTitle } from './AdminParts';

/**
 * ReforgeEditor — manage reforges and their stat bonuses
 */
export default function ReforgeEditor({ reforge, onSave, onReset, saving }) {
  const [form, setForm] = useState({
    name: reforge?.name || '',
    description: reforge?.description || '',
    statBonuses: reforge?.statBonuses || '',
    rarity: reforge?.rarity || 'Common',
  });

  return (
    <section className="admin-editor card">
      <EditorTitle unit={{ name: form.name || 'New Reforge', rarity: form.rarity }} label="Editing Reforge" />

      <div className="admin-form-grid">
        <AdminInput label="Reforge Name" value={form.name} onChange={(v) => setForm(p => ({ ...p, name: v }))} />
        <AdminInput label="Rarity" value={form.rarity} onChange={(v) => setForm(p => ({ ...p, rarity: v }))} />
        <label className="admin-field full">
          <span>Description</span>
          <textarea className="admin-textarea" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
        </label>
        <label className="admin-field full">
          <span>Stat Bonuses (one per line, e.g. Damage: +10%)</span>
          <textarea className="admin-textarea admin-code-box" value={form.statBonuses} onChange={(e) => setForm(p => ({ ...p, statBonuses: e.target.value }))} />
        </label>
      </div>

      <div className="admin-actions">
        <button type="button" className="filled" onClick={() => onSave?.(form)} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Reforge'}
        </button>
        <button type="button" onClick={onReset}>🔄 Reset</button>
      </div>
    </section>
  );
}
