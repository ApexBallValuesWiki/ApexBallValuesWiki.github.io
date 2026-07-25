import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { supabase } from '../utils/supabase';
import './AnnouncementBanner.css';

const DISMISSED_KEY = 'apex-dismissed-announcements';

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const bannerRef = useRef(null);

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('public:site_announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_announcements' }, (payload) => {
        // If an announcement is published/reactivated, auto-reset local dismissal cache
        if (payload.new && payload.new.active) {
          try {
            localStorage.removeItem(DISMISSED_KEY);
          } catch {
            // ignore
          }
        }
        fetchAnnouncements();
      })
      .subscribe();

    function onCustomEvent(e) {
      if (e.detail && typeof e.detail === 'object') {
        const item = Array.isArray(e.detail) ? e.detail.find((x) => x.active) : (e.detail.active ? e.detail : null);
        if (item) {
          try {
            localStorage.removeItem(DISMISSED_KEY);
          } catch {
            // ignore
          }
          setAnnouncement(item);
          setDismissed(false);
        } else {
          setAnnouncement(null);
        }
      } else {
        fetchAnnouncements();
      }
    }

    window.addEventListener('apex-announcements-updated', onCustomEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('apex-announcements-updated', onCustomEvent);
    };
  }, []);

  async function fetchAnnouncements() {
    try {
      const { data, error } = await supabase
        .from('site_announcements')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const item = data[0];
        setAnnouncement(item);
        try {
          const stored = localStorage.getItem(DISMISSED_KEY);
          if (stored === String(item.id)) {
            setDismissed(true);
          } else {
            setDismissed(false);
          }
        } catch {
          setDismissed(false);
        }
      } else {
        setAnnouncement(null);
      }
    } catch {
      // ignore network errors
    }
  }

  function handleDismiss() {
    setDismissed(true);
    if (announcement) {
      try {
        localStorage.setItem(DISMISSED_KEY, String(announcement.id));
      } catch {
        // ignore
      }
    }
    document.documentElement.style.setProperty('--announcement-height', '0px');
  }

  useLayoutEffect(() => {
    if (!announcement || dismissed || !bannerRef.current) {
      document.documentElement.style.setProperty('--announcement-height', '0px');
      return;
    }

    const node = bannerRef.current;
    const measure = () => {
      if (!node) return;
      const height = node.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--announcement-height', `${Math.round(height)}px`);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty('--announcement-height', '0px');
    };
  }, [announcement, dismissed]);

  if (!announcement || dismissed) return null;

  return (
    <div ref={bannerRef} className="announcement-banner" role="region" aria-label="Global Announcement">
      <div className="announcement-banner-content">
        <span className="announcement-banner-tag">⚡ BROADCAST</span>
        <span className="announcement-banner-text">{announcement.message}</span>
      </div>
      <button
        type="button"
        className="announcement-banner-close"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
      >
        ✕
      </button>
    </div>
  );
}
