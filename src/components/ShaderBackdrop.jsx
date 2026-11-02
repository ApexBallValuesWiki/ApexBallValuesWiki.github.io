import { useEffect, useRef } from 'react';
import useMotionPreference from '../hooks/useMotionPreference';
import './ShaderBackdrop.css';

function shouldSkipTilt() {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth <= 900) return true;
  const mem = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  return (typeof mem === 'number' && mem <= 4) || (typeof cores === 'number' && cores <= 4);
}

// Static gradient plates are composited by CSS. The previous canvas repainted
// two gradients and read computed styles every frame even while nothing moved.
export default function ShaderBackdrop({ accentColor, className = '', variant = 'default' }) {
  return (
    <div
      className={`shader-backdrop variant-${variant} ${className}`.trim()}
      style={accentColor ? { '--section-accent': accentColor } : undefined}
      aria-hidden="true"
    >
      <div className="shader-linear-wash" />
      <div className="shader-mesh-orb orb-a" />
      <div className="shader-mesh-orb orb-b" />
    </div>
  );
}

// Lightweight panel tilt, opt-in by pointer capability and motion preference.
// Transform is applied to one layer rather than updating inherited CSS vars
// across the whole section on every pointer frame.
export function useSplineTilt(maxDeg = 4) {
  const ref = useRef(null);
  const motionAllowed = useMotionPreference();

  useEffect(() => {
    const el = ref.current;
    if (!el || !motionAllowed || shouldSkipTilt()) return undefined;

    let frame = 0;
    let clientX = 0;
    let clientY = 0;
    const handleMove = (event) => {
      clientX = event.clientX;
      clientY = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const nx = Math.max(-0.5, Math.min(0.5, (clientX - rect.left) / rect.width - 0.5));
        const ny = Math.max(-0.5, Math.min(0.5, (clientY - rect.top) / rect.height - 0.5));
        el.style.transform = `perspective(1400px) rotateX(${(-ny * maxDeg).toFixed(2)}deg) rotateY(${(nx * maxDeg).toFixed(2)}deg)`;
      });
    };
    const handleLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      el.style.removeProperty('transform');
    };
    el.addEventListener('pointermove', handleMove, { passive: true });
    el.addEventListener('pointerleave', handleLeave, { passive: true });
    return () => {
      handleLeave();
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerleave', handleLeave);
    };
  }, [maxDeg, motionAllowed]);

  return ref;
}
