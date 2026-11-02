import { useEffect, useRef } from 'react';
import './LandingBackdrop.css';

/**
 * A single, flat, faceted shape for the landing page, drawn as vector paths.
 * The facets meet edge-to-edge; there are no tubes, ribbons, or intersecting
 * shapes. The illustration stays crisp at any screen resolution and does not
 * require WebGL, a video, or a frame-by-frame render loop.
 */
export default function LandingBackdrop() {
  const shapeRef = useRef(null);
  const spotlightRef = useRef(null);

  useEffect(() => {
    const shape = shapeRef.current;
    const spotlight = spotlightRef.current;
    if (!shape || !spotlight) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let pointerX = window.innerWidth * 0.68;
    let pointerY = window.innerHeight * 0.42;
    let hasPointer = false;

    const update = () => {
      frame = 0;
      if (reducedMotion.matches) {
        shape.style.transform = '';
        spotlight.setAttribute('cx', '43%');
        spotlight.setAttribute('cy', '27%');
        return;
      }

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      const px = hasPointer ? (pointerX / Math.max(1, window.innerWidth) - 0.5) : 0;
      const py = hasPointer ? (pointerY / Math.max(1, window.innerHeight) - 0.5) : 0;
      // Move the entire shape as one piece. Its internal geometry never changes.
      shape.style.transform = `translate3d(${(px * 14).toFixed(1)}px, ${(py * 12 - progress * 34).toFixed(1)}px, 0) rotate(${(px * 1.4 + progress * 3).toFixed(2)}deg)`;

      if (hasPointer) {
        const box = shape.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((pointerX - box.left) / Math.max(1, box.width)) * 100));
        const y = Math.max(0, Math.min(100, ((pointerY - box.top) / Math.max(1, box.height)) * 100));
        spotlight.setAttribute('cx', `${x.toFixed(1)}%`);
        spotlight.setAttribute('cy', `${y.toFixed(1)}%`);
      }
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onPointerMove = (event) => {
      if (!finePointer.matches) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      hasPointer = true;
      scheduleUpdate();
    };

    scheduleUpdate();
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    reducedMotion.addEventListener?.('change', scheduleUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      reducedMotion.removeEventListener?.('change', scheduleUpdate);
    };
  }, []);

  return (
    <div className="landing-backdrop" aria-hidden="true">
      <div className="landing-backdrop__field" />
      <div className="landing-backdrop__shape-position">
        <div className="landing-backdrop__shape" ref={shapeRef}>
          <svg viewBox="0 0 610 800" xmlns="http://www.w3.org/2000/svg" focusable="false">
            <defs>
              <linearGradient id="landing-facet-a" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#e6f8ff" />
                <stop offset="0.35" stopColor="var(--landing-prism-tint)" />
                <stop offset="1" stopColor="#1a3c55" />
              </linearGradient>
              <linearGradient id="landing-facet-b" x1="0" y1="0" x2="0.9" y2="1">
                <stop offset="0" stopColor="#8ec6db" />
                <stop offset="0.48" stopColor="#315d79" />
                <stop offset="1" stopColor="#0a2031" />
              </linearGradient>
              <linearGradient id="landing-facet-c" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#accde0" />
                <stop offset="0.4" stopColor="#426f87" />
                <stop offset="1" stopColor="#102b3d" />
              </linearGradient>
              <linearGradient id="landing-facet-d" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#c5f3ff" />
                <stop offset="0.32" stopColor="var(--landing-prism-tint)" />
                <stop offset="1" stopColor="#13374c" />
              </linearGradient>
              <linearGradient id="landing-facet-e" x1="0.1" y1="1" x2="0.9" y2="0">
                <stop offset="0" stopColor="#b7e5f4" />
                <stop offset="0.45" stopColor="#4d94ac" />
                <stop offset="1" stopColor="#102c40" />
              </linearGradient>
              <linearGradient id="landing-facet-f" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#193c55" />
                <stop offset="0.55" stopColor="#3d7692" />
                <stop offset="1" stopColor="#0c2638" />
              </linearGradient>
              <linearGradient id="landing-facet-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#a5d7e8" />
                <stop offset="0.5" stopColor="#4a859e" />
                <stop offset="1" stopColor="#163c50" />
              </linearGradient>
              <linearGradient id="landing-facet-h" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#d9f4fc" />
                <stop offset="0.4" stopColor="#729eb1" />
                <stop offset="1" stopColor="#1a4059" />
              </linearGradient>
              <radialGradient id="landing-pointer-light" ref={spotlightRef} cx="43%" cy="27%" r="45%">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.23" />
                <stop offset="0.45" stopColor="var(--landing-prism-tint)" stopOpacity="0.1" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="landing-prism-edge" x1="0" y1="0" x2="0.9" y2="1">
                <stop offset="0" stopColor="#f3feff" stopOpacity="0.95" />
                <stop offset="0.42" stopColor="var(--landing-prism-tint)" stopOpacity="0.42" />
                <stop offset="0.78" stopColor="#c9efff" stopOpacity="0.8" />
                <stop offset="1" stopColor="#b8e7ff" stopOpacity="0.55" />
              </linearGradient>
            </defs>

            {/* Eight adjacent faces form one uninterrupted, non-self-intersecting silhouette. */}
            <path d="M270 35 L490 155 L260 310 Z" fill="url(#landing-facet-a)" />
            <path d="M490 155 L555 385 L320 510 L260 310 Z" fill="url(#landing-facet-b)" />
            <path d="M555 385 L416 655 L320 510 Z" fill="url(#landing-facet-c)" />
            <path d="M416 655 L218 760 L320 510 Z" fill="url(#landing-facet-d)" />
            <path d="M218 760 L75 574 L320 510 Z" fill="url(#landing-facet-e)" />
            <path d="M75 574 L55 300 L260 310 L320 510 Z" fill="url(#landing-facet-f)" />
            <path d="M55 300 L125 150 L260 310 Z" fill="url(#landing-facet-g)" />
            <path d="M125 150 L270 35 L260 310 Z" fill="url(#landing-facet-h)" />

            <path d="M270 35 L490 155 L555 385 L416 655 L218 760 L75 574 L55 300 L125 150 Z" fill="url(#landing-pointer-light)" />
            <path d="M270 35 L490 155 L555 385 L416 655 L218 760 L75 574 L55 300 L125 150 Z" fill="none" stroke="url(#landing-prism-edge)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M270 35 L260 310 L55 300 M125 150 L260 310 L490 155 M260 310 L320 510 L555 385 M320 510 L416 655 M320 510 L218 760 M320 510 L75 574" fill="none" stroke="#d9f6ff" strokeOpacity="0.22" strokeWidth="1.2" />
          </svg>
        </div>
      </div>
    </div>
  );
}
