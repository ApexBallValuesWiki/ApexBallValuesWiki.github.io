// ============================================================================
// Admin safety & efficiency helpers (backlog batch utilities).
// - fuzzyMatch: typo-tolerant search scoring for the unit picker
// - compressImage: shrink uploads in-browser before they hit the database
// - scorePasscode: strength meter for passcode changes
// - form drafts: autosave/restore unsaved editor forms
// - recent edits: "recently touched" quick-row memory
// ============================================================================

/** True when every word of `query` matches `text` as a subsequence
 *  (order-preserving, gaps allowed) — "shade d" matches "Shade Demon". */
export function fuzzyMatch(query, text) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const t = String(text || '').toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return words.every((word) => {
    if (t.includes(word)) return true;
    let i = 0;
    for (const ch of t) {
      if (ch === word[i]) {
        i += 1;
        if (i === word.length) return true;
      }
    }
    return false;
  });
}

/** Downscale an image file in-browser. PNG keeps its format (transparency);
 *  everything else becomes JPEG at `quality`. If compression would not help
 *  (small file / larger output), the original file is returned untouched. */
export function compressImage(file, maxDim = 1280, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/gif') {
      resolve(file);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        // No downscale needed and already a compressed format → keep original.
        if (scale >= 1 && !['image/png', 'image/webp'].includes(file.type)) {
          resolve(file);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob((blob) => {
          if (!blob || blob.size >= file.size) resolve(file);
          else resolve(new File([blob], file.name.replace(/\.\w+$/, type === 'image/png' ? '.png' : '.jpg'), { type, lastModified: Date.now() }));
        }, type, quality);
      } catch {
        resolve(file);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/** Passcode strength: 0–5. Weak (< 3) passcodes are rejected client-side. */
export function scorePasscode(pw) {
  const p = String(pw || '');
  let score = 0;
  if (p.length >= 8) score += 1;
  if (p.length >= 12) score += 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
  if (/\d/.test(p)) score += 1;
  if (/[^A-Za-z0-9]/.test(p)) score += 1;
  const labels = ['Very weak', 'Very weak', 'Weak', 'Okay', 'Strong', 'Very strong'];
  return { score, label: labels[score] };
}

// ---- Form draft autosave (one live draft per editor kind) -------------------

const draftKey = (kind) => `apex-formdraft-${kind}`;

export function saveFormDraft(kind, slug, form) {
  try {
    localStorage.setItem(draftKey(kind), JSON.stringify({ slug, form, savedAt: Date.now() }));
  } catch { /* storage full/disabled — drafts are best-effort */ }
}

export function loadFormDraft(kind) {
  try {
    const raw = localStorage.getItem(draftKey(kind));
    const draft = raw ? JSON.parse(raw) : null;
    return draft && draft.slug && draft.form ? draft : null;
  } catch {
    return null;
  }
}

export function clearFormDraft(kind) {
  try { localStorage.removeItem(draftKey(kind)); } catch { /* ignore */ }
}

// ---- Editor re-seed guard --------------------------------------------------
// After a save we must NOT wipe the form the editor just submitted (the KV
// echo can lag a beat), but that exemption belongs to the saved unit only.
// A previous version used a plain "skip the next seed" boolean, which armed on
// save and was then consumed by the NEXT unit the editor clicked — so the next
// unit loaded with the values just typed for the previous one.
export function shouldReseedEditor(justSavedSlug, selectedSlug) {
  if (!justSavedSlug) return true;
  if (justSavedSlug === selectedSlug) return false; // still showing the saved unit
  return true;                                       // switched: always re-seed
}

// ---- Recently edited units (quick-row) ---------------------------------------

const RECENT_KEY = 'apex-recent-edits-v1';

export function loadRecentEdits() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function pushRecentEdit(entry) {
  if (!entry?.slug) return;
  try {
    const list = loadRecentEdits().filter((e) => !(e.slug === entry.slug && e.kind === entry.kind));
    list.unshift({ slug: entry.slug, name: entry.name || entry.slug, kind: entry.kind || 'value', at: Date.now() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  } catch { /* ignore */ }
}
