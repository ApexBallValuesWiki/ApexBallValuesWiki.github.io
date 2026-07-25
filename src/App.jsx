import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import HoloBackground from './components/HoloBackground';
import SmoothScroll from './components/SmoothScroll';
import MobileBottomNav from './components/MobileBottomNav';
import AnnouncementBanner from './components/AnnouncementBanner';
import BackToTop from './components/BackToTop';
import BugReportButton from './components/BugReportButton';
import ShortcutHelp from './components/ShortcutHelp';
import RouteEffects from './components/RouteEffects';
import AppRoutes from './AppRoutes';
import { SHORTCUT_ROUTES } from './config/navigation';
import { getRecoveryRedirectPath } from './utils/supabase';

function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [shortcutOpen, setShortcutOpen] = useState(false);

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

  // Password-reset recovery links land at the clean site root with either
  // PKCE query params (?type=recovery&code=...) or older implicit-flow hash
  // params (#access_token=...&refresh_token=...&type=recovery). On first load,
  // route both shapes into the visible reset page.
  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('apex-chunk-reload-v1');
    }
    const redirectPath = getRecoveryRedirectPath();
    if (redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <AnnouncementBanner />
      <Header />
      <MobileBottomNav />
      <ShortcutHelp open={shortcutOpen} onClose={() => setShortcutOpen(false)} />
      <BugReportButton />
      <BackToTop />
      <AppRoutes />
    </SmoothScroll>
  );
}
