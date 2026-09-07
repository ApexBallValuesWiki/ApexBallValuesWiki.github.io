import { useState } from 'react';
import CreateUnitPage from './CreateUnitPage';
import CreateMapForm from './CreateMapForm';
import CreateSkinForm from './CreateSkinForm';
import CreateMaterialForm from './CreateMaterialForm';

// CREATE HUB — the main creation page for WIKI editors. Four creators in one
// place: Units, Maps, Skins, Materials. Everything created here is a REAL
// entity (no "custom" concept) and behaves exactly like the built-ins.

const TABS = [
  { id: 'unit', icon: '⚔️', label: 'Create Unit' },
  { id: 'map', icon: '🗺️', label: 'Create Map' },
  { id: 'skin', icon: '🎨', label: 'Create Skin' },
  { id: 'material', icon: '🧪', label: 'Create Material' },
];

const SUBTITLES = {
  unit: 'Adds a real unit — WIKI page, shiny variant, Values entry and search, exactly like the built-ins.',
  map: 'Adds a real map to /wiki/maps and the Maps editor.',
  skin: 'Adds a real skin to the skins pages (Normal or Shiny variant).',
  material: 'Adds a real material — its own separate system, never a unit and never a shiny variant.',
};

export default function CreateHub(props) {
  const [tab, setTab] = useState('unit');

  return (
    <section className="admin-editor card create-unit-page">
      <p className="admin-kicker">Creation</p>
      <h2>✨ Create</h2>
      <div className="admin-create-tabs" role="tablist" aria-label="Create options">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`admin-create-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <p className="admin-muted">{SUBTITLES[tab]}</p>
      {tab === 'unit' && <CreateUnitPage {...props} embedded />}
      {tab === 'map' && <CreateMapForm session={props.session} onCreate={props.onCreateMap} saving={props.saving} existingSlugs={props.mapSlugs} />}
      {tab === 'skin' && <CreateSkinForm session={props.session} onCreate={props.onCreateSkin} saving={props.saving} existingSlugs={props.skinSlugs} />}
      {tab === 'material' && <CreateMaterialForm session={props.session} onCreate={props.onCreateMaterial} saving={props.saving} existingSlugs={props.materialSlugs} />}
    </section>
  );
}
