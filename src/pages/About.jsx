import { Link } from 'react-router-dom';
import { OPERATOR, LAST_UPDATED } from '../data/operator';
import './Legal.css';

// About is deliberately static and factual. It exists so visitors, parents
// and reviewers can see who runs this site and what it actually contains
// without enabling JavaScript or signing in to anything.
export default function About() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <p className="legal-kicker">APEX WIKI &amp; VALUES</p>
        <h1>About this site</h1>
        <p className="legal-lead">
          A free, fan-made reference for the Roblox experience Ball Tower Defense. Who we are, what we publish, and what we do not collect.
        </p>
        <p className="legal-updated">Last updated {LAST_UPDATED}</p>
      </header>
      <nav className="legal-index" aria-label="On this page">
        <a href="#what">What this is</a><a href="#who">Who runs it</a><a href="#content">What you'll find</a><a href="#data">Your data</a><a href="#free">Cost &amp; ads</a><a href="#families">Children &amp; families</a><a href="#contact">Contact</a>
      </nav>

      <section id="what" className="legal-section">
        <h2>1. What this is</h2>
        <p>Apex WIKI &amp; Values is an unofficial, independently operated companion for Ball Tower Defense by Cash Grab Studios. It is a reference site: it collects unit statistics, upgrade costs, items, trade values and small tools into one place so players can look things up quickly.</p>
        <p>It is <strong>not</strong> affiliated with, endorsed by, sponsored by, or operated by Roblox Corporation, Cash Grab Studios, or the game's creators. All game names, unit names, artwork and trademarks belong to their respective owners. See the <Link to="/disclaimer">Fan-content &amp; IP disclaimer</Link>.</p>
      </section>

      <section id="who" className="legal-section">
        <h2>2. Who runs it</h2>
        <p>The site is operated by <strong>{OPERATOR.name}</strong> ({OPERATOR.entity}) based in {OPERATOR.jurisdiction}, with a small volunteer team of editors who maintain the values and WIKI data. No physical postal address is published; the private contact channel below is the designated way to reach the operator.</p>
        <p>The site is hosted on GitHub Pages. A Cloudflare Worker serves the shared, structured game database. Neither provider receives anything beyond the ordinary network information needed to deliver a web page.</p>
      </section>

      <section id="content" className="legal-section">
        <h2>3. What you'll find</h2>
        <p>The <Link to="/wiki">WIKI</Link> documents units by rarity, their statistics, upgrade costs, placement limits and items. The <Link to="/values">trade values</Link> section lists community-observed values, demand and trends. The <Link to="/values/calculator">trade calculator</Link> and <Link to="/values/afford">"what can I afford?"</Link> tool help compare offers, and a few small minigames are available for fun.</p>
        <p>Values are <strong>community opinions, not official prices</strong>, and they change. Nothing here is financial advice, and we do not buy, sell, broker or guarantee any in-game item.</p>
      </section>

      <section id="data" className="legal-section">
        <h2>4. Your data</h2>
        <p>Public visitors have no accounts and nothing to sign up for. We do not run analytics, advertising identifiers, third-party fonts, third-party image hosts, or free-text contact forms. Optional on-device statistics are <strong>off by default</strong> and stay in your browser. Essential settings (appearance, accessibility, offline cache, game progress) are stored locally.</p>
        <p>You can change or withdraw optional choices at any time from "Privacy choices" in the footer. Full details are in the <Link to="/privacy">Privacy policy</Link> and <Link to="/cookies">Cookie notice</Link>.</p>
      </section>

      <section id="free" className="legal-section">
        <h2>5. Cost and advertising</h2>
        <p>The site is free to use and has no paid tier, subscriptions, purchases or premium features. <strong>Advertising is currently disabled on both the public site and the Test Realm</strong>; no advertising script, cookie or request is loaded.</p>
        <p>If advertising is enabled after approval, it will only ever run behind a Google-certified consent platform, Google's own free "Privacy &amp; messaging" CMP, and only for visitors who consent. Personalised advertising will not be targeted at children. An <code>ads.txt</code> file exists for publisher verification; its presence does not enable ads.</p>
      </section>

      <section id="families" className="legal-section">
        <h2>6. Children and families</h2>
        <p>This is a mixed-age site about a game played by children and teenagers. It is designed so a child can use it without giving us personal data: no accounts, no chat, no free-text submissions, no behavioural advertising and no optional statistics before consent. A parent or guardian should still help younger children with external links to Roblox, Discord and YouTube.</p>
        <p>Parents or guardians may request access to, correction of, or deletion of any information they believe was submitted, using the contact below. We answer within {OPERATOR.sla}, free of charge, worldwide.</p>
      </section>

      <section id="contact" className="legal-section">
        <h2>7. Contact</h2>
        <p>Questions, privacy or parental requests, copyright and removal notices, and factual corrections all go to the operator at <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. See the <Link to="/contact">Contact page</Link> for what to include. We answer within {OPERATOR.sla}.</p>
        <p>Please do not post personal information in public bug reports or community channels.</p>
      </section>
    </main>
  );
}
