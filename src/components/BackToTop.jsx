import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './BackToTop.css';

const ENABLED_PATHS = [
  /^\/wiki\/units\//,
  /^\/values\/units\//,
  /^\/wiki\/compare/,
];

export default function BackToTop() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const enabled = ENABLED_PATHS.some((pattern) => pattern.test(location.pathname));

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return undefined;
    }

    function onScroll() {
      setVisible(window.scrollY > 700);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled, location.pathname]);

  if (!enabled || !visible) return null;

  function scrollTop() {
    if (window.__apexLenis?.scrollTo) {
      window.__apexLenis.scrollTo(0, { duration: 0.8 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <button type="button" className="back-to-top filled" onClick={scrollTop} aria-label="Back to top">
      ↑
    </button>
  );
}
