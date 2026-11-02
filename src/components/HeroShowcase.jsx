import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HERO_ARTWORK } from '../data/heroArtwork';
import useMotionPreference from '../hooks/useMotionPreference';
import {
  HERO_ROTATION_MS, HERO_PENDING_TIMEOUT_MS, nextHeroSlug,
  requestHeroSlide, readyHeroSlide, finishHeroTransition,
} from '../utils/heroCarousel';
import HeroAtmosphere from './HeroAtmosphere';
import CoolIcon from './CoolIcon';
import './HeroShowcase.css';
import { resolveImageUrl } from '../utils/localAssets';

const firstSlide = { artwork: HERO_ARTWORK[0], id: 0 };
const DESKTOP_ART_MEDIA = '(min-width: 761px)';

function ArtworkLayer({ slide, phase, failed, onReady, onFailure, onTransitionComplete }) {
  const { artwork } = slide;
  const [desktopFailed, setDesktopFailed] = useState(false);
  const [prepared, setPrepared] = useState(() => typeof window !== 'undefined'
    && Boolean(artwork.desktopImage) && Boolean(window.matchMedia?.(DESKTOP_ART_MEDIA)?.matches));
  const selectedImage = prepared ? artwork.desktopImage : artwork.image;
  const imageStyle = { '--hero-image': `url(${JSON.stringify(selectedImage)})` };

  const isDesktopImage = (image) => Boolean(
    artwork.desktopImage && image.currentSrc
    && image.currentSrc === new URL(artwork.desktopImage, document.baseURI).href,
  );

  const readyWhenDecoded = (event) => {
    const image = event.currentTarget;
    setPrepared(isDesktopImage(image));
    if (phase !== 'pending') return;
    // Keep the preceding portrait visible until the replacement is decoded.
    // The pending style is sampled before the class changes so even a cached
    // image transitions from opacity zero rather than popping into view.
    const ready = () => {
      const layer = image.closest('.apex-hero-art-layer');
      if (layer?.isConnected) getComputedStyle(layer).getPropertyValue('opacity');
      onReady(slide);
    };
    if (typeof image.decode === 'function') image.decode().catch(() => {}).then(ready);
    else ready();
  };

  const handleFailure = (event) => {
    // If a prepared desktop WebP cannot load, use the original supplied PNG;
    // only show the placeholder if that original also fails.
    if (!desktopFailed && isDesktopImage(event.currentTarget)) {
      setDesktopFailed(true);
      setPrepared(false);
      return;
    }
    onFailure(slide, phase);
  };

  return (
    <div
      className={`apex-hero-art-layer is-${phase}`}
      data-artwork={artwork.slug}
      aria-hidden="true"
      onTransitionEnd={(event) => {
        if (phase === 'leaving' && event.target === event.currentTarget && event.propertyName === 'opacity') {
          onTransitionComplete(slide.id);
        }
      }}
    >
      {failed ? <div className="apex-hero-art-missing">{artwork.name.charAt(0)}</div> : (
        <div className={`apex-hero-portrait${prepared ? ' is-prepared' : ''}`} style={imageStyle}>
          <picture>
            {!desktopFailed && artwork.desktopImage && <source type="image/webp" media={DESKTOP_ART_MEDIA} srcSet={artwork.desktopImage} />}
            <img
              src={resolveImageUrl(artwork.image)}
              className="apex-hero-unit"
              alt=""
              fetchPriority={slide.id === 0 ? 'high' : 'auto'}
              decoding="async"
              draggable="false"
              onLoad={readyWhenDecoded}
              onError={handleFailure}
            />
          </picture>
          <span className="apex-hero-unit-tint" />
          <span className="apex-hero-unit-contrast" />
        </div>
      )}
    </div>
  );
}

