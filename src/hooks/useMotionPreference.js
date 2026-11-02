import { useEffect, useState } from 'react';
import { loadUXSettings } from '../utils/uxSettings';
import { motionIsAllowed } from '../utils/motionPreference';

function systemPrefersReducedMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

// Updates live when either the OS or the site's Theme Studio setting changes.
export default function useMotionPreference() {
  const [settings, setSettings] = useState(() => loadUXSettings());
  const [systemReduced, setSystemReduced] = useState(systemPrefersReducedMotion);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onMedia = () => setSystemReduced(Boolean(media?.matches));
    const onSettings = (event) => setSettings(event.detail || loadUXSettings());
    onMedia();
    // addListener is retained for older Safari versions.
    if (media?.addEventListener) media.addEventListener('change', onMedia);
    else media?.addListener?.(onMedia);
    window.addEventListener('apex-ux-updated', onSettings);
    return () => {
      if (media?.removeEventListener) media.removeEventListener('change', onMedia);
      else media?.removeListener?.(onMedia);
      window.removeEventListener('apex-ux-updated', onSettings);
    };
  }, []);

  return motionIsAllowed(settings, systemReduced);
}
