import { Fragment, useEffect, useRef } from 'react';
import Lenis from 'lenis';

/**
 * Drives the whole page's scroll with real inertia/momentum physics (via
 * Lenis) instead of relying on native OS scrolling or CSS scroll-behavior
 * (which only smooths programmatic jumps, not wheel/trackpad input).
 * Slightly slower duration + gentle easing gives the "buttery" feel —
 * scrolling is still fully interruptible at any moment, it just glides
 * to a stop rather than halting instantly.
 */
export default function SmoothScroll({ children }) {
  const lenisRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.78,
      easing: (t) => 1 - Math.pow(1 - t, 2.35), // quick settle without the old search-page snap
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.15,
      prevent: (node) => {
        return (
          node.classList?.contains('admin-log-list') ||
          node.classList?.contains('admin-unit-list') ||
          Boolean(node.closest?.('.admin-log-list')) ||
          Boolean(node.closest?.('.admin-unit-list')) ||
          node.hasAttribute?.('data-lenis-prevent') ||
          Boolean(node.closest?.('[data-lenis-prevent]'))
        );
      },
    });
    lenisRef.current = lenis;

    // Expose the page scroller so deep-link features (like unit search
    // highlights) can use Lenis' smooth physics instead of native
    // scrollIntoView, which could snap/jump on the search flows.
    window.__apexLenis = lenis;

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      if (window.__apexLenis === lenis) {
        window.__apexLenis = null;
      }
      lenis.destroy();
    };
  }, []);

  return <Fragment>{children}</Fragment>;
}
