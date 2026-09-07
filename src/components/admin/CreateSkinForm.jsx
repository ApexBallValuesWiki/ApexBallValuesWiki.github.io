import { useState } from 'react';
import { slugify } from '../../utils/slug';
import { uploadUnitImage } from '../../utils/adminImage';
import { compressImage } from '../../utils/adminSafety';
import { SKIN_CATEGORIES } from '../../data/taxonomy';
import Dropdown from '../Dropdown';

// Create a REAL skin — stored as a WIKI row with kind:'skin' so it shows on
// the skins pages without polluting unit lists.
export default function CreateSkinForm({ session, onCreate, saving, existingSlugs }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(SKIN_CATEGORIES[0] || 'Exclusive');
  const [shiny, setShiny] = useState(false);
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');

  const slug = (shiny ? 'shiny-' : '') + slugify(name.trim());
  const clash = slug ? existingSlugs?.has(slug) : false;

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!name.trim()) return setError('Type a skin name first.');
    if (clash) return setError(`A skin called "${name.trim()}" already exists.`);
    if (!session?.user?.id) return setError('Session expired. Please log in again.');
    let imageUrl = null;
    if (imageFile) imageUrl = await uploadUnitImage(await compressImage(imageFile), slug, session).catch(() => null);
    await onCreate({
      slug, name: name.trim(), kind: 'skin', category, shiny,
      description: description.trim(), image_url: imageUrl,
    });
    setName(''); setCategory(SKIN_CATEGORIES[0] || 'Exclusive'); setShiny(false); setDescription(''); setImageFile(null);
  }

  return (
    <form onSubmit={submit} className="admin-form-grid">
      {error && <div className="admin-message" role="alert">{error}</div>}
      <label className="admin-field">
        <span>Skin Name</span>
        <input className="admin-text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Doom Ball" required />
        {slug && <small className="admin-field-hint">Slug: {slug}{clash ? ' — ⚠️ already exists!' : ''}</small>}
      </label>
      <div className="admin-field">
        <span>Category</span>
        <Dropdown value={category} onChange={setCategory} options={SKIN_CATEGORIES.map((c) => ({ value: c, label: c }))} ariaLabel="Skin category" />
      </div>
      <label className="admin-field">
        <span>Variant</span>
        <Dropdown value={shiny ? 'shiny' : 'normal'} onChange={(v) => setShiny(v === 'shiny')} options={[{ value: 'normal', label: 'Normal' }, { value: 'shiny', label: 'Shiny' }]} ariaLabel="Skin variant" />
      </label>
      <label className="admin-field full">
        <span>Description</span>
        <textarea className="admin-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short skin description…" />
      </label>
      <label className="admin-field full admin-upload-button">
        🖼️ Skin Image (optional)
        <input type="file" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setImageFile(await compressImage(e.target.files[0])); }} />
      </label>
      <div className="admin-field full">
        <button type="submit" className="filled" disabled={saving}>🎨 Create Skin</button>
      </div>
    </form>
  );
}
