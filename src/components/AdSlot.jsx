import { useEffect, useRef, useState } from 'react';
import {
  AD_CLIENT,
  AD_SLOTS,
  areAdsAllowed,
  ensureAdSenseScript,
  adSenseScriptLoaded,
} from '../utils/ads';
import { PRIVACY_CHANGE_EVENT } from '../utils/privacyChoices';

// One placement per page, one push per DOM node. Waiting for the library's
// load event and never reusing a slot ID prevents the "TagError: X/Y" that
// the old build reproduced on every production page.
// TFAT=1 is a conservative child-treatment signal, NOT parental consent or a
// replacement for a certified CMP. Ads are disabled in this build.
export default function AdSlot({ placement = 'home', ready = true }) {
  const slotId = AD_SLOTS[placement] || null;
  const [allowed, setAllowed] = useState(false);
  const pushedRef = useRef(false);

  useEffect(() => {
    const update = () => {
      const ok = Boolean(areAdsAllowed() && ready && slotId);
      setAllowed(ok);
      if (!ok) pushedRef.current = false;
      if (ok) ensureAdSenseScript();
    };
    window.addEventListener('apex-ads-state', update);
    window.addEventListener(PRIVACY_CHANGE_EVENT, update);
    window.addEventListener('apex-ads-script-loaded', update);
    update();
    return () => {
      window.removeEventListener('apex-ads-state', update);
      window.removeEventListener(PRIVACY_CHANGE_EVENT, update);
      window.removeEventListener('apex-ads-script-loaded', update);
    };
  }, [ready, slotId]);

  useEffect(() => {
    if (!allowed || !slotId || !areAdsAllowed() || !adSenseScriptLoaded() || pushedRef.current) return;
    pushedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      pushedRef.current = false;
      console.error('AdSense failed to push slot:', error);
    }
  }, [allowed, slotId]);

  if (!allowed) return null;
  return (
    <aside className="apex-ad-slot-wrapper" aria-label="Advertisement" style={{ margin: '64px auto', textAlign: 'center', width: '100%' }}>
      <span style={{ display: 'block', marginBottom: 12, fontSize: 11, color: 'var(--text-dim)' }}>Advertisement</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
        data-tag-for-age-treatment="1"
      />
    </aside>
  );
}
