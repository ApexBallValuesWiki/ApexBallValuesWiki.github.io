import { motion } from 'framer-motion';

// ============================================================================
// Privacy Policy — required for Google AdSense and basic site transparency.
// Keep the wording in sync with what the site actually does:
//   - localStorage only (theme, settings, achievements, minigame progress,
//     local analytics) — never leaves the browser
//   - user-submitted content (bug reports, fan art, leaderboard entries)
//     goes to our Cloudflare API
//   - Google AdSense serves ads and may set cookies (see Advertising)
// ============================================================================

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay } }),
};

const UPDATED = 'September 2026';

export default function Privacy() {
  return (
    <main className="privacy-page" style={{ maxWidth: 860, margin: '0 auto', padding: '26px 18px 70px' }}>
      <motion.section variants={fadeUp} initial="initial" animate="animate">
        <p className="crumb">APEX / PRIVACY</p>
        <h1>Privacy Policy</h1>
        <p className="privacy-updated">Last updated: {UPDATED}</p>
        <p>
          Apex WIKI &amp; Values (apexballvalueswiki.github.io) is a fan-made companion site for the game
          Ball Tower Defense. This page explains, in plain words, what information the site touches and what
          happens to it. <strong>Short version:</strong> almost everything stays inside your own browser.
        </p>
      </motion.section>

      <Section title="1. Who we are" delay={0.05}>
        <p>
          This is an unofficial, fan-run project. We are <strong>not affiliated with, endorsed by, or
          sponsored by</strong> Cash Grab Studios or the developers of Ball Tower Defense. All game names,
          units, images, and related assets belong to their respective owners.
        </p>
      </Section>

      <Section title="2. Information stored on your device" delay={0.1}>
        <p>
          The site saves preferences and progress in your browser's <strong>localStorage</strong> — never in
          a cookie jar on our servers. This includes:
        </p>
        <ul>
          <li>Theme, appearance, and accessibility settings</li>
          <li>Achievement and minigame progress (Ball Knowledge streaks, Ballonomics, Balling)</li>
          <li>Local usage statistics used to show you your own stats</li>
        </ul>
        <p>
          This data <strong>never leaves your browser</strong>. Clearing your browser data removes it
          permanently. We cannot read it, and we cannot restore it.
        </p>
      </Section>

      <Section title="3. Information you choose to send us" delay={0.15}>
        <p>
          If you use the bug-report form, submit fan art, or appear on a minigame leaderboard, that content
          (what you type or upload, plus the name you choose) is stored through our API so it can be
          displayed on the site and managed by our team. You can ask us to remove anything you submitted —
          see <em>Contact</em> below.
        </p>
      </Section>

      <Section title="4. Advertising (Google AdSense)" delay={0.2}>
        <p>
          We show ads served by <strong>Google AdSense</strong> to keep the site running. Google and its
          partners may use cookies (including the DoubleClick cookie) to serve ads based on your prior
          visits to this or other websites.
        </p>
        <ul>
          <li>Google's use of advertising cookies enables it and its partners to serve ads based on your visits to this site and/or other sites on the Internet.</li>
          <li>You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer noopener">Google Ads Settings</a>.</li>
          <li>You can also opt out of third-party vendor cookies at <a href="https://www.aboutads.info/choices/" target="_blank" rel="noreferrer noopener">aboutads.info/choices</a> or <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noreferrer noopener">youronlinechoices.eu</a> (EU).</li>
          <li>More details: <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noreferrer noopener">Google's Advertising Policies</a>.</li>
        </ul>
        <p>Ads are only shown on pages with regular site content — never on error, login, or empty screens.</p>
      </Section>

      <Section title="5. Analytics" delay={0.25}>
        <p>
          The statistics we look at (visit counts, page views) are aggregated and stored <strong>locally on
          your device</strong>. We do not run hidden server-side visitor tracking, and we do not sell data.
        </p>
      </Section>

      <Section title="6. Children's privacy" delay={0.3}>
        <p>
          This site is not directed at children under 13, and we do not knowingly collect personal
          information from children. If you believe a child has submitted content to us, contact us and we
          will remove it.
        </p>
      </Section>

      <Section title="7. Changes to this policy" delay={0.35}>
        <p>
          If the site changes in a way that affects privacy, this page will be updated and the date above
          will change. Big changes will be announced on the site and our Discord.
        </p>
      </Section>

      <Section title="8. Contact" delay={0.4}>
        <p>
          Questions, data-removal requests, or takedown concerns? Reach us on our Discord server, or use the
          🐛 bug-report button on any page — reports go straight to the team.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, delay, children }) {
  return (
    <motion.section className="card privacy-section" variants={fadeUp} initial="initial" animate="animate" custom={delay} style={{ padding: '18px 20px', marginTop: 14 }}>
      <h2 style={{ fontSize: '1.05rem', marginBottom: 8 }}>{title}</h2>
      {children}
    </motion.section>
  );
}
