import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchActiveAnnouncement, clearActiveAnnouncement } from '../utils/apexClient';
import { useAdminStatus } from '../hooks/useAdminStatus';
import './GlobalAnnouncement.css';

// ============================================================================
// GLOBAL ANNOUNCEMENT — the ONE announcement banner. Modern look, server
// data: it polls the KV worker (every 30s) so a broadcast from the admin
// Announcement Studio appears for EVERY visitor, not just the sender's
// browser. (The old localStorage version and the legacy gradient
// "BROADCAST" banner were merged into this component.)
// ============================================================================

const DISMISSED_KEY = 'apex-dismissed-announcements';
const POLL_MS = 30000;

export function useGlobalAnnouncement() {
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      const item = await fetchActiveAnnouncement();
      if (!alive) return;
      setAnnouncement(item && item.message ? item : null);
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
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return announcement;
}

// Identity of an announcement: id + sentAt + the message itself. Even if a
// server ever reuses an id, a NEW message/sentAt is always a NEW announcement
// and must always appear, no matter what was dismissed before.
function announcementKey(a) {
  return `${a?.id ?? 'x'}|${a?.sentAt ?? 'x'}|${a?.message ?? ''}`;
}

export default function GlobalAnnouncement() {
  const announcement = useGlobalAnnouncement();
  const bannerRef = useRef(null);
  const [dismissedKey, setDismissedKey] = useState(null);
  const { isAdmin } = useAdminStatus();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    const ok = await clearActiveAnnouncement();
    setDeleting(false);
    if (ok) window.dispatchEvent(new CustomEvent('apex-announcements-updated'));
  }

  // Dismissal is per-announcement: a NEW broadcast always shows again.
  const currentKey = announcementKey(announcement);
  useEffect(() => {
    try {
      setDismissedKey(localStorage.getItem(DISMISSED_KEY) || null);
    } catch { /* ignore */ }
  }, [currentKey]);

  // Keep the sticky-header offset in sync with the real banner height.
  useLayoutEffect(() => {
    if (!announcement || dismissedKey === currentKey || !bannerRef.current) {
      document.documentElement.style.setProperty('--announcement-height', '0px');
      return undefined;
    }
    const node = bannerRef.current;
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
  }, [announcement, dismissedKey, currentKey]);

  if (!announcement || dismissedKey === currentKey) return null;

  const colors = {
    info: { bg: 'rgba(77, 157, 255, 0.1)', border: 'var(--c-info)', text: 'var(--c-info)' },
    warning: { bg: 'rgba(255, 200, 50, 0.1)', border: 'var(--c-warning)', text: 'var(--c-warning)' },
    success: { bg: 'rgba(0, 255, 145, 0.1)', border: 'var(--c-success)', text: 'var(--c-success)' },
    error: { bg: 'rgba(255, 77, 77, 0.1)', border: 'var(--c-danger)', text: 'var(--c-danger)' },
  };
  const c = colors[announcement.type] || colors.info;
  const icons = { info: '📢', warning: '⚠️', success: '✅', error: '🚨' };

  function handleDismiss() {
    try { localStorage.setItem(DISMISSED_KEY, currentKey); } catch { /* ignore */ }
    setDismissedKey(currentKey);
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={bannerRef}
        className="global-announcement"
        style={{ background: c.bg, borderColor: c.border, color: c.text }}
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <span className="ga-icon">{icons[announcement.type] || '📢'}</span>
        <span className="ga-message">{announcement.message}</span>
        {isAdmin && (
          <button
            type="button"
            className="ga-trash"
            onClick={handleDelete}
            disabled={deleting}
            title={deleting ? 'Deleting…' : 'Delete this announcement for everyone'}
            aria-label="Delete announcement for everyone"
          >🗑️</button>
        )}
        <button type="button" className="ga-dismiss" onClick={handleDismiss} aria-label="Dismiss announcement">✕</button>
      </motion.div>
    </AnimatePresence>
  );
}
