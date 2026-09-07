import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchActiveAnnouncements, deleteAnnouncement } from '../utils/apexClient';
import { useAdminStatus } from '../hooks/useAdminStatus';
import './GlobalAnnouncement.css';

// GLOBAL ANNOUNCEMENTS — stacked banners at the top of the site. Multiple can
// be live at once (each with its own type and expiry). They poll the KV
// worker (every 30s) so a broadcast from the admin Announcement Studio
// appears for EVERY visitor, not just the sender's browser.

const DISMISSED_KEY = 'apex-dismissed-announcements';
const POLL_MS = 30000;
const MAX_DISMISSED = 20;

export function useGlobalAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      const list = await fetchActiveAnnouncements();
      if (!alive) return;
      setAnnouncements(Array.isArray(list) ? list : []);
    }

    refresh();
    // Lightweight polling: a new broadcast reaches every visitor within
    // half a minute — no realtime socket needed. The custom event makes it
    // instant for this browser right after the studio sends or clears.
    const pollId = window.setInterval(refresh, POLL_MS);
    const onUpdated = () => refresh();
    window.addEventListener('apex-announcements-updated', onUpdated);
    // Coming back to the tab? Check immediately instead of waiting for the
    // next poll tick, so switching apps never shows a stale announcement.
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      window.clearInterval(pollId);
      window.removeEventListener('apex-announcements-updated', onUpdated);
      window.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return announcements;
}

// Identity of an announcement: id + sentAt + the message itself. Even if a
// server ever reuses an id, a NEW message/sentAt is always a NEW announcement
// and must always appear, no matter what was dismissed before.
function announcementKey(a) {
  return `${a?.id ?? 'x'}|${a?.sentAt ?? 'x'}|${a?.message ?? ''}`;
}

function loadDismissed() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export default function GlobalAnnouncement() {
  const announcements = useGlobalAnnouncements();
  const stackRef = useRef(null);
  const [dismissed, setDismissed] = useState([]);
  const { isAdmin } = useAdminStatus();
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    setDismissed(loadDismissed());
  }, [announcements.map(announcementKey).join('||')]);

  function dismiss(key) {
    const next = [...new Set([...loadDismissed(), key])].slice(-MAX_DISMISSED);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setDismissed(next);
  }

  async function handleDelete(id) {
    if (deletingId) return;
    setDeletingId(id);
    const ok = await deleteAnnouncement(id);
    setDeletingId(null);
    if (ok) window.dispatchEvent(new CustomEvent('apex-announcements-updated'));
  }

  const visible = announcements.filter((a) => !dismissed.includes(announcementKey(a)));

  // Keep the sticky-header offset in sync with the real stack height.
  useLayoutEffect(() => {
    if (!visible.length || !stackRef.current) {
      document.documentElement.style.setProperty('--announcement-height', '0px');
      return undefined;
    }
    const node = stackRef.current;
    const measure = () => {
      if (!node) return;
      document.documentElement.style.setProperty('--announcement-height', `${Math.round(node.getBoundingClientRect().height)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty('--announcement-height', '0px');
    };
  }, [visible.length]);

  if (!visible.length) return null;

  const colors = {
    info: { bg: 'rgba(77, 157, 255, 0.1)', border: 'var(--c-info)', text: 'var(--c-info)' },
    warning: { bg: 'rgba(255, 200, 50, 0.1)', border: 'var(--c-warning)', text: 'var(--c-warning)' },
    success: { bg: 'rgba(0, 255, 145, 0.1)', border: 'var(--c-success)', text: 'var(--c-success)' },
    error: { bg: 'rgba(255, 77, 77, 0.1)', border: 'var(--c-danger)', text: 'var(--c-danger)' },
  };
  const icons = { info: '📢', warning: '⚠️', success: '✅', error: '🚨' };

  return (
    <div ref={stackRef} className="global-announcement-stack">
      <AnimatePresence>
        {visible.map((a) => {
          const key = announcementKey(a);
          const c = colors[a.type] || colors.info;
          return (
            <motion.div
              key={key}
              className="global-announcement"
              style={{ background: c.bg, borderColor: c.border, color: c.text }}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <span className="ga-icon">{icons[a.type] || '📢'}</span>
              <span className="ga-message">
                {a.title ? <strong>{a.title}: </strong> : null}
                {a.message}
              </span>
              {isAdmin && (
                <button
                  type="button"
                  className="ga-trash"
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  title={deletingId === a.id ? 'Deleting…' : 'Delete this announcement for everyone'}
                  aria-label="Delete announcement for everyone"
                >🗑️</button>
              )}
              <button type="button" className="ga-dismiss" onClick={() => dismiss(key)} aria-label="Dismiss announcement">✕</button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
