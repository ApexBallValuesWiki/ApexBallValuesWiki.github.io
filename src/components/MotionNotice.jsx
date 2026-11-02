import { useEffect, useState } from 'react';
import { applyUXSettings, loadUXSettings, saveUXSettings, systemReducedMotion } from '../utils/uxSettings';
import './MotionNotice.css';

const DISMISS_KEY = 'apex-motion-notice-dismissed';

/**
 * Desktop browsers that inherit an OS "reduce animation" accessibility flag
 * make every CSS animation collapse to 0.001ms — chopped hero slides, buttons
 * that jump, no smooth scrolling. Rather than silently overriding an
 * accessibility preference, we surface a small, explicit opt-in.
 */
export default function MotionNotice() {
  const [show, setShow] = useState(false);

  const evaluate = () => {
    const settings = loadUXSettings();
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { /* ignore */ }
    setShow(systemReducedMotion() && settings.motionOverride !== 'on' && !dismissed);
  };

  useEffect(() => {
    evaluate();
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onSettings = () => evaluate();
    media?.addEventListener?.('change', onSettings);
    window.addEventListener('apex-ux-updated', onSettings);
    return () => {
      media?.removeEventListener?.('change', onSettings);
      window.removeEventListener('apex-ux-updated', onSettings);
    };
  }, []);

  if (!show) return null;

  function enable() {
    const next = {
      ...loadUXSettings(),
      motionOverride: 'on',
      reducedMotion: false,
      animSpeed: 1,
      smoothScroll: true,
    };
    saveUXSettings(next);
    applyUXSettings(next);
    setShow(false);
  }

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  }

  return (
    <div className="apex-motion-notice" role="status">
      <span className="apex-motion-notice-icon" aria-hidden="true">✨</span>
      <div className="apex-motion-notice-copy">
        <strong>Animations are paused</strong>
        <small>Your computer asks sites to reduce motion. Turn smooth motion back on here.</small>
      </div>
      <button type="button" className="apex-motion-notice-cta" onClick={enable}>Enable smooth motion</button>
      <button type="button" className="apex-motion-notice-x" onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}
