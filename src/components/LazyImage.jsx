import { useState, useRef, useEffect } from 'react';

/**
 * LazyImage — lazy loads images with blur-up placeholder
 */
export default function LazyImage({ src, alt, className, style, width, height }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      {/* Blur placeholder */}
      {!loaded && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--bg-elevated)',
          filter: 'blur(20px)',
          transform: 'scale(1.1)',
        }} />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          onLoad={() => setLoaded(true)}
          style={{
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
    </div>
  );
}
