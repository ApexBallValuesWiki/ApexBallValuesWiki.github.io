import { useState } from 'react';
import CreateUnitPage from './CreateUnitPage';
import CreateMapForm from './CreateMapForm';
import CreateSkinForm from './CreateSkinForm';
import CreateMaterialForm from './CreateMaterialForm';
import { AdminSubTabs } from './AdminShellNav';
import { CREATE_TABS } from './adminNav';

// ============================================================================
// CREATE HUB — the main creation page for WIKI editors. Four creators in one
// place: Units, Maps, Skins, Materials. Everything created here is a REAL
// entity (no "custom" concept) and behaves exactly like the built-ins.
//
// The active tab is controlled by the panel's URL (?view=create&tab=map) when
// `tab`/`onTabChange` are supplied, so refreshing or sharing a link keeps you
// on the same creator. Without those props it falls back to local state.
// ============================================================================


const SUBTITLES = {
  unit: 'Adds a real unit — WIKI page, shiny variant, Values entry and search, exactly like the built-ins.',
  map: 'Adds a real map to /wiki/maps and the Maps editor.',
  skin: 'Adds a real skin to the skins pages (Normal or Shiny variant).',
  material: 'Adds a real material — its own separate system, never a unit and never a shiny variant.',
};

export default function CreateHub({ tab: controlledTab, onTabChange, ...props }) {
  const [ownTab, setOwnTab] = useState('unit');
  const tab = controlledTab || ownTab;
  const setTab = onTabChange || setOwnTab;

  return (
    <section className="admin-editor card create-unit-page">
      <p className="admin-kicker">Creation</p>
      <h2>✨ Create</h2>
      <AdminSubTabs tabs={CREATE_TABS} active={tab} onSelect={setTab} label="Create options" />
      <p className="admin-muted">{SUBTITLES[tab]}</p>
      {tab === 'unit' && <CreateUnitPage {...props} embedded />}
      {tab === 'map' && <CreateMapForm session={props.session} onCreate={props.onCreateMap} saving={props.saving} existingSlugs={props.mapSlugs} />}
      {tab === 'skin' && <CreateSkinForm session={props.session} onCreate={props.onCreateSkin} saving={props.saving} existingSlugs={props.skinSlugs} />}
      {tab === 'material' && <CreateMaterialForm session={props.session} onCreate={props.onCreateMaterial} saving={props.saving} existingSlugs={props.materialSlugs} />}
    </section>
  );
}
