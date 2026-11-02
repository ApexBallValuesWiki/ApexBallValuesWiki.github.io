import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ALL_UNITS } from '../data/units';
import { useData } from '../context/DataContext';
import { isShinyRarity } from '../data/taxonomy';
import { formatCompactNumber } from '../utils/formatNumber';
import { useWikiImageOverrides } from '../hooks/useWikiImageOverrides';
import UnitIcon from '../components/UnitIcon';
import wikiFeatureDecoration from '../assets/units/provided/laserminigunner.png';
import HeroShowcase from '../components/HeroShowcase';
import ThemeCutout from '../components/ThemeCutout';
import CoolIcon from '../components/CoolIcon';
import LandingCalculator from '../components/LandingCalculator';
import AdSlot from '../components/AdSlot';
// Optional website illustration icons; never used as unit image overrides.
import wikiDecoration from '../assets/units/provided/baller.png';
import valuesDecoration from '../assets/units/provided/brainball.png';
import gamesDecoration from '../assets/units/provided/showmanball.png';
import './Home.css';

const BASE_UNIT_COUNT = ALL_UNITS.filter((unit) => !isShinyRarity(unit.rarity)).length;
const DESTINATIONS = [
  { to: '/wiki', label: 'Wiki', text: 'Stats, upgrades and how to obtain each unit.', icon: wikiDecoration },
  { to: '/values', label: 'Values', text: 'Browse estimates, demand and scarcity.', icon: valuesDecoration },
  { to: '/minigames', label: 'Minigames', text: 'Put your Ball TD knowledge to the test.', icon: gamesDecoration },
];
const COMMUNITY = [
  { label: 'Credits', description: 'The people behind the wiki', to: '/credits' },
  { label: 'Play Ball TD', description: 'Official Roblox experience', href: 'https://www.roblox.com/games/18343561950/Ball-Tower-Defense' },
  { label: 'Official Discord', description: 'Ball Tower Defense community', href: 'https://discord.gg/kWhpVncQwr' },
  { label: 'Cash Grab Studios', description: 'Official Roblox community', href: 'https://www.roblox.com/communities/32380537/Cash-Grab-Studios#!/about' },
  { label: 'YouTube', description: 'Cash Grab Studios channel', href: 'https://www.youtube.com/@CashGrabStudios' },
];

