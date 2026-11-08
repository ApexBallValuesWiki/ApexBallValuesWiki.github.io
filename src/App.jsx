import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import useMotionPreference from './hooks/useMotionPreference';
import { useAdminStatus } from './hooks/useAdminStatus';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import HoloBackground from './components/HoloBackground';
import AmbientAccents from './components/AmbientAccents';
import MotionNotice from './components/MotionNotice';
import RewardVfx from './components/RewardVfx';
import SmoothScroll from './components/SmoothScroll';
import ScrollReveal from './components/ScrollReveal';
import MobileBottomNav from './components/MobileBottomNav';
import GlobalAnnouncement from './components/GlobalAnnouncement';
import BackToTop from './components/BackToTop';
import BugReportButton from './components/BugReportButton';
import CommandPalette from './components/CommandPalette';
import { OfflineValuesBanner } from './components/OfflineValuesControl';
import ShortcutHelp from './components/ShortcutHelp';
import RouteEffects from './components/RouteEffects';
import FirstTimeTutorial from './components/FirstTimeTutorial';
import { openApexGuide } from './components/FirstTimeTutorial';
import AchievementPopup from './components/AchievementPopup';
import AppRoutes from './AppRoutes';
import PrivacyChoices from './components/PrivacyChoices';
import { setAdsEnabled, setAdsRoute } from './utils/ads';
import { openPrivacyChoices, PRIVACY_CHANGE_EVENT } from './utils/privacyChoices';
import { initCmpBridge } from './utils/cmp';
import AccessGate, { MaintenancePage } from './components/SiteGate';
import ErrorBoundary from './components/ErrorBoundary';
import { fetchMaintenanceStatus } from './utils/apexClient';
import { subscribeLiveStatus, ensureLiveStatus, refreshLiveStatus } from './utils/liveStatus';
import { startExistCounts } from './utils/existCountStore';

// The Test Realm (staging host) is team-only: visitors must sign in with an
// admin account before anything loads. The production host is unaffected.
const TEST_REALM_HOSTS = ['zenithvalues.github.io'];
import { SHORTCUT_ROUTES } from './config/navigation';
import { loadUXSettings, applyUXSettings } from './utils/uxSettings';
import { trackPageVisit, trackDailyVisit } from './utils/achievements';
import './styles/ux-enhancements.css';

function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
}

