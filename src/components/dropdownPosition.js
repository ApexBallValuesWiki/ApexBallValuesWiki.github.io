// Fixed, viewport-clamped placement shared by every select and autocomplete.
export function dropdownPosition(rect, viewportWidth, viewportHeight) {
  const margin = 8;
  const gap = 6;
  const width = Math.max(0, Math.min(viewportWidth - margin * 2, Math.max(rect.width, 180)));
  const left = Math.max(margin, Math.min(rect.left, viewportWidth - margin - width));
  const below = Math.max(0, viewportHeight - rect.bottom - margin - gap);
  const above = Math.max(0, rect.top - margin - gap);
  const openUp = below < 160 && above > below;
  return {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(Math.min(380, openUp ? above : below))}px`,
    ...(openUp ? { bottom: `${Math.round(viewportHeight - rect.top + gap)}px` } : { top: `${Math.round(rect.bottom + gap)}px` }),
  };
}