export default function Home() {
  const { unitValues } = useData();
  const unitCount = unitValues?.filter((u) => u.kind !== 'item' && !u.shiny && !isShinyRarity(u.rarity)).length || BASE_UNIT_COUNT;

  const featuredValueUnits = useMemo(() => (unitValues || [])
    .filter((u) => u.kind !== 'item' && u.hasValue && !u.shiny && !isShinyRarity(u.rarity) && Number.isFinite(u.tradeValue) && u.tradeValue > 0)
    .sort((a, b) => b.tradeValue - a.tradeValue).slice(0, 4), [unitValues]);
  const calculatorUnits = useMemo(() => (unitValues || [])
    .filter((u) => u.kind !== 'item' && u.hasValue && !u.shiny && !isShinyRarity(u.rarity) && Number.isFinite(u.tradeValue) && u.tradeValue > 0)
    .sort((a, b) => b.tradeValue - a.tradeValue).slice(0, 40), [unitValues]);
  const { imageMap } = useWikiImageOverrides(
    [...new Set([...featuredValueUnits.map((unit) => unit.slug), ...calculatorUnits.map((unit) => unit.slug)])],
  );

  return (
    <div className="home-layout-wrapper">
      <div className="home-side-ad left"><AdSlot placement="home" /></div>
      <main className="home">
        <HeroShowcase />

        <section id="inside-apex" className="landing-intro landing-container" aria-labelledby="landing-intro-title">
          <div className="landing-intro-main" data-scroll-reveal>
            <h2 id="landing-intro-title">Wiki, values<br />and games.</h2>
            <p>Browse unit stats, check trading values, and play three Ball Tower Defense minigames.</p>
          </div>
          <div className="landing-destinations">
            {DESTINATIONS.map((item) => <Link key={item.to} to={item.to} className="landing-destination">
              <ThemeCutout as="span" src={item.icon} className="landing-destination-art" />
              <div><strong>{item.label}</strong><span>{item.text}</span></div>
              <CoolIcon name="arrow-up-right" size={20} />
            </Link>)}
          </div>
        </section>

        <section className="landing-market landing-container" aria-labelledby="landing-market-title">
          <div className="landing-market-copy" data-scroll-reveal>
            <h2 id="landing-market-title">Unit<br />values.</h2>
            <p>Compare current estimates, demand and scarcity for {unitCount} units.</p>
            <Link to="/values" className="landing-text-link">Explore values <CoolIcon name="arrow-up-right" size={18} /></Link>
          </div>
          <div className="landing-market-list" data-scroll-reveal>
            <div className="landing-list-head"><strong>Highest-valued units</strong><Link to="/values/units/search">View all <CoolIcon name="arrow-up-right" size={15} /></Link></div>
            {featuredValueUnits.length ? featuredValueUnits.map((unit, index) => (
              <Link key={unit.slug} className="landing-market-row" to={`/values/units/${encodeURIComponent(unit.rarity)}/${unit.slug}`}>
                <span className="landing-row-number">{String(index + 1).padStart(2, '0')}</span>
                <UnitIcon slug={unit.slug} name={unit.name} shiny={isShinyRarity(unit.rarity)} size={46} imageUrl={imageMap[unit.slug] || unit.imageUrl} />
                <span className="landing-unit-name"><strong>{unit.name}</strong><small>{unit.rarity} · {unit.demand || 'Normal'} demand</small></span>
                <span className="showcase-unit-price">{formatCompactNumber(unit.tradeValue)}</span>
                <CoolIcon name="arrow-up-right" size={16} />
              </Link>
            )) : <p className="landing-empty">Value estimates are not available right now.</p>}
          </div>
        </section>

        <section className="landing-wiki" aria-labelledby="landing-wiki-title">
          <div className="landing-wiki-art" aria-hidden="true">
            <span>WIKI</span>
            <ThemeCutout src={wikiFeatureDecoration} className="landing-wiki-cutout" />
          </div>
          <div className="landing-wiki-copy" data-scroll-reveal>
            <h2 id="landing-wiki-title">Unit<br />stats.</h2>
            <p>See stats, upgrades and how to obtain each unit.</p>
            <div className="landing-link-stack">
              <Link to="/wiki/units/search" className="landing-text-link">Browse units <CoolIcon name="arrow-up-right" size={18} /></Link>
              <Link to="/wiki/compare" className="landing-text-link">Compare units <CoolIcon name="arrow-up-right" size={18} /></Link>
            </div>
          </div>
        </section>

        <section className="landing-trade landing-container" aria-labelledby="landing-trade-title">
          <div className="landing-trade-copy" data-scroll-reveal>
            <h2 id="landing-trade-title">Trade<br />calculator.</h2>
            <p>Compare the values on both sides of a trade.</p>
            <Link to="/values/calculator" className="landing-text-link">Open calculator <CoolIcon name="arrow-up-right" size={18} /></Link>
          </div>
          <div className="landing-trade-demo" data-scroll-reveal>
            <LandingCalculator unitValues={calculatorUnits} imageMap={imageMap} />
          </div>
        </section>

        <section className="landing-community landing-container" aria-labelledby="landing-community-title">
          <div><h2 id="landing-community-title">Community.</h2></div>
          <div className="landing-community-links">
            {COMMUNITY.map((item) => {
              const body = <><span><strong>{item.label}</strong><small>{item.description}</small></span><CoolIcon name="arrow-up-right" size={18} /></>;
              return item.to ? <Link key={item.label} to={item.to}>{body}</Link> : <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">{body}</a>;
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
