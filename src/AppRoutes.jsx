import { lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AnimatedPage from './components/AnimatedPage';

function lazyWithRetry(importFunc) {
  return lazy(() =>
    importFunc().catch((error) => {
      const isChunkLoadError =
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        String(error).includes('dynamically imported module');

      if (isChunkLoadError && typeof window !== 'undefined') {
        const hasReloaded = sessionStorage.getItem('apex-chunk-reload-v1');
        if (!hasReloaded) {
          sessionStorage.setItem('apex-chunk-reload-v1', 'true');
          window.location.reload();
          return new Promise(() => {}); // stay pending while browser reloads
        }
      }
      throw error;
    })
  );
}

const Home = lazyWithRetry(() => import('./pages/Home'));
const BallKnowledge = lazyWithRetry(() => import('./pages/BallKnowledge'));
const MinigamesHome = lazyWithRetry(() => import('./pages/minigames/MinigamesHome'));
const Ballonomics = lazyWithRetry(() => import('./pages/minigames/Ballonomics'));
const Balling = lazyWithRetry(() => import('./pages/minigames/Balling'));
const InviteClaim = lazyWithRetry(() => import('./pages/InviteClaim'));
const Afford = lazyWithRetry(() => import('./pages/values/Afford'));
const AdminHome = lazyWithRetry(() => import('./pages/admin/AdminHome'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));
const Credits = lazyWithRetry(() => import('./pages/Credits'));
const Privacy = lazyWithRetry(() => import('./pages/Privacy'));
const Terms = lazyWithRetry(() => import('./pages/Terms'));
const Cookies = lazyWithRetry(() => import('./pages/Cookies'));
const Disclaimer = lazyWithRetry(() => import('./pages/Disclaimer'));
const Changelog = lazyWithRetry(() => import('./pages/Changelog'));
const About = lazyWithRetry(() => import('./pages/About'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const ThemeStudio = lazyWithRetry(() => import('./pages/ThemeStudio'));

const WikiHome = lazyWithRetry(() => import('./pages/wiki/WikiHome'));
const UnitsList = lazyWithRetry(() => import('./pages/wiki/UnitList'));
const UnitDetail = lazyWithRetry(() => import('./pages/wiki/UnitDetail'));
const UnitCompare = lazyWithRetry(() => import('./pages/wiki/UnitCompare'));
const WikiUnitSearch = lazyWithRetry(() => import('./pages/wiki/UnitSearch'));
const ItemsList = lazyWithRetry(() => import('./pages/wiki/ItemList'));
const ItemDetail = lazyWithRetry(() => import('./pages/wiki/ItemDetail'));
const ReforgesList = lazyWithRetry(() => import('./pages/wiki/ReforgesList'));
const FanArt = lazyWithRetry(() => import('./pages/fanart/FanArt'));
const Achievements = lazyWithRetry(() => import('./pages/Achievements'));
const BugReport = lazyWithRetry(() => import('./pages/bugs/BugReport'));

const ValuesHome = lazyWithRetry(() => import('./pages/values/ValuesHome'));
const ValueUnitsList = lazyWithRetry(() => import('./pages/values/UnitValueList'));
const ValueUnitDetail = lazyWithRetry(() => import('./pages/values/UnitValueDetail'));
const ValuesUnitSearch = lazyWithRetry(() => import('./pages/values/UnitSearch'));
const TradeCalculator = lazyWithRetry(() => import('./pages/values/TradeCalculator'));

function LoadingFallback() {
  return (
    <main className="page-shell" aria-live="polite" aria-busy="true">
      <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
        Loading Testing…
      </div>
    </main>
  );
}

function page(element, variant = 'default') {
  return (
    <AnimatedPage variant={variant}>
      <Suspense fallback={<LoadingFallback />}>
        {element}
      </Suspense>
    </AnimatedPage>
  );
}

export default function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={page(<Home />)} />
      <Route path="/minigames" element={page(<MinigamesHome />)} />
      <Route path="/minigames/ball-knowledge" element={page(<BallKnowledge />)} />
      <Route path="/minigames/ballonomics" element={page(<Ballonomics />)} />
      <Route path="/minigames/balling" element={page(<Balling />)} />
      <Route path="/ball-knowledge" element={<Navigate to="/minigames/ball-knowledge" replace />} />
      <Route path="/invite" element={page(<InviteClaim />)} />
      <Route path="/values/afford" element={page(<Afford />)} />
      <Route path="/admin" element={page(<AdminHome />)} />
      <Route path="/admin/reset-password" element={page(<AdminHome />)} />
      <Route path="/theme-editor" element={page(<ThemeStudio />)} />
      <Route path="/themes" element={<Navigate to="/theme-editor" replace />} />
      <Route path="/about" element={page(<About />)} />
      <Route path="/contact" element={page(<Contact />)} />
      <Route path="/credits" element={page(<Credits />)} />
      <Route path="/privacy" element={page(<Privacy />)} />
      <Route path="/terms" element={page(<Terms />)} />
      <Route path="/cookies" element={page(<Cookies />)} />
      <Route path="/cookie-policy" element={<Navigate to="/cookies" replace />} />
      <Route path="/disclaimer" element={page(<Disclaimer />)} />
      <Route path="/legal" element={<Navigate to="/disclaimer" replace />} />
      <Route path="/changelog" element={page(<Changelog />)} />
      <Route path="/achievements" element={page(<Achievements />)} />
      <Route path="/bug-report" element={page(<BugReport />)} />

      <Route path="/wiki" element={page(<WikiHome />)} />
      <Route path="/wiki/compare" element={page(<UnitCompare />)} />
      <Route path="/wiki/units" element={<Navigate to="/wiki/units/Normie" replace />} />
      <Route path="/wiki/units/search" element={page(<WikiUnitSearch />)} />
      <Route path="/wiki/units/:rarity" element={page(<UnitsList />)} />
      <Route path="/wiki/units/:rarity/:slug" element={page(<UnitDetail />, 'detail')} />

      <Route path="/wiki/items" element={<Navigate to="/wiki/items/Consumables" replace />} />
      <Route path="/wiki/items/:group" element={page(<ItemsList />)} />
      <Route path="/wiki/items/:group/:slug" element={page(<ItemDetail />, 'detail')} />

      <Route path="/wiki/reforges" element={page(<ReforgesList />)} />

      {/* Hidden pages (Maps, Crates, Skins, Traits) redirect cleanly to /wiki */}
      <Route path="/wiki/maps" element={<Navigate to="/wiki" replace />} />
      <Route path="/wiki/maps/:slug" element={<Navigate to="/wiki" replace />} />
      <Route path="/wiki/crates" element={<Navigate to="/wiki" replace />} />
      <Route path="/wiki/traits" element={<Navigate to="/wiki" replace />} />
      <Route path="/wiki/traits/:slug" element={<Navigate to="/wiki" replace />} />
      <Route path="/wiki/skins" element={<Navigate to="/wiki" replace />} />
      <Route path="/wiki/skins/:category" element={<Navigate to="/wiki" replace />} />
      <Route path="/wiki/skins/:category/:slug" element={<Navigate to="/wiki" replace />} />
      <Route path="/wiki/shiny-skins" element={<Navigate to="/wiki" replace />} />
      <Route path="/wiki/shiny-skins/:category" element={<Navigate to="/wiki" replace />} />
      <Route path="/wiki/shiny-skins/:category/:slug" element={<Navigate to="/wiki" replace />} />

      <Route path="/wiki/fanart" element={page(<FanArt />)} />
      <Route path="/wiki/bug-report" element={<Navigate to="/bug-report" replace />} />

      <Route path="/values" element={page(<ValuesHome />)} />
      <Route path="/values/units" element={<Navigate to="/values/units/Normie" replace />} />
      <Route path="/values/units/search" element={page(<ValuesUnitSearch />)} />
      <Route path="/values/units/:rarity" element={page(<ValueUnitsList />)} />
      <Route path="/values/units/:rarity/:slug" element={page(<ValueUnitDetail />, 'detail')} />
      <Route path="/values/crates" element={<Navigate to="/wiki" replace />} />
      <Route path="/values/calculator" element={page(<TradeCalculator />)} />

      <Route path="*" element={page(<NotFound />)} />
    </Routes>
    </AnimatePresence>
  );
}

// Route-chunk prefetch: call when a user hovers/focuses a link — the chunk
// downloads before they click, so navigation feels instant. Same dynamic
// imports as the lazy routes above → same chunks, no duplicates.
const PREFETCH_ROUTES = [
  ['/values/calculator', () => import('./pages/values/TradeCalculator')],
  ['/values', () => import('./pages/values/ValuesHome')],
  ['/minigames', () => import('./pages/minigames/MinigamesHome')],
  ['/minigames/ball-knowledge', () => import('./pages/BallKnowledge')],
  ['/minigames/ballonomics', () => import('./pages/minigames/Ballonomics')],
  ['/minigames/balling', () => import('./pages/minigames/Balling')],
  ['/achievements', () => import('./pages/Achievements')],
  ['/theme-editor', () => import('./pages/ThemeStudio')],
  ['/wiki', () => import('./pages/wiki/WikiHome')],
  ['/admin', () => import('./pages/admin/AdminHome')],
];

const prefetchedChunks = new Set();

export function prefetchRoute(path) {
  for (const [prefix, load] of PREFETCH_ROUTES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      if (!prefetchedChunks.has(prefix)) {
        prefetchedChunks.add(prefix);
        load().catch(() => {});
      }
      return;
    }
  }
}
