// CRAWLABLE STATIC CONTENT for every pre-rendered page.
//
// Vite ships a client-rendered SPA. A crawler that does not execute JavaScript
// used to see only `<div id="root"></div>` — an empty page. This module emits
// a genuine, readable HTML snapshot of the same information the app shows,
// into `#root`. React's createRoot() replaces it as soon as the app boots, so
// human visitors see the normal interactive site. Nothing is hidden, cloaked
// or keyword-stuffed: the text below is the real page content.
//
// It also means the legal pages, About and Contact are fully readable without
// JavaScript — which is what an AdSense reviewer (or a parent) needs.
import { OPERATOR as OP, LAST_UPDATED } from '../../src/data/operator.js';

const NAV = [
  ['/', 'Home'],
  ['/wiki', 'WIKI'],
  ['/values', 'Trade values'],
  ['/values/calculator', 'Trade calculator'],
  ['/values/afford', 'What can I afford?'],
  ['/about', 'About'],
  ['/contact', 'Contact'],
  ['/privacy', 'Privacy policy'],
  ['/terms', 'Terms of use'],
  ['/cookies', 'Cookie notice'],
  ['/disclaimer', 'Disclaimer'],
  ['/credits', 'Credits'],
  ['/changelog', "What's new"],
];

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function legalBodies(link) {
  const mail = `<a href="mailto:${esc(OP.email)}">${esc(OP.email)}</a>`;
  return {
    '/privacy': `
        <h1>Privacy policy</h1>
        <p>What this site collects, why, who is responsible, and how to exercise your rights. Last updated ${esc(LAST_UPDATED)}.</p>
        <h2>1. Who is responsible</h2>
        <p>Apex WIKI &amp; Values is an unofficial, independently operated, fan-made companion for the Roblox experience Ball Tower Defense. It is not affiliated with, endorsed by, or sponsored by Roblox Corporation, Cash Grab Studios, or the game's creators.</p>
        <p><strong>Controller / operator:</strong> ${esc(OP.name)} — ${esc(OP.entity)}, based in ${esc(OP.jurisdiction)}. No physical postal address is published; please use the private contact channel below.</p>
        <p><strong>Private contact for privacy, parental, copyright and removal requests:</strong> ${mail}. <strong>Response time:</strong> we answer every request within ${esc(OP.sla)}, free of charge, worldwide.</p>
        <h2>2. What we collect</h2>
        <p><strong>From public visitors: no personal data is collected by this site.</strong> There are no accounts, no sign-up, no contact form with free text, no analytics, no advertising identifiers, and no third-party fonts, images or time services. Optional on-device statistics are off by default and stay in your browser only.</p>
        <p>Unit images, fonts, stylesheets and scripts are served from this site's own hosting. Links to Roblox, Discord, YouTube and other sites are ordinary hyperlinks that load only when you choose to open them.</p>
        <p><strong>From editors:</strong> the small team that maintains values uses an email address and a secret passcode held in Cloudflare KV. Editor identifiers are stripped from all publicly served data.</p>
        <h2>3. Hosting and service providers</h2>
        <p>The site is hosted on GitHub Pages. The shared values and WIKI database is served by a Cloudflare Worker with a KV namespace. Those providers necessarily receive ordinary network information such as IP address, request time, user agent and the requested resource.</p>
        <p>The site does not send personal data to any advertising, analytics, profiling, or data-broker service.</p>
        <h2>4. Cookies, consent and on-device storage</h2>
        <p>The site sets <strong>no advertising or tracking cookies</strong>. It uses browser storage and a service-worker cache for essential purposes only: appearance and accessibility settings, offline assets, and game progress. Optional visit and search statistics are off until you opt in through the consent banner, and you can change your choice at any time via "Privacy choices" in the footer.</p>
        <p>We do not sell or share personal data, and we do not use data for automated decision-making or profiling.</p>
        <h2>5. Advertising</h2>
        <p><strong>Advertising is disabled in this build on both the public site and the Test Realm.</strong> No AdSense tag, advertising cookie, or advertising request is loaded. The Test Realm can never serve ads.</p>
        <p>If advertising is enabled after approval, the advertising partner will be <strong>Google AdSense</strong> (publisher ${esc('pub-2832011907708910')}, as declared in <code>ads.txt</code>). Google and its partners may use cookies, IP addresses or similar identifiers to deliver, measure and personalise ads, and may combine visits to this and other sites.</p>
        <p>That will only happen after a <strong>Google-certified consent platform</strong> is in place — Google's own free "Privacy &amp; messaging" CMP, not a paid third-party service — after child-safety settings are configured, and only for visitors who have opted in. The site requests <strong>non-personalised ads by default</strong> and never targets personalised advertising at children. Consent can be withdrawn at any time.</p>
        <p>Useful links: <a href="https://business.safety.google/privacy/" rel="noopener noreferrer">How Google uses data from partner sites</a>, <a href="https://myadcenter.google.com/" rel="noopener noreferrer">Google My Ad Center</a>, <a href="https://www.aboutads.info/choices/" rel="noopener noreferrer">aboutads.info choices</a>.</p>
        <p>An <code>ads.txt</code> file is present for publisher verification; its presence does not enable ads.</p>
        <h2>6. Children and families</h2>
        <p>This site is for a mixed-age audience that includes children and teenagers. It is designed so children can use it without giving us personal data: no accounts, no free-text submissions, no behavioural advertising, no third-party asset hosts, and no optional statistics before consent. A parent or guardian should help a child with privacy choices and external links.</p>
        <p>We comply with Brazil's LGPD (including Article 14 and the ECA Digital rules), the U.S. COPPA Rule, and applicable U.S. state privacy laws. We do not knowingly collect personal information from a child under 13 (U.S.) or under 12 (Brazil).</p>
        <h2>7. Retention</h2>
        <p>On-device settings and progress remain until you clear them. Structured, non-identifying issue reports and editor records are kept only while needed to operate and audit the wiki. Server and hosting logs follow GitHub's and Cloudflare's own policies.</p>
        <h2>8. International transfers</h2>
        <p>GitHub and Cloudflare may process network information in countries other than yours, including the United States, under their own safeguards. We do not transfer visitor profiles because we do not create any.</p>
        <h2>9. Your rights and how to complain</h2>
        <p>Under the LGPD, GDPR/UK GDPR, COPPA and applicable U.S. state laws you may have the right to confirm whether data is processed, access it, correct it, delete it, restrict or object to processing, receive a portable copy, withdraw consent, and not be discriminated against for exercising a right.</p>
        <p>To exercise any right, email ${mail} with the subject "Privacy request". We answer within ${esc(OP.sla)}. You may also complain to the Brazilian ANPD, the UK ICO, your EEA supervisory authority, the U.S. FTC, or your state attorney general.</p>
        <p>See also ${link('/terms', 'Terms of use')}, ${link('/cookies', 'Cookie notice')}, ${link('/about', 'About')} and ${link('/contact', 'Contact')}.</p>`,

    '/terms': `
        <h1>Terms of use</h1>
        <p>Last updated ${esc(LAST_UPDATED)}. These terms govern use of Apex WIKI &amp; Values.</p>
        <h2>1. Who we are and acceptance</h2>
        <p>Apex WIKI &amp; Values is operated by ${esc(OP.name)} (${esc(OP.entity)}, ${esc(OP.jurisdiction)}). By using the site you accept these terms. If you do not agree, please stop using it. Contact: ${mail}.</p>
        <h2>2. Unofficial fan content</h2>
        <p>This is an unofficial, independently operated fan reference for Ball Tower Defense. It is not affiliated with, endorsed by, or sponsored by Roblox Corporation, Cash Grab Studios, or the game's creators. Game names, unit names, artwork and trademarks belong to their respective owners. Read the ${link('/disclaimer', 'Fan-content &amp; IP disclaimer')} for the full notice and removal process.</p>
        <h2>3. Values are opinions, not prices</h2>
        <p>Trade values are community-observed opinions. They change, they are not guarantees, and they are not financial advice. We do not buy, sell, broker or guarantee any in-game item, and we are not responsible for trades made between players. Always confirm an offer yourself.</p>
        <h2>4. Acceptable use</h2>
        <p>Do not attempt to disrupt the site, access the editor or admin areas without authorisation, scrape it in a way that degrades service for others, or submit personal information about yourself or other people in public reports. Children should use the site with a parent or guardian's guidance.</p>
        <h2>5. Availability and changes</h2>
        <p>The site is provided free of charge, as-is, and may change or be unavailable at any time. Content, values and tools may be corrected without notice. See ${link('/changelog', "What's new")} for notable changes.</p>
        <h2>6. Privacy, cookies and advertising</h2>
        <p>Personal-data handling is described in the ${link('/privacy', 'Privacy policy')} and ${link('/cookies', 'Cookie notice')}. Advertising is currently disabled. If it is enabled later, it will run only behind a Google-certified consent platform and never target personalised ads at children.</p>
        <h2>7. Contact and complaints</h2>
        <p>Questions, corrections, privacy requests and removal notices: ${mail}. We respond within ${esc(OP.sla)}. See the ${link('/contact', 'Contact page')}.</p>`,

    '/cookies': `
        <h1>Cookie &amp; storage notice</h1>
        <p>Last updated ${esc(LAST_UPDATED)}. How this site stores things on your device.</p>
        <h2>1. No advertising or tracking cookies</h2>
        <p>This site sets no advertising, analytics or tracking cookies. It does not use Google Fonts, third-party image hosts, time APIs, tag managers or analytics services. All assets are served from the site's own hosting.</p>
        <h2>2. Essential storage</h2>
        <p>Browser local/session storage and a service-worker cache hold only what is needed to run the site as you configured it: appearance and accessibility settings, offline assets, and game/achievement progress. These are essential and do not require consent.</p>
        <h2>3. Optional storage</h2>
        <p>Optional on-device visit and search statistics are off by default and only written after you opt in. Advertising cookies are also off by default and only used if advertising is enabled in a future release and you opt in. Nothing optional is written before a choice is made. Use "Privacy choices" in the footer to change or withdraw consent at any time.</p>
        <h2>4. Withdrawing consent and deleting data</h2>
        <p>Withdrawing removes optional usage and recent-search history but keeps game progress. Your browser's site-data controls can delete all cookies, storage and caches for this site. The ${link('/privacy', 'Privacy policy')} includes a "Clear this app's local data" action.</p>
        <h2>5. Third parties</h2>
        <p>Only GitHub Pages (hosting) and Cloudflare (the shared values database) receive ordinary network information required to deliver the site. If advertising is enabled after approval, the partner will be <strong>Google AdSense</strong> (publisher ${esc('pub-2832011907708910')}), listed here and in the ${link('/privacy', 'Privacy policy')} before any ad request is made. Consent will be handled by Google's free certified "Privacy &amp; messaging" CMP. Personalised advertising will not be targeted at children, and non-personalised ads are the default. Opt out through ${link('/privacy', 'Privacy policy §5')}, <a href="https://myadcenter.google.com/" rel="noopener noreferrer">My Ad Center</a> or <a href="https://www.aboutads.info/choices/" rel="noopener noreferrer">aboutads.info</a>. The Test Realm can never serve ads.</p>
        <h2>6. Contact</h2>
        <p>Questions about cookies or storage: ${mail}. We answer within ${esc(OP.sla)}. See also the ${link('/terms', 'Terms of use')}.</p>`,

    '/disclaimer': `
        <h1>Fan-content &amp; IP disclaimer</h1>
        <p>Last updated ${esc(LAST_UPDATED)}.</p>
        <h2>Unofficial fan project</h2>
        <p>Apex WIKI &amp; Values is an unofficial, independently operated, fan-made companion for the Roblox experience Ball Tower Defense. It is not affiliated with, endorsed by, sponsored by, or operated by Roblox Corporation, Cash Grab Studios, or the game's creators. All game names, unit names, artwork, logos and trademarks belong to their respective owners and are used here for identification and reference only.</p>
        <h2>Values are opinions</h2>
        <p>Trade values are community estimates, not official prices or financial advice. We do not buy, sell, broker or guarantee any in-game item and are not responsible for trades between players.</p>
        <h2>Removal requests</h2>
        <p>If you are a rights holder and believe material on this site should be removed or credited differently, email ${mail} with the page URL, a description of the work, and your authority to act. We review and respond within ${esc(OP.sla)} and remove material where appropriate. This is the site's designated takedown channel.</p>
        <p>Operator: ${esc(OP.name)}, ${esc(OP.entity)}, ${esc(OP.jurisdiction)}. See the ${link('/privacy', 'Privacy policy')}, ${link('/cookies', 'Cookie notice')}, ${link('/terms', 'Terms of use')} and ${link('/contact', 'Contact')}.</p>`,

    '/about': `
        <h1>About this site</h1>
        <p>A free, fan-made reference for the Roblox experience Ball Tower Defense. Who we are, what we publish, and what we do not collect. Last updated ${esc(LAST_UPDATED)}.</p>
        <h2>1. What this is</h2>
        <p>Apex WIKI &amp; Values is an unofficial, independently operated companion for Ball Tower Defense by Cash Grab Studios. It collects unit statistics, upgrade costs, items, trade values and small tools into one place so players can look things up quickly. It is not affiliated with, endorsed by, sponsored by, or operated by Roblox Corporation, Cash Grab Studios, or the game's creators.</p>
        <h2>2. Who runs it</h2>
        <p>The site is operated by <strong>${esc(OP.name)}</strong> (${esc(OP.entity)}) based in ${esc(OP.jurisdiction)}, with a small volunteer team of editors. No physical postal address is published; ${mail} is the designated private channel. The site is hosted on GitHub Pages, with a Cloudflare Worker serving the shared structured game database.</p>
        <h2>3. What you'll find</h2>
        <p>The ${link('/wiki', 'WIKI')} documents units by rarity, statistics, upgrade costs, placement limits and items. The ${link('/values', 'trade values')} section lists community-observed values, demand and trends. The ${link('/values/calculator', 'trade calculator')} and ${link('/values/afford', '"what can I afford?"')} tool help compare offers, plus a few small minigames. Values are community opinions, not official prices, and they change.</p>
        <h2>4. Your data</h2>
        <p>Public visitors have no accounts. We run no analytics, advertising identifiers, third-party fonts, third-party image hosts or free-text contact forms. Optional on-device statistics are off by default and stay in your browser. Change or withdraw choices from "Privacy choices" in the footer; see the ${link('/privacy', 'Privacy policy')} and ${link('/cookies', 'Cookie notice')}.</p>
        <h2>5. Cost and advertising</h2>
        <p>The site is free to use with no paid tier, subscriptions or purchases. Advertising is currently disabled on both realms; no advertising script, cookie or request is loaded. If enabled after approval, it will run only behind Google's free certified "Privacy &amp; messaging" CMP and only for visitors who consent, with non-personalised ads as the default and no personalised advertising targeted at children.</p>
        <h2>6. Children and families</h2>
        <p>This is a mixed-age site about a game played by children and teenagers. It is designed so a child can use it without giving us personal data. Parents or guardians may request access, correction or deletion using the contact below; we answer within ${esc(OP.sla)}, free of charge, worldwide.</p>
        <h2>7. Contact</h2>
        <p>Questions, privacy or parental requests, copyright and removal notices, and factual corrections go to ${mail}. See the ${link('/contact', 'Contact page')} for what to include. We answer within ${esc(OP.sla)}.</p>`,

    '/contact': `
        <h1>Contact</h1>
        <p>One private channel, one named operator, one published response time. No forms, no accounts, no middlemen. Last updated ${esc(LAST_UPDATED)}.</p>
        <h2>1. Operator and email</h2>
        <p><strong>Operator:</strong> ${esc(OP.name)} — ${esc(OP.entity)}, based in ${esc(OP.jurisdiction)}.</p>
        <p><strong>Private contact:</strong> ${mail}. This mailbox is monitored by the operator, not by a support team or a third-party service. We do not publish a physical postal address; where a legal formality requires one, it is supplied privately during that request.</p>
        <h2>2. What to send here</h2>
        <p>Use this address for privacy or data requests, parental and child-safety questions, copyright and trademark removal notices, factual corrections to WIKI or values data, accessibility problems and general questions. For content errors, include the page URL and unit or item name. Rights-holder removal requests should include the page URL, a description of the work and your authority to act; this is the site's designated takedown channel. See the ${link('/disclaimer', 'Fan-content &amp; IP disclaimer')}.</p>
        <h2>3. Response time</h2>
        <p>We acknowledge requests immediately and answer every request within <strong>${esc(OP.sla)}</strong>, free of charge, worldwide. The same deadline applies to all visitors regardless of where they live. You may also complain to the Brazilian ANPD, the UK ICO, your EEA supervisory authority, the U.S. FTC, or your state attorney general.</p>
        <h2>4. What not to send</h2>
        <p>Please do not include passwords, bank or payment details, verification codes, full addresses, or other sensitive personal information. We will never ask for them. Children should ask a parent or guardian before writing to us, and personal information should never be posted in public bug reports or community channels.</p>
        <h2>5. Other useful pages</h2>
        <p>${link('/about', 'About this site')} · ${link('/privacy', 'Privacy policy')} · ${link('/cookies', 'Cookie notice')} · ${link('/terms', 'Terms of use')} · ${link('/disclaimer', 'Disclaimer')} · ${link('/credits', 'Credits')}. Use "Privacy choices" in the footer to change optional on-device settings without contacting us.</p>`,
  };
}

