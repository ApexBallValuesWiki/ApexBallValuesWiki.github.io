import { useState } from 'react';
import { UNIT_RARITIES } from '../../data/taxonomy';
import { slugify } from '../../utils/slug';
import { uploadUnitImage } from '../../utils/adminImage';
import { compressImage } from '../../utils/adminSafety';
import Dropdown from '../Dropdown';

// CREATE UNIT — a dedicated admin page for WIKI editors to add REAL units to
// the site. This is not a "custom unit" concept: a created unit behaves
// exactly like a built-in one (wiki page, shiny variant, values entry,
// search, tier lists). After creation you land in the WIKI editor to fill
// in the full stat sheet.

const BASE_RARITIES = UNIT_RARITIES.filter((r) => !r.startsWith('Shiny'));
const TYPES = ['DPS', 'Support', 'Economy', 'Buff', 'Summoner'];
const CATEGORIES = ['Standard', 'Event', 'Limited', 'Unobtainable'];

const toOptions = (list) => list.map((value) => ({ value, label: value }));

export default function CreateUnitPage({ session, onCreate, saving, existingSlugs, embedded = false }) {
  const [name, setName] = useState('');
  const [rarity, setRarity] = useState(BASE_RARITIES[0] || 'Normie');
  const [type, setType] = useState('DPS');
  const [category, setCategory] = useState('Standard');
  const [description, setDescription] = useState('');
  const [obtainText, setObtainText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const slug = slugify(name.trim());
  const slugClash = slug ? existingSlugs?.has(slug) : false;

  async function handleImage(file) {
    if (!file?.type?.startsWith('image/')) return;
    setError('');
    try {
      setImageFile(await compressImage(file));
    } catch {
      setImageFile(file);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Type a unit name first.');
      return;
    }
    if (!slug) {
      setError('That name cannot be turned into a valid page slug.');
      return;
    }
    if (slugClash) {
      setError(`A unit called "${cleanName}" already exists — edit it in the WIKI editor instead.`);
      return;
    }
    if (!session?.user?.id) {
      setError('Session expired. Please log in again.');
      return;
    }
    setBusy(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadUnitImage(imageFile, slug, session);
      }
      const payload = {
        slug,
        name: cleanName,
        rarity,
        type,
        raw_type: type,
        category,
        description: description.trim(),
        obtain: obtainText.split('\n').map((line) => line.trim()).filter(Boolean),
        image_url: imageUrl,
        placement_limit: null,
        total_cost: null,
        passive: null,
        ability: null,
        synergy: null,
        min_max_stats: {},
        upgrades: [],
        updated_at: new Date().toISOString(),
        updated_by: session.user.email,
      };
      await onCreate(payload);
      setName(''); setRarity(BASE_RARITIES[0] || 'Normie'); setType('DPS');
      setDescription(''); setObtainText(''); setImageFile(null);
    } catch (e) {
      setError(`Could not create the unit: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  const working = busy || saving;

  if (embedded) {
    return (
      <div>
        {error && <div className="admin-message" role="alert">{error}</div>}
        <UnitFormFields name={name} setName={setName} rarity={rarity} setRarity={setRarity} type={type} setType={setType} category={category} setCategory={setCategory} description={description} setDescription={setDescription} obtainText={obtainText} setObtainText={setObtainText} imageFile={imageFile} handleImage={handleImage} working={working} submit={submit} slug={slug} slugClash={slugClash} />
      </div>
    );
  }

  return (
    <section className="admin-editor card create-unit-page">
      <p className="admin-kicker">New unit</p>
      <h2>✨ Create a Unit</h2>
      <p className="admin-muted">
        Adds a real unit to the site — it gets its own WIKI page, a shiny variant, a Values entry and
        shows up in search, exactly like the built-in units. After creating it, you land in the WIKI
        editor to fill in its stat sheet.
      </p>
      {error && <div className="admin-message" role="alert">{error}</div>}
      <UnitFormFields name={name} setName={setName} rarity={rarity} setRarity={setRarity} type={type} setType={setType} category={category} setCategory={setCategory} description={description} setDescription={setDescription} obtainText={obtainText} setObtainText={setObtainText} imageFile={imageFile} handleImage={handleImage} working={working} submit={submit} slug={slug} slugClash={slugClash} />
    </section>
  );
}

function UnitFormFields({ name, setName, rarity, setRarity, type, setType, category, setCategory, description, setDescription, obtainText, setObtainText, imageFile, handleImage, working, submit, slug, slugClash }) {
  return (
    <form onSubmit={submit} className="admin-form-grid">
      <label className="admin-field">
        <span>Ball Name</span>
        <input className="admin-text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ball" required />
        {slug && <small className="admin-field-hint">Page: /wiki/units/{rarity}/{slug}{slugClash ? ' — ⚠️ already exists!' : ''}</small>}
      </label>
      <div className="admin-field">
        <span>Rarity</span>
        <Dropdown value={rarity} onChange={setRarity} options={toOptions(BASE_RARITIES)} ariaLabel="Rarity" />
      </div>
      <div className="admin-field">
        <span>Type</span>
        <Dropdown value={type} onChange={setType} options={toOptions(TYPES)} ariaLabel="Unit type" />
      </div>
      <div className="admin-field">
        <span>Category</span>
        <Dropdown value={category} onChange={setCategory} options={toOptions(CATEGORIES)} ariaLabel="Category" />
      </div>
      <label className="admin-field full">
        <span>Description</span>
        <textarea className="admin-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Short flavor text shown on the unit page…" />
      </label>
      <label className="admin-field full">
        <span>How to obtain (one per line)</span>
        <textarea className="admin-textarea" value={obtainText} onChange={(e) => setObtainText(e.target.value)} rows={2} placeholder={'e.g. Royal Crate\nEvent reward'} />
      </label>
      <div className="admin-field full">
        <label className="admin-upload-button">
          🖼️ Unit Image (optional)
          <input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0])} />
        </label>
        {imageFile && <small className="admin-field-hint">{imageFile.name} ready — auto-compressed before upload.</small>}
      </div>
      <div className="admin-field full">
        <button type="submit" className="filled" disabled={working}>
          {working ? 'Creating…' : '✨ Create Unit'}
        </button>
      </div>
    </form>
  );
}
