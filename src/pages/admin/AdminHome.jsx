import { useEffect, useMemo, useState, useRef, useCallback} from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ALL_UNITS } from '../../data/units';
import CreateHub from '../../components/admin/CreateHub';
import staticOverridesJson from '../../data/overrides/staticOverrides.json';
import { CRATES, MATERIALS } from '../../data/items';
import { ALL_MAPS } from '../../data/maps';
import { ALL_SKINS, ALL_SHINY_SKINS } from '../../data/skins';
import { useData } from '../../context/DataContext';
import { SHINY_UNITS } from '../../data/units';
import { useWikiImageOverrides } from '../../hooks/useWikiImageOverrides';
import { UNIT_RARITIES, isShinyRarity } from '../../data/taxonomy';
import { computeTradeValue } from '../../utils/calculator';
import { slugify } from '../../utils/slug';
import { APEX_KV_URL, getAdminHeaders, pushKvEntry, deleteKvEntry, fetchChangeLog, logoutEverywhere, addDeletedUnit, restoreDeletedUnit, fetchUnitHistory, fetchMaintenanceStatus, setMaintenance } from '../../utils/apexClient';
import AnnouncementStudio from '../../components/admin/AnnouncementStudio';
import AdminDashboard from '../../components/admin/AdminDashboard';
import ChangeFeed from '../../components/admin/ChangeFeed';
import { buildFullPublishBundle, pushBundleToCloudflareKV } from '../../components/admin/adminKV';
import { removeCachedWikiImage, saveCachedWikiImage, loadCachedWikiImages } from '../../utils/wikiImageCache';
import {
  canEditValue,
  canEditWiki,
  errorMessage,
  formToUpgrade,
  linesToObject,
  normalizeValueForm,
  valueRowToForm,
  wikiRowToForm,
} from '../../utils/adminForms';
import { uploadUnitImage, uploadContentImage } from '../../utils/adminImage';
import {
  setLocalValueOverride,
  setLocalWikiOverride,
  loadLocalValueOverrides,
  loadLocalWikiOverrides,
  loadLocalMapOverrides,
  setLocalMapOverride,
  loadLocalCrateOverrides,
  setLocalCrateOverride,
  loadLocalMaterialOverrides,
  setLocalMaterialOverride,
  loadLocalDeletedOverrides,
  markLocalOverrideDeleted,
  markLocalUnitDeleted,
  unmarkLocalUnitDeleted,
  unmarkLocalOverrideDeleted,
  clearLocalDeletedOverrides
} from '../../utils/localOverrides';
import { getDisplayName, TEAM_MEMBERS } from '../../utils/teamMembers';
import { notifyAdminAuthChange } from '../../hooks/useAdminStatus';
import Dropdown from '../../components/Dropdown';
import { AdminLog, AdminMessage, AuthPanel, ContentEditor, DeletedUnitsPanel, UnitPicker, ValueEditor, WikiEditor, loadPersistedLogs, persistLog } from '../../components/admin/AdminParts';
import ContributionGraph from '../../components/admin/ContributionGraph';
import BugReportAdmin from '../../components/bugs/BugReportAdmin';
import MarketAnalytics from '../../components/MarketAnalytics';
import { createUndoRedo } from '../../utils/undoRedo';
import {
  fuzzyMatch, saveFormDraft, loadFormDraft, clearFormDraft,
  pushRecentEdit, loadRecentEdits, scorePasscode, compressImage,
} from '../../utils/adminSafety';
import { recordValueChange } from '../../components/ValueTrendGraph';
import './AdminHome.css';

// NORMAL → SHINY AUTOSYNC
// Automatically generates the Shiny variant when saving a Normal unit.
// Rules: 1.5× all damage/DPS stats, everything else identical.
const SHINY_DAMAGE_MULTIPLIER = 1.5;

function findShinyUnit(normalUnit, allUnits) {
  if (!normalUnit || isShinyRarity(normalUnit.rarity)) return null;
  const shinyRarity = `Shiny ${normalUnit.rarity}`;
  return allUnits.find(u => u.name === normalUnit.name && u.rarity === shinyRarity) || null;
}

function makeShinySlug(normalSlug) {
  return `shiny-${normalSlug}`;
}

function scaleDamageStats(stats, multiplier) {
  if (!stats || typeof stats !== 'object') return stats;
  const scaled = {};
  for (const [key, value] of Object.entries(stats)) {
    const keyLower = key.toLowerCase();
    const isDamage = keyLower.includes('damage') || keyLower.includes('dps') || keyLower.includes('atk') || keyLower.includes('attack');
    if (isDamage && typeof value === 'string') {
      // Handle ranges like "10 → 50" or single values like "100"
      const parts = value.split('→').map(s => s.trim());
      if (parts.length === 2) {
        const lo = parseFloat(parts[0]);
        const hi = parseFloat(parts[1]);
        if (!isNaN(lo) && !isNaN(hi)) {
          scaled[key] = `${Math.round(lo * multiplier)} → ${Math.round(hi * multiplier)}`;
          continue;
        }
      }
      const num = parseFloat(value);
      if (!isNaN(num)) {
        scaled[key] = `${Math.round(num * multiplier)}`;
        continue;
      }
    }
    scaled[key] = value;
  }
  return scaled;
}

function scaleUpgrades(upgrades, multiplier) {
  if (!Array.isArray(upgrades)) return upgrades;
  return upgrades.map(upgrade => {
    if (!upgrade) return upgrade;
    const scaled = { ...upgrade };
    // Scale DPS text
    if (scaled.dpsText && typeof scaled.dpsText === 'string') {
      scaled.dpsText = scaled.dpsText.replace(/(\d+(?:\.\d+)?)/g, (match) => {
        const num = parseFloat(match);
        return isNaN(num) ? match : String(Math.round(num * multiplier));
      });
    }
    // Scale attack text lines
    if (scaled.attacksText && typeof scaled.attacksText === 'string') {
      scaled.attacksText = scaled.attacksText.replace(/Damage:\s*(\d+(?:\.\d+)?)/gi, (match, num) => {
        return `Damage: ${Math.round(parseFloat(num) * multiplier)}`;
      });
    }
    // Scale stats text (damage lines only)
    if (scaled.statsText && typeof scaled.statsText === 'string') {
      scaled.statsText = scaled.statsText.replace(/Damage:\s*(\d+(?:\.\d+)?)/gi, (match, num) => {
        return `Damage: ${Math.round(parseFloat(num) * multiplier)}`;
      });
    }
    return scaled;
  });
}

async function autoSyncShinyVariant(normalPayload, normalUnit, allUnits, session, localWikiOverride, setWikiRows, setLocalWikiOverride) {
  if (!normalUnit || isShinyRarity(normalUnit.rarity)) return;

  const shinyUnit = findShinyUnit(normalUnit, allUnits);
  const shinySlug = shinyUnit ? shinyUnit.slug : makeShinySlug(normalUnit.slug);
  const shinyName = shinyUnit ? shinyUnit.name : normalUnit.name;
  const shinyRarity = `Shiny ${normalUnit.rarity}`;

  // Build shiny payload: copy everything from normal, scale damage, change rarity
  const shinyPayload = {
    ...normalPayload,
    slug: shinySlug,
    name: shinyName,
    rarity: shinyRarity,
    min_max_stats: scaleDamageStats(normalPayload.min_max_stats, SHINY_DAMAGE_MULTIPLIER),
    upgrades: scaleUpgrades(normalPayload.upgrades, SHINY_DAMAGE_MULTIPLIER),
    updated_at: new Date().toISOString(),
    updated_by: 'shiny-autosync',
    custom_unit: normalPayload.custom_unit || false,
  };

  // Remove normal-only fields

  // Save to local override
  setLocalWikiOverride(shinySlug, shinyPayload);

  // Update wiki rows state
  setWikiRows((prev) => {
    const filtered = prev.filter((r) => r.slug !== shinySlug);
    return [shinyPayload, ...filtered];
  });
}

const NEW_UNIT_RARITY_GROUPS = [
  { label: 'Base Rarities', options: UNIT_RARITIES.filter((r) => !r.startsWith('Shiny')).map((r) => ({ value: r, label: r })) },
  { label: 'Shiny Rarities', options: UNIT_RARITIES.filter((r) => r.startsWith('Shiny')).map((r) => ({ value: r, label: r })) },
];

const ROLE_EMOJI = {
  owner: '👑',
  admin: '🛡️',
  editor: '✏️',
  lead_value_editor: '💰',
  lead_wiki_editor: '📖',
  value_editor: '💰',
  wiki_editor: '📖',
  fanart_editor: '🎨',
};

const SIDEBAR_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'values', icon: '💰', label: 'Values Editor' },
  { id: 'wiki', icon: '📖', label: 'WIKI Editor' },
  { id: 'create', icon: '✨', label: 'Create' },
  { id: 'maps', icon: '🗺️', label: 'Maps' },
  { id: 'crates', icon: '📦', label: 'Crates' },
  { id: 'materials', icon: '🧪', label: 'Materials' },
  { id: 'bugs', icon: '🐛', label: 'Bug Reports' },
  { id: 'announcements', icon: '📢', label: 'Announcements' },
  { id: 'logs', icon: '📈', label: 'Logs & Info' },
];

