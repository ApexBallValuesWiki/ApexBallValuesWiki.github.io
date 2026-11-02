// Six small, self-hosted cutouts used as quiet atmosphere away from the hero.
// They are intentionally few (1-2 per view is the motion/UX rule), low opacity,
// decorative only, and never loaded on touch devices or with reduced motion.
import forestBall from '../assets/units/ambient/forestball.webp';
import hackerBall from '../assets/units/ambient/hackerball.webp';
import plasma from '../assets/units/ambient/plasmaball.webp';
import wukong from '../assets/units/ambient/wukongball.webp';
import partyMan from '../assets/units/ambient/partyman.webp';
import frutiger from '../assets/units/ambient/frutigerball.webp';

export const AMBIENT_ARTWORK = Object.freeze([
  { slug: 'forest-ball', name: 'Forest Ball', image: forestBall, position: 'left' },
  { slug: 'hacker-ball', name: 'Hacker Ball', image: hackerBall, position: 'right' },
  { slug: 'plasma', name: 'Plasma', image: plasma, position: 'left' },
  { slug: 'wukong', name: 'Wukong', image: wukong, position: 'right' },
  { slug: 'party-man', name: 'Party Man', image: partyMan, position: 'left' },
  { slug: 'frutiger', name: 'Frutiger', image: frutiger, position: 'right' },
]);

/** Deterministic pair for a route so the atmosphere changes without flicker. */
export function ambientForPath(pathname) {
  const key = String(pathname || '/').split('/').filter(Boolean)[0] || 'home';
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 997;
  const start = hash % AMBIENT_ARTWORK.length;
  return [AMBIENT_ARTWORK[start], AMBIENT_ARTWORK[(start + 3) % AMBIENT_ARTWORK.length]];
}
