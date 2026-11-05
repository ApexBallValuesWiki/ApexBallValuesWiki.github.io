import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ambientForPath } from '../data/ambientArtwork';
import useMotionPreference from '../hooks/useMotionPreference';
import './AmbientAccents.css';

// Two quiet cutouts per view — never parallax, never scroll-linked, never a
// third-party request. They are decorative only (aria-hidden, pointer-events
// none) and are skipped entirely on touch, small screens, data-saver and
// reduced-motion/animations-off. The pair is deterministic per route so
// navigating does not flicker through random artwork.
const DESKTOP_MEDIA = '(min-width: 900px) and (pointer: fine)';

export default function AmbientAccents() {
  const { pathname } = useLocation();
  const motionAllowed = useMotionPreference();
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined'
      && Boolean(window.matchMedia?.(DESKTOP_MEDIA)?.matches)
      && navigator.connection?.saveData !== true,
  );

  useEffect(() => {
    const media = window.matchMedia?.(DESKTOP_MEDIA);
    if (!media) return undefined;
    const update = () => setDesktop(media.matches && navigator.connection?.saveData !== true);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  if (!desktop || !motionAllowed) return null;

  const pair = ambientForPath(pathname);
  return (
    <div className="apex-ambient" data-ambient-count={pair.length} aria-hidden="true">
      {pair.map((art) => (
        <span key={art.slug} className={`apex-ambient-unit apex-ambient-${art.position}`}>
          <img
            className="apex-ambient-cutout"
            src={art.image}
            alt=""
            width="280"
            height="280"
            loading="lazy"
            decoding="async"
            draggable="false"
          />
          <span
            className="apex-ambient-tint"
            style={{ '--ambient-mask': `url(${JSON.stringify(art.image)})` }}
          />
        </span>
      ))}
    </div>
  );
}
