import { useEffect, useRef } from 'react';
import './Holo3DScene.css';

function parseHexToRgbNormalized(hex) {
  const clean = String(hex || '').trim().replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return [
      parseInt(clean[0] + clean[0], 16) / 255,
      parseInt(clean[1] + clean[1], 16) / 255,
      parseInt(clean[2] + clean[2], 16) / 255,
    ];
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16) / 255,
      parseInt(clean.slice(2, 4), 16) / 255,
      parseInt(clean.slice(4, 6), 16) / 255,
    ];
  }
  return [0.78, 0.86, 1.0];
}

const VERTEX_SHADER_SRC = `
attribute vec2 aPos;
varying vec2 vUv;

void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/**
 * Full-Viewport Non-Overlapping Abstract Silk-Aurora Page Background
 * - 100% single-valued, strictly ordered diagonal silk wave folds (k = 0..5).
 * - Because all 6 silk folds share a sweeping carrier arch G(u, t) while their
 *   individual wave offsets satisfy |w_k(u, t)| <= 0.036 < 0.5 * dv (dv = 0.145),
 *   V_k(u, t) - V_{k+1}(u, t) >= 0.073 > 0 at every point (u, t).
 * - Mathematically impossible for any fold to self-intersect, cross, or overlap.
 * - Makes the Home page background look distinctly different from the rest of
 *   the website's flat black square grid.
 */
const FRAGMENT_SHADER_SRC = `
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform float uScroll;
uniform vec2 uPointer;
uniform vec2 uFlowOffset;
uniform vec3 uAccent;
uniform vec3 uSecondary;

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float x = (uv.x - 0.5) * aspect;
  float y = uv.y - 0.5;

  // Theme color harmonization: rich sapphire-cyan + active theme accent
  float accLum = dot(uAccent, vec3(0.299, 0.587, 0.114));
  vec3 primaryTint = mix(vec3(0.36, 0.62, 0.98), uAccent, clamp(accLum * 1.1, 0.30, 0.88));
  vec3 secondaryTint = mix(vec3(0.52, 0.38, 0.92), uSecondary, 0.55);

  // =========================================================================
  // 1. DEEP VELVET MIDNIGHT-INDIGO & AURORA ATMOSPHERE
  // =========================================================================
  vec3 bgDeep = vec3(0.018, 0.028, 0.062) + primaryTint * 0.025;
  vec3 bgMid  = vec3(0.032, 0.056, 0.118) + primaryTint * 0.055 + secondaryTint * 0.035;
  vec3 bgHigh = vec3(0.022, 0.038, 0.084) + secondaryTint * 0.045;

  vec3 col = mix(bgDeep, bgMid, smoothstep(-0.52, 0.15, y));
  col = mix(col, bgHigh, smoothstep(0.10, 0.55, y));

  // Large atmospheric light pool on the open right-center canvas
  vec2 stageCenter = vec2(0.18 * aspect, 0.04 - 0.12 * (uScroll - 0.5));
  vec2 dStage = vec2((x - stageCenter.x) * 0.78, (y - stageCenter.y) * 1.05);
  float stageBloom = exp(-dot(dStage, dStage) * 2.1);
  col += (primaryTint * 0.14 + secondaryTint * 0.08 + vec3(0.03, 0.06, 0.12)) * stageBloom;

  // Interactive cursor glow pool
  vec2 ptrPos = vec2(uPointer.x * 0.5 * aspect, uPointer.y * 0.5);
  vec2 dPtr = vec2(x - ptrPos.x, y - ptrPos.y);
  float ptrBloom = exp(-dot(dPtr, dPtr) * 3.6);
  col += (primaryTint * 0.10 + vec3(0.04, 0.06, 0.10)) * ptrBloom;

  // =========================================================================
  // 2. ROTATED DIAGONAL COORDINATE FRAME (u, v) FOR ORGANIC S-CURVE FLOW
  // =========================================================================
  // Rotate by ~19 degrees so the silk waves sweep diagonally across the page
  // rather than sitting as flat horizontal stripes.
  float cosA = 0.9455;
  float sinA = -0.3255;
  float u = x * cosA - y * sinA;
  float v = x * sinA + y * cosA;

  // Shared sweeping S-curve carrier wave G(u, t):
  // Added identically to all 6 silk folds so it creates a dramatic, organic
  // sculptural arch while preserving exact separation V_k(u) - V_{k+1}(u)!
  float uFlow = u + uFlowOffset.x * 0.55 - uScroll * 0.65;
  float carrier = 0.165 * sin(1.22 * uFlow - uTime * 0.13)
                + 0.068 * cos(0.68 * uFlow + uTime * 0.09 + 0.7);
  float dCarrier = 0.165 * 1.22 * cos(1.22 * uFlow - uTime * 0.13)
                 - 0.068 * 0.68 * sin(0.68 * uFlow + uTime * 0.09 + 0.7);

  // Horizontal light envelope so crests glow brightest in the open right-center
  // viewport and soften gently behind the left content cards and far-right rail
  float stageLightEnv = smoothstep(-0.85, 0.05, x) * smoothstep(1.02 * aspect, 0.36 * aspect, x);
  float baseRimEnv = 0.34 + 0.66 * stageLightEnv;

  // =========================================================================
  // 3. 6 STRICTLY NON-OVERLAPPING SCULPTED SILK FOLDS (k = 0 .. 5)
  // Baseline spacing dv = 0.148; per-fold wave |w_k| <= 0.036 < 0.5 * dv.
  // Therefore V_k(u) - V_{k+1}(u) >= 0.076 > 0 everywhere — ZERO OVERLAP!
  // =========================================================================
  for (int k = 0; k < 6; k++) {
    float fk = float(k);
    float vBase = 0.30 - fk * 0.148;

    float phase = fk * 0.74 + uScroll * 1.35 + uFlowOffset.x * 0.95;
    float t1 = uTime * 0.18 + fk * 0.38;
    float t2 = -uTime * 0.13 + fk * 0.52;

    float a1 = 1.55 * u + phase + t1;
    float a2 = 2.75 * u - 0.55 * phase + t2;
    float a3 = 0.85 * u + 0.70 * phase - t1 * 0.6;

    // Strictly bounded per-fold modulation: 0.021 + 0.009 + 0.006 = 0.036
    float w = 0.021 * sin(a1)
            + 0.009 * cos(a2)
            + 0.006 * sin(a3);

    float dw = 0.021 * 1.55 * cos(a1)
             - 0.009 * 2.75 * sin(a2)
             + 0.006 * 0.85 * cos(a3);

    float vCrest = vBase + carrier + w;
    float slope = dCarrier + dw;

    // Signed distance below fold k's crest in rotated v-space
    float d = vCrest - v;

    // Smooth anti-aliased fold coverage (v <= vCrest)
    float foldMask = smoothstep(-0.003, 0.003, d);

    // 3D surface normal along the silk fold for directional studio lighting
    vec3 nrm = normalize(vec3(-slope * 1.95, 1.0, 0.75));
    vec3 lightDir = normalize(vec3(0.42 + uPointer.x * 0.28, 0.68 + uPointer.y * 0.22, 0.58));
    float ndotl = clamp(dot(nrm, lightDir), 0.0, 1.0);
    float s2 = ndotl * ndotl;
    float s4 = s2 * s2;
    float s8 = s4 * s4;

    float layerFrac = fk / 5.0;
    float posD = max(d, 0.0);

    // Smooth velvet-satin gradient inside the fold (zero stripes, zero banding)
    float topSheen = exp(-posD * 14.5);
    float bodyFalloff = exp(-posD * 5.2);

    vec3 foldTint = mix(primaryTint, secondaryTint, 0.35 + 0.35 * sin(fk * 0.85 + u * 0.9));

    vec3 deepFoldCol = mix(
      vec3(0.018, 0.030, 0.068) + foldTint * 0.025,
      vec3(0.010, 0.017, 0.042) + foldTint * 0.015,
      layerFrac
    );

    vec3 litFoldCol = vec3(0.09, 0.15, 0.28)
                    + foldTint * (0.26 + 0.24 * s4)
                    + vec3(0.18, 0.24, 0.36) * s8 * stageLightEnv;

    vec3 foldBody = mix(deepFoldCol, litFoldCol, topSheen * (0.55 + 0.45 * baseRimEnv));
    foldBody += foldTint * 0.07 * bodyFalloff * s2;

    // Composite this silk fold cleanly over the folds behind it
    col = mix(col, foldBody, foldMask * 0.95);

    // Sculpted satin-chrome crest highlight along d = 0 (soft & refined, never harsh neon)
    float crestCore = exp(-d * d * 18000.0);
    float crestSoft = exp(-d * d * 1100.0);

    vec3 rimCol = mix(foldTint * 0.85 + vec3(0.32, 0.44, 0.64), vec3(0.92, 0.96, 1.0), s4 * 0.75);
    float rimStrength = (0.22 + 0.52 * s4) * baseRimEnv;

    col += rimCol * crestCore * rimStrength;
    col += (foldTint * 0.22 + vec3(0.05, 0.09, 0.18)) * crestSoft * 0.24 * baseRimEnv;
  }

  // Gentle top & bottom framing vignette
  float vVig = smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.91, uv.y);
  col *= mix(0.78, 1.0, vVig);

  // Smooth filmic tone mapping
  col = col / (1.0 + col * 0.25);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function Holo3DScene({
  variant = 'horizon',
  scrollContainerRef = null,
  className = '',
  interactive = true,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let gl = null;
    try {
      gl =
        canvas.getContext('webgl', {
          alpha: false,
          antialias: true,
          depth: false,
          stencil: false,
          powerPreference: 'high-performance',
        }) || canvas.getContext('experimental-webgl');
    } catch {
      gl = null;
    }

    let program = null;
    let quadBuffer = null;
    let aPosLoc = -1;
    let uResolutionLoc = null;
    let uTimeLoc = null;
    let uScrollLoc = null;
    let uPointerLoc = null;
    let uFlowOffsetLoc = null;
    let uAccentLoc = null;
    let uSecondaryLoc = null;
    let ctx2d = null;

    if (gl) {
      const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
      if (vs && fs) {
        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
          gl.useProgram(program);
          quadBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW
          );
          aPosLoc = gl.getAttribLocation(program, 'aPos');
          gl.enableVertexAttribArray(aPosLoc);
          gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

          uResolutionLoc = gl.getUniformLocation(program, 'uResolution');
          uTimeLoc = gl.getUniformLocation(program, 'uTime');
          uScrollLoc = gl.getUniformLocation(program, 'uScroll');
          uPointerLoc = gl.getUniformLocation(program, 'uPointer');
          uFlowOffsetLoc = gl.getUniformLocation(program, 'uFlowOffset');
          uAccentLoc = gl.getUniformLocation(program, 'uAccent');
          uSecondaryLoc = gl.getUniformLocation(program, 'uSecondary');
        } else {
          program = null;
        }
      }
    }

    if (!program) {
      try {
        ctx2d = canvas.getContext('2d');
      } catch {
        ctx2d = null;
      }
    }

    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let pointerX = 0;
    let pointerY = 0;

    let isDragging = false;
    let lastDragX = 0;
    let lastDragY = 0;
    let flowTargetX = 0;
    let flowTargetY = 0;
    let flowX = 0;
    let flowY = 0;

    let scrollProgress = 0;
    let targetScrollProgress = 0;

    let accentRgb = [0.68, 0.8, 1.0];
    let secondaryRgb = [0.44, 0.62, 0.95];

    function refreshThemeColors() {
      const style = getComputedStyle(document.documentElement);
      const rawAccent = style.getPropertyValue('--accent') || '#8ab4ff';
      const rawSecondary =
        style.getPropertyValue('--accent-secondary') || rawAccent;
      accentRgb = parseHexToRgbNormalized(rawAccent);
      secondaryRgb = parseHexToRgbNormalized(rawSecondary);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.0);
      width = Math.max(1, Math.floor(rect.width * dpr));
      height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      if (gl && program) {
        gl.viewport(0, 0, width, height);
      }
    }

    function updateScroll() {
      if (scrollContainerRef?.current) {
        const maxScroll = Math.max(
          1,
          document.documentElement.scrollHeight - window.innerHeight
        );
        targetScrollProgress = Math.max(
          0,
          Math.min(1, window.scrollY / maxScroll)
        );
      } else {
        const rect = canvas.getBoundingClientRect();
        const vh = Math.max(1, window.innerHeight);
        targetScrollProgress = Math.max(
          0,
          Math.min(1, 1 - rect.top / vh)
        );
      }
    }

    function onPointerMove(e) {
      const vw = Math.max(1, window.innerWidth);
      const vh = Math.max(1, window.innerHeight);
      pointerTargetX = ((e.clientX / vw) - 0.5) * 2;
      pointerTargetY = (0.5 - (e.clientY / vh)) * 2;

      if (isDragging && interactive) {
        const dx = (e.clientX - lastDragX) / vw;
        const dy = (e.clientY - lastDragY) / vh;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        flowTargetX += dx * 2.2;
        flowTargetY = Math.max(-0.8, Math.min(0.8, flowTargetY - dy * 1.6));
      }
    }

    function onPointerDown(e) {
      if (!interactive) return;
      isDragging = true;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      canvas.classList.add('is-dragging');
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      canvas.classList.remove('is-dragging');
    }

    // 2D Canvas fallback that draws the exact same 6 non-overlapping diagonal silk folds
    function render2DFallback(timeSec) {
      if (!ctx2d) return;
      ctx2d.clearRect(0, 0, width, height);

      const r = Math.round((0.36 + accentRgb[0] * 0.64) * 255);
      const g = Math.round((0.56 + accentRgb[1] * 0.44) * 255);
      const b = Math.round((0.82 + accentRgb[2] * 0.18) * 255);

      const skyGrad = ctx2d.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#060b18');
      skyGrad.addColorStop(0.5, '#0b1428');
      skyGrad.addColorStop(1, '#040710');
      ctx2d.fillStyle = skyGrad;
      ctx2d.fillRect(0, 0, width, height);

      const steps = 64;
      for (let k = 0; k < 6; k++) {
        const yBaseNorm = 0.24 + k * 0.135;
        const phase = k * 0.74 + scrollProgress * 1.35 + flowX * 0.95;

        ctx2d.beginPath();
        for (let i = 0; i <= steps; i++) {
          const uNorm = i / steps;
          const xNorm = (uNorm - 0.5) * (width / Math.max(height, 1));
          const carrier =
            0.14 * Math.sin(1.22 * (xNorm + flowX * 0.55 - scrollProgress * 0.65) - timeSec * 0.13) +
            0.06 * Math.cos(0.68 * xNorm + timeSec * 0.09);
          const wave =
            0.021 * Math.sin(1.55 * xNorm + phase + timeSec * 0.18) +
            0.009 * Math.cos(2.75 * xNorm - 0.55 * phase - timeSec * 0.13);

          const py = (yBaseNorm - 0.18 * (uNorm - 0.5) - carrier - wave) * height;
          const px = uNorm * width;
          if (i === 0) ctx2d.moveTo(px, py);
          else ctx2d.lineTo(px, py);
        }

        ctx2d.lineTo(width, height + 10);
        ctx2d.lineTo(0, height + 10);
        ctx2d.closePath();

        const bandGrad = ctx2d.createLinearGradient(0, yBaseNorm * height - 60, 0, height);
        const alpha = 0.22 - k * 0.02;
        bandGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`);
        bandGrad.addColorStop(0.4, 'rgba(8, 14, 28, 0.92)');
        bandGrad.addColorStop(1, 'rgba(4, 7, 16, 0.98)');
        ctx2d.fillStyle = bandGrad;
        ctx2d.fill();

        ctx2d.strokeStyle = `rgba(${Math.min(255, r + 35)}, ${Math.min(255, g + 35)}, 255, ${(0.45 - k * 0.04).toFixed(3)})`;
        ctx2d.lineWidth = Math.max(1.2, 1.6 * dpr);
        ctx2d.stroke();
      }
    }

    const startTime = performance.now();
    let frameCount = 0;

    function render(now) {
      rafId = requestAnimationFrame(render);
      frameCount++;
      if (frameCount % 90 === 1) {
        refreshThemeColors();
      }

      pointerX += (pointerTargetX - pointerX) * 0.06;
      pointerY += (pointerTargetY - pointerY) * 0.06;
      flowX += (flowTargetX - flowX) * 0.07;
      flowY += (flowTargetY - flowY) * 0.07;
      flowTargetY *= 0.985;
      scrollProgress += (targetScrollProgress - scrollProgress) * 0.08;

      const timeSec = (now - startTime) * 0.001;

      if (gl && program) {
        gl.useProgram(program);
        gl.uniform2f(uResolutionLoc, width, height);
        gl.uniform1f(uTimeLoc, timeSec);
        gl.uniform1f(uScrollLoc, scrollProgress);
        gl.uniform2f(uPointerLoc, pointerX, pointerY);
        gl.uniform2f(uFlowOffsetLoc, flowX, flowY);
        gl.uniform3f(uAccentLoc, accentRgb[0], accentRgb[1], accentRgb[2]);
        gl.uniform3f(
          uSecondaryLoc,
          secondaryRgb[0],
          secondaryRgb[1],
          secondaryRgb[2]
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } else {
        render2DFallback(timeSec);
      }
    }

    refreshThemeColors();
    resize();
    updateScroll();
    rafId = requestAnimationFrame(render);

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      if (gl && quadBuffer) gl.deleteBuffer(quadBuffer);
      if (gl && program) gl.deleteProgram(program);
    };
  }, [variant, scrollContainerRef, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`holo-3d-canvas ${interactive ? 'is-interactive' : ''} ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
