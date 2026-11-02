import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './FirstTimeTutorial.css';

const TUTORIAL_KEY = 'apex-tutorial-seen-v1';

// A first-run helper, NOT a modal. The old version was a full-screen
// `z-index:99999` scrim that swallowed every click on the site (footer links,
// minigame buttons, the values editor). This one never covers the page:
// the wrapper has pointer-events:none and only the small card is interactive.
const QUICK_LINKS = [
  { to: '/wiki', icon: '📖', label: 'Browse the WIKI', hint: 'Unit stats, upgrades and how to get them' },
  { to: '/values', icon: '💰', label: 'Check Values', hint: 'Live trade estimates, demand and scarcity' },
  { to: '/values/calculator', icon: '🧮', label: 'Trade Calculator', hint: 'Compare both sides of a trade' },
];

export function openApexGuide() {
  window.dispatchEvent(new CustomEvent('apex-open-guide'));
}

export default function FirstTimeTutorial() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TUTORIAL_KEY)) {
        const timer = setTimeout(() => setVisible(true), 900);
        return () => clearTimeout(timer);
      }
    } catch { /* storage blocked — show the guide anyway */ }
    return undefined;
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* ignore */ }
  }, []);

  // Escape always dismisses; the guide is also re-openable from the footer.
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && visible) close(); };
    const onOpen = () => setVisible(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('apex-open-guide', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('apex-open-guide', onOpen);
    };
  }, [visible, close]);

  // Never let a helper card follow the visitor around the whole site.
  useEffect(() => { setVisible(false); }, [location.pathname]);

  if (!visible) return null;

  return (
    <div className="apex-guide-wrap" aria-hidden="false">
      <aside className="apex-guide-card" role="dialog" aria-label="New here? Quick start guide" aria-modal="false">
        <div className="apex-guide-head">
          <div>
            <span className="apex-guide-kicker">NEW HERE?</span>
            <h2>Start with these three</h2>
          </div>
          <button type="button" className="apex-guide-close" onClick={close} aria-label="Close quick start guide">✕</button>
        </div>
        <p className="apex-guide-intro">Apex WIKI &amp; Values is a fan-made companion for Ball Tower Defense. Pick what you want to do:</p>
        <div className="apex-guide-links">
          {QUICK_LINKS.map((item) => (
            <Link key={item.to} to={item.to} className="apex-guide-link" onClick={close}>
              <span className="apex-guide-link-icon" aria-hidden="true">{item.icon}</span>
              <span><strong>{item.label}</strong><small>{item.hint}</small></span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
        <div className="apex-guide-foot">
          <button type="button" className="apex-guide-dismiss" onClick={close}>Got it, don&apos;t show again</button>
          <Link to="/theme-editor" onClick={close}>Customize theme</Link>
        </div>
      </aside>
    </div>
  );
}
