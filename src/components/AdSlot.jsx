import { useEffect, useState } from 'react';
import { areAdsAllowed, ensureAdSenseScript } from '../utils/ads';

// Ad container for Google AdSense. Renders NOTHING unless:
//  - the site is the production host (never the Test Realm / localhost), and
//  - the AdSense loader is available.
// See src/utils/ads.js — this guard exists to comply with the AdSense
// "no ads on screens without publisher content" policy.
export default function AdSlot({ slotId, ready = true }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // AdSense policy: only after maintenance is confirmed off AND the host is
    // production AND the parent page says its content is on screen.
    if (!areAdsAllowed() || !ready) return undefined;
    // Small settle delay: never race the first paint of page content.
    const t = window.setTimeout(() => {
      ensureAdSenseScript();
      setAllowed(true);
    }, 1200);
    const onState = () => { if (!areAdsAllowed()) setAllowed(false); };
    window.addEventListener('apex-ads-state', onState);
    return () => { window.clearTimeout(t); window.removeEventListener('apex-ads-state', onState); };
  }, [ready]);

  useEffect(() => {
    if (!allowed || !slotId) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense failed to push slot:', e);
    }
  }, [allowed, slotId]);

  if (!allowed) return null;

  return (
    <div
      className="apex-ad-slot-wrapper"
      style={{
        margin: '54px auto',
        textAlign: 'center',
        width: '100%',
        minHeight: '100px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.01)',
        border: '1px dashed rgba(255,255,255,0.04)',
        borderRadius: '16px',
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-2832011907708910"
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
