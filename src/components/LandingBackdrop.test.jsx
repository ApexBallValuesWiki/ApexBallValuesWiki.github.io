import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LandingBackdrop from './LandingBackdrop';

const markup = () => renderToStaticMarkup(<LandingBackdrop />);

function points(path) {
  const numbers = (path.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  return Array.from({ length: numbers.length / 2 }, (_, i) => [numbers[i * 2], numbers[i * 2 + 1]]);
}

function area(polygon) {
  if (polygon.length < 3) return 0;
  return Math.abs(polygon.reduce((sum, p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0)) / 2;
}

// Clip one convex face against another. Shared edges have zero area and are
// intentional; a positive intersection area would mean two facets overlap.
function intersection(subject, clip) {
  let result = subject;
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  for (let i = 0; i < clip.length && result.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const edge = [b[0] - a[0], b[1] - a[1]];
    const inside = (p) => cross(edge, [p[0] - a[0], p[1] - a[1]]) >= -1e-8;
    const intersect = (p, q) => {
      const segment = [q[0] - p[0], q[1] - p[1]];
      const t = cross([a[0] - p[0], a[1] - p[1]], edge) / cross(segment, edge);
      return [p[0] + t * segment[0], p[1] + t * segment[1]];
    };
    const previous = result;
    result = [];
    for (let j = 0; j < previous.length; j++) {
      const p = previous[j];
      const q = previous[(j + 1) % previous.length];
      if (inside(p) && inside(q)) result.push(q);
      else if (inside(p) && !inside(q)) result.push(intersect(p, q));
      else if (!inside(p) && inside(q)) result.push(intersect(p, q), q);
    }
  }
  return result;
}

describe('landing backdrop', () => {
  it('renders the decorative vector without a video or WebGL canvas', () => {
    const html = markup();
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('<svg');
    expect(html).not.toMatch(/<(video|canvas)\b/);
  });

  it('tiles one silhouette with adjacent, non-overlapping facets', () => {
    const html = markup();
    const faces = [...html.matchAll(/<path d="([^"]+)" fill="url\(#landing-facet-[a-h]\)"/g)]
      .map((match) => points(match[1]));
    const outline = html.match(/<path d="([^"]+)" fill="none" stroke="url\(#landing-prism-edge\)"/);
    expect(faces).toHaveLength(8);
    expect(outline).not.toBeNull();
    expect(faces.reduce((sum, face) => sum + area(face), 0)).toBeCloseTo(area(points(outline[1])), 6);
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        expect(area(intersection(faces[i], faces[j]))).toBeLessThan(1e-5);
      }
    }
  });
});
