import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteEffects() {
  const location = useLocation();

  useEffect(() => {
    requestAnimationFrame(() => {
      if (window.__apexLenis?.scrollTo) {
        window.__apexLenis.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo(0, 0);
      }
      window.dispatchEvent(new CustomEvent('apex-route-change', { detail: { path: location.pathname } }));
    });
  }, [location.pathname]);

  return null;
}
