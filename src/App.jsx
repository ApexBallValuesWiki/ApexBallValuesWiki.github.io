import { useEffect, useState } from 'react';
import { useAdminStatus } from './hooks/useAdminStatus';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import HoloBackground from './components/HoloBackground';
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
import { SHORTCUT_ROUTES } from './config/navigation';
import { loadUXSettings, applyUXSettings } from './utils/uxSettings';
import { trackPageVisit, trackDailyVisit } from './utils/achievements';
import './styles/ux-enhancements.css';

function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
}

export default function App() {
  const { isAdmin } = useAdminStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const [shortcutOpen, setShortcutOpen] = useState(false);

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
        document.title = `${h1.innerText.trim()} | APEX Values & WIKI`;
      } else {
        document.title = 'APEX Values & WIKI — Ball Tower Defense';
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

  return (
    <SmoothScroll>
      <RouteEffects />
      <HoloBackground />
      <GlobalAnnouncement />
      <Header />
      <MobileBottomNav />
      <ShortcutHelp open={shortcutOpen} onClose={() => setShortcutOpen(false)} isAdmin={isAdmin} />
      <BugReportButton />
      <BackToTop />
      <FirstTimeTutorial />
      <AchievementPopup />
      <AppRoutes />
    </SmoothScroll>
  );
}
