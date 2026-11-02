import * as THREE from 'three';

// Single depth field, not an intersecting mesh. No continuously running loop:
// the camera renders on resize/scroll/theme changes and briefly eases to rest.
export function createHeroAtmosphere(host) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 40);
  camera.position.z = 10;
  const vertices = [];
  // Deterministic field so hydration and repeat visits do not shift the design.
  let seed = 82719;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 180; i += 1) {
    vertices.push((random() - 0.5) * 23, (random() - 0.5) * 13, (random() - 0.5) * 10);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const material = new THREE.PointsMaterial({ size: 0.026, color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true });
  const stars = new THREE.Points(geometry, material);
  scene.add(stars);

  let disposed = false;
  let visible = true;
  let frame = 0;
  let target = 0;
  let current = 0;
  function requestRender() { if (!frame && !disposed && visible) frame = requestAnimationFrame(render); }
  function render() {
    frame = 0;
    if (disposed || !visible) return;
    current += (target - current) * 0.14;
    camera.position.x = current * 0.6;
    camera.position.y = -current * 0.22;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    if (Math.abs(target - current) > 0.001) requestRender();
  }
  function measure() {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  }
  function onScroll() {
    if (!visible) return;
    const rect = host.getBoundingClientRect();
    target = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
    requestRender();
  }
  function onTheme(event) {
    const color = event?.detail?.colors?.text || getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
    try { if (color) material.color.set(color); } catch { /* retain neutral */ }
    requestRender();
  }
  const resize = new ResizeObserver(measure);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) onScroll(); }, { rootMargin: '100px' });
  resize.observe(host);
  intersection.observe(host);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('apex-theme-updated', onTheme);
  onTheme(); measure(); onScroll();
  return () => {
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    resize.disconnect(); intersection.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('apex-theme-updated', onTheme);
    geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}