/**
 * Build the crawlable HTML body for a route.
 * ctx = { esc, basePath, rarities, itemGroups }
 */
export function buildStaticBody(route, ctx) {
  const e = ctx.esc || esc;
  const base = ctx.basePath || '';
  const link = (path, label) => `<a href="${e(base + (path === '/' ? '/' : path))}">${label}</a>`;
  const heading = e((route.title || 'Apex WIKI &amp; Values').split(' — ')[0]);
  const legal = legalBodies(link)[route.path];

  let core;
  if (route.prerenderBody) {
    core = route.prerenderBody;
  } else if (legal) {
    core = legal;
  } else {
    const sections = [];
    const path = route.path;
    const rarities = ctx.rarities || [];
    const itemGroups = ctx.itemGroups || [];

    if (path === '/') {
      sections.push(`<h2>Explore the site</h2><ul>
        <li>${link('/wiki', 'WIKI')} — unit statistics, upgrade costs, placement limits and items.</li>
        <li>${link('/values', 'Trade values')} — community-observed values, demand and trends.</li>
        <li>${link('/values/calculator', 'Trade calculator')} — check value totals and overpay.</li>
        <li>${link('/values/afford', 'What can I afford?')} — find units within your budget.</li>
        <li>${link('/minigames', 'Minigames')} — small browser games.</li>
      </ul>`);
      sections.push('<p>Apex WIKI &amp; Values is a free, unofficial fan-made companion for Ball Tower Defense by Cash Grab Studios. It has no accounts, no paid tier and no advertising. Values are community opinions, not official prices.</p>');
    } else if (path === '/wiki' || path === '/wiki/units' || path === '/values' || path === '/values/units') {
      sections.push(`<h2>Browse by rarity</h2><ul>${rarities.map((r) => `<li>${link('/' + (path.startsWith('/values') ? 'values' : 'wiki') + '/units/' + encodeURIComponent(r), e(r) + ' units')}</li>`).join('')}</ul>`);
      sections.push(`<p>${path.startsWith('/values') ? 'Trade values are community estimates that change over time. Always confirm an offer yourself.' : 'Every unit page lists statistics, upgrade costs, placement limits and how to obtain the unit.'}</p>`);
    } else if (path === '/wiki/items') {
      sections.push(`<h2>Item groups</h2><ul>${itemGroups.map((g) => `<li>${link('/wiki/items/' + encodeURIComponent(g), e(g))}</li>`).join('')}</ul>`);
    } else if (path === '/minigames') {
      sections.push(`<h2>Minigames</h2><ul>
        <li>${link('/minigames/ball-knowledge', 'Ball Knowledge')} — a daily reset tracker.</li>
        <li>${link('/minigames/ballonomics', 'Ballonomics')} — higher or lower values.</li>
        <li>${link('/minigames/balling', 'Balling')} — pixel reveal guessing game.</li>
      </ul>`);
    } else if (/^\/wiki\/units\/[^/]+$/.test(path) || /^\/values\/units\/[^/]+$/.test(path)) {
      sections.push(`<h2>Browse units</h2><ul>${rarities.map((r) => `<li>${link('/' + (path.startsWith('/values') ? 'values' : 'wiki') + '/units/' + encodeURIComponent(r), e(r))}</li>`).join('')}</ul>`);
    } else {
      sections.push(`<p>${e(route.description)}</p>`);
    }
    core = `<h1>${heading}</h1>\n        ${sections.join('\n        ')}`;
  }

  const nav = `<nav aria-label="Site sections"><h2>Site sections</h2><ul>${NAV.map(([p, label]) => `<li>${link(p, e(label))}</li>`).join('')}</ul></nav>`;
  const note = `<p class="apex-static-note">This is the text version of the page. The interactive WIKI, live values and tools load with JavaScript. Apex WIKI &amp; Values is free, unofficial, and has no accounts. Operator: ${e(OP.name)} — ${link('/contact', 'Contact')} · ${link('/privacy', 'Privacy policy')}.</p>`;
  return `<main class="apex-static" id="apex-static-content">\n      ${core}\n      ${nav}\n      ${note}\n    </main>`;
}

export function staticNavLinkList() { return NAV.map(([p]) => p); }
