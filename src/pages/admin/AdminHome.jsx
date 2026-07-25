import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ALL_UNITS } from '../../data/units';
import staticOverridesJson from '../../data/overrides/staticOverrides.json';
import { ALL_MAPS } from '../../data/maps';
import { CRATES } from '../../data/items';
import { useData } from '../../context/DataContext';
import { useWikiImageOverrides } from '../../hooks/useWikiImageOverrides';
import { UNIT_RARITIES } from '../../data/taxonomy';
import { computeTradeValue } from '../../utils/calculator';
import { slugify } from '../../utils/slug';
import { supabase, SUPABASE_URL } from '../../utils/supabase';
import { removeCachedWikiImage, saveCachedWikiImage, loadCachedWikiImages } from '../../utils/wikiImageCache';
import {
  canEditValue,
  canEditWiki,
  errorMessage,
  formToUpgrade,
  getFallbackValueData,
  linesToObject,
  normalizeValueForm,
  valueRowToForm,
  wikiRowToForm,
} from '../../utils/adminForms';
import { uploadUnitImage, uploadContentImage, removeUnitImages } from '../../utils/adminImage';
import {
  setLocalValueOverride,
  setLocalWikiOverride,
  loadLocalValueOverrides,
  loadLocalWikiOverrides,
  loadLocalMapOverrides,
  setLocalMapOverride,
  loadLocalCrateOverrides,
  setLocalCrateOverride,
  loadLocalDeletedOverrides,
  markLocalOverrideDeleted,
  clearLocalDeletedOverrides
} from '../../utils/localOverrides';
import { getDisplayName, TEAM_MEMBERS } from '../../utils/teamMembers';
import Dropdown from '../../components/Dropdown';
import { AdminLog, AuthPanel, ContentEditor, UnitPicker, ValueEditor, WikiEditor } from '../../components/admin/AdminParts';
import CreateUnitPanel from '../../components/admin/CreateUnitPanel';
import ContributionGraph from '../../components/admin/ContributionGraph';
import BugReportAdmin from '../../components/bugs/BugReportAdmin';
import './AdminHome.css';

const NEW_UNIT_RARITY_GROUPS = [
  { label: 'Base Rarities', options: UNIT_RARITIES.filter((r) => !r.startsWith('Shiny')).map((r) => ({ value: r, label: r })) },
  { label: 'Shiny Rarities', options: UNIT_RARITIES.filter((r) => r.startsWith('Shiny')).map((r) => ({ value: r, label: r })) },
];

