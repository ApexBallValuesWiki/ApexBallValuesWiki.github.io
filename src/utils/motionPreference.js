import { normalizeAnimSpeed } from './uxSettings';

/**
 * A visitor's operating-system and in-site motion choices both take precedence
 * over automatic animation — UNLESS they explicitly opt back in.
 *
 * `motionOverride` is the escape hatch for desktop browsers that report
 * `prefers-reduced-motion: reduce` because of an OS accessibility setting
 * (Windows "Animation effects" off, etc.). Those browsers otherwise reduce
 * every CSS animation to 0.001ms, which looks like chopped slides and buttons
 * that jump instead of easing. 'on' restores full motion + Lenis; 'off'
 * forces reduced motion; 'auto' respects the OS and the site's own settings.
 */
export function motionIsAllowed(settings = {}, systemReduced = false) {
  if (settings.motionOverride === 'on') return true;
  if (settings.motionOverride === 'off') return false;
  return !systemReduced
    && settings.reducedMotion !== true
    && normalizeAnimSpeed(settings.animSpeed) > 0;
}

/** Reason shown in the Theme Studio / motion banner when motion is paused. */
export function motionPauseReason(settings = {}, systemReduced = false) {
  if (settings.motionOverride === 'off') return 'You turned animations off manually.';
  if (settings.reducedMotion === true) return 'Reduced motion is enabled in the site settings.';
  if (normalizeAnimSpeed(settings.animSpeed) <= 0) return 'Animation speed is set to Off.';
  if (systemReduced) return 'Your computer asks websites to reduce motion (an OS accessibility setting).';
  return '';
}

export function systemPrefersReducedMotion() {
  return typeof window !== 'undefined'
    && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}