export default function App() {
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [maintenance, setMaintenance] = useState({ on: false, message: '', loading: true });
  const motionAllowed = useMotionPreference();

  // Automatic exist counts ride on that SAME consolidated /status poll. One
  // shared store, started once; no second timer and no per-minute request.
  useEffect(() => { startExistCounts(); }, []);

  // Maintenance is delivered by the SAME consolidated /status poll that
  // drives the shared database — no second 60s timer. A legacy worker (or a
  // slow first load) still falls back to the standalone endpoint once.
  useEffect(() => {
    let alive = true;
    const apply = (status) => {
      if (!alive || !status) return;
      const state = status.maintenance || { on: false, message: '', confirmed: false };
      setMaintenance({ on: !!state.on, message: state.message || '', loading: false });
      setAdsEnabled(state.confirmed === true && state.on === false);
    };
    const unsubscribe = subscribeLiveStatus(apply);
    ensureLiveStatus(1500).then(async (status) => {
      if (!alive) return;
      if (status) { apply(status); return; }
      const state = await fetchMaintenanceStatus();
      if (alive) {
        setMaintenance({ on: !!state.on, message: state.message || '', loading: false });
        setAdsEnabled(state.confirmed === true && state.on === false);
      }
    });
    const onUpdated = () => refreshLiveStatus();
    window.addEventListener('apex-maintenance-updated', onUpdated);
    return () => {
      alive = false;
      unsubscribe();
      window.removeEventListener('apex-maintenance-updated', onUpdated);
    };
  }, []);

  const isTestRealm = typeof window !== 'undefined' && TEST_REALM_HOSTS.includes(window.location.hostname);

  // Apply UX settings on mount and whenever the OS accessibility preference
  // changes at runtime (e.g. the visitor turns Windows animation effects back
  // on). `data-motion` is the single CSS gate for all animation rules.
  useEffect(() => {
    applyUXSettings(loadUXSettings());
    trackDailyVisit();
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onOsMotionChange = () => applyUXSettings(loadUXSettings());
    media?.addEventListener?.('change', onOsMotionChange);
    return () => media?.removeEventListener?.('change', onOsMotionChange);
  }, []);

  // Optional on-device visit statistics are gated by the visitor's choice.
  useEffect(() => {
    trackPageVisit(location.pathname);
    const onPrivacyChange = () => {
      trackDailyVisit();
      trackPageVisit(location.pathname);
    };
    window.addEventListener(PRIVACY_CHANGE_EVENT, onPrivacyChange);
    return () => window.removeEventListener(PRIVACY_CHANGE_EVENT, onPrivacyChange);
  }, [location.pathname]);

  // Install the Google-certified CMP callbacks. This loads NOTHING unless
  // ads are enabled AND the operator supplied VITE_ADS_CMP_URL. It always
  // fails closed, so a missing CMP can never accidentally serve ads.
  useEffect(() => { initCmpBridge(); }, []);

  useEffect(() => {
    setAdsRoute(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const h1 = document.querySelector('h1');
      if (h1 && h1.innerText) {
        document.title = `${h1.innerText.trim()} | Apex WIKI & Values`;
      } else {
        document.title = 'Apex WIKI & Values — Ball Tower Defense';
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // One-time cleanup of the legacy chunk-reload guard (kept from the old
  // code-split reload loop fix).
  useEffect(() => {
    try { sessionStorage.removeItem('apex-chunk-reload-v1'); } catch { /* storage may be blocked */ }
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setShortcutOpen(false);
        return;
      }

      if (event.key === '?' && !isTypingTarget(event.target)) {
        event.preventDefault();
        setShortcutOpen((open) => !open);
        return;
      }

      if (isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === '/') {
        event.preventDefault();
        navigate(location.pathname.startsWith('/values') ? '/values/units/search' : '/wiki/units/search');
      } else if (key === 't') {
        event.preventDefault();
        navigate('/theme-editor');
      } else if (SHORTCUT_ROUTES[key]) {
        navigate(SHORTCUT_ROUTES[key]);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [location.pathname, navigate]);

  // Gates — evaluated AFTER all hooks so hook order stays unconditional.
  // The staging UI stays closed while saved credentials are being verified;
  // GitHub Pages files still require separate server/edge access protection.
  // The public invite-claim page must stay reachable while the staging gate
  // or maintenance mode is up, otherwise a new editor can never redeem a link.
  const publicInvite = location.pathname.startsWith('/invite');
  if (!publicInvite && !maintenance.loading && maintenance.on && !isAdmin && !location.pathname.startsWith('/admin')) {
    // /admin stays reachable during maintenance — the login screen lives
    // there, so a logged-out owner can always get in and turn it off.
    return <><AmbientAccents /><MaintenancePage message={maintenance.message} /></>;
  }
  if (!publicInvite && isTestRealm && (adminLoading || !isAdmin)) {
    return <><AmbientAccents /><AccessGate /></>;
  }

  return (
    <MotionConfig reducedMotion={motionAllowed ? 'user' : 'always'} skipAnimations={!motionAllowed}>
    <SmoothScroll>
      <RouteEffects />
      <ScrollReveal />
      <HoloBackground />
      <AmbientAccents />
      <MotionNotice />
      <RewardVfx />
      <GlobalAnnouncement />
      {maintenance.on && isAdmin && !location.pathname.startsWith('/admin') && (
        <div role="status" style={{ position: 'fixed', bottom: '14px', right: '14px', zIndex: 90, background: 'rgba(229, 72, 77, 0.15)', border: '1px solid rgba(229, 72, 77, 0.5)', color: '#ff9b9b', borderRadius: '12px', padding: '10px 14px', fontSize: '13px', maxWidth: '300px' }}>
          🛠️ Maintenance mode is ON — visitors see the maintenance page. Manage it in the admin dashboard.
        </div>
      )}
      <Header />
      <MobileBottomNav />
      <ShortcutHelp open={shortcutOpen} onClose={() => setShortcutOpen(false)} isAdmin={isAdmin} />
      <BugReportButton />
      <CommandPalette />
      <OfflineValuesBanner />
      <BackToTop />
      {!location.pathname.startsWith('/admin') && <FirstTimeTutorial />}
      <AchievementPopup />
      <LiveUpdateToast />
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
      <footer className="site-footer">
        <span>
          Apex WIKI &amp; Values — unofficial fan-made companion for Ball Tower Defense. Not affiliated with or endorsed by Roblox Corporation or Cash Grab Studios.
        </span>
        <span className="site-footer-links">
          <Link to="/changelog">What's new</Link>
          <span aria-hidden="true">·</span>
          <Link to="/about">About</Link>
          <span aria-hidden="true">·</span>
          <Link to="/contact">Contact</Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacy">Privacy &amp; cookies</Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms">Terms</Link>
          <span aria-hidden="true">·</span>
          <Link to="/cookies">Cookies</Link>
          <span aria-hidden="true">·</span>
          <Link to="/disclaimer">Disclaimer</Link>
          <span aria-hidden="true">·</span>
          <button type="button" className="footer-privacy-button" onClick={openPrivacyChoices}>Privacy choices</button>
          <span aria-hidden="true">·</span>
          <Link to="/credits">Credits</Link>
          <span aria-hidden="true">·</span>
          <button type="button" className="footer-privacy-button" onClick={openApexGuide}>Quick start guide</button>
        </span>
      </footer>
      <PrivacyChoices />
    </SmoothScroll>
    </MotionConfig>
  );
}

// Small "live data updated" notice — appears when the KV poll picks up a new
// published version (values/wiki edits), then fades away.
function LiveUpdateToast() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let t = 0;
    const onLive = () => {
      setVisible(true);
      window.clearTimeout(t);
      t = window.setTimeout(() => setVisible(false), 4000);
    };
    window.addEventListener('apex-live-updated', onLive);
    return () => { window.removeEventListener('apex-live-updated', onLive); window.clearTimeout(t); };
  }, []);
  if (!visible) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed', bottom: 14, right: 14, zIndex: 90,
        background: 'rgba(77, 157, 255, 0.14)', border: '1px solid rgba(77, 157, 255, 0.5)',
        color: '#9ecbff', borderRadius: 12, padding: '10px 14px', fontSize: 13, pointerEvents: 'none',
      }}
    >
      ⚡ Live data updated
    </div>
  );
}