export default function HeroShowcase() {
  const heroRef = useRef(null);
  const requestId = useRef(0);
  const [slides, setSlides] = useState({ current: firstSlide, previous: null, pending: null });
  const [paused, setPaused] = useState(false);
  const [playOverride, setPlayOverride] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [failedImages, setFailedImages] = useState(() => new Set());
  const [announcement, setAnnouncement] = useState('');
  const motionAllowed = useMotionPreference();
  const artwork = slides.current.artwork;
  const playing = !paused && (motionAllowed || playOverride);

  useEffect(() => {
    const updateVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    if (!heroRef.current || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 });
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  // The background scanline is obscured by the opaque hero. It is disabled on
  // phones; pause it on desktop too while the hero is actually in view.
  useEffect(() => {
    const root = document.documentElement;
    if (inView) root.dataset.apexHeroVisible = 'true';
    else delete root.dataset.apexHeroVisible;
    return () => { delete root.dataset.apexHeroVisible; };
  }, [inView]);

  // If the visitor changes a global motion setting later, require a fresh
  // explicit opt-in before overriding that preference for this carousel.
  useEffect(() => setPlayOverride(false), [motionAllowed]);

  const changeUnit = useCallback((direction, announce = true) => {
    const id = ++requestId.current;
    setSlides((current) => requestHeroSlide(current, HERO_ARTWORK, id, direction, announce));
  }, []);

  const commitPending = useCallback((pending) => {
    if (requestId.current !== pending.id) return;
    setSlides((current) => readyHeroSlide(current, pending.id, requestId.current));
  }, []);

  const finishPrevious = useCallback((id) => {
    setSlides((current) => finishHeroTransition(current, id, requestId.current));
  }, []);

  const onFailure = useCallback((slide, phase) => {
    setFailedImages((previous) => new Set(previous).add(slide.artwork.slug));
    if (phase === 'pending') commitPending(slide);
  }, [commitPending]);

  // A previously failed image has a fallback rather than an <img> load event.
  useEffect(() => {
    if (slides.pending && failedImages.has(slides.pending.artwork.slug)) commitPending(slides.pending);
  }, [slides.pending, failedImages, commitPending]);

  // Watchdog: a slide must never sit in `pending` indefinitely. Some browsers
  // do not resolve decode() for a cached/aborted image, and the rotation timer
  // is intentionally suspended while a pending layer exists.
  useEffect(() => {
    if (!slides.pending || slides.pending.ready) return undefined;
    const pending = slides.pending;
    const timer = window.setTimeout(() => commitPending(pending), HERO_PENDING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [slides.pending, commitPending]);

  // Prefer transitionend to a wall-clock timeout. The longer fallback handles
  // cancelled transitions and browsers that do not dispatch the event.
  useEffect(() => {
    if (!slides.previous) return undefined;
    const previousId = slides.previous.id;
    if (!motionAllowed) {
      finishPrevious(previousId);
      return undefined;
    }
    const timer = window.setTimeout(() => finishPrevious(previousId), 1600);
    return () => window.clearTimeout(timer);
  }, [slides.previous, motionAllowed, finishPrevious]);

  useEffect(() => {
    if (slides.current.announce) setAnnouncement(slides.current.artwork.name);
  }, [slides.current]);

  // Warm and decode the same responsive source that will be displayed next;
  // data-saver visitors do not receive speculative downloads.
  useEffect(() => {
    if (navigator.connection?.saveData) return undefined;
    const next = nextHeroSlug(HERO_ARTWORK, artwork.slug);
    const entry = HERO_ARTWORK.find((item) => item.slug === next);
    if (!entry) return undefined;
    const preloader = new Image();
    preloader.decoding = 'async';
    preloader.src = window.matchMedia(DESKTOP_ART_MEDIA).matches ? (entry.desktopImage || entry.image) : entry.image;
    if (typeof preloader.decode === 'function') preloader.decode().catch(() => {});
    return () => { preloader.onload = null; preloader.onerror = null; };
  }, [artwork.slug]);

  useEffect(() => {
    if (!playing || !inView || !tabVisible || slides.pending || HERO_ARTWORK.length < 2) return undefined;
    const timer = window.setTimeout(() => changeUnit(1, false), HERO_ROTATION_MS);
    return () => window.clearTimeout(timer);
  }, [slides.current.id, slides.pending, playing, inView, tabVisible, changeUnit]);

  const toggleRotation = () => {
    if (playing) setPaused(true);
    else {
      if (!motionAllowed) setPlayOverride(true);
      setPaused(false);
    }
  };

  const layer = (slide, phase) => <ArtworkLayer
    key={slide.id}
    slide={slide}
    phase={phase}
    failed={failedImages.has(slide.artwork.slug)}
    onReady={commitPending}
    onFailure={onFailure}
    onTransitionComplete={finishPrevious}
  />;

  return (
    <section ref={heroRef} className="apex-hero" aria-labelledby="apex-hero-title" aria-roledescription="carousel" data-unit-count={HERO_ARTWORK.length}>
      <HeroAtmosphere />
      <h1 id="apex-hero-title" className="apex-hero-display">APEX<span className="apex-sr-only"> Wiki &amp; Values</span></h1>

      <figure className="apex-hero-visual" aria-label={`${artwork.name} artwork`} data-unit-slug={artwork.slug}>
        <div className="apex-hero-art">
          {slides.previous && layer(slides.previous, 'leaving')}
          {layer(slides.current, slides.previous ? 'entering' : slides.current.id === 0 ? 'initial' : 'current')}
          {slides.pending && layer(slides.pending, 'pending')}
        </div>
      </figure>

      <nav className="apex-hero-actions" aria-label="Explore Apex">
        <Link to="/wiki" className="apex-hero-primary">Wiki <CoolIcon name="arrow-up-right" size={17} /></Link>
        <Link to="/values" className="apex-hero-secondary">Values <CoolIcon name="arrow-up-right" size={17} /></Link>
      </nav>

      <div className="apex-hero-controls" aria-label="Unit carousel controls">
        <button type="button" onClick={() => changeUnit(-1)} aria-label="Previous unit"><CoolIcon name="arrow-left" size={19} /></button>
        <button type="button" onClick={toggleRotation} aria-label={playing ? 'Pause unit rotation' : 'Play unit rotation'} title={!motionAllowed && !playing ? 'Play this carousel despite the reduced-motion setting' : undefined}>
          <CoolIcon name={playing ? 'pause' : 'play'} size={16} />
        </button>
        <button type="button" onClick={() => changeUnit(1)} aria-label="Next unit"><CoolIcon name="arrow-right" size={19} /></button>
      </div>
      <span className="apex-sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
    </section>
  );
}
