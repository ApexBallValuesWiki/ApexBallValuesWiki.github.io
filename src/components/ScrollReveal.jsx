import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useMotionPreference from '../hooks/useMotionPreference';

// Content is never hidden while JS loads. Discover only newly mounted
// subtrees, instead of rescanning the whole app on every unrelated mutation.
export default function ScrollReveal() {
  const { pathname } = useLocation();
  const motionAllowed = useMotionPreference();
  useEffect(() => {
    if (!motionAllowed || !('IntersectionObserver' in window)) return undefined;
    const root = document.getElementById('root') || document.body;
    const watched = new WeakSet();
    const added = new Set();
    const removed = new Set();
    let frame = 0;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('scroll-revealed');
        observer.unobserve(entry.target);
        watched.delete(entry.target);
      }
    }), { threshold: 0.08 });

    const walk = (node, visit) => {
      if (node.nodeType !== 1) return;
      if (node.matches('[data-scroll-reveal]')) visit(node);
      node.querySelectorAll('[data-scroll-reveal]').forEach(visit);
    };
    const observe = (node) => {
      if (!node.isConnected || node.classList.contains('scroll-revealed') || watched.has(node)) return;
      watched.add(node);
      observer.observe(node);
    };
    const unobserve = (node) => {
      if (node.isConnected || !watched.has(node)) return;
      observer.unobserve(node);
      watched.delete(node);
    };
    const flush = () => {
      frame = 0;
      removed.forEach((node) => walk(node, unobserve));
      added.forEach((node) => walk(node, observe));
      removed.clear();
      added.clear();
    };
    // IntersectionObserver alone never fired for above-the-fold nodes in
    // some layouts (they were already intersecting before observation), so
    // [data-scroll-reveal] stayed invisible with 0/.scroll-revealed.
    const revealInViewport = () => {
      root.querySelectorAll('[data-scroll-reveal]:not(.scroll-revealed)').forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
          node.classList.add('scroll-revealed');
          observer.unobserve(node);
          watched.delete(node);
        }
      });
    };
    walk(root, observe);
    window.requestAnimationFrame(revealInViewport);
    const revealTimer = window.setTimeout(revealInViewport, 350);
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => { if (node.nodeType === 1) added.add(node); });
        record.removedNodes.forEach((node) => { if (node.nodeType === 1) removed.add(node); });
      });
      if ((added.size || removed.size) && !frame) {
        frame = requestAnimationFrame(() => { flush(); revealInViewport(); });
      }
    });
    mutations.observe(root, { childList: true, subtree: true });
    return () => {
      mutations.disconnect();
      observer.disconnect();
      window.clearTimeout(revealTimer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname, motionAllowed]);
  return null;
}
