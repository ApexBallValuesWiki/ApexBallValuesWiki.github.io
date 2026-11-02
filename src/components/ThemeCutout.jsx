import { HERO_ARTWORK } from '../data/heroArtwork';
import './ThemeCutout.css';
import { resolveImageUrl } from '../utils/localAssets';

// Shared decorative illustrations only. This map never participates in unit
// image lookup, and therefore never replaces normal or shiny Wiki artwork.
const supplied = Object.fromEntries(HERO_ARTWORK.map(({ slug, image, name }) => [slug, { src: image, label: name }]));
export const CUTOUT_MAP = Object.freeze({
  ...supplied,
  // Retain existing page aliases while giving those surfaces supplied art.
  overlord: supplied['omega-knight'],
  poseidon: supplied['king-ball'],
  hacker: supplied.brainball,
  drone: supplied.plasma,
  forest: supplied.autumn,
  king: supplied.fancyball,
  laserminigunner: supplied['laser-minigunner'],
  partyman: supplied['party-man'],
  elfcommander: supplied['elf-commander'],
});

export const RARITY_CUTOUT_MAP = {
  Normie: 'baller',
  Odds: 'elf-commander',
  Rares: 'mummy',
  Awesome: 'showman',
  Legendaries: 'fancyball',
  Mythics: 'hephaestus',
  Transcendents: 'wukong',
  Omegas: 'omega-knight',
  '???': 'plasma',
};

export function getCutoutForRarity(rarity = '') {
  const base = String(rarity || '').replace(/^Shiny\s+/i, '');
  return RARITY_CUTOUT_MAP[base] || 'omega-knight';
}

/**
 * Theme-adaptive website ornament, not a unit record or unit image.
 * `tintColor` lets a caller pin the tint to something other than the active
 * theme — the Browse by Rarity cards use their own rarity colour for this.
 */
export default function ThemeCutout({
  variant = 'overlord',
  src: customSrc,
  alt = '',
  as: Element = 'div',
  className = '',
  floating = false,
  tintColor,
  style,
}) {
  const entry = CUTOUT_MAP[variant] || CUTOUT_MAP.overlord;
  const src = customSrc || entry.src;
  const maskVars = {
    '--cutout-mask': `url(${JSON.stringify(src)})`,
    ...(tintColor ? { '--cutout-tint': tintColor } : {}),
    ...style,
  };

  return (
    <Element
      className={`theme-cutout ${floating ? 'is-floating' : ''} ${className}`.trim()}
      style={maskVars}
      data-theme-art="true"
      aria-hidden={alt ? undefined : 'true'}
    >
      <img
        src={resolveImageUrl(src)}
        alt={alt}
        className="theme-cutout-img"
        loading="lazy"
        decoding="async"
        draggable="false"
      />
      <span className="theme-cutout-tint" aria-hidden="true" />
      <span className="theme-cutout-sheen" aria-hidden="true" />
    </Element>
  );
}