export default function AdminHome() {
  const location = useLocation();
  const navigate = useNavigate();
  const resetMode = location.pathname.endsWith('/reset-password');
  const { customUnits, refresh, refreshWiki, refreshContent, wikiRows: liveWikiRows = [] } = useData();
  const generatedUnits = useMemo(() => {
    return ALL_UNITS.filter((unit) => {
      const isUnob = unit.category === 'Unobtainable' || unit.categories?.includes('Unobtainable');
      return (unit.documented && !unit.unavailableData) || isUnob;
    });
  }, []);

  const [session, setSession] = useState(null);
  const [testerRealm, setTesterRealm] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  const [query, setQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [previewMode, setPreviewMode] = useState(true);
  const [valueRows, setValueRows] = useState([]);
  const [valueLog, setValueLog] = useState([]);
  const [wikiRows, setWikiRows] = useState([]);
  const [mapRows, setMapRows] = useState([]);
  const [crateRows, setCrateRows] = useState([]);
  const [wikiLog, setWikiLog] = useState([]);
  const [dataVersion, setDataVersion] = useState(0);
  const units = useMemo(() => [...generatedUnits, ...customUnits], [generatedUnits, customUnits]);
  const allSlugs = useMemo(() => units.map((u) => u.slug), [units]);
  const { imageMap } = useWikiImageOverrides(allSlugs);

  // Robustly build the admin image map merging all sources
  const adminImageMap = useMemo(() => {
    const map = {};
    
    // 1. Cached image overrides (lowest priority)
    try {
      const cache = loadCachedWikiImages() || {};
      Object.entries(cache).forEach(([slug, url]) => {
        if (url) map[slug] = url;
      });
    } catch (e) {
      console.warn('Failed to load cached wiki images in adminImageMap', e);
    }

    // 2. Global context live rows (from useData().wikiRows)
    (Array.isArray(liveWikiRows) ? liveWikiRows : []).forEach((row) => {
      if (row?.slug && (row.image_url || row.imageUrl)) {
        map[row.slug] = row.image_url || row.imageUrl;
      }
    });

    // 3. Local admin fetched rows (from AdminHome state wikiRows)
    (Array.isArray(wikiRows) ? wikiRows : []).forEach((row) => {
      if (row?.slug && (row.image_url || row.imageUrl)) {
        map[row.slug] = row.image_url || row.imageUrl;
      }
    });

    // 4. Local draft overrides (client PRVW - highest priority)
    try {
      const localWiki = loadLocalWikiOverrides() || {};
      Object.entries(localWiki).forEach(([slug, row]) => {
        if (row && (row.image_url || row.imageUrl)) {
          map[slug] = row.image_url || row.imageUrl;
        }
      });
    } catch (e) {
      console.warn('Failed to load local wiki overrides in adminImageMap', e);
    }

    return map;
  }, [liveWikiRows, wikiRows, dataVersion]);

  const unitsWithImages = useMemo(
    () => units.map((u) => ({ ...u, imageUrl: adminImageMap[u.slug] || imageMap[u.slug] || u.imageUrl || u.image_url || null })),
    [units, adminImageMap, imageMap]
  );
  const [selectedSlug, setSelectedSlug] = useState(generatedUnits[0]?.slug || '');
  const [activeTool, setActiveTool] = useState('values');
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitRarity, setNewUnitRarity] = useState('Normie');
  const [contentSlug, setContentSlug] = useState(ALL_MAPS[0]?.slug || CRATES[0]?.slug || '');
  const [contentForm, setContentForm] = useState({});
  const [contentImageFile, setContentImageFile] = useState(null);
  const [showCreateUnit, setShowCreateUnit] = useState(false);

  const selectedUnit = unitsWithImages.find((unit) => unit.slug === selectedSlug) || unitsWithImages[0];
  const selectedValueRow = useMemo(() => {
    const dbRow = valueRows.find((row) => row.slug === selectedUnit?.slug);
    if (!previewMode || !selectedUnit) return dbRow || null;
    const localOver = loadLocalValueOverrides()[selectedUnit.slug];
    return localOver ? { ...(dbRow || {}), ...localOver, slug: selectedUnit.slug } : (dbRow || null);
  }, [valueRows, selectedUnit, previewMode, dataVersion]);

  const selectedWikiRow = useMemo(() => {
    const dbRow = wikiRows.find((row) => row.slug === selectedUnit?.slug);
    if (!previewMode || !selectedUnit) return dbRow || null;
    const localOver = loadLocalWikiOverrides()[selectedUnit.slug];
    return localOver ? { ...(dbRow || {}), ...localOver, slug: selectedUnit.slug } : (dbRow || null);
  }, [wikiRows, selectedUnit, previewMode, dataVersion]);

  const contentItems = activeTool === 'maps' ? ALL_MAPS : CRATES;
  const selectedContentItem = contentItems.find((item) => item.slug === contentSlug) || contentItems[0];
  const selectedContentRow = (activeTool === 'maps' ? mapRows : crateRows).find((row) => row.slug === selectedContentItem?.slug);

  const [valueForm, setValueForm] = useState(() => valueRowToForm(null, generatedUnits[0]?.slug));
  const [wikiForm, setWikiForm] = useState(() => wikiRowToForm(null, generatedUnits[0]));
  const [wikiImageFile, setWikiImageFile] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const valueDirty = JSON.stringify(valueForm) !== JSON.stringify(valueRowToForm(selectedValueRow, selectedUnit?.slug));
  const wikiDirty = JSON.stringify(wikiForm) !== JSON.stringify(wikiRowToForm(selectedWikiRow, selectedUnit)) || !!wikiImageFile;

  useEffect(() => {
    const dirty = valueDirty || wikiDirty;
    function warn(event) { if (dirty) { event.preventDefault(); event.returnValue = ''; } }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [valueDirty, wikiDirty]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('apex-admin-email-v1');
    const savedPasscode = localStorage.getItem('apex-admin-passcode-v1');
    if (savedEmail && savedPasscode) {
      const cleanEmail = savedEmail.trim().toLowerCase();
      const member = TEAM_MEMBERS[cleanEmail];
      if (member) {
        setSession({
          user: {
            id: cleanEmail,
            email: cleanEmail,
          }
        });
        setAdminUser({
          email: cleanEmail,
          role: member.roleKey,
        });
      }
    }
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    if (!session?.user?.email) {
      setAdminUser(null);
      return;
    }
    setAdminLoading(true);
    const cleanEmail = session.user.email.toLowerCase();
    const member = TEAM_MEMBERS[cleanEmail];
    if (member) {
      setAdminUser({
        email: cleanEmail,
        role: member.roleKey,
      });
    } else {
      setAdminUser(null);
    }
    setAdminLoading(false);
  }, [session]);

  const role = adminUser?.role || null;
  const valueAllowed = canEditValue(role);
  const wikiAllowed = canEditWiki(role);
  const anyAllowed = valueAllowed || wikiAllowed;

  useEffect(() => {
    if (valueAllowed) setActiveTool('values');
    else if (wikiAllowed) setActiveTool('wiki');
  }, [valueAllowed, wikiAllowed]);

  async function refreshAdminData({ logsOnly = false } = {}) {
    setDataVersion((v) => v + 1);

    const localValues = loadLocalValueOverrides() || {};
    const localWiki = loadLocalWikiOverrides() || {};
    const localMaps = loadLocalMapOverrides() || {};
    const localCrates = loadLocalCrateOverrides() || {};

    // Pull the LIVE Cloudflare KV database bundle first so the panel always
    // reflects what players see (including other admins' edits). The local
    // sandbox drafts are layered LAST, so a local PRVW draft always wins.
    let kvData = null;
    try {
      const res = await fetch(`${SUPABASE_URL}/overrides`).catch(() => null);
      if (res && res.ok) kvData = await res.json();
    } catch {
      kvData = null; // Worker offline → fall back to static + local layers only
    }

    // Tolerant row builders: accept both camelCase bundle entries
    // (`baseValue`, `unlockRequirement`, `imageUrl`) and snake_case DB row
    // entries (`base_value`, `unlock_requirement`, `image_url`), and NEVER
    // drop fields like trend/notes/updated_at (dropping them made forms
    // revert to fallback data after a refresh).
    const buildValueRow = (slug, val = {}) => ({
      slug,
      base_value: val.baseValue ?? val.base_value,
      base_value_max: val.baseValueMax ?? val.base_value_max ?? null,
      demand: val.demand,
      scarcity: val.scarcity,
      trend: val.trend,
      notes: val.notes,
      gems: val.gems,
      coins: val.coins,
      updated_at: val.updated_at,
      updated_by: val.updated_by,
    });

    const buildWikiRow = (slug, wiki = {}) => ({
      slug,
      name: wiki.name,
      rarity: wiki.rarity,
      image_url: wiki.image_url ?? wiki.imageUrl,
      description: wiki.description,
      type: wiki.type,
      raw_type: wiki.raw_type ?? wiki.rawType,
      category: wiki.category,
      placement_limit: wiki.placement_limit ?? wiki.placementLimit,
      total_cost: wiki.total_cost ?? wiki.totalCost,
      custom_unit: wiki.custom_unit ?? wiki.customUnit,
      early_game_rank: wiki.early_game_rank ?? wiki.earlyGameRank,
      late_game_rank: wiki.late_game_rank ?? wiki.lateGameRank,
      obtain: wiki.obtain,
      passive: wiki.passive,
      ability: wiki.ability,
      synergy: wiki.synergy,
      min_max_stats: wiki.min_max_stats ?? wiki.minMaxStats,
      upgrades: wiki.upgrades,
      updated_at: wiki.updated_at,
      updated_by: wiki.updated_by,
    });

    const buildMapRow = (slug, map = {}) => ({
      slug,
      name: map.name,
      description: map.description,
      difficulty: map.difficulty,
      unlock_requirement: map.unlock_requirement ?? map.unlockRequirement,
      image_url: map.image_url ?? map.imageUrl,
      updated_at: map.updated_at,
      updated_by: map.updated_by,
    });

    const buildCrateRow = (slug, crate = {}) => ({
      slug,
      name: crate.name,
      description: crate.description,
      image_url: crate.image_url ?? crate.imageUrl,
      chances: crate.chances,
      obtain: crate.obtain,
      effect: crate.effect,
      updated_at: crate.updated_at,
      updated_by: crate.updated_by,
    });

    // Merge priority (lowest → highest): bundled static JSON → live Cloudflare
    // KV database → local sandbox (PRVW) drafts.
    const valueMap = {};
    [staticOverridesJson?.valueOverrides, kvData?.valueOverrides, localValues].forEach((src) => {
      Object.entries(src || {}).forEach(([slug, val]) => {
        valueMap[slug] = buildValueRow(slug, val);
      });
    });

    const wikiMap = {};
    [staticOverridesJson?.wikiOverrides, kvData?.wikiOverrides, localWiki].forEach((src) => {
      Object.entries(src || {}).forEach(([slug, wiki]) => {
        wikiMap[slug] = buildWikiRow(slug, wiki);
      });
    });

    const mapMap = {};
    [staticOverridesJson?.mapOverrides, kvData?.mapOverrides, localMaps].forEach((src) => {
      Object.entries(src || {}).forEach(([slug, map]) => {
        mapMap[slug] = buildMapRow(slug, map);
      });
    });

    const crateMap = {};
    [staticOverridesJson?.crateOverrides, kvData?.crateOverrides, localCrates].forEach((src) => {
      Object.entries(src || {}).forEach(([slug, crate]) => {
        crateMap[slug] = buildCrateRow(slug, crate);
      });
    });

    setValueRows(Object.values(valueMap));
    setWikiRows(Object.values(wikiMap));
    setMapRows(Object.values(mapMap));
    setCrateRows(Object.values(crateMap));

    if (canConnectSupabase()) {
      try {
        const [valLogs, wikiLogs] = await Promise.all([
          supabase.from('value_change_log_public').select('*').order('changed_at', { ascending: false }).limit(100),
          supabase.from('wiki_change_log_public').select('*').order('changed_at', { ascending: false }).limit(100),
        ]);
        if (!valLogs.error && Array.isArray(valLogs.data)) {
          setValueLog(valLogs.data);
        }
        if (!wikiLogs.error && Array.isArray(wikiLogs.data)) {
          setWikiLog(wikiLogs.data);
        }
      } catch (e) {
        console.warn('Failed to load change logs:', e);
      }
    }
    return;
  }

  async function fetchBakedBackupBundle() {
    try {
      const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/overrides/staticOverrides.json`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error('[APEX] Failed to fetch baked backup bundle:', e);
    }
    return null;
  }

  async function buildFullPublishBundle() {
    let kvData = null;
    try {
      const res = await fetch(`${SUPABASE_URL}/overrides?_=${Date.now()}`).catch(() => null);
      if (res && res.ok) {
        kvData = await res.json();
      }
    } catch (e) {
      console.warn('[APEX] Failed to fetch current KV bundle:', e);
    }

    const bakedData = await fetchBakedBackupBundle() || {};
    const localValues = loadLocalValueOverrides() || {};
    const localWiki = loadLocalWikiOverrides() || {};
    const localMaps = loadLocalMapOverrides() || {};
    const localCrates = loadLocalCrateOverrides() || {};

    const deleted = loadLocalDeletedOverrides() || { value: [], wiki: [], map: [], crate: [] };

    const sections = [
      { key: 'valueOverrides', baked: bakedData.valueOverrides, kv: kvData?.valueOverrides, local: localValues, deletedKey: 'value' },
      { key: 'wikiOverrides', baked: bakedData.wikiOverrides, kv: kvData?.wikiOverrides, local: localWiki, deletedKey: 'wiki' },
      { key: 'mapOverrides', baked: bakedData.mapOverrides, kv: kvData?.mapOverrides, local: localMaps, deletedKey: 'map' },
      { key: 'crateOverrides', baked: bakedData.crateOverrides, kv: kvData?.crateOverrides, local: localCrates, deletedKey: 'crate' },
    ];

    const result = {
      timestamp: new Date().toISOString(),
    };

    for (const { key, baked, kv, local, deletedKey } of sections) {
      const merged = {
        ...(baked || {}),
        ...(kv || {}),
        ...(local || {}),
      };

      const deletedSlugs = deleted[deletedKey] || [];
      for (const slug of deletedSlugs) {
        if (!local || !(slug in local)) {
          delete merged[slug];
        }
      }

      result[key] = merged;
    }

    return result;
  }

  async function pushBundleToCloudflareKV(bundle, isRestore = false) {
    try {
      const savedEmail = localStorage.getItem('apex-admin-email-v1') || '';
      const savedPasscode = localStorage.getItem('apex-admin-passcode-v1') || '';

      const response = await fetch(`${SUPABASE_URL}/overrides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': savedEmail,
          'X-Admin-Passcode': savedPasscode,
        },
        body: JSON.stringify(bundle),
      });

      if (response.status === 401) {
        setMessage('⚠️ Saved locally, but cloud publish failed: Your saved login/passcode is invalid.');
        return false;
      }

      if (response.ok) {
        if (isRestore) {
          setMessage('✅ FULL DATABASE RESTORED!');
        } else {
          setMessage('✓ Saved & Published live to Cloudflare KV database! Updates are active for all players instantly.');
        }
        return true;
      } else {
        const errData = await response.json().catch(() => ({}));
        setMessage(`⚠️ Saved locally, but cloud publish failed: ${errData.error || 'Server error'}`);
        return false;
      }
    } catch (e) {
      setMessage(`⚠️ Saved locally, but could not connect to Cloudflare KV database: ${e.message}`);
      return false;
    }
  }

  async function pushToCloudflareKV() {
    setSaving(true);
    try {
      const bundle = await buildFullPublishBundle();
      const success = await pushBundleToCloudflareKV(bundle, false);
      if (success) {
        clearLocalDeletedOverrides();
      }
    } catch (e) {
      setMessage(`⚠️ Failed to build publish bundle: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }



  function isContentFormDirty(form, row, item, kind) {
    if (!item) return false;
    const isMap = kind === 'maps';

    // Compare the camelCase FORM fields against the snake_case DATABASE ROW
    // fields safely: both sides are normalized to strings, and the "original"
    // side uses the exact same fallback chain the form-init effect uses, so a
    // just-saved payload always evaluates to dirty === false.
    const str = (v) => (v === null || v === undefined ? '' : String(v));

    const currentName = str(form.name);
    const currentDesc = str(form.description);
    const currentImage = str(form.imageUrl);

    const originalName = str(row?.name || item.name);
    const originalDesc = str(row?.description);
    const originalImage = str(row?.image_url || row?.imageUrl || (isMap ? item.image : item.imageUrl));

    if (isMap) {
      const currentDiff = str(form.difficulty);
      const currentUnlock = str(form.unlockRequirement);

      const originalDiff = str(row?.difficulty);
      const originalUnlock = str(row?.unlock_requirement || item.unlockRequirement);

      return currentName !== originalName ||
             currentDesc !== originalDesc ||
             currentImage !== originalImage ||
             currentDiff !== originalDiff ||
             currentUnlock !== originalUnlock;
    }

    const currentObtain = str(form.obtain);
    const currentEffect = str(form.effect);
    const currentChances = JSON.stringify(form.chances || {});

    const originalObtain = str(row?.obtain);
    const originalEffect = str(row?.effect);
    const originalChances = JSON.stringify(row?.chances || {});

    return currentName !== originalName ||
           currentDesc !== originalDesc ||
           currentImage !== originalImage ||
           currentObtain !== originalObtain ||
           currentEffect !== originalEffect ||
           currentChances !== originalChances;
  }

  useEffect(() => {
    if (anyAllowed) refreshAdminData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyAllowed]);

  useEffect(() => {
    setValueForm(valueRowToForm(selectedValueRow, selectedUnit?.slug));
    setWikiForm(wikiRowToForm(selectedWikiRow, selectedUnit));
    setWikiImageFile(null);
  }, [selectedUnit?.slug, previewMode]);

  useEffect(() => {
    if (!valueDirty) setValueForm(valueRowToForm(selectedValueRow, selectedUnit?.slug));
    if (!wikiDirty && !wikiImageFile) setWikiForm(wikiRowToForm(selectedWikiRow, selectedUnit));
  }, [dataVersion]);

  useEffect(() => {
    if (!selectedContentItem) return;
    setContentForm(activeTool === 'maps' ? { name: selectedContentRow?.name || selectedContentItem.name, description: selectedContentRow?.description || '', difficulty: selectedContentRow?.difficulty || '', unlockRequirement: selectedContentRow?.unlock_requirement || selectedContentItem.unlockRequirement || '', imageUrl: selectedContentRow?.image_url || selectedContentItem.image || '' } : { name: selectedContentRow?.name || selectedContentItem.name, description: selectedContentRow?.description || '', chances: selectedContentRow?.chances || {}, obtain: selectedContentRow?.obtain || '', effect: selectedContentRow?.effect || '', imageUrl: selectedContentRow?.image_url || selectedContentItem.imageUrl || '' });
    setContentImageFile(null);
  }, [activeTool, selectedContentItem, selectedContentRow]);

  const filteredUnits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = unitsWithImages.filter((unit) => {
      const matchesText = !q || unit.name.toLowerCase().includes(q) || unit.slug.includes(q) || unit.rarity?.toLowerCase().includes(q) || unit.type?.toLowerCase().includes(q);
      const matchesFilter = unitFilter === 'all' || (unitFilter === 'live' ? (activeTool === 'values' ? valueRows : wikiRows).some((row) => row.slug === unit.slug) : unitFilter === 'custom' ? unit.customUnit : unit.rarity === unitFilter);
      return matchesText && matchesFilter;
    });
    const custom = filtered.filter((u) => u.customUnit);
    const regular = filtered.filter((u) => !u.customUnit).slice(0, Math.max(20, 1000 - custom.length));
    return [...custom, ...regular];
  }, [query, unitsWithImages, unitFilter, activeTool, valueRows, wikiRows]);

  const tradeValue = computeTradeValue(valueForm.baseValue, valueForm.demand, valueForm.scarcity);

  function selectUnit(unitOrSlug) {
    if (!unitOrSlug) return;
    const targetSlug = typeof unitOrSlug === 'string' ? unitOrSlug : unitOrSlug.slug;
    if (targetSlug) {
      setSelectedSlug(targetSlug);
      setMessage('');
    }
  }
  function updateValueField(key, value) {
    setValueForm((prev) => ({ ...prev, [key]: value }));
  }
  function updateWikiField(key, value) {
    setWikiForm((prev) => ({ ...prev, [key]: value }));
  }

  async function createCustomUnit(event) {
    event.preventDefault();
    if (!wikiAllowed) return;
    if (!session?.user?.id) {
      setMessage('Session expired. Please log in again.');
      return;
    }
    const name = newUnitName.trim();
    if (!name) {
      setMessage('Type a custom unit name first.');
      return;
    }
    const slug = slugify(name);
    const payload = {
      slug, name, rarity: newUnitRarity, custom_unit: true, type: 'DPS', raw_type: 'Unit',
      category: 'Standard', obtain: [], min_max_stats: {}, upgrades: [],
      updated_by: session.user.id, updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('unit_wiki_overrides').upsert(payload, { onConflict: 'slug' });
    if (error) {
      setMessage(`Could not create custom unit: ${errorMessage(error)}`);
      return;
    }
    try {
      await supabase.from('wiki_change_log').insert({ slug, old_value: {}, new_value: payload });
    } catch {
      // ignore log failure
    }
    setNewUnitName('');
    setSelectedSlug(slug);
    setActiveTool('wiki');
    setMessage(`Created custom unit ${name}. Fill in its WIKI data and save.`);
    try {
      await Promise.all([refreshAdminData(), refresh(), refreshWiki()]);
    } catch {
      // ignore
    }
  }

  async function signIn(event) {
    event.preventDefault();
    setAuthMessage('');
    const cleanEmail = email.trim().toLowerCase();
    const member = TEAM_MEMBERS[cleanEmail];
    if (!member) {
      setAuthMessage('⚠️ Email not found on the APEX team roster.');
      return;
    }
    
    setAdminLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: cleanEmail, password: password.trim() }),
      });
      
      if (response.ok) {
        localStorage.setItem('apex-admin-email-v1', cleanEmail);
        localStorage.setItem('apex-admin-passcode-v1', password.trim());
        
        const mockSession = {
          user: {
            id: cleanEmail,
            email: cleanEmail,
          }
        };
        setSession(mockSession);
        setAdminUser({
          email: cleanEmail,
          role: member.roleKey,
        });
        setPreviewMode(true);
        setAuthMessage('✓ Authenticated in Serverless Sandbox Editor mode!');
      } else {
        const errData = await response.json().catch(() => ({}));
        setAuthMessage(`⚠️ Login failed: ${errData.error || 'Incorrect password.'}`);
      }
    } catch (e) {
      setAuthMessage(`⚠️ Error: Could not connect to the database: ${e.message}`);
    }
    setAdminLoading(false);
  }

  async function signOut() {
    localStorage.removeItem('apex-admin-email-v1');
    localStorage.removeItem('apex-admin-passcode-v1');
    setSession(null);
    setAdminUser(null);
    setAuthMessage('');
    setValueRows([]);
    setWikiRows([]);
    setMapRows([]);
    setCrateRows([]);
  }

  async function updatePassword(event) {
    event.preventDefault();
    setAuthMessage('');
    const cleanEmail = email.trim().toLowerCase();
    const currentPass = password.trim();
    const nextPasscode = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (nextPasscode.length < 6) {
      setAuthMessage('⚠️ New password must be at least 6 characters.');
      return;
    }
    if (nextPasscode !== confirm) {
      setAuthMessage('⚠️ New password and confirmation do not match.');
      return;
    }

    setResetSaving(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: cleanEmail, currentPassword: currentPass, newPassword: nextPasscode }),
      });
      
      if (response.ok) {
        // Success: wipe every stored credential + session so the editor is
        // fully logged out, then route back to the LOGIN screen so they must
        // verify their NEW password immediately.
        localStorage.removeItem('apex-admin-email-v1');
        localStorage.removeItem('apex-admin-passcode-v1');
        setSession(null);
        setAdminUser(null);
        setValueRows([]);
        setWikiRows([]);
        setMapRows([]);
        setCrateRows([]);
        setEmail('');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setAuthMessage('✅ Password updated successfully! You have been logged out for security. Please log in below with your NEW password to verify it works.');
        navigate('/admin');
      } else {
        const errData = await response.json().catch(() => ({}));
        setAuthMessage(`⚠️ Error: ${errData.error || 'Could not update password.'}`);
      }
    } catch (e) {
      setAuthMessage(`⚠️ Error: Could not connect to the database: ${e.message}`);
    }
    setResetSaving(false);
  }

  async function saveValue() {
    if (!valueAllowed || !selectedUnit) return;
    if (!session?.user?.id) {
      setMessage('Session expired. Please log in again.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const next = normalizeValueForm(valueForm);
      if (previewMode) {
        const payload = {
          slug: selectedUnit.slug,
          base_value: next.baseValue, baseValue: next.baseValue,
          base_value_max: next.baseValueMax, baseValueMax: next.baseValueMax,
          gems: next.gems, coins: next.coins,
          demand: next.demand, scarcity: next.scarcity, trend: next.trend, notes: next.notes,
          updated_at: new Date().toISOString(), updated_by: 'local-preview', isPrvw: true, prvw: true
        };
        setLocalValueOverride(selectedUnit.slug, payload);
        setValueRows((prev) => {
          const filtered = prev.filter((r) => r.slug !== selectedUnit.slug);
          return [payload, ...filtered];
        });
        // Re-seed the form from the CANONICAL saved payload so the inputs
        // never revert (string "500" → number 500) and the dirty check
        // compares identical shapes, clearing "● Unsaved Changes".
        setValueForm(valueRowToForm(payload, selectedUnit.slug));
        setMessage('✓ Saved local Client PRVW value override!');
        try {
          refresh();
        } catch {
          // ignore
        }
        if (!testerRealm) pushToCloudflareKV();
        else setMessage('✓ Saved local Client PRVW value override in Tester Realm (No global consequences!)');
        setSaving(false);
        return;
      }
      const oldValue = selectedValueRow || getFallbackValueData(selectedUnit.slug);
      const payload = {
        slug: selectedUnit.slug, kind: 'unit', 
        base_value: next.baseValue, base_value_max: next.baseValueMax,
        gems: next.gems, coins: next.coins,
        demand: next.demand, scarcity: next.scarcity, trend: next.trend, notes: next.notes,
        updated_by: session.user.id, updated_at: new Date().toISOString(),
      };
      setLocalValueOverride(selectedUnit.slug, null);
      const { error } = await supabase.from('value_entries').upsert(payload, { onConflict: 'slug' });
      if (error) throw error;
      setValueRows((prev) => {
        const filtered = prev.filter((r) => r.slug !== selectedUnit.slug);
        return [payload, ...filtered];
      });
      setValueForm(valueRowToForm(payload, selectedUnit.slug));
      try {
        await supabase.from('value_change_log').insert({ slug: selectedUnit.slug, kind: 'unit', old_value: oldValue, new_value: payload });
      } catch {
        // ignore log failure
      }
      setMessage('Saved value globally. Values pages and calculator will sync automatically.');
      try {
        await refreshAdminData({ logsOnly: true });
      } catch {
        // ignore
      }
    } catch (error) {
      setMessage(`Save failed: ${errorMessage(error)}`);
    }
    setSaving(false);
  }

  async function resetValue() {
    if (!valueAllowed || !selectedUnit) return;
    if (previewMode) {
      setLocalValueOverride(selectedUnit.slug, null);
      markLocalOverrideDeleted('value', selectedUnit.slug);
      setMessage(`✓ Removed local Client PRVW value override for ${selectedUnit.name}! Restored live/fallback value.`);
      setValueRows((prev) => [...prev]);
      try {
        await refresh();
        await refreshAdminData();
      } catch {
        // ignore
      }
      if (!testerRealm) pushToCloudflareKV();
      else setMessage(`✓ Removed local override for ${selectedUnit.name} in Tester Realm (No global consequences!)`);
      return;
    }
    setLocalValueOverride(selectedUnit.slug, null);
    const { error } = await supabase.from('value_entries').delete().eq('slug', selectedUnit.slug);
    if (error) setMessage(`Reset failed: ${errorMessage(error)}`);
    else {
      setMessage('Live value override removed; fallback generated value restored.');
      try {
        await refreshAdminData({ logsOnly: true });
      } catch {
        // ignore
      }
    }
  }

  async function saveWiki() {
    if (!wikiAllowed || !selectedUnit) return;
    if (!session?.user?.id) {
      setMessage('Session expired. Please log in again.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const minMaxStats = linesToObject(wikiForm.minMaxStatsText);
      const upgrades = (wikiForm.upgradeForms || []).map(formToUpgrade);
      const obtain = wikiForm.obtainText.split('\n').map((line) => line.trim()).filter(Boolean);
      let imageUrl = wikiForm.imageUrl || null;
      if (wikiImageFile) {
        imageUrl = await uploadUnitImage(wikiImageFile, selectedUnit.slug, session);
      }
      if (previewMode) {
        const payload = {
          slug: selectedUnit.slug,
          name: wikiForm.name || selectedUnit.name, description: wikiForm.description, type: wikiForm.type,
          raw_type: wikiForm.rawType, category: wikiForm.category, placement_limit: wikiForm.placementLimit,
          total_cost: wikiForm.totalCost, early_game_rank: wikiForm.earlyGameRank || null, late_game_rank: wikiForm.lateGameRank || null,
          passive: wikiForm.passive, ability: wikiForm.ability, synergy: wikiForm.synergy,
          obtain, min_max_stats: minMaxStats, upgrades, image_url: imageUrl, updated_at: new Date().toISOString(),
          isPrvw: true, prvw: true,
          custom_unit: selectedUnit.customUnit || undefined
        };
        setLocalWikiOverride(selectedUnit.slug, payload);
        setWikiRows((prev) => {
          const filtered = prev.filter((r) => r.slug !== selectedUnit.slug);
          return [payload, ...filtered];
        });
        // Re-seed the form from the CANONICAL saved payload and clear the
        // pending image file — otherwise `wikiDirty` stays true forever
        // (`|| !!wikiImageFile`) and the form appears unsaved/reverted.
        setWikiForm(wikiRowToForm(payload, selectedUnit));
        setWikiImageFile(null);
        if (imageUrl) saveCachedWikiImage(selectedUnit.slug, imageUrl);
        setMessage('✓ Saved local Client PRVW wiki override!');
        try {
          refreshWiki();
        } catch {
          // ignore
        }
        if (!testerRealm) pushToCloudflareKV();
        else setMessage('✓ Saved local Client PRVW wiki override in Tester Realm (No global consequences!)');
        setSaving(false);
        return;
      }
      setLocalWikiOverride(selectedUnit.slug, null);
      const payload = {
        slug: selectedUnit.slug, image_url: imageUrl, description: wikiForm.description || null,
        type: wikiForm.type || null, raw_type: wikiForm.rawType || null, category: wikiForm.category || null,
        placement_limit: wikiForm.placementLimit || null, total_cost: wikiForm.totalCost || null,
        early_game_rank: wikiForm.earlyGameRank === '' ? null : Number(wikiForm.earlyGameRank),
        late_game_rank: wikiForm.lateGameRank === '' ? null : Number(wikiForm.lateGameRank),
        obtain, passive: wikiForm.passive || null, ability: wikiForm.ability || null, synergy: wikiForm.synergy || null,
        min_max_stats: minMaxStats, upgrades, updated_by: session.user.id, updated_at: new Date().toISOString(),
        custom_unit: selectedUnit.customUnit || undefined
      };
      const { error } = await supabase.from('unit_wiki_overrides').upsert(payload, { onConflict: 'slug' });
      if (error) throw error;
      setWikiRows((prev) => {
        const filtered = prev.filter((r) => r.slug !== selectedUnit.slug);
        return [payload, ...filtered];
      });
      setWikiForm(wikiRowToForm(payload, selectedUnit));
      try {
        await supabase.from('wiki_change_log').insert({ slug: selectedUnit.slug, old_value: selectedWikiRow || {}, new_value: payload });
      } catch {
        // ignore log failure
      }
      if (imageUrl) saveCachedWikiImage(selectedUnit.slug, imageUrl);
      setMessage('Saved WIKI override globally. Unit cards/details will use the uploaded render.');
      try {
        await refreshAdminData({ logsOnly: true });
      } catch {
        // ignore
      }
    } catch (error) {
      setMessage(`Wiki save failed: ${errorMessage(error)}`);
    }
    setSaving(false);
  }

  async function saveContent() {
    if (!wikiAllowed || !selectedContentItem) return;
    if (!session?.user?.id) {
      setMessage('Session expired. Please log in again.');
      return;
    }
    setSaving(true); setMessage('');
    try {
      const mapsMode = activeTool === 'maps';
      const imageUrl = contentImageFile ? await uploadContentImage(contentImageFile, mapsMode ? 'maps' : 'crates', selectedContentItem.slug, session) : (contentForm.imageUrl || null);
      const payload = mapsMode ? { slug: selectedContentItem.slug, name: contentForm.name, description: contentForm.description || null, difficulty: contentForm.difficulty || null, unlock_requirement: contentForm.unlockRequirement || null, image_url: imageUrl, updated_by: session.user.id, updated_at: new Date().toISOString() } : { slug: selectedContentItem.slug, name: contentForm.name, description: contentForm.description || null, image_url: imageUrl, chances: contentForm.chances || {}, obtain: contentForm.obtain || null, effect: contentForm.effect || null, updated_by: session.user.id, updated_at: new Date().toISOString() };
      
      if (previewMode) {
        // 100% LOCAL SANDBOX PATH — fully bypasses Supabase. Write the local
        // override, update the rows state, then publish the whole bundle to
        // Cloudflare KV via pushToCloudflareKV().
        if (mapsMode) {
          setLocalMapOverride(selectedContentItem.slug, payload);
          setMapRows((prev) => {
            const filtered = prev.filter((r) => r.slug !== selectedContentItem.slug);
            return [payload, ...filtered];
          });
        } else {
          setLocalCrateOverride(selectedContentItem.slug, payload);
          setCrateRows((prev) => {
            const filtered = prev.filter((r) => r.slug !== selectedContentItem.slug);
            return [payload, ...filtered];
          });
        }
        // Re-seed the form from the CANONICAL saved payload (mapping the
        // snake_case row fields back onto the camelCase form fields, with the
        // same fallbacks the init effect uses) and clear the pending image
        // file — this is what makes the "● Unsaved Changes" pill disappear.
        setContentForm(mapsMode
          ? {
              name: payload.name || selectedContentItem.name,
              description: payload.description || '',
              difficulty: payload.difficulty || '',
              unlockRequirement: payload.unlock_requirement || selectedContentItem.unlockRequirement || '',
              imageUrl: payload.image_url || selectedContentItem.image || '',
            }
          : {
              name: payload.name || selectedContentItem.name,
              description: payload.description || '',
              chances: payload.chances || {},
              obtain: payload.obtain || '',
              effect: payload.effect || '',
              imageUrl: payload.image_url || selectedContentItem.imageUrl || '',
            });
        setContentImageFile(null);
        setMessage(`✓ Saved ${mapsMode ? 'map' : 'crate'} override locally!`);
        if (!testerRealm) pushToCloudflareKV();
        else setMessage(`✓ Saved local ${mapsMode ? 'map' : 'crate'} override in Tester Realm (No global consequences!)`);
        setSaving(false);
        return;
      }

      const { error } = await supabase.from(mapsMode ? 'map_wiki_overrides' : 'crate_wiki_overrides').upsert(payload, { onConflict: 'slug' });
      if (error) throw error;
      const setRows = mapsMode ? setMapRows : setCrateRows;
      setRows((prev) => {
        const filtered = prev.filter((r) => r.slug !== selectedContentItem.slug);
        return [payload, ...filtered];
      });
      setMessage(`Saved ${mapsMode ? 'map' : 'crate'} globally.`);
      try {
        await refreshAdminData({ logsOnly: true });
      } catch {
        // ignore
      }
    } catch (error) { setMessage(`Content save failed: ${errorMessage(error)}`); }
    setSaving(false);
  }

  async function resetContent() {
    if (!selectedContentItem) return;
    const mapsMode = activeTool === 'maps';
    if (previewMode) {
      if (mapsMode) {
        setLocalMapOverride(selectedContentItem.slug, null);
        markLocalOverrideDeleted('map', selectedContentItem.slug);
        setMapRows((prev) => prev.filter((r) => r.slug !== selectedContentItem.slug));
      } else {
        setLocalCrateOverride(selectedContentItem.slug, null);
        markLocalOverrideDeleted('crate', selectedContentItem.slug);
        setCrateRows((prev) => prev.filter((r) => r.slug !== selectedContentItem.slug));
      }
      setMessage('Content override removed; default data restored.');
      if (!testerRealm) pushToCloudflareKV();
      else setMessage('Content override removed in Tester Realm (No global consequences!)');
      return;
    }

    const { error } = await supabase.from(activeTool === 'maps' ? 'map_wiki_overrides' : 'crate_wiki_overrides').delete().eq('slug', selectedContentItem.slug);
    setMessage(error ? `Reset failed: ${errorMessage(error)}` : 'Content override removed; default data restored.');
    if (!error) {
      try {
        await refreshAdminData({ logsOnly: true });
      } catch {
        // ignore
      }
    }
  }

  async function resetWiki() {
    if (!wikiAllowed || !selectedUnit) return;
    if (previewMode) {
      setLocalWikiOverride(selectedUnit.slug, null);
      markLocalOverrideDeleted('wiki', selectedUnit.slug);
      setMessage(`✓ Removed local Client PRVW wiki override for ${selectedUnit.name}!`);
      setWikiRows((prev) => [...prev]);
      try {
        await refreshAdminData({ logsOnly: true });
      } catch {
        // ignore
      }
      if (!testerRealm) pushToCloudflareKV();
      else setMessage(`✓ Removed local Client PRVW wiki override for ${selectedUnit.name} in Tester Realm (No global consequences!)`);
      return;
    }
    setLocalWikiOverride(selectedUnit.slug, null);
    const { error } = await supabase.from('unit_wiki_overrides').delete().eq('slug', selectedUnit.slug);
    if (error) setMessage(`Wiki reset failed: ${errorMessage(error)}`);
    else {
      removeCachedWikiImage(selectedUnit.slug);
      try {
        await removeUnitImages(selectedUnit.slug);
      } catch {
        // ignore
      }
      setMessage('WIKI override removed; generated stat-sheet data restored.');
      try {
        await refreshAdminData({ logsOnly: true });
      } catch {
        // ignore
      }
    }
  }

  async function deleteCustomUnit() {
    if (!wikiAllowed || !selectedUnit?.customUnit) return;
    if (!window.confirm(`Delete custom unit "${selectedUnit.name}"? This permanently removes it from the WIKI and Values everywhere.`)) return;
    const slug = selectedUnit.slug;
    const name = selectedUnit.name;
    if (previewMode) {
      setLocalWikiOverride(slug, null);
      setLocalValueOverride(slug, null);
      markLocalOverrideDeleted('wiki', slug);
      markLocalOverrideDeleted('value', slug);
      setMessage(`✓ Deleted local Client PRVW custom unit "${name}"!`);
      setWikiRows((prev) => [...prev]);
      setValueRows((prev) => [...prev]);
      try {
        await refreshAdminData({ logsOnly: true });
      } catch {
        // ignore
      }
      if (!testerRealm) pushToCloudflareKV();
      else setMessage(`✓ Deleted local custom unit "${name}" in Tester Realm (No global consequences!)`);
      return;
    }
    setLocalWikiOverride(slug, null);
    setLocalValueOverride(slug, null);
    await supabase.from('unit_wiki_overrides').delete().eq('slug', slug);
    await supabase.from('value_entries').delete().eq('slug', slug);
    try {
      await removeUnitImages(slug);
    } catch {
      // ignore
    }
    removeCachedWikiImage(slug);
    try {
      await supabase.from('wiki_change_log').insert({ slug, old_value: { deleted: true }, new_value: {} });
    } catch {
      // ignore
    }
    setMessage(`Deleted custom unit ${name}.`);
    setSelectedSlug(generatedUnits[0]?.slug || '');
    try {
      await refreshAdminData({ logsOnly: true });
    } catch {
      // ignore
    }
  }

  function clearAllLocalOverrides() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('apex-local-value-overrides-v1');
      localStorage.removeItem('apex-local-wiki-overrides-v1');
      localStorage.removeItem('apex-local-map-overrides-v1');
      localStorage.removeItem('apex-local-crate-overrides-v1');
      clearLocalDeletedOverrides();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apex-values-updated'));
      window.dispatchEvent(new CustomEvent('apex-wiki-updated'));
      window.dispatchEvent(new CustomEvent('apex-maps-updated'));
      window.dispatchEvent(new CustomEvent('apex-crates-updated'));
    }
    setValueRows((prev) => [...prev]);
    setWikiRows((prev) => [...prev]);
    setMapRows((prev) => [...prev]);
    setCrateRows((prev) => [...prev]);
    try {
      refreshAdminData({ logsOnly: true });
    } catch {
      // ignore
    }
    setMessage('🗑️ Cleared all local PRVW overrides (units, values, maps & crates) across the entire site! All items restored to clean live Cloudflare KV data.');
  }



  if (authLoading) return <main className="admin-page"><div className="admin-editor card">Loading admin…</div></main>;

  if (resetMode) {
    return (
      <main className="admin-page">
        <AuthPanel title="Change Personal Password" message={authMessage}>
          <form className="admin-auth-form" onSubmit={updatePassword}>
            <p className="admin-muted">Change your personal admin password dynamically. Initial default password is "apex2026".</p>
            <label>Your Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="editor@email.com" required />
            <label>Current Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Current Password…" required />
            <label>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password…" minLength={6} required />
            <label>Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm New Password…" minLength={6} required />
            <button type="submit" className="filled" disabled={resetSaving}>{resetSaving ? 'Updating…' : 'Update Password'}</button>
            <button type="button" onClick={() => { setEmail(''); setPassword(''); navigate('/admin'); }} disabled={resetSaving}>Back to Login</button>
          </form>
        </AuthPanel>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="admin-page">
        <AuthPanel title="APEX Admin Login" message={authMessage}>
          <form className="admin-auth-form" onSubmit={signIn}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="editor@email.com" />
            <label>Personal Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password…" />
            <button type="submit" className="filled">Login</button>
            <button type="button" onClick={() => { setAuthMessage(''); setEmail(''); setPassword(''); navigate('/admin/reset-password'); }}>🔒 Change Personal Password</button>
          </form>
        </AuthPanel>
      </main>
    );
  }

  if (adminLoading) return <main className="admin-page"><div className="admin-editor card">Checking permissions…</div></main>;

  if (!anyAllowed) {
    return (
      <main className="admin-page">
        <AuthPanel title="Access Denied" message={authMessage || `Logged in as ${session.user.email}, but this account does not have admin permissions.`}>
          <button type="button" className="admin-denied-button" onClick={signOut}>Logout</button>
        </AuthPanel>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <motion.section className="admin-hero" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1>APEX Admin</h1>
        <p>Logged in as <strong>{getDisplayName(session?.user?.email, true)}</strong> · Role: <strong>{role}</strong></p>
        <div className="admin-hero-actions">
          <button type="button" className="admin-denied-button" onClick={() => navigate('/admin/reset-password')}>Change Passcode</button>
          <button type="button" className="admin-denied-button" onClick={signOut}>Logout</button>
        </div>
      </motion.section>

      {role === 'owner' && <ContributionGraph valueLogs={valueLog} wikiLogs={wikiLog} />}

      <div className="admin-panel-slide-row" style={{ marginTop: 20 }}>
        <span className="admin-panel-slide-title">🛠️ APEX Editor</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginLeft: 16 }}>
          {wikiAllowed && (
            <button type="button" className="admin-denied-button" style={{ borderColor: 'var(--success, #00ff91)', color: 'var(--success, #00ff91)', fontWeight: 900 }} onClick={() => setShowCreateUnit(!showCreateUnit)}>
              ✨ {showCreateUnit ? 'Close Create Panel' : '+ Create New Custom Unit'}
            </button>
          )}
          <button
            type="button"
            className="admin-denied-button"
            style={{
              borderColor: testerRealm ? '#b679ff' : 'rgba(255,255,255,0.12)',
              color: testerRealm ? '#b679ff' : '#ffffff',
              fontWeight: 800
            }}
            onClick={() => {
              setTesterRealm(!testerRealm);
              setMessage(testerRealm ? 'Disabled Tester Realm. Live publishing re-enabled.' : 'Enabled Tester Realm! All changes are now local-only.');
            }}
          >
            {testerRealm ? '🧪 Disable Tester Realm' : '🧪 Enable Tester Realm'}
          </button>
        </div>
      </div>

      {testerRealm && (
        <div className="tester-realm-banner" style={{ background: 'rgba(182, 121, 255, 0.08)', border: '1px dashed #b679ff', color: '#b679ff', padding: '12px 18px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, marginTop: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🧪 <strong>TESTER REALM ACTIVE:</strong> Edits are saved strictly inside your local browser. Live publishing is fully disabled. Go test anything with zero consequences!</span>
        </div>
      )}

      {showCreateUnit && (
        <CreateUnitPanel
          session={session}
          supabase={supabase}
          previewMode={previewMode}
          setLocalWikiOverride={setLocalWikiOverride}
          setLocalValueOverride={setLocalValueOverride}
          onCreated={(slug, name) => {
            setShowCreateUnit(false);
            setSelectedSlug(slug);
            setActiveTool('wiki');
            setMessage(`Created custom unit "${name}"! Fill in its WIKI stat sheet below.`);
            refreshAdminData().then(() => {
              if (!testerRealm) pushToCloudflareKV();
              else setMessage(`Created custom unit "${name}" in Tester Realm (No global consequences!)`);
            });
          }}
          onClose={() => setShowCreateUnit(false)}
        />
      )}

      <div className="admin-tabs">
        {valueAllowed && <button type="button" className={activeTool === 'values' ? 'active' : ''} onClick={() => { setActiveTool('values'); setMessage(''); }}>Values Editor</button>}
        {wikiAllowed && <button type="button" className={activeTool === 'wiki' ? 'active' : ''} onClick={() => { setActiveTool('wiki'); setMessage(''); }}>WIKI Editor</button>}
        {(role === 'owner' || role === 'admin') && <button type="button" className={activeTool === 'bugReports' ? 'active' : ''} onClick={() => { setActiveTool('bugReports'); setMessage(''); }}>Bug Reports</button>}
        {wikiAllowed && <button type="button" className={activeTool === 'maps' ? 'active' : ''} onClick={() => { setActiveTool('maps'); setMessage(''); }}>Maps</button>}
        {/* {wikiAllowed && <button type="button" className={activeTool === 'crates' ? 'active' : ''} onClick={() => { setActiveTool('crates'); setMessage(''); }}>Crates</button>} */}
      </div>

      {activeTool === 'bugReports' && (role === 'owner' || role === 'admin') ? (
        <BugReportAdmin />
      ) : activeTool === 'maps' || activeTool === 'crates' ? (
        <section className="admin-content-layout"><aside className="admin-unit-picker card"><div className="admin-section-head"><h2>{activeTool === 'maps' ? 'Maps' : 'Crates'}</h2><span>{contentItems.length}</span></div><input className="admin-search" placeholder={`Search ${activeTool}…`} onChange={(e) => { const q = e.target.value.toLowerCase(); setContentSlug(contentItems.find((item) => item.name.toLowerCase().includes(q))?.slug || contentItems[0]?.slug); }} /><div className="admin-unit-list">{contentItems.map((item) => <button type="button" key={item.slug} className={item.slug === selectedContentItem?.slug ? 'admin-unit active' : 'admin-unit'} onClick={() => setContentSlug(item.slug)}><span className="admin-unit-text"><strong>{item.name}</strong><small>{item.slug}</small></span></button>)}</div></aside><ContentEditor kind={activeTool} item={selectedContentItem} form={contentForm} setForm={setContentForm} imageFile={contentImageFile} setImageFile={setContentImageFile} onSave={saveContent} onReset={resetContent} saving={saving} dirty={!!contentImageFile || isContentFormDirty(contentForm, selectedContentRow, selectedContentItem, activeTool)} /></section>
      ) : activeTool !== 'bugReports' && (
        <section className="admin-layout">
          <UnitPicker
            units={filteredUnits} total={units.length} query={query} setQuery={setQuery} filter={unitFilter} setFilter={setUnitFilter}
            selectedUnit={selectedUnit} selectUnit={selectUnit} valueRows={valueRows} wikiRows={wikiRows} mode={activeTool}
            imageMap={adminImageMap}
          />
          {activeTool === 'values' ? (
            <ValueEditor
              unit={selectedUnit} form={valueForm} tradeValue={tradeValue} selectedRow={selectedValueRow}
              updateField={updateValueField} saveValue={saveValue} resetValue={resetValue} refresh={refreshAdminData}
              saving={saving} message={message} navigate={navigate} dirty={valueDirty}
              imageMap={adminImageMap} wikiRows={wikiRows}
            />
          ) : (
            <WikiEditor
              unit={selectedUnit} form={wikiForm} selectedRow={selectedWikiRow} updateField={updateWikiField}
              imageFile={wikiImageFile} setImageFile={setWikiImageFile} saveWiki={saveWiki} resetWiki={resetWiki}
              deleteCustomUnit={deleteCustomUnit} refresh={refreshAdminData} saving={saving} message={message} navigate={navigate} dirty={wikiDirty}
              imageMap={adminImageMap} wikiRows={wikiRows}
            />
          )}
        </section>
      )}

      <AdminLog activeTool={activeTool} valueLog={valueLog} wikiLog={wikiLog} role={role} />
    </main>
  );
}
