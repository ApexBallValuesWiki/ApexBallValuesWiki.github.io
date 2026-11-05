import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  getPrivacyChoice,
  savePrivacyChoice,
  PRIVACY_OPEN_EVENT,
} from '../utils/privacyChoices';
import './PrivacyChoices.css';

// First-party consent control for all OPTIONAL storage. Essential settings
// and the offline cache never depend on this choice. Optional statistics and
// advertising default to OFF and nothing optional is written before consent.
// This first-party control governs OPTIONAL ON-DEVICE STORAGE. It is NOT a
// Google-certified CMP: once ads are enabled, advertising consent is read
// from Google's free "Privacy & messaging" CMP by src/utils/cmp.js, which
// fails closed. See ENABLE-ADS.md.
export default function PrivacyChoices() {
  const [open, setOpen] = useState(() => getPrivacyChoice() === null);
  const [customize, setCustomize] = useState(false);
  const [localStats, setLocalStats] = useState(false);
  const [ads, setAds] = useState(false);

  // The banner is fixed to the bottom. Without extra page padding it sits on
  // top of the footer and makes links like "What's new" / "Credits" impossible
  // to click — one of the reported "bottom pages don't work" bugs.
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.dataset.privacyBanner = 'open';
    else delete root.dataset.privacyBanner;
    return () => { delete root.dataset.privacyBanner; };
  }, [open]);

  useEffect(() => {
    const show = () => {
      const current = getPrivacyChoice();
      if (current) {
        setLocalStats(current.localStats);
        setAds(current.ads);
      }
      setCustomize(true);
      setOpen(true);
    };
    window.addEventListener(PRIVACY_OPEN_EVENT, show);
    return () => window.removeEventListener(PRIVACY_OPEN_EVENT, show);
  }, []);

  if (!open || typeof document === 'undefined') return null;

  function choose(nextLocalStats, nextAds) {
    savePrivacyChoice({ localStats: nextLocalStats, ads: nextAds });
    setLocalStats(nextLocalStats);
    setAds(nextAds);
    setCustomize(false);
    setOpen(false);
  }

  return createPortal(
    <section className="privacy-choice" aria-labelledby="privacy-choice-title" aria-describedby="privacy-choice-description" role="dialog" aria-modal="false">
      <div className="privacy-choice-copy">
        <h2 id="privacy-choice-title">Your privacy choices</h2>
        <p id="privacy-choice-description">
          We store only essential settings (appearance, accessibility and an offline cache) on your device. Optional visit statistics and advertising are <strong>off by default</strong>. Children should ask a parent or guardian before choosing.
        </p>
        {customize && (
          <div className="privacy-choice-options" style={{ display: 'grid', gap: 6, margin: '10px 0' }}>
            <label style={{ fontSize: '0.8rem', display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={localStats} onChange={(e) => setLocalStats(e.target.checked)} />
              Optional on-device statistics (local achievements only)
            </label>
            <label style={{ fontSize: '0.8rem', display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={ads} onChange={(e) => setAds(e.target.checked)} />
              Optional statistics and ad cookies (ad consent is handled by Google's consent message when ads are on)
            </label>
          </div>
        )}
        <Link to="/privacy" onClick={() => setOpen(false)}>Privacy notice</Link>
        {' · '}
        <Link to="/cookies" onClick={() => setOpen(false)}>Cookie notice</Link>
        {' · '}
        <Link to="/terms" onClick={() => setOpen(false)}>Terms</Link>
        {' · '}
        <Link to="/about" onClick={() => setOpen(false)}>About</Link>
        {' · '}
        <Link to="/contact" onClick={() => setOpen(false)}>Contact</Link>
      </div>
      <div className="privacy-choice-actions">
        <button type="button" onClick={() => choose(false, false)}>Reject optional</button>
        {customize ? (
          <button type="button" onClick={() => choose(localStats, ads)}>Save choices</button>
        ) : (
          <button type="button" onClick={() => setCustomize(true)}>Customize</button>
        )}
        <button type="button" onClick={() => choose(true, true)}>Accept all</button>
      </div>
    </section>,
    document.body
  );
}
