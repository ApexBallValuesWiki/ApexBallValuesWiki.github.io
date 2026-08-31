import { useState } from 'react';
import { AdminInput, AdminSelect, EditorTitle } from './AdminParts';

/**
 * SkinEditor — full skin editing with image uploads, rarity, category, crate assignment
 */
export default function SkinEditor({ skin, onSave, onReset, saving }) {
  const [form, setForm] = useState({
    name: skin?.name || '',
    rarity: skin?.rarity || 'Normie',
    category: skin?.category || 'Normie',
    crate: skin?.crate || '',
    description: skin?.description || '',
    imageUrl: skin?.imageUrl || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  function acceptImage(file) {
    if (file?.type?.startsWith('image/')) setImageFile(file);
  }

  return (
    <section className="admin-editor card">
      <EditorTitle unit={{ name: form.name || 'New Skin', rarity: form.rarity }} label="Editing Skin" dirty={!!imageFile} />

      <div className={`admin-upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); acceptImage(e.dataTransfer.files?.[0]); }}>
        {(imageFile ? URL.createObjectURL(imageFile) : form.imageUrl) ? (
          <img src={imageFile ? URL.createObjectURL(imageFile) : form.imageUrl} alt="Skin preview" className="admin-image-preview" />
        ) : (
          <strong>Drop skin artwork here</strong>
        )}
        <label className="admin-upload-button">📸 Upload Skin<input type="file" accept="image/*" onChange={(e) => acceptImage(e.target.files?.[0])} /></label>
      </div>

      <div className="admin-form-grid">
        <AdminInput label="Skin Name" value={form.name} onChange={(v) => setForm(p => ({ ...p, name: v }))} />
        <AdminSelect label="Rarity" value={form.rarity} onChange={(v) => setForm(p => ({ ...p, rarity: v }))}
          options={['Normie', 'Odd', 'Rare', 'Awesome', 'Legendary', 'Mythic', 'Deluxe', '???']} />
        <AdminSelect label="Category" value={form.category} onChange={(v) => setForm(p => ({ ...p, category: v }))}
          options={['Normie', 'Odd', 'Rare', 'Awesome', 'Legendary', 'Mythic', 'Deluxe', '???']} />
        <AdminInput label="Crate Assignment" value={form.crate} onChange={(v) => setForm(p => ({ ...p, crate: v }))} />
        <label className="admin-field full">
          <span>Description</span>
          <textarea className="admin-textarea" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
        </label>
      </div>

      <div className="admin-actions">
        <button type="button" className="filled" onClick={() => onSave?.(form, imageFile)} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Skin'}
        </button>
        <button type="button" onClick={onReset}>🔄 Reset</button>
      </div>
    </section>
  );
}
