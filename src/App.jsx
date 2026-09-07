import { useEffect, useState } from 'react';
import { useAdminStatus } from './hooks/useAdminStatus';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import HoloBackground from './components/HoloBackground';
import RewardVfx from './components/RewardVfx';
import SmoothScroll from './components/SmoothScroll';
import MobileBottomNav from './components/MobileBottomNav';
import GlobalAnnouncement from './components/GlobalAnnouncement';
import BackToTop from './components/BackToTop';
import BugReportButton from './components/BugReportButton';
import ShortcutHelp from './components/ShortcutHelp';
import RouteEffects from './components/RouteEffects';
import FirstTimeTutorial from './components/FirstTimeTutorial';
import AchievementPopup from './components/AchievementPopup';
import AppRoutes from './AppRoutes';
import AccessGate, { MaintenancePage } from './components/SiteGate';
import ErrorBoundary from './components/ErrorBoundary';
import { fetchMaintenanceStatus } from './utils/apexClient';

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

  // Maintenance mode: poll the worker; admins bypass and see a banner.
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const state = await fetchMaintenanceStatus();
      if (alive) setMaintenance({ on: !!state.on, message: state.message || '', loading: false });
    };
    refresh();
    const pollId = window.setInterval(refresh, 30000);
    const onUpdated = () => refresh();
    window.addEventListener('apex-maintenance-updated', onUpdated);
    return () => { alive = false; window.clearInterval(pollId); window.removeEventListener('apex-maintenance-updated', onUpdated); };
  }, []);

  const isTestRealm = typeof window !== 'undefined' && TEST_REALM_HOSTS.includes(window.location.hostname);

  // Apply UX settings on mount
  useEffect(() => {
    applyUXSettings(loadUXSettings());
    trackDailyVisit();
  }, []);

  // Track page visits for Explorer achievement
  useEffect(() => {
    trackPageVisit(location.pathname);
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
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('apex-chunk-reload-v1');
    }
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
  // (Skipped while the auth/maintenance state is still loading so a
  // logged-in team member never flashes a gate page.)
  if (!maintenance.loading && maintenance.on && !isAdmin && !location.pathname.startsWith('/admin')) {
    // /admin stays reachable during maintenance — the login screen lives
    // there, so a logged-out owner can always get in and turn it off.
    return <MaintenancePage message={maintenance.message} />;
  }
  if (isTestRealm && !adminLoading && !isAdmin) {
    return <AccessGate />;
  }

  return (
    <SmoothScroll>
      <RouteEffects />
      <HoloBackground />
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
      <BackToTop />
      {!location.pathname.startsWith('/admin') && <FirstTimeTutorial />}
      <AchievementPopup />
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </SmoothScroll>
  );
}
