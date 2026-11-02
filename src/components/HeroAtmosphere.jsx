import { useEffect, useRef, useState } from 'react';
import { loadUXSettings } from '../utils/uxSettings';

// A quiet, scroll-responsive 3D star field behind the existing unit render.
// Touch, reduced motion, disabled scenes and WebGL failures keep the CSS sky.
export default function HeroAtmosphere() {
  const hostRef = useRef(null);
  const [allowed, setAllowed] = useState(false);
  const [settings, setSettings] = useState(() => loadUXSettings());

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => {
      // Only genuinely constrained devices are excluded. The old thresholds
      // (>4 GB RAM, >4 cores, >900px, pointer:fine) disabled the 3D layer on
      // most laptops and all tablets, which read as "3D broken everywhere".
      const lowPower = (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2)
        || (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2)
        || navigator.connection?.saveData === true;
      const webgl = (() => {
        try {
          const canvas = document.createElement('canvas');
          return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
        } catch { return false; }
      })();
      setAllowed(!motion.matches && fine.matches && window.innerWidth > 640 && !lowPower && webgl);
    };
    const onSettings = (event) => setSettings(event.detail || loadUXSettings());
    update();
    motion.addEventListener('change', update);
    fine.addEventListener('change', update);
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('apex-ux-updated', onSettings);
    return () => {
      motion.removeEventListener('change', update);
      fine.removeEventListener('change', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('apex-ux-updated', onSettings);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !allowed || settings.reducedMotion || Number(settings.animSpeed) <= 0 || settings.scrollScene === false || !('IntersectionObserver' in window) || !('ResizeObserver' in window)) return undefined;
    let disposed = false;
    let cleanup;
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      try {
        const { createHeroAtmosphere } = await import('./heroAtmosphereScene');
        if (!disposed) cleanup = createHeroAtmosphere(host);
      } catch (error) {
        // Never fail silently: the CSS sky stays visible, but the reason is
        // now diagnosable instead of a blank hero with no console output.
        console.warn('[APEX] 3D hero unavailable; using CSS fallback.', error);
      }
    }, { rootMargin: '80px' });
    observer.observe(host);
    return () => { disposed = true; observer.disconnect(); cleanup?.(); };
  }, [allowed, settings.reducedMotion, settings.animSpeed, settings.scrollScene]);

  return <div className="hero-atmosphere" aria-hidden="true"><div ref={hostRef} className="hero-atmosphere-canvas" /></div>;
}
