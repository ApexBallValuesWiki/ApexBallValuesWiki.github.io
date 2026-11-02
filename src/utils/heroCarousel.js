// The home showcase cycles the supplied artwork, not the live unit database.
export const HERO_ROTATION_MS = 5000;
// A pending layer waits for `decode()` before it can crossfade. On a slow PC
// (or a stalled/cached image) that promise may never settle, which used to
// freeze the carousel forever. Force-commit after this bounded wait.
export const HERO_PENDING_TIMEOUT_MS = 1400;

export function nextHeroSlug(roster, current, direction = 1) {
  if (!roster.length) return null;
  const index = roster.findIndex((entry) => entry.slug === current);
  if (index < 0) return roster[0].slug;
  return roster[((index + direction) % roster.length + roster.length) % roster.length].slug;
}

// Keep the latest request while an image decodes. Requesting the current
// image cancels an outstanding request instead of dissolving it into itself.
export function requestHeroSlide(slides, roster, id, direction = 1, announce = true) {
  const origin = slides.pending?.artwork.slug || slides.current.artwork.slug;
  const next = nextHeroSlug(roster, origin, direction);
  const artwork = roster.find((entry) => entry.slug === next);
  if (!artwork || artwork.slug === slides.current.artwork.slug) return { ...slides, pending: null };
  return { ...slides, pending: { artwork, id, announce } };
}

// A decoded image can start a transition only if its request is still the
// latest. If a previous dissolve is active, retain it for the next transition.
export function readyHeroSlide(slides, pendingId, latestRequestId) {
  if (pendingId !== latestRequestId || slides.pending?.id !== pendingId) return slides;
  if (slides.previous) {
    return slides.pending.ready ? slides : { ...slides, pending: { ...slides.pending, ready: true } };
  }
  return { previous: slides.current, current: slides.pending, pending: null };
}

// Finish only the intended outgoing layer, then transition to a decoded queued
// request or wait for it to decode. This bounds the active dissolve to two.
export function finishHeroTransition(slides, previousId, latestRequestId) {
  if (slides.previous?.id !== previousId) return slides;
  if (slides.pending?.ready && slides.pending.id === latestRequestId) {
    return { previous: slides.current, current: slides.pending, pending: null };
  }
  return { ...slides, previous: null };
}
