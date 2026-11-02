// Website decoration only. These are the 20 character images supplied by the
// team; they never change a unit's Wiki/Values image or its shiny variant.
// The PNGs are the portable/picture-fallback source, the WebP files are the
// lossless-fidelity desktop presentation copies. Both sets are self-hosted.
import wukong from '../assets/units/provided/wukongball.png';
import brainball from '../assets/units/provided/brainball.png';
import fancyball from '../assets/units/provided/fancyball.png';
import hephaestus from '../assets/units/provided/hephaestusball.png';
import autumn from '../assets/units/provided/autumnball.png';
import baller from '../assets/units/provided/baller.png';
import showman from '../assets/units/provided/showmanball.png';
import omegaKnight from '../assets/units/provided/omegaknight-omk.png';
import golem from '../assets/units/provided/golemball.png';
import dictator from '../assets/units/provided/dictatorball.png';
import plasma from '../assets/units/provided/plasmaball.png';
import mummy from '../assets/units/provided/mummyball.png';
import frutiger from '../assets/units/provided/frutigerball.png';
import kingBall from '../assets/units/provided/kingball.png';
import laserMiniGunner from '../assets/units/provided/laserminigunner.png';
import partyMan from '../assets/units/provided/partyman.png';
import elfCommander from '../assets/units/provided/elfcommander.png';
import overclockedOverlord from '../assets/units/provided/overclockedoverlord.png';
import hackerBall from '../assets/units/provided/hackerball.png';
import forestBall from '../assets/units/provided/forestball.png';

import wukongDesktop from '../assets/units/hero-desktop/wukongball.webp';
import brainballDesktop from '../assets/units/hero-desktop/brainball.webp';
import fancyballDesktop from '../assets/units/hero-desktop/fancyball.webp';
import hephaestusDesktop from '../assets/units/hero-desktop/hephaestusball.webp';
import autumnDesktop from '../assets/units/hero-desktop/autumnball.webp';
import ballerDesktop from '../assets/units/hero-desktop/baller.webp';
import showmanDesktop from '../assets/units/hero-desktop/showmanball.webp';
import omegaKnightDesktop from '../assets/units/hero-desktop/omegaknight-omk.webp';
import golemDesktop from '../assets/units/hero-desktop/golemball.webp';
import dictatorDesktop from '../assets/units/hero-desktop/dictatorball.webp';
import plasmaDesktop from '../assets/units/hero-desktop/plasmaball.webp';
import mummyDesktop from '../assets/units/hero-desktop/mummyball.webp';
import frutigerDesktop from '../assets/units/hero-desktop/frutigerball.webp';
import kingBallDesktop from '../assets/units/hero-desktop/kingball.webp';
import laserMiniGunnerDesktop from '../assets/units/hero-desktop/laserminigunner.webp';
import partyManDesktop from '../assets/units/hero-desktop/partyman.webp';
import elfCommanderDesktop from '../assets/units/hero-desktop/elfcommander.webp';
import overclockedOverlordDesktop from '../assets/units/hero-desktop/overclockedoverlord.webp';
import hackerBallDesktop from '../assets/units/hero-desktop/hackerball.webp';
import forestBallDesktop from '../assets/units/hero-desktop/forestball.webp';

export const HERO_ARTWORK = Object.freeze([
  { slug: 'wukong', name: 'Wukong', image: wukong, desktopImage: wukongDesktop },
  { slug: 'brainball', name: 'Brain Ball', image: brainball, desktopImage: brainballDesktop },
  { slug: 'fancyball', name: 'Fancy Ball', image: fancyball, desktopImage: fancyballDesktop },
  { slug: 'hephaestus', name: 'Hephaestus', image: hephaestus, desktopImage: hephaestusDesktop },
  { slug: 'autumn', name: 'Autumn', image: autumn, desktopImage: autumnDesktop },
  { slug: 'baller', name: 'Baller', image: baller, desktopImage: ballerDesktop },
  { slug: 'showman', name: 'Showman', image: showman, desktopImage: showmanDesktop },
  { slug: 'omega-knight', name: 'Omega Knight', image: omegaKnight, desktopImage: omegaKnightDesktop },
  { slug: 'golem', name: 'Golem', image: golem, desktopImage: golemDesktop },
  { slug: 'dictator', name: 'Dictator', image: dictator, desktopImage: dictatorDesktop },
  { slug: 'plasma', name: 'Plasma', image: plasma, desktopImage: plasmaDesktop },
  { slug: 'mummy', name: 'Mummy', image: mummy, desktopImage: mummyDesktop },
  { slug: 'frutiger', name: 'Frutiger', image: frutiger, desktopImage: frutigerDesktop },
  { slug: 'king-ball', name: 'King Ball', image: kingBall, desktopImage: kingBallDesktop },
  { slug: 'laser-minigunner', name: 'Laser Mini Gunner', image: laserMiniGunner, desktopImage: laserMiniGunnerDesktop },
  { slug: 'party-man', name: 'Party Man', image: partyMan, desktopImage: partyManDesktop },
  { slug: 'elf-commander', name: 'Elf Commander', image: elfCommander, desktopImage: elfCommanderDesktop },
  { slug: 'overclocked-overlord', name: 'Overclocked Overlord', image: overclockedOverlord, desktopImage: overclockedOverlordDesktop },
  { slug: 'hacker-ball', name: 'Hacker Ball', image: hackerBall, desktopImage: hackerBallDesktop },
  { slug: 'forest-ball', name: 'Forest Ball', image: forestBall, desktopImage: forestBallDesktop },
]);

export const HERO_ARTWORK_COUNT = HERO_ARTWORK.length;
