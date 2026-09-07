import { useState } from 'react';
import { slugify } from '../../utils/slug';
import { uploadUnitImage } from '../../utils/adminImage';
import { compressImage } from '../../utils/adminSafety';

// Create a REAL material — stored as a WIKI row with kind:'material' so it
// shows on the Materials pages without polluting unit lists.
export default function CreateMaterialForm({ session, onCreate, saving, existingSlugs }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [effect, setEffect] = useState('');
  const [obtainText, setObtainText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');

  const slug = slugify(name.trim());
  const clash = slug ? existingSlugs?.has(slug) : false;

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!name.trim()) return setError('Type a material name first.');
    if (clash) return setError(`A material called "${name.trim()}" already exists.`);
    if (!session?.user?.id) return setError('Session expired. Please log in again.');
    let imageUrl = null;
    if (imageFile) imageUrl = await uploadUnitImage(await compressImage(imageFile), slug, session).catch(() => null);
    await onCreate({
      slug, name: name.trim(), kind: 'material',
      description: description.trim(), effect: effect.trim(),
      obtain: obtainText.split('\n').map((l) => l.trim()).filter(Boolean),
      image_url: imageUrl,
    });
    setName(''); setDescription(''); setEffect(''); setObtainText(''); setImageFile(null);
  }

  return (
    <form onSubmit={submit} className="admin-form-grid">
      {error && <div className="admin-message" role="alert">{error}</div>}
      <label className="admin-field">
        <span>Material Name</span>
        <input className="admin-text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frost Shard" required />
        {slug && <small className="admin-field-hint">Slug: {slug}{clash ? ' — ⚠️ already exists!' : ''}</small>}
      </label>
      <label className="admin-field full">
        <span>Description</span>
        <textarea className="admin-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this material?" />
      </label>
      <label className="admin-field full">
        <span>Effect</span>
        <input className="admin-text-input" value={effect} onChange={(e) => setEffect(e.target.value)} placeholder="e.g. Unlocks the Frost Key door" />
      </label>
      <label className="admin-field full">
        <span>How to obtain (one per line)</span>
        <textarea className="admin-textarea" rows={2} value={obtainText} onChange={(e) => setObtainText(e.target.value)} placeholder={'e.g. Frozen Crate\nWave 40 rewards'} />
      </label>
      <label className="admin-field full admin-upload-button">
        🖼️ Material Image (optional)
        <input type="file" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setImageFile(await compressImage(e.target.files[0])); }} />
      </label>
      <div className="admin-field full">
        <button type="submit" className="filled" disabled={saving}>🧪 Create Material</button>
      </div>
    </form>
  );
}
