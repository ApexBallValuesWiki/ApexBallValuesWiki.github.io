import { useState } from 'react';
import { slugify } from '../../utils/slug';
import { uploadContentImage } from '../../utils/adminImage';
import { compressImage } from '../../utils/adminSafety';

// Create a REAL map — appears on /wiki/maps and the Maps editor like built-ins.
export default function CreateMapForm({ session, onCreate, saving, existingSlugs }) {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('Normal');
  const [description, setDescription] = useState('');
  const [unlock, setUnlock] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');

  const slug = slugify(name.trim());
  const clash = slug ? existingSlugs?.has(slug) : false;

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!name.trim()) return setError('Type a map name first.');
    if (clash) return setError(`A map called "${name.trim()}" already exists.`);
    if (!session?.user?.id) return setError('Session expired. Please log in again.');
    let imageUrl = null;
    if (imageFile) imageUrl = await uploadContentImage(await compressImage(imageFile), slug, session).catch(() => null);
    await onCreate({
      slug, name: name.trim(), description: description.trim(), difficulty,
      unlock_requirement: unlock.trim(), image_url: imageUrl,
    });
    setName(''); setDifficulty('Normal'); setDescription(''); setUnlock(''); setImageFile(null);
  }

  return (
    <form onSubmit={submit} className="admin-form-grid">
      {error && <div className="admin-message" role="alert">{error}</div>}
      <label className="admin-field">
        <span>Map Name</span>
        <input className="admin-text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frozen Wasteland" required />
        {slug && <small className="admin-field-hint">Page slug: {slug}{clash ? ' — ⚠️ already exists!' : ''}</small>}
      </label>
      <label className="admin-field">
        <span>Difficulty</span>
        <input className="admin-text-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="e.g. Insane" />
      </label>
      <label className="admin-field full">
        <span>Description</span>
        <textarea className="admin-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short map description…" />
      </label>
      <label className="admin-field full">
        <span>Unlock Requirement</span>
        <input className="admin-text-input" value={unlock} onChange={(e) => setUnlock(e.target.value)} placeholder="e.g. Beat Wave 30 on Hard" />
      </label>
      <label className="admin-field full admin-upload-button">
        🖼️ Map Image (optional)
        <input type="file" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setImageFile(await compressImage(e.target.files[0])); }} />
      </label>
      <div className="admin-field full">
        <button type="submit" className="filled" disabled={saving}>🗺️ Create Map</button>
      </div>
    </form>
  );
}
