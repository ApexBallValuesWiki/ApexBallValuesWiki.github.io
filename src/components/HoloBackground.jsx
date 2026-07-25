import './HoloBackground.css';

/**
 * Pure black backdrop with a flat holographic grid: plain straight vertical
 * and horizontal lines, evenly spaced, tiling seamlessly in every direction
 * so it reads as an infinite plane (no vanishing point / perspective focus).
 * Implemented as a repeating CSS background-image grid — no SVG, no viewBox
 * edges, trivially large cell size.
 */
export default function HoloBackground() {
  return (
    <>
      <div className="holo-bg" aria-hidden="true">
        <div className="holo-grid" />
        <div className="holo-particles" />
        <div className="holo-vignette" />
        <div className="holo-scanline" />
      </div>
      <div className="holo-crt-scanlines" aria-hidden="true" />
    </>
  );
}