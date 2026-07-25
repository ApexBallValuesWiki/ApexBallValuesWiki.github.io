import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reads ?highlight=<slug> from the URL, scrolls the matching element
 * (identified by a `data-slug="<slug>"` attribute) into view once mounted,
 * and returns the currently-highlighted slug (or null) so callers can apply
 * a visual pulse class to that one card. Used by the "jump to unit" search
 * feature — see UnitSearchPanel.jsx (rendered on the dedicated unit search
 * pages reached by clicking "Units" in the sidebar).
 */
export function useScrollToHighlight() {
  const location = useLocation();
  const [highlighted, setHighlighted] = useState(null);
  const clearTimerRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const target = params.get('highlight');
    if (!target) return undefined;

    setHighlighted(target);
    const scrollTimer = setTimeout(() => {
      const el = document.querySelector(`[data-slug="${CSS.escape(target)}"]`);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
      const centeredTarget = currentScroll + rect.top - window.innerHeight / 2 + rect.height / 2;

      if (window.__apexLenis?.scrollTo) {
        window.__apexLenis.scrollTo(Math.max(0, centeredTarget), {
          duration: 0.85,
          easing: (t) => 1 - Math.pow(1 - t, 2.4),
        });
      } else {
        window.scrollTo({ top: Math.max(0, centeredTarget), behavior: 'smooth' });
      }
    }, 120);

    clearTimerRef.current = setTimeout(() => setHighlighted(null), 2400);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimerRef.current);
    };
  }, [location.search]);

  return highlighted;
}
