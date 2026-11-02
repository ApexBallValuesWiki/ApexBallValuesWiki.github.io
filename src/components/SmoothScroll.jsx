import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { loadUXSettings } from '../utils/uxSettings';
import useMotionPreference from '../hooks/useMotionPreference';

// Desktop / PC detection. Some Windows laptops and 2-in-1 devices report
// `(pointer: fine)` as false even with a mouse attached, which silently killed
// Lenis on exactly the machines the operator complained about. Use a width
// check plus "not a touch-first device" instead — far more reliable.
const WIDE_MEDIA = '(min-width: 900px)';
const COARSE_MEDIA = '(pointer: coarse)';

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

/**
 * One scroll controller for every route — never a second one.
 *
 * "Re-adding" PC smooth scrolling means the desktop path is now explicit and
 * observable: <html data-apex-smooth-scroll="lenis|native|off"> is written on
 * every change, and the Theme Studio exposes a live PC scroll-ease control.
 * Reduced motion, animations-off and coarse pointers always stay native.
 */
export default function SmoothScroll({ children }) {
  const lenisRef = useRef(null);
  const glowRef = useRef(null);
  const location = useLocation();
  const [ux, setUx] = useState(() => loadUXSettings());
  const motionAllowed = useMotionPreference();
  const [desktop, setDesktop] = useState(
    () => typeof window === 'undefined'
      || (Boolean(window.matchMedia?.(WIDE_MEDIA)?.matches) && !window.matchMedia?.(COARSE_MEDIA)?.matches),
  );
  const [finePointer, setFinePointer] = useState(
    () => typeof window === 'undefined' || !window.matchMedia?.(COARSE_MEDIA)?.matches,
  );

  useEffect(() => {
    const wideMedia = window.matchMedia?.(WIDE_MEDIA);
    const coarseMedia = window.matchMedia?.(COARSE_MEDIA);
    const updateMedia = () => {
      setDesktop(Boolean(wideMedia?.matches) && !coarseMedia?.matches);
      setFinePointer(!coarseMedia?.matches);
    };
    const updateUx = (event) => setUx(event.detail || loadUXSettings());
    updateMedia();
    wideMedia?.addEventListener?.('change', updateMedia);
    coarseMedia?.addEventListener?.('change', updateMedia);
    window.addEventListener('apex-ux-updated', updateUx);
    return () => {
      wideMedia?.removeEventListener?.('change', updateMedia);
      coarseMedia?.removeEventListener?.('change', updateMedia);
      window.removeEventListener('apex-ux-updated', updateUx);
    };
  }, []);

  const speed = Number(ux.animSpeed);
  const canAnimate = motionAllowed && ux.reducedMotion !== true && speed > 0;
  const wantsSmooth = desktop && canAnimate && ux.smoothScroll !== false;
  const scrollState = wantsSmooth ? 'lenis' : (desktop && canAnimate ? 'native' : 'off');
  const scrollEase = clamp(ux.scrollEase, 0.6, 1.5, 1);

  // Diagnostics + CSS hooks. Written before the controller is created so a
  // browser probe can tell exactly which path this PC is using.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.apexSmoothScroll = scrollState;
    return () => { delete root.dataset.apexSmoothScroll; };
  }, [scrollState]);

  useEffect(() => {
    if (!wantsSmooth) return undefined;
    const lenis = new Lenis({
      // Higher ease = a longer, softer glide with slightly smaller wheel
      // steps. Both values are bounded so no setting can feel broken.
      duration: clamp(1.15 / scrollEase, 0.7, 1.9, 1.15),
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: clamp(0.94 / scrollEase, 0.62, 1.3, 0.94),
      allowNestedScroll: true,
      anchors: { offset: -70 },
      stopInertiaOnNavigate: true,
      autoResize: true,
    });
    lenisRef.current = lenis;
    window.__apexLenis = lenis;
    let rafId;
    const raf = (time) => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
      if (window.__apexLenis === lenis) delete window.__apexLenis;
    };
  }, [wantsSmooth, scrollEase]);

  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return undefined;
    lenis.scrollTo(0, { immediate: true });
    const timer = setTimeout(() => lenis.resize(), 140);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Cursor glow is deliberately very faint, and inactive for touch/reduced motion.
  useEffect(() => {
    const glow = glowRef.current;
    if (!glow || !finePointer || !canAnimate) return undefined;
    let frame = 0; let targetX = 0; let targetY = 0; let x = 0; let y = 0;
    let initialized = false; let lastTime = 0;
    function update(time) {
      const dt = lastTime ? Math.min(40, time - lastTime) : 16.7;
      lastTime = time;
      const easing = 1 - Math.exp(-dt / 105);
      x += (targetX - x) * easing; y += (targetY - y) * easing;
      glow.style.transform = `translate3d(${(x - 150).toFixed(1)}px, ${(y - 150).toFixed(1)}px, 0)`;
      if (Math.abs(targetX - x) > 0.4 || Math.abs(targetY - y) > 0.4) frame = requestAnimationFrame(update);
      else { frame = 0; lastTime = 0; }
    }
    function move(e) {
      targetX = e.clientX; targetY = e.clientY;
      if (!initialized) { x = targetX; y = targetY; initialized = true; }
      if (!frame) frame = requestAnimationFrame(update);
    }
    window.addEventListener('pointermove', move, { passive: true });
    return () => { if (frame) cancelAnimationFrame(frame); window.removeEventListener('pointermove', move); };
  }, [finePointer, canAnimate]);

  return <><div ref={glowRef} className="apex-cursor-glow" aria-hidden="true" />{children}</>;
}
