import { useEffect, useRef } from 'react';

export function useOverflowScroll(deps = [], options = {}) {
  const { wheelMultiplier = 0.22, easing = 0.075 } = options;
  const ref = useRef(null);
  const targetRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    function maxScroll() {
      return Math.max(0, element.scrollHeight - element.clientHeight);
    }

    function stopAnimation() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    function animate() {
      const current = element.scrollTop;
      const target = Math.max(0, Math.min(maxScroll(), targetRef.current));
      const next = current + (target - current) * easing;

      if (Math.abs(target - current) < 0.45) {
        element.scrollTop = target;
        rafRef.current = null;
        return;
      }

      element.scrollTop = next;
      rafRef.current = requestAnimationFrame(animate);
    }

    function onWheel(event) {
      if (maxScroll() <= 0) return;

      event.preventDefault();
      event.stopPropagation();

      const activeTarget = rafRef.current ? targetRef.current : element.scrollTop;
      targetRef.current = Math.max(0, Math.min(maxScroll(), activeTarget + event.deltaY * wheelMultiplier));

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    function onScroll() {
      if (!rafRef.current) targetRef.current = element.scrollTop;
    }

    targetRef.current = element.scrollTop;
    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      stopAnimation();
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('scroll', onScroll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
