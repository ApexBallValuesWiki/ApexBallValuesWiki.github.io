import './HoloBackground.css';

/**
 * Pure black backdrop with a flat holographic grid: plain straight vertical
 * and horizontal lines, evenly spaced, tiling seamlessly in every direction
 * so it reads as an infinite plane (no vanishing point / perspective focus).
 *
 * IMPORTANT: every decorative layer lives INSIDE `.holo-bg`. The CRT texture
 * used to be a bare sibling with `position:absolute; inset:0` and default
 * `pointer-events`, which made it an invisible full-page sheet that swallowed
 * clicks on footer links, minigame buttons and the admin editor. Keeping it
 * inside the `pointer-events:none`, `z-index:-1` container prevents that.
 */
export default function HoloBackground() {
  return (
    <div className="holo-bg" aria-hidden="true">
      <div className="holo-grid" />
      <div className="holo-particles" />
      <div className="holo-vignette" />
      <div className="holo-scanline" />
      <div className="holo-crt-scanlines" />
    </div>
  );
}