export default function AdminHome() {
  const location = useLocation();
  const navigate = useNavigate();
  const resetMode = location.pathname.endsWith('/reset-password');
  const { refresh, refreshWiki, refreshContent, createdUnits, createdMaps, createdSkins, createdMaterials, materialRowMap, deletedUnitSlugs, isUnitDeleted, wikiRows: liveWikiRows = [] } = useData();
  const generatedUnits = useMemo(() => {
    return ALL_UNITS.filter((unit) => {
      const isUnob = unit.category === 'Unobtainable' || unit.categories?.includes('Unobtainable');
      return (unit.documented && !unit.unavailableData) || isUnob;
    });
  }, []);

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  // Members still on the DEFAULT passcode ('apex2026') are locked to the
  // password-change screen until they set their own — no editing before.
  const [mustChangePassword, setMustChangePassword] = useState(() => {
    try {
      return localStorage.getItem('apex-admin-passcode-v1') === 'apex2026';
    } catch { return false; }
  });

  const [query, setQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [previewMode, setPreviewMode] = useState(true);
  const [valueRows, setValueRows] = useState([]);
  const [valueLog] = useState([]);
  const [wikiRows, setWikiRows] = useState([]);
  const [mapRows, setMapRows] = useState([]);
  const [crateRows, setCrateRows] = useState([]);
  const [wikiLog] = useState([]);
  const [dataVersion, setDataVersion] = useState(0);
  const units = useMemo(() => [...generatedUnits, ...(createdUnits || [])].filter((u) => !isUnitDeleted(u.slug)), [generatedUnits, createdUnits, isUnitDeleted]);
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
  const [activeView, setActiveView] = useState('dashboard');
  const [searchParams, setSearchParams] = useSearchParams();
  // Subpages live in the URL (?view=…&tool=…) so a refresh keeps you where
  // you were and deep links (e.g. /admin?view=create) work.
  useEffect(() => {
    try {
      const v = searchParams.get('view');
      const t = searchParams.get('tool');
      const known = SIDEBAR_ITEMS.some((i) => i.id === v);
      if (known) setActiveView(v); // role gates are enforced at render time
      if (t === 'values' || t === 'wiki' || t === 'maps' || t === 'crates') setActiveTool(t);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      const next = {};
      if (activeView !== 'dashboard') next.view = activeView;
      if (activeTool !== 'values') next.tool = activeTool;
      setSearchParams(next, { replace: true });
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, activeTool]);

  // Maintenance mode (owner/admin): closes the site for visitors
  const [maintenance, setMaintenanceState] = useState({ on: false, message: '', loading: true });
  const refreshMaintenance = useCallback(async () => {
    const state = await fetchMaintenanceStatus();
    setMaintenanceState({ on: !!state.on, message: state.message || '', loading: false });
  }, []);
  useEffect(() => {
    refreshMaintenance();
    const pollId = window.setInterval(refreshMaintenance, 60000);
    const onUpdated = () => refreshMaintenance();
    window.addEventListener('apex-maintenance-updated', onUpdated);
    return () => { window.clearInterval(pollId); window.removeEventListener('apex-maintenance-updated', onUpdated); };
  }, [refreshMaintenance]);

  async function handleToggleMaintenance() {
    if (role !== 'owner' && role !== 'admin') return;
    const turningOn = !maintenance.on;
    const extra = turningOn ? '\n\nVisitors will see a "we are under maintenance" page until it is turned off. Team members keep full access.' : '';
    if (!window.confirm(`${turningOn ? 'Turn maintenance mode ON and close the site for visitors?' : 'Turn maintenance mode OFF and reopen the site?'}${extra}`)) return;
    setMaintenanceState((p) => ({ ...p, loading: true }));
    const res = await setMaintenance(turningOn, '');
    if (res.ok) {
      window.dispatchEvent(new CustomEvent('apex-maintenance-updated'));
      setMessage(turningOn ? '🛠 Maintenance mode is ON — visitors now see the maintenance page.' : '✅ Maintenance mode is OFF — the site is open again.');
      setMessageAction(null);
      await refreshMaintenance();
    } else {
      setMaintenanceState((p) => ({ ...p, loading: false }));
      setMessage(`⚠️ Could not switch maintenance mode: ${res.error || 'worker not reachable'}. Needs the updated worker deployed.`);
      setMessageAction(null);
    }
  }

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
  const [localChangeLog, setLocalChangeLog] = useState(() => loadPersistedLogs());
  const [liveDbTime, setLiveDbTime] = useState(null);
  const [serverEdits, setServerEdits] = useState([]);
  const [messageAction, setMessageAction] = useState(null);
  const [recentEdits, setRecentEdits] = useState(() => loadRecentEdits());
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [draftsVersion, setDraftsVersion] = useState(0);
  const undoRedo = useMemo(() => createUndoRedo(), []);
  const commitRangeRef = useRef(null);
  const justSavedRef = useRef(false);
  const bundleVersionRef = useRef(0);

  // Baseline-snapshot dirty tracking. The old row-vs-form comparison was
  // wrong at rest (e.g. an empty crate form vs. CRATES[0] read as "dirty"
  // with the user touching nothing — causing the false "Are you sure?"
  // popup on EVERY view switch). A form is dirty only if it differs from
  // what it was when it was last seeded/saved/reset.
  const dirtyBaselinesRef = useRef({});
  const baseline = (kind, form) => { dirtyBaselinesRef.current[kind] = JSON.stringify(form); };
  const isDirty = (kind, form) =>
    dirtyBaselinesRef.current[kind] !== undefined && JSON.stringify(form) !== dirtyBaselinesRef.current[kind];

  const valueDirty = isDirty('value', valueForm);
  const wikiDirty = isDirty('wiki', wikiForm) || !!wikiImageFile;
  const contentDirty = !!contentImageFile || isDirty('content', contentForm);
  const anyDirty = valueDirty || wikiDirty || contentDirty;

  // Dirty-state shield: warn on tab close / reload…
  useEffect(() => {
    function warn(event) { if (anyDirty) { event.preventDefault(); event.returnValue = ''; } }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [anyDirty]);

  // …on leaving the admin route entirely…
  const anyDirtyRef = useRef(false);
  anyDirtyRef.current = anyDirty;
  const wasAdminRef = useRef(location.pathname.startsWith('/admin'));
  useEffect(() => {
    const onAdmin = location.pathname.startsWith('/admin');
    const leaving = wasAdminRef.current && !onAdmin;
    wasAdminRef.current = onAdmin;
    if (leaving && anyDirtyRef.current && !window.confirm('You have unsaved changes. Leave the admin panel anyway?')) {
      navigate('/admin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // …and on switching tool/view inside the admin panel.
  const viewGuardRef = useRef({ tool: activeTool, view: activeView });
  useEffect(() => {
    const prev = viewGuardRef.current;
    const changed = prev.tool !== activeTool || prev.view !== activeView;
    if (!changed) return;
    if (anyDirtyRef.current && !window.confirm('You have unsaved changes. Switch anyway?')) {
      setActiveTool(prev.tool);
      setActiveView(prev.view);
      return; // ref intentionally unchanged → re-run sees no change, no loop
    }
    viewGuardRef.current = { tool: activeTool, view: activeView };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, activeView]);

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
  const stats = {
    units: units.length,
    values: valueRows.length,
    maps: mapRows.length,
    crates: crateRows.length,
  };
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const edits24h = serverEdits.filter((e) => new Date(e?.at || 0).getTime() >= dayAgo).length
    + localChangeLog.filter((e) => new Date(e?.changed_at || 0).getTime() >= dayAgo).length;
  const anyAllowed = valueAllowed || wikiAllowed;

  // Track changes locally for the Admin Log display (persisted to localStorage)
  function logChange(slug, kind, detail) {
    const entry = {
      id: Date.now() + Math.random(),
      slug,
      kind,
      detail,
      changed_at: new Date().toISOString(),
      changed_by_email: session?.user?.email || 'unknown',
    };
    persistLog(entry);
    setLocalChangeLog((prev) => [entry, ...prev].slice(0, 200));
  }

  useEffect(() => {
    if (valueAllowed) setActiveTool('values');
    else if (wikiAllowed) setActiveTool('wiki');
  }, [valueAllowed, wikiAllowed]);

  async function refreshAdminData({ logsOnly: _logsOnly = false } = {}) {
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
      const res = await fetch(`${APEX_KV_URL}/overrides`).catch(() => null);
      if (res && res.ok) kvData = await res.json();
      if (typeof kvData?.__v === 'number') bundleVersionRef.current = kvData.__v;
      if (kvData?.timestamp) setLiveDbTime(new Date(kvData.timestamp));
    } catch {
      kvData = null; // Worker offline → fall back to static + local layers only
    }
    // Shared change feed (for the "Edits (24h)" stat card + server log tab)
    fetchChangeLog()
      .then((changes) => setServerEdits(Array.isArray(changes) ? changes : []))
      .catch(() => {});

    // Tolerant row builders: accept both camelCase bundle entries
    // (`baseValue`, `unlockRequirement`, `imageUrl`) and snake_case DB row
    // entries (`base_value`, `unlock_requirement`, `image_url`), and NEVER
    // drop fields like trend/notes/updated_at (dropping them made forms
    // revert to fallback data after a refresh).
    const buildValueRow = (slug, val = {}) => ({
      slug,
      base_value: val.baseValue ?? val.base_value,
      base_value_max: val.baseValueMax ?? val.base_value_max ?? null,
      gems_max: val.gemsMax ?? val.gems_max ?? null,
      coins_max: val.coinsMax ?? val.coins_max ?? null,
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

    // Change logs are local-only now (logChange above) — the live database
    // is the Cloudflare KV bundle, which has no separate log tables.
    return;
  }

  async function pushToCloudflareKV({ isRestore = false } = {}) {
    setSaving(true);
    try {
      let bundle = await buildFullPublishBundle();
      let result = await pushBundleToCloudflareKV(bundle, { isRestore, onStatus: setMessage });
      if (result.conflict) {
        // Someone else saved while we were editing: refetch their data,
        // re-merge our drafts on top, and try exactly once more.
        setMessage('🔄 Database changed while saving — re-merging your edits…');
        await refreshAdminData();
        bundle = await buildFullPublishBundle();
        result = await pushBundleToCloudflareKV(bundle, { isRestore, onStatus: setMessage });
        if (result.conflict) {
          setMessage('⚠️ Still out of date after retry — your edits are saved locally. Try saving again in a moment.');
          setMessageAction({ label: '🔄 Publish again', run: () => { pushToCloudflareKV({ isRestore }); } });
          setSaving(false);
          return;
        }
      }
      if (typeof result.version === 'number') bundleVersionRef.current = result.version;
      if (result.ok) {
        clearLocalDeletedOverrides();
      }
    } catch (e) {
      setMessage(`⚠️ Failed to build publish bundle: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ---- Per-slug publishing (concurrent-safe): pushes ONE local draft entry
  // straight to the KV database. No full-bundle overwrite, so two admins
  // editing different units can never erase each other anymore.
  function localDraftFor(section, slug) {
    if (section === 'value') return (loadLocalValueOverrides() || {})[slug];
    if (section === 'wiki') return (loadLocalWikiOverrides() || {})[slug];
    if (section === 'map') return (loadLocalMapOverrides() || {})[slug];
    if (section === 'crate') return (loadLocalCrateOverrides() || {})[slug];
    return null;
  }

  async function pushEntryToKV(section, slug, { silent = true } = {}) {
    const draft = localDraftFor(section, slug);
    if (!draft) {
      // No local draft — fall back to a full publish.
      return pushToCloudflareKV();
    }
    const result = await pushKvEntry(section, slug, draft);
    if (result.ok) {
      if (typeof result.version === 'number') bundleVersionRef.current = result.version;
      unmarkLocalOverrideDeleted(section, slug);
      if (!silent) setMessage(`✓ Published to live database (v${result.version}).`);
    } else if (result.status === 401) {
      setMessage('⚠️ Saved locally, but cloud publish failed: Your saved login/passcode is invalid.');
    } else {
      setMessage(`⚠️ Cloud publish failed: ${result.error || 'Server error'}`);
      setMessageAction({ label: '🔄 Try again', run: () => { pushEntryToKV(section, slug, { silent }); } });
    }
    return result.ok;
  }

  async function deleteEntryFromKV(section, slug) {
    const result = await deleteKvEntry(section, slug);
    if (result.ok && typeof result.version === 'number') bundleVersionRef.current = result.version;
    else if (result.status === 401) setMessage('⚠️ Cloud delete failed: invalid saved login/passcode.');
    else if (!result.ok) {
      setMessage(`⚠️ Cloud delete failed: ${result.error || 'Server error'}`);
      setMessageAction({ label: '🔄 Try again', run: () => { deleteEntryFromKV(section, slug); } });
    }
    return result.ok;
  }

  // Revert a server history entry: restore its `before` payload (or delete
  // the entry if the change created it).
  async function revertChange(entry) {
    if (!entry?.section || !entry?.slug) return;
    try {
      if (entry.before) {
        const result = await pushKvEntry(entry.section, entry.slug, entry.before);
        if (!result.ok) { setMessage(`⚠️ Revert failed: ${result.error || 'Server error'}`); return; }
        if (typeof result.version === 'number') bundleVersionRef.current = result.version;
      } else {
        const result = await deleteKvEntry(entry.section, entry.slug);
        if (!result.ok) { setMessage(`⚠️ Revert failed: ${result.error || 'Server error'}`); return; }
      }
      setMessage(`↩️ Reverted ${entry.section} change for ${entry.slug}.`);
      logChange(entry.slug, entry.section, `Reverted to previous ${entry.section} value`);
      await Promise.all([refreshAdminData(), refresh(), refreshWiki()]);
    } catch (e) {
      setMessage(`⚠️ Revert failed: ${e.message}`);
      setMessageAction({ label: '🔄 Try again', run: () => { revertChange(entry); } });
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
    if (justSavedRef.current) {
      justSavedRef.current = false;
      return; // Skip re-seed right after save to preserve user input
    }
    const seededValue = valueRowToForm(selectedValueRow, selectedUnit?.slug);
    const seededWiki = wikiRowToForm(selectedWikiRow, selectedUnit);
    setValueForm(seededValue);
    setWikiForm(seededWiki);
    setWikiImageFile(null);
    baseline('value', seededValue);
    baseline('wiki', seededWiki);
    // Draft autosave restore: if this slug has an unsaved local draft (e.g.
    // the editor refreshed mid-edit), bring it back instead of losing it.
    // (Baselines stay at the seeded values, so a restored draft correctly
    // shows as unsaved work.)
    const valueDraft = loadFormDraft('value');
    if (valueDraft?.slug === selectedUnit?.slug) {
      setValueForm(valueDraft.form);
      setMessage('↩️ Restored your unsaved value draft (not published yet).');
    }
    const wikiDraft = loadFormDraft('wiki');
    if (wikiDraft?.slug === selectedUnit?.slug) {
      setWikiForm(wikiDraft.form);
      setMessage('↩️ Restored your unsaved WIKI draft (not published yet).');
    }
  }, [selectedUnit?.slug, previewMode]);

  // Draft autosave persist: every keystroke into an editor form is kept in
  // localStorage (throttle: 400ms) so a refresh/navigation never loses work.
  useEffect(() => {
    if (activeTool !== 'values' || !selectedUnit?.slug || !valueDirty) return undefined;
    const t = setTimeout(() => saveFormDraft('value', selectedUnit.slug, valueForm), 400);
    return () => clearTimeout(t);
  }, [valueForm, valueDirty, activeTool, selectedUnit?.slug]);

  useEffect(() => {
    if (activeTool !== 'wiki' || !selectedUnit?.slug || !wikiDirty) return undefined;
    const t = setTimeout(() => saveFormDraft('wiki', selectedUnit.slug, wikiForm), 400);
    return () => clearTimeout(t);
  }, [wikiForm, wikiDirty, activeTool, selectedUnit?.slug]);

  useEffect(() => {
    if (!selectedContentItem?.slug) return undefined;
    const kind = activeTool === 'maps' ? 'maps' : 'crates';
    if (!contentDirty) return undefined;
    const t = setTimeout(() => saveFormDraft(kind, selectedContentItem.slug, contentForm), 400);
    return () => clearTimeout(t);
  }, [contentForm, contentDirty, activeTool, selectedContentItem?.slug]);

  // Note: Don't re-seed form on dataVersion change to prevent wiping user input.
  // The form is already set correctly after each save via setValueForm(payload).
  // Only re-seed when the selected unit changes (handled by the other useEffect).

  const contentSeedRef = useRef(null);
  useEffect(() => {
    if (!selectedContentItem) return;
    // Re-seed ONLY when the tool or the selected item actually changes.
    // Row objects get new identities on every KV sync — reseeding on those
    // wiped in-progress edits while typing (looked like saving was broken).
    const seedKey = `${activeTool}:${selectedContentItem.slug}`;
    if (contentSeedRef.current === seedKey) return;
    contentSeedRef.current = seedKey;
    const seededContent = activeTool === 'maps' ? { name: selectedContentRow?.name || selectedContentItem.name, description: selectedContentRow?.description || '', difficulty: selectedContentRow?.difficulty || '', unlockRequirement: selectedContentRow?.unlock_requirement || selectedContentItem.unlockRequirement || '', imageUrl: selectedContentRow?.image_url || selectedContentItem.image || '' } : { name: selectedContentRow?.name || selectedContentItem.name, description: selectedContentRow?.description || '', chances: selectedContentRow?.chances || {}, obtain: selectedContentRow?.obtain || '', effect: selectedContentRow?.effect || '', imageUrl: selectedContentRow?.image_url || selectedContentItem.imageUrl || '' };
    setContentForm(seededContent);
    setContentImageFile(null);
    baseline('content', seededContent);
    const contentDraft = loadFormDraft(activeTool === 'maps' ? 'maps' : 'crates');
    if (contentDraft?.slug === selectedContentItem.slug) {
      setContentForm(contentDraft.form);
      setMessage(`↩️ Restored your unsaved ${activeTool === 'maps' ? 'map' : 'crate'} draft (not published yet).`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, selectedContentItem?.slug]);

  const filteredUnits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = unitsWithImages.filter((unit) => {
      const matchesText = fuzzyMatch(q, `${unit.name || ''} ${unit.slug || ''} ${unit.rarity || ''} ${unit.type || ''}`);
      const matchesFilter = unitFilter === 'all' || (unitFilter === 'live' ? (activeTool === 'values' ? valueRows : wikiRows).some((row) => row.slug === unit.slug) : unit.rarity === unitFilter);
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

  async function signIn(event) {
    event.preventDefault();
    setAuthMessage('');
    const cleanEmail = email.trim().toLowerCase();
    const member = TEAM_MEMBERS[cleanEmail];
    if (!member) {
      setAuthMessage('⚠️ Email not found on the Testing team roster.');
      return;
    }
    
    setAdminLoading(true);
    try {
      const response = await fetch(`${APEX_KV_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: cleanEmail, password: password.trim() }),
      });
      
      if (response.ok) {
        const loginData = await response.json().catch(() => ({}));
        localStorage.setItem('apex-admin-email-v1', cleanEmail);
        localStorage.setItem('apex-admin-passcode-v1', password.trim());
        setMustChangePassword(loginData.mustChangePassword === true || password.trim() === 'apex2026');
        
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
        notifyAdminAuthChange();
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
    notifyAdminAuthChange();
  }

  async function updatePassword(event) {
    event.preventDefault();
    setAuthMessage('');
    const cleanEmail = email.trim().toLowerCase();
    const currentPass = password.trim();
    const nextPasscode = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (scorePasscode(nextPasscode).score < 3) {
      setAuthMessage('⚠️ Passcode too weak — use at least 8 characters with a capital letter and a number (symbols help).');
      return;
    }
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
      const response = await fetch(`${APEX_KV_URL}/change-password`, {
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
        setMustChangePassword(false);
        setAuthMessage('✅ Password updated successfully! You have been logged out for security. Please log in below with your NEW password to verify it works.');
        notifyAdminAuthChange();
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

  // Create a REAL unit (owner/editor tool): writes a WIKI row for a slug
  // outside the static roster — the site picks it up as a genuine unit with
  // its own page, shiny variant and Values entry.
  const existingSlugs = useMemo(() => new Set([...ALL_UNITS.map((u) => u.slug), ...(createdUnits || []).map((u) => u.slug)]), [createdUnits]);
  const mapSlugs = useMemo(() => new Set([...ALL_MAPS.map((m) => m.slug), ...(createdMaps || []).map((m) => m.slug)]), [createdMaps]);
  const skinSlugs = useMemo(() => new Set([...ALL_SKINS.map((m) => m.slug), ...ALL_SHINY_SKINS.map((m) => m.slug), ...(createdSkins || []).map((m) => m.slug)]), [createdSkins]);
  const materialSlugs = useMemo(() => new Set([...MATERIALS.map((m) => m.slug), ...(createdMaterials || []).map((m) => m.slug)]), [createdMaterials]);

  async function handleCreateUnit(payload) {
    if (!wikiAllowed) return;
    if (!(await verifySession())) return;
    setLocalWikiOverride(payload.slug, payload);
    setWikiRows((prev) => [payload, ...prev.filter((r) => r.slug !== payload.slug)]);
    logChange(payload.slug, 'wiki', `Created unit ${payload.name} (${payload.rarity})`);
    setMessage(`✓ Created ${payload.name}! Now fill in its stat sheet below — Ctrl+S saves as you go.`);
    setMessageAction(null);
    setActiveTool('wiki');
    setSelectedSlug(payload.slug);
    setActiveView('wiki');
    try { await Promise.all([refreshAdminData(), refresh(), refreshWiki()]); } catch { /* ignore */ }
    pushEntryToKV('wiki', payload.slug);
  }

  // Delete ANY unit (built-in or created) from the entire site: it vanishes
  // from Values, WIKI, search and counts everywhere until restored. Local
  // mark = instant; the KV registry (bundle.deletedUnits) = global. The
  // shiny variant goes with the base.
  const [restoringUnit, setRestoringUnit] = useState(null);

  async function deleteUnit() {
    if (!wikiAllowed || !selectedUnit) return;
    if (!(await verifySession())) return;
    const baseSlug = selectedUnit.slug.replace(/^shiny-/, '');
    if (!window.confirm(`Delete "${selectedUnit.name}" from the ENTIRE site?\n\nIt disappears from Values, the WIKI, search and counts — everywhere. You can restore it later from Logs & Info.`)) return;
    const name = selectedUnit.name;
    clearFormDraft('wiki');
    clearFormDraft('value');
    // IMPORTANT: the unit's wiki/value rows are KEPT (local + KV). The
    // deleted-units registry is what hides it site-wide — and keeping the
    // rows is what makes restore possible. Deleting the rows here used to
    // destroy created units forever (they had no other copy of their data).
    markLocalUnitDeleted(baseSlug);
    removeCachedWikiImage(baseSlug);
    setWikiRows((prev) => prev.filter((r) => r.slug !== baseSlug && r.slug !== `shiny-${baseSlug}`));
    setValueRows((prev) => prev.filter((r) => r.slug !== baseSlug && r.slug !== `shiny-${baseSlug}`));
    setSelectedSlug(generatedUnits.find((u) => !isUnitDeleted(u.slug))?.slug || '');
    setMessage(`🗑️ Deleted "${name}" from the site. Restore it any time in Logs & Info.`);
    setMessageAction(null);
    setDraftsVersion((v) => v + 1);
    try { await Promise.all([refreshAdminData(), refresh()]); } catch { /* ignore */ }
    // Global registry + leftover-row cleanup (idempotent; the registry
    // endpoint rides the pending worker deploy — until then the local mark
    // still hides the unit in this browser).
    const res = await addDeletedUnit(baseSlug);
    if (!res.ok && res.status === 404) setMessage(`🗑️ Deleted "${name}" locally — syncs site-wide once the worker update is deployed.`);
  }

  async function handleRestoreUnit(slug) {
    setRestoringUnit(slug);
    try {
      unmarkLocalUnitDeleted(slug);
      // HONEST RESTORE: the old code ignored the worker's answer and always
      // claimed success — a rejected restore (expired login, old worker)
      // looked like it worked while the unit stayed hidden forever.
      const res = await restoreDeletedUnit(slug).catch(() => ({ ok: false, status: 0 }));
      if (!res.ok) {
        if (res.status === 401) {
          setMessage(`⚠️ Could not restore "${slug}" — your login expired. Log in again, then press Restore once more.`);
          setMessageAction(null);
          return;
        }
        // Local mark is cleared; the site-wide registry syncs once the
        // worker update is deployed. Say so instead of claiming success.
        setMessage(`↩️ "${slug}" is restored in this browser. It returns for everyone once the worker update is deployed.`);
        setMessageAction(null);
        await refreshAdminData().catch(() => {});
        return;
      }
      // DEEP RESTORE: units deleted by the OLD code had their rows wiped
      // from the database. If this unit's data is missing, rebuild it from
      // the server-side edit history (every save was recorded there).
      const revived = await resurrectUnitFromHistory(slug);
      await Promise.all([refreshAdminData(), refresh()]);
      setMessage(revived
        ? `↩️ Restored "${slug}" — its data was rebuilt from edit history and it is live everywhere again.`
        : `↩️ Restored "${slug}" — it is live everywhere again.`);
      setMessageAction(null);
    } finally {
      setRestoringUnit(null);
    }
  }

  // Rebuild a wiped unit's rows (wiki + value, base and shiny) from the
  // worker's edit history. Returns true if anything was rebuilt.
  async function resurrectUnitFromHistory(slug) {
    if (!session?.user?.id) return false;
    let rebuilt = false;
    for (const section of ['wiki', 'value']) {
      for (const s of [slug, `shiny-${slug}`]) {
        try {
          const history = await fetchUnitHistory(section, s);
          if (!Array.isArray(history) || !history.length) continue;
          // newest record that still carries data (after for edits, before
          // for the wipe-delete itself)
          let row = null;
          for (let i = history.length - 1; i >= 0; i -= 1) {
            const r = history[i];
            const candidate = r?.after || r?.before;
            if (candidate && typeof candidate === 'object' && (candidate.slug || r.slug === s)) { row = candidate; break; }
          }
          if (!row) continue;
          const payload = { ...row, slug: s, resurrected: true, resurrected_at: new Date().toISOString() };
          if (section === 'wiki') setLocalWikiOverride(s, payload);
          else setLocalValueOverride(s, payload);
          await pushKvEntry(section, s, payload).catch(() => {});
          logChange(s, section, `Deep-restore: rebuilt ${section} row from edit history`);
          rebuilt = true;
        } catch { /* history unavailable — skip */ }
      }
    }
    return rebuilt;
  }

  // Materials editor (editing; creation lives in the Create hub)
  const [materialSlug, setMaterialSlug] = useState(null);
  const [materialQuery, setMaterialQuery] = useState('');
  const [materialForm, setMaterialForm] = useState({ name: '', description: '', effect: '', obtainText: '', imageUrl: null });
  const [materialImageFile, setMaterialImageFile] = useState(null);

  const materialList = useMemo(() => {
    // Static roster merged with the materials lane (own system — never wiki
    // rows, never units, never shiny variants).
    const base = MATERIALS.map((m) => {
      const row = materialRowMap?.[m.slug];
      return row ? { ...m, name: row.name || m.name, description: row.description || m.description || '', effect: row.effect || '', obtain: Array.isArray(row.obtain) ? row.obtain : [], imageUrl: row.image_url ?? row.imageUrl ?? null, documented: true } : { ...m, description: m.description || '', effect: m.effect || '', obtain: m.obtain || [], imageUrl: m.imageUrl || null };
    });
    const q = materialQuery.trim().toLowerCase();
    return [...base, ...(createdMaterials || [])].filter((m) => !q || String(m.name).toLowerCase().includes(q) || m.slug.includes(q));
  }, [materialRowMap, createdMaterials, materialQuery]);

  const selectedMaterial = materialList.find((m) => m.slug === materialSlug) || materialList[0];

  // CLEAR THE WORKSPACE (one time): materials used to be stored as WIKI rows
  // with a kind marker. They now live in their OWN system. On first load we
  // sweep the local WIKI lane: real material rows migrate to the materials
  // lane; any 'shiny-' material junk (there are NO shiny materials) is
  // deleted outright.
  const materialsSweptRef = useRef(false);
  useEffect(() => {
    if (materialsSweptRef.current) return;
    materialsSweptRef.current = true;
    try {
      const wikiLane = loadLocalWikiOverrides() || {};
      const legacy = Object.entries(wikiLane).filter(([, row]) => row && row.kind === 'material');
      if (!legacy.length) return;
      let moved = 0;
      let dropped = 0;
      legacy.forEach(([slug, row]) => {
        setLocalWikiOverride(slug, null); // remove from the WIKI workspace
        if (slug.startsWith('shiny-')) { dropped += 1; return; }
        setLocalMaterialOverride(slug, row); // into the materials system
        moved += 1;
      });
      logChange('materials', 'system', `Materials moved to their own system (${moved} migrated, ${dropped} shiny junk dropped)`);
    } catch { /* ignore */ }
  }, []);

  const materialSeedRef = useRef(null);
  useEffect(() => {
    if (!selectedMaterial) return;
    if (materialSeedRef.current === selectedMaterial.slug) return;
    materialSeedRef.current = selectedMaterial.slug;
    setMaterialForm({ name: selectedMaterial.name || '', description: selectedMaterial.description || '', effect: selectedMaterial.effect || '', obtainText: (selectedMaterial.obtain || []).join('\n'), imageUrl: selectedMaterial.imageUrl || null });
    setMaterialImageFile(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaterial?.slug]);

  async function saveMaterial() {
    if (!wikiAllowed || !selectedMaterial) return;
    if (!session?.user?.id) { setMessage('Session expired. Please log in again.'); return; }
    if (!(await verifySession())) return;
    setSaving(true);
    setMessage('');
    try {
      let imageUrl = materialForm.imageUrl || null;
      if (materialImageFile) imageUrl = await uploadUnitImage(materialImageFile, selectedMaterial.slug, session);
      const payload = {
        slug: selectedMaterial.slug,
        name: materialForm.name.trim() || selectedMaterial.slug,
        kind: 'material',
        description: materialForm.description.trim(),
        effect: materialForm.effect.trim(),
        obtain: materialForm.obtainText.split('\n').map((line) => line.trim()).filter(Boolean),
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
        updated_by: session.user.email,
      };
      setLocalMaterialOverride(payload.slug, payload);
      logChange(payload.slug, 'material', `Material updated: ${payload.name}`);
      setMessage(`✓ Saved material "${payload.name}"!`);
      setMessageAction(null);
      materialSeedRef.current = null; // re-seed from the saved state
      try { await Promise.all([refreshAdminData(), refreshWiki()]); } catch { /* ignore */ }
      pushEntryToKV('materials', payload.slug);
    } catch (error) {
      setMessage(`Material save failed: ${errorMessage(error)}`);
    }
    setSaving(false);
  }

  // Create hub handlers (real entities, no "custom" concept)
  async function handleCreateMap(payload) {
    if (!wikiAllowed) return;
    if (!(await verifySession())) return;
    setLocalMapOverride(payload.slug, payload);
    setMapRows((prev) => [payload, ...prev.filter((r) => r.slug !== payload.slug)]);
    logChange(payload.slug, 'map', `Created map ${payload.name}`);
    setMessage(`✓ Created map "${payload.name}"! Now fill in its details in the Maps editor.`);
    setMessageAction(null);
    setActiveView('maps');
    setActiveTool('maps');
    setContentSlug(payload.slug);
    try { await Promise.all([refreshAdminData(), refreshContent()]); } catch { /* ignore */ }
    pushEntryToKV('map', payload.slug);
  }

  async function handleCreateSkin(payload) {
    if (!wikiAllowed) return;
    if (!(await verifySession())) return;
    setLocalWikiOverride(payload.slug, payload);
    setWikiRows((prev) => [payload, ...prev.filter((r) => r.slug !== payload.slug)]);
    logChange(payload.slug, 'skin', `Created skin ${payload.name}${payload.shiny ? ' (Shiny)' : ''}`);
    setMessage(`✓ Created skin "${payload.name}"! It is live on the skins pages.`);
    setMessageAction(null);
    try { await Promise.all([refreshAdminData(), refreshWiki()]); } catch { /* ignore */ }
    pushEntryToKV('wiki', payload.slug);
  }

  async function handleCreateMaterial(payload) {
    if (!wikiAllowed) return;
    if (!(await verifySession())) return;
    setLocalMaterialOverride(payload.slug, payload);
    logChange(payload.slug, 'material', `Created material ${payload.name}`);
    setMessage(`✓ Created material "${payload.name}"! Edit it any time under Materials.`);
    setMessageAction(null);
    setActiveView('materials');
    try { await Promise.all([refreshAdminData(), refreshWiki()]); } catch { /* ignore */ }
    pushEntryToKV('materials', payload.slug);
  }

  // Lightweight credential probe (any admin-authed endpoint works). Only a
  // definitive 401 counts as expired — offline/404 (worker not yet deployed)
  // never blocks local editing. Result is cached for 60s.
  const sessionCheckRef = useRef({ at: 0, ok: true });
  async function verifySession() {
    const now = Date.now();
    if (now - sessionCheckRef.current.at < 60000) return sessionCheckRef.current.ok;
    try {
      const res = await fetch(`${APEX_KV_URL}/changes`, { headers: getAdminHeaders() }).catch(() => null);
      const ok = !(res && res.status === 401);
      sessionCheckRef.current = { at: now, ok };
      if (!ok) setMessage('⚠️ Your login expired — please log in again. Your unsaved edits are kept as a draft.');
      return ok;
    } catch {
      return true; // network trouble is not a session problem
    }
  }

  // Log out everywhere (#22): rotates the passcode server-side and saves the
  // new one here — every other device's saved login becomes invalid instantly.
  async function handleLogoutEverywhere() {
    if (!window.confirm('Log out ALL other devices? Your passcode will be rotated — only this browser stays signed in.')) return;
    try {
      const result = await logoutEverywhere();
      if (result.ok && result.passcode) {
        localStorage.setItem('apex-admin-passcode-v1', result.passcode);
        sessionCheckRef.current = { at: 0, ok: true };
        setAuthMessage('✓ All other devices were logged out. Your new passcode was saved in this browser automatically.');
      } else {
        setAuthMessage(`⚠️ Could not log out everywhere: ${result.error || 'server error'} (needs the updated worker deployed).`);
      }
    } catch (e) {
      setAuthMessage(`⚠️ Could not log out everywhere: ${e.message}`);
    }
  }

  // Unpublished-work indicator (#20)
  // Honest definition of "unsaved": live form drafts (autosaved, not yet
  // saved/published) + deletions that have not reached the cloud yet.
  const SECTION_META = {
    value: { icon: '💰', tool: 'values' },
    wiki: { icon: '📖', tool: 'wiki' },
    maps: { icon: '🗺️', tool: 'maps' },
    crates: { icon: '📦', tool: 'crates' },
  };

  const draftEntries = useMemo(() => {
    void draftsVersion;
    const entries = [];
    for (const kind of ['value', 'wiki', 'maps', 'crates']) {
      const draft = loadFormDraft(kind);
      if (draft?.slug) entries.push({ type: 'form', kind, slug: draft.slug });
    }
    const deleted = loadLocalDeletedOverrides() || {};
    Object.entries(deleted).forEach(([section, slugs]) =>
      (slugs || []).forEach((slug) => entries.push({ type: 'delete', kind: section, slug })));
    return entries;
  }, [draftsVersion]);

  function openDraft(entry) {
    const meta = SECTION_META[entry.kind] || SECTION_META.value;
    if (entry.kind === 'value' || entry.kind === 'wiki') {
      setActiveTool(meta.tool);
      setSelectedSlug(entry.slug);
    } else {
      setActiveTool(meta.tool);
      setContentSlug(entry.slug);
    }
    setDraftsOpen(false);
  }

  function discardDraft(entry) {
    if (entry.type === 'form') clearFormDraft(entry.kind);
    else unmarkLocalOverrideDeleted(entry.kind, entry.slug);
    setDraftsVersion((v) => v + 1);
  }

  async function publishPendingDelete(entry) {
    const ok = await deleteEntryFromKV(entry.kind, entry.slug);
    if (ok) {
      unmarkLocalOverrideDeleted(entry.kind, entry.slug);
      setDraftsVersion((v) => v + 1);
      refreshAdminData().catch(() => {});
    }
  }

  function handleSelectRecent(entry) {
    setActiveTool(entry.kind === 'values' ? 'values' : 'wiki');
    setSelectedSlug(entry.slug);
  }

  // Re-verify quietly when the tab regains focus (catches overnight logouts).
  useEffect(() => {
    function onFocus() {
      if (!session?.user?.id) return;
      if (Date.now() - sessionCheckRef.current.at > 300000) verifySession();
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [session?.user?.id]);

  async function saveValue() {
    if (!valueAllowed || !selectedUnit) return;
    if (!session?.user?.id) {
      setMessage('Session expired. Please log in again.');
      return;
    }
    // Pre-flight credential check: fail BEFORE saving (drafts are preserved),
    // never after the editor already typed a full form.
    if (!(await verifySession())) return;
    // Commit any pending range input and get the parsed values directly
    let committedRange = null;
    if (commitRangeRef.current) committedRange = commitRangeRef.current();
    // Apply committed range to form state synchronously before normalizing
    const formSnapshot = { ...valueForm };
    if (committedRange) {
      formSnapshot.baseValue = committedRange.baseValue;
      formSnapshot.baseValueMax = committedRange.baseValueMax;
    }
    setSaving(true);
    setMessage('');
    try {
      const next = normalizeValueForm(formSnapshot);
      const currentValue = selectedValueRow?.base_value || 0;

      // Record value change for trend graph
      recordValueChange(selectedUnit.slug, currentValue, { value: next.baseValue, gems: next.gems, coins: next.coins });

      // Push to undo stack
      undoRedo.push({ kind: 'value', form: valueForm, slug: selectedUnit.slug, at: Date.now() });

      // SANDBOX→KV FLOW (the one canonical save path): write the local
      // override as the canonical draft, then publish the whole bundle to the
      // Cloudflare KV database. The publish makes it live for all players.
      const payload = {
        slug: selectedUnit.slug,
        base_value: next.baseValue, baseValue: next.baseValue,
        base_value_max: next.baseValueMax, baseValueMax: next.baseValueMax,
        gems: next.gems, coins: next.coins,
        gems_max: next.gemsMax, gemsMax: next.gemsMax,
        coins_max: next.coinsMax, coinsMax: next.coinsMax,
        demand: next.demand, scarcity: next.scarcity, trend: next.trend, notes: next.notes,
        updated_at: new Date().toISOString(), updated_by: session.user.email
      };
      setLocalValueOverride(selectedUnit.slug, payload);
      setValueRows((prev) => {
        const filtered = prev.filter((r) => r.slug !== selectedUnit.slug);
        return [payload, ...filtered];
      });
      justSavedRef.current = true;
      logChange(selectedUnit.slug, 'value', `Value: ${next.baseValue}${next.baseValueMax ? '-' + next.baseValueMax : ''} | Gems: ${next.gems} | Coins: ${next.coins} | ${next.demand} / ${next.scarcity}`);
      setMessage(`✓ Saved! Value: ${next.baseValue}${next.baseValueMax ? '-' + next.baseValueMax : ''} | Gems: ${next.gems} | Coins: ${next.coins}`);
      setMessageAction(null);
      baseline('value', valueForm); // the on-screen form IS what was saved
      clearFormDraft('value');
      pushRecentEdit({ slug: selectedUnit.slug, name: selectedUnit.name || selectedUnit.slug, kind: 'values' });
      setRecentEdits(loadRecentEdits());
      setDraftsVersion((v) => v + 1);
      try { await pushEntryToKV('value', selectedUnit.slug); } catch { /* ignore */ }
      try { await refreshAdminData({ logsOnly: true }); } catch { /* ignore */ }
    } catch (error) {
      setMessage(`Save failed: ${errorMessage(error)}`);
    }
    setSaving(false);
  }

  async function resetValue() {
    if (!valueAllowed || !selectedUnit) return;
    clearFormDraft('value');
    setLocalValueOverride(selectedUnit.slug, null);
    markLocalOverrideDeleted('value', selectedUnit.slug);
    setMessage(`✓ Removed live value override for ${selectedUnit.name}! Fallback value restored.`);
    setValueRows((prev) => [...prev]);
    try {
      await refresh();
      await refreshAdminData();
    } catch {
      // ignore
    }
    deleteEntryFromKV('value', selectedUnit.slug);
  }

  async function saveWiki() {
    if (!wikiAllowed || !selectedUnit) return;
    if (!session?.user?.id) {
      setMessage('Session expired. Please log in again.');
      return;
    }
    // Pre-flight credential check: fail BEFORE saving (drafts are preserved),
    // never after the editor already typed a full form.
    if (!(await verifySession())) return;
        undoRedo.push({ kind: 'wiki', form: wikiForm, slug: selectedUnit.slug, at: Date.now() });
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
      // SANDBOX→KV FLOW: local override (canonical draft) → publish bundle.
      const payload = {
        slug: selectedUnit.slug,
        name: wikiForm.name || selectedUnit.name, description: wikiForm.description, type: wikiForm.type,
        raw_type: wikiForm.rawType, category: wikiForm.category, placement_limit: wikiForm.placementLimit,
        total_cost: wikiForm.totalCost, early_game_rank: wikiForm.earlyGameRank || null, late_game_rank: wikiForm.lateGameRank || null,
        passive: wikiForm.passive, ability: wikiForm.ability, synergy: wikiForm.synergy,
        obtain, min_max_stats: minMaxStats, upgrades, image_url: imageUrl, updated_at: new Date().toISOString(),
        updated_by: session.user.email,
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
      baseline('wiki', wikiRowToForm(payload, selectedUnit));
      if (imageUrl) saveCachedWikiImage(selectedUnit.slug, imageUrl);
      setMessage('✓ Saved WIKI override! Auto-syncing Shiny variant…');
      logChange(selectedUnit.slug, 'wiki', `Wiki updated: ${wikiForm.name || selectedUnit.name}`);
      // AUTO-SYNC: silently generate the Shiny variant with 1.5× damage
      try {
        await autoSyncShinyVariant(payload, selectedUnit, units, session, setLocalWikiOverride, setWikiRows, setLocalWikiOverride);
      } catch (e) {
        console.warn('Shiny auto-sync skipped:', e);
      }
      try {
        refreshWiki();
      } catch {
        // ignore
      }
      await pushEntryToKV('wiki', selectedUnit.slug);
      clearFormDraft('wiki');
      pushRecentEdit({ slug: selectedUnit.slug, name: selectedUnit.name || selectedUnit.slug, kind: 'wiki' });
      setRecentEdits(loadRecentEdits());
      setDraftsVersion((v) => v + 1);
      // The shiny auto-sync above wrote its own local draft — publish it too.
      const shinySlug = makeShinySlug(selectedUnit.slug);
      if (shinySlug !== selectedUnit.slug) {
        try { await pushEntryToKV('wiki', shinySlug); } catch { /* ignore */ }
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
    // Pre-flight credential check: fail BEFORE saving (drafts are preserved),
    // never after the editor already typed a full form.
    if (!(await verifySession())) return;
        undoRedo.push({ kind: 'content', form: contentForm, slug: selectedContentItem.slug, at: Date.now() });
    setSaving(true); setMessage('');
    try {
      const mapsMode = activeTool === 'maps';
      const imageUrl = contentImageFile ? await uploadContentImage(contentImageFile, mapsMode ? 'maps' : 'crates', selectedContentItem.slug, session) : (contentForm.imageUrl || null);
      const payload = mapsMode ? { slug: selectedContentItem.slug, name: contentForm.name, description: contentForm.description || null, difficulty: contentForm.difficulty || null, unlock_requirement: contentForm.unlockRequirement || null, image_url: imageUrl, updated_by: session.user.email, updated_at: new Date().toISOString() } : { slug: selectedContentItem.slug, name: contentForm.name, description: contentForm.description || null, image_url: imageUrl, chances: contentForm.chances || {}, obtain: contentForm.obtain || null, effect: contentForm.effect || null, updated_by: session.user.email, updated_at: new Date().toISOString() };

      // SANDBOX→KV FLOW: write the local override, update the rows state,
      // then publish this ONE entry to Cloudflare KV (concurrent-safe).
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
      const savedContent = mapsMode
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
          };
      setContentForm(savedContent);
      setContentImageFile(null);
      baseline('content', savedContent);
      setMessage(`✓ Saved ${mapsMode ? 'map' : 'crate'} override!`);
      clearFormDraft(activeTool === 'maps' ? 'maps' : 'crates');
      setDraftsVersion((v) => v + 1);
      logChange(selectedContentItem.slug, mapsMode ? 'map' : 'crate', `${mapsMode ? 'Map' : 'Crate'} updated: ${contentForm.name}`);
      pushEntryToKV(mapsMode ? 'map' : 'crate', selectedContentItem.slug);
    } catch (error) { setMessage(`Content save failed: ${errorMessage(error)}`); }
    setSaving(false);
  }

  async function resetContent() {
    if (!selectedContentItem) return;
    const mapsMode = activeTool === 'maps';
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
    const resetContentForm = mapsMode
      ? { name: selectedContentItem.name, description: '', difficulty: '', unlockRequirement: selectedContentItem.unlockRequirement || '', imageUrl: selectedContentItem.image || '' }
      : { name: selectedContentItem.name, description: '', chances: {}, obtain: '', effect: '', imageUrl: selectedContentItem.imageUrl || '' };
    setContentForm(resetContentForm);
    baseline('content', resetContentForm);
    deleteEntryFromKV(mapsMode ? 'map' : 'crate', selectedContentItem.slug);
  }

  async function resetWiki() {
    if (!wikiAllowed || !selectedUnit) return;
    setLocalWikiOverride(selectedUnit.slug, null);
    markLocalOverrideDeleted('wiki', selectedUnit.slug);
    removeCachedWikiImage(selectedUnit.slug);
    setMessage(`✓ Removed live WIKI override for ${selectedUnit.name}!`);
    setWikiRows((prev) => [...prev]);
    try {
      await refreshAdminData({ logsOnly: true });
    } catch {
      // ignore
    }
    deleteEntryFromKV('wiki', selectedUnit.slug);
  }

  function applySnapshot(snapshot, label) {
    if (!snapshot?.form) return;
    if (snapshot.kind === 'value') {
      setSelectedSlug(snapshot.slug);
      setValueForm(snapshot.form);
    } else if (snapshot.kind === 'wiki') {
      setSelectedSlug(snapshot.slug);
      setWikiForm(snapshot.form);
    } else if (snapshot.kind === 'content') {
      setContentSlug(snapshot.slug);
      setContentForm(snapshot.form);
    }
    baseline(snapshot.kind === 'content' ? 'content' : snapshot.kind, snapshot.form);
    setMessage(label);
    setMessageAction(null);
  }
  const undoHotkeyRef = useRef(null);
  undoHotkeyRef.current = () => {
    const snapshot = undoRedo.undo();
    if (snapshot) applySnapshot(snapshot, `↩️ Undid ${snapshot.kind} change for ${snapshot.slug}.`);
  };
  const redoHotkeyRef = useRef(null);
  redoHotkeyRef.current = () => {
    const snapshot = undoRedo.redo();
    if (snapshot) applySnapshot(snapshot, `↪️ Redid ${snapshot.kind} change for ${snapshot.slug}.`);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveHotkeyRef.current?.();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        // Only inside the admin panel, and never while typing in inputs —
        // native text undo stays available there.
        const tag = String(e.target?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
        e.preventDefault();
        if (e.shiftKey) redoHotkeyRef.current?.();
        else undoHotkeyRef.current?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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

  if (mustChangePassword && session) {
    return (
      <main className="admin-page">
        <AuthPanel title="Set Your Own Password First" message={authMessage}>
          <div className="admin-message" role="alert" style={{ marginBottom: 14 }}>
            ⚠️ You are still using the <strong>default password</strong> — change it before you can edit the site. Pick something only you know.
          </div>
          <form className="admin-auth-form" onSubmit={updatePassword}>
            <label>Your Email Address</label>
            <input type="email" value={email || session.user.email} onChange={(e) => setEmail(e.target.value)} placeholder="editor@email.com" required />
            <label>Current Password (the default one)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Current Password…" required />
            <label>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password…" minLength={6} required aria-describedby="pass-strength-meter" />
            {newPassword && (
              <div id="pass-strength-meter" className={`pass-strength s-${scorePasscode(newPassword).score}`} aria-live="polite">
                <div className="pass-bars" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < scorePasscode(newPassword).score ? 'on' : ''} />)}
                </div>
                <small>{scorePasscode(newPassword).label}</small>
              </div>
            )}
            <label>Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm New Password…" minLength={6} required />
            <button type="submit" className="filled" disabled={resetSaving}>{resetSaving ? 'Saving…' : '🔐 Change Password & Continue'}</button>
          </form>
          <button type="button" className="ghost admin-logout-all" onClick={signOut} style={{ marginTop: 12 }}>Cancel & log out</button>
        </AuthPanel>
      </main>
    );
  }

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
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password…" minLength={6} required aria-describedby="pass-strength-meter" />
            {newPassword && (
              <div id="pass-strength-meter" className={`pass-strength s-${scorePasscode(newPassword).score}`} aria-live="polite">
                <div className="pass-bars" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < scorePasscode(newPassword).score ? 'on' : ''} />)}
                </div>
                <small>{scorePasscode(newPassword).label}</small>
              </div>
            )}
            <label>Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm New Password…" minLength={6} required />
            <button type="button" className="ghost admin-logout-all" onClick={handleLogoutEverywhere} title="Rotate your passcode so every other device gets logged out">
              🚪 Log out everywhere
            </button>
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
        <AuthPanel title="Testing Admin Login" message={authMessage}>
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

  const canManageSite = role === 'owner' || role === 'admin';

  return (
    <main className="admin-page">
      {/* Maintenance notice — the admin exception page: the panel keeps
          working while the public site shows the maintenance screen. */}
      {maintenance?.on && (
        <div
          role="status"
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
            margin: '0 0 14px', padding: '12px 16px',
            background: 'rgba(229, 72, 77, 0.12)',
            border: '1px solid rgba(229, 72, 77, 0.45)',
            borderRadius: '12px', color: '#ffb3b6', fontSize: '13.5px',
          }}
        >
          <span style={{ fontSize: '18px' }}>🛠️</span>
          <span style={{ flex: 1, minWidth: '220px' }}>
            <strong>Maintenance mode is ON.</strong> Visitors are seeing the “We’re under maintenance” page — the admin panel stays open for the team.
          </span>
          {canManageSite && (
            <button
              type="button"
              onClick={handleToggleMaintenance}
              disabled={maintenance.loading}
              style={{
                padding: '7px 14px', borderRadius: '9px', cursor: 'pointer',
                border: '1px solid rgba(229, 72, 77, 0.6)',
                background: 'rgba(229, 72, 77, 0.25)', color: '#ffd6d8',
                fontSize: '13px', fontWeight: 600,
              }}
            >
              {maintenance.loading ? '…' : 'Turn maintenance OFF'}
            </button>
          )}
        </div>
      )}
      {/* Top Bar */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <span className="admin-topbar-title">⚡ TESTING ADMIN</span>
          <span className="admin-topbar-user">{getDisplayName(session?.user?.email, true)} {ROLE_EMOJI[role] || '🔧'} ({role})</span>
        </div>
        <div className="admin-topbar-actions">
          {draftEntries.length > 0 && (
            <div className="admin-drafts-wrap">
              <button
                type="button"
                className="admin-drafts-pill"
                onClick={() => setDraftsOpen((v) => !v)}
                title="Unsaved drafts and pending deletions in this browser"
              >
                ✏️ {draftEntries.length} unsaved
              </button>
              {draftsOpen && (
                <div className="admin-drafts-panel card">
                  <div className="admin-drafts-head">
                    <strong>Not live yet (this browser)</strong>
                    <button type="button" onClick={() => setDraftsOpen(false)} aria-label="Close drafts panel">✕</button>
                  </div>
                  <div className="admin-drafts-list" data-lenis-prevent>
                    {draftEntries.map((entry) => {
                      const meta = SECTION_META[entry.kind] || SECTION_META.value;
                      return (
                        <div key={`${entry.type}:${entry.kind}:${entry.slug}`} className="admin-drafts-row">
                          <span>{meta.icon} {entry.slug}</span>
                          <span className="admin-drafts-row-actions">
                            {entry.type === 'form' ? (
                              <>
                                <button type="button" onClick={() => openDraft(entry)} title="Open this editor to review and save">✏️ Open</button>
                                <button type="button" onClick={() => discardDraft(entry)} title="Throw this draft away">🗑️ Discard</button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => publishPendingDelete(entry)} title="Apply this deletion to the live database">🗑️ Make live</button>
                                <button type="button" onClick={() => discardDraft(entry)} title="Cancel this deletion">↩️ Cancel</button>
                              </>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <button className="admin-topbar-btn" onClick={() => navigate('/admin/reset-password')}>🔒 Password</button>
          <button className="admin-topbar-btn danger" onClick={signOut}>Logout</button>
        </div>
      </div>

      <div className="admin-layout-main">
        {/* Sidebar */}
        <nav className="admin-sidebar">
          {SIDEBAR_ITEMS.map(item => {
            if (item.id === 'bugs' && role !== 'owner' && role !== 'admin') return null;
            if (item.id === 'announcements' && role !== 'owner' && role !== 'admin') return null;
            if (item.id === 'create' && !wikiAllowed) return null;
            return (
              <button key={item.id} className={`admin-sidebar-item ${activeView === item.id ? 'active' : ''}`} onClick={() => { setActiveView(item.id); if (['values','wiki','maps','crates'].includes(item.id)) setActiveTool(item.id); }}>
                <span className="admin-sidebar-icon">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="admin-content">

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <AdminDashboard
          stats={stats}
          wikiCount={wikiRows.length}
          shinyCount={SHINY_UNITS.length}
          edits24h={edits24h}
          role={role}
          wikiAllowed={wikiAllowed}
          valueAllowed={valueAllowed}
          maintenance={maintenance}
          onToggleMaintenance={handleToggleMaintenance}
          deletedCount={deletedUnitSlugs.length}
          recentEdits={recentEdits}
          onNavigate={(view) => { setActiveView(view); if (['values','wiki','maps','crates'].includes(view)) setActiveTool(view); }}
        />
      )}

      {/* Editor Views - only show when corresponding sidebar is active */}
      {activeView === 'bugs' && (role === 'owner' || role === 'admin') ? (
        <BugReportAdmin />
      ) : activeView === 'materials' ? (
        <section className="admin-content-layout">
          <aside className="admin-unit-picker card">
            <div className="admin-section-head"><h2>Materials</h2><span className="admin-count-badge">{materialList.length}</span></div>
            <input className="admin-search" value={materialQuery} onChange={(e) => setMaterialQuery(e.target.value)} placeholder="Search materials…" aria-label="Search materials" />
            <div className="admin-unit-list" data-lenis-prevent>
              {materialList.map((m) => (
                <button type="button" key={m.slug} className={m.slug === selectedMaterial?.slug ? 'admin-unit active' : 'admin-unit'} onClick={() => setMaterialSlug(m.slug)}>
                  <span className="admin-unit-text"><strong>{m.name}</strong><small>{m.slug}{m.documented ? '' : ' · stub'}</small></span>
                </button>
              ))}
            </div>
          </aside>
          <section className="admin-editor card">
            <p className="admin-kicker">Material</p>
            <h2>🧪 {selectedMaterial?.name || 'Material'}</h2>
            <AdminMessage message={message} action={messageAction} />
            <div className="admin-upload-zone">
              {(materialImageFile || materialForm.imageUrl) ? (
                <img className="admin-image-preview" src={materialImageFile ? URL.createObjectURL(materialImageFile) : materialForm.imageUrl} alt="Material preview" />
              ) : (
                <strong>Material image (optional)</strong>
              )}
              <label className="admin-upload-button">📸 Upload Image<input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f?.type?.startsWith('image/')) setMaterialImageFile(await compressImage(f)); }} /></label>
            </div>
            <div className="admin-form-grid">
              <label className="admin-field"><span>Name</span>
                <input className="admin-text-input" value={materialForm.name} onChange={(e) => setMaterialForm((p) => ({ ...p, name: e.target.value }))} />
              </label>
              <label className="admin-field"><span>Effect</span>
                <input className="admin-text-input" value={materialForm.effect} onChange={(e) => setMaterialForm((p) => ({ ...p, effect: e.target.value }))} placeholder="e.g. Unlocks the Frost Key door" />
              </label>
              <label className="admin-field full"><span>Description</span>
                <textarea className="admin-textarea" rows={2} value={materialForm.description} onChange={(e) => setMaterialForm((p) => ({ ...p, description: e.target.value }))} />
              </label>
              <label className="admin-field full"><span>How to obtain (one per line)</span>
                <textarea className="admin-textarea" rows={2} value={materialForm.obtainText} onChange={(e) => setMaterialForm((p) => ({ ...p, obtainText: e.target.value }))} />
              </label>
              <div className="admin-field full">
                <button type="button" className="filled" onClick={saveMaterial} disabled={saving}>{saving ? 'Saving…' : '💾 Save Material'}</button>
              </div>
            </div>
          </section>
        </section>
      ) : activeView === 'maps' || activeView === 'crates' ? (
        <section className="admin-content-layout"><aside className="admin-unit-picker card"><div className="admin-section-head"><h2>{activeTool === 'maps' ? 'Maps' : 'Crates'}</h2><span>{contentItems.length}</span></div><input className="admin-search" placeholder={`Search ${activeTool}…`} onChange={(e) => { const q = e.target.value.toLowerCase(); setContentSlug(contentItems.find((item) => item.name.toLowerCase().includes(q))?.slug || contentItems[0]?.slug); }} /><div className="admin-unit-list">{contentItems.map((item) => <button type="button" key={item.slug} className={item.slug === selectedContentItem?.slug ? 'admin-unit active' : 'admin-unit'} onClick={() => setContentSlug(item.slug)}><span className="admin-unit-text"><strong>{item.name}</strong><small>{item.slug}</small></span></button>)}</div></aside><ContentEditor kind={activeTool} item={selectedContentItem} form={contentForm} setForm={setContentForm} imageFile={contentImageFile} setImageFile={setContentImageFile} onSave={saveContent} onReset={resetContent} saving={saving} dirty={contentDirty} /></section>
      ) : (activeView === 'values' || activeView === 'wiki') && (
        <section className="admin-layout">
          {activeTool === 'values' ? (
            <ValueEditor
              unit={selectedUnit} form={valueForm} tradeValue={tradeValue} selectedRow={selectedValueRow}
              updateField={updateValueField} saveValue={saveValue} resetValue={resetValue} refresh={refreshAdminData}
              saving={saving} message={message} messageAction={messageAction} navigate={navigate} dirty={valueDirty}
              imageMap={adminImageMap} wikiRows={wikiRows}
              commitRangeRef={commitRangeRef}
            />
          ) : (
            <WikiEditor
              unit={selectedUnit} form={wikiForm} selectedRow={selectedWikiRow} updateField={updateWikiField}
              imageFile={wikiImageFile} setImageFile={setWikiImageFile} saveWiki={saveWiki} resetWiki={resetWiki} canDeleteUnit={!!selectedUnit} onDeleteUnit={deleteUnit}
              refresh={refreshAdminData} saving={saving} message={message} messageAction={messageAction} navigate={navigate} dirty={wikiDirty}
              imageMap={adminImageMap} wikiRows={wikiRows}
            />
          )}
          <UnitPicker
            units={filteredUnits} total={units.length} query={query} setQuery={setQuery} filter={unitFilter} setFilter={setUnitFilter}
            selectedUnit={selectedUnit} selectUnit={selectUnit} valueRows={valueRows} wikiRows={wikiRows} mode={activeTool}
            imageMap={adminImageMap}
            recentEdits={recentEdits}
            onSelectRecent={handleSelectRecent}
          />
        </section>
      )}

          {/* Create hub (WIKI editors): Units · Maps · Skins · Materials */}
      {activeView === 'create' && wikiAllowed && (
        <CreateHub
          session={session}
          saving={saving}
          existingSlugs={existingSlugs}
          mapSlugs={mapSlugs}
          skinSlugs={skinSlugs}
          materialSlugs={materialSlugs}
          onCreate={handleCreateUnit}
          onCreateMap={handleCreateMap}
          onCreateSkin={handleCreateSkin}
          onCreateMaterial={handleCreateMaterial}
        />
      )}

      {/* Announcements Studio (owner only) */}
      {activeView === 'announcements' && (role === 'owner' || role === 'admin') && (
        <AnnouncementStudio onStatus={setMessage} />
      )}

      {/* Logs & Info */}
          {activeView === 'logs' && (
            <div>
              <ChangeFeed />
              <AdminLog activeTool="values" valueLog={valueLog} wikiLog={wikiLog} role={role} valueLogs={valueLog} wikiLogs={wikiLog} localChangeLog={localChangeLog} onClearLogs={() => setLocalChangeLog([])} onRevert={revertChange} />
            <DeletedUnitsPanel units={[...deletedUnitSlugs]} onRestore={handleRestoreUnit} restoring={restoringUnit} />
              {(role === 'owner' || role === 'admin') && <MarketAnalytics valueRows={valueRows} units={units} />}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
