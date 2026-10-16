import React from 'react';
import overlordImg from '../assets/cutouts/overclocked-overlord.png';
import poseidonImg from '../assets/cutouts/poseidon.png';
import hackerImg from '../assets/cutouts/hacker-ball.png';
import droneImg from '../assets/cutouts/drone-ball.png';
import forestImg from '../assets/cutouts/forest-ball.png';
import kingImg from '../assets/cutouts/king-ball.png';
import laserMinigunnerImg from '../assets/cutouts/laser-minigunner.png';
import partyManImg from '../assets/cutouts/party-man.png';
import elfCommanderImg from '../assets/cutouts/elf-commander.png';
import './ThemeCutout.css';

export const CUTOUT_MAP = {
  overlord: { src: overlordImg, label: 'Overclocked Overlord' },
  poseidon: { src: poseidonImg, label: 'Poseidon' },
  hacker: { src: hackerImg, label: 'Hacker Ball' },
  drone: { src: droneImg, label: 'Drone Ball' },
  forest: { src: forestImg, label: 'Forest Ball' },
  king: { src: kingImg, label: 'King Ball' },
  laserminigunner: { src: laserMinigunnerImg, label: 'Laser Minigunner' },
  partyman: { src: partyManImg, label: 'Party Man' },
  elfcommander: { src: elfCommanderImg, label: 'Elf Commander' },
};

export const RARITY_CUTOUT_MAP = {
  Normie: 'partyman',
  Odds: 'elfcommander',
  Rares: 'drone',
  Awesome: 'forest',
  Legendaries: 'king',
  Mythics: 'laserminigunner',
  Transcendents: 'poseidon',
  Omegas: 'overlord',
  '???': 'hacker',
};

export function getCutoutForRarity(rarity = '') {
  const base = String(rarity || '').replace(/^Shiny\s+/i, '');
  return RARITY_CUTOUT_MAP[base] || 'overlord';
}

/**
 * Renders a unit cutout in crisp metallic monochrome and dynamically tints it
 * to the active theme color (--accent) or an optional custom `--cutout-tint`
 * using CSS alpha masking so transparent pixels stay 100% transparent.
 */
export default function ThemeCutout({
  variant = 'overlord',
  src: customSrc,
  alt = '',
  className = '',
  tintColor,
  floating = false,
  style,
}) {
  const entry = CUTOUT_MAP[variant] || CUTOUT_MAP.overlord;
  const src = customSrc || entry.src;

  const maskVars = {
    '--cutout-mask': `url("${src}")`,
    ...(tintColor ? { '--cutout-tint': tintColor } : {}),
    ...style,
  };

  return (
    <div
      className={`theme-cutout ${floating ? 'is-floating' : ''} ${className}`.trim()}
      style={maskVars}
      aria-hidden={alt ? undefined : 'true'}
    >
      <img
        src={src}
        alt={alt}
        className="theme-cutout-img"
         loading="lazy"
        decoding="async"
        draggable="false"
      />
      <span className="theme-cutout-tint" aria-hidden="true" />
      <span className="theme-cutout-sheen" aria-hidden="true" />
    </div>
  );
}
