import { lazy, Suspense } from 'react';
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
const AdminHome = lazyWithRetry(() => import('./pages/admin/AdminHome'));
const Credits = lazyWithRetry(() => import('./pages/Credits'));
const ThemeStudio = lazyWithRetry(() => import('./pages/ThemeStudio'));

const WikiHome = lazyWithRetry(() => import('./pages/wiki/WikiHome'));
const UnitsList = lazyWithRetry(() => import('./pages/wiki/UnitList'));
const UnitDetail = lazyWithRetry(() => import('./pages/wiki/UnitDetail'));
const UnitCompare = lazyWithRetry(() => import('./pages/wiki/UnitCompare'));
const UnitLeaderboards = lazyWithRetry(() => import('./pages/wiki/UnitLeaderboards'));
const WikiUnitSearch = lazyWithRetry(() => import('./pages/wiki/UnitSearch'));
const ItemsList = lazyWithRetry(() => import('./pages/wiki/ItemList'));
const ItemDetail = lazyWithRetry(() => import('./pages/wiki/ItemDetail'));
const MapsList = lazyWithRetry(() => import('./pages/wiki/MapList'));
const MapDetail = lazyWithRetry(() => import('./pages/wiki/MapDetail'));
const TraitsList = lazyWithRetry(() => import('./pages/wiki/TraitList'));
const TraitDetail = lazyWithRetry(() => import('./pages/wiki/TraitDetail'));
const SkinsList = lazyWithRetry(() => import('./pages/wiki/SkinList'));
const ReforgesList = lazyWithRetry(() => import('./pages/wiki/ReforgesList'));
const CratesList = lazyWithRetry(() => import('./pages/wiki/CratesList'));
const SkinDetail = lazyWithRetry(() => import('./pages/wiki/SkinDetail'));
const FanArt = lazyWithRetry(() => import('./pages/fanart/FanArt'));
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
        Loading APEX…
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
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={page(<Home />)} />
      <Route path="/ball-knowledge" element={page(<BallKnowledge />)} />
      <Route path="/admin" element={page(<AdminHome />)} />
      <Route path="/admin/reset-password" element={page(<AdminHome />)} />
      <Route path="/theme-editor" element={page(<ThemeStudio />)} />
      <Route path="/credits" element={page(<Credits />)} />
      <Route path="/bug-report" element={page(<BugReport />)} />

      <Route path="/wiki" element={page(<WikiHome />)} />
      <Route path="/wiki/compare" element={page(<UnitCompare />)} />
      <Route path="/wiki/leaderboards" element={page(<UnitLeaderboards />)} />
      <Route path="/wiki/units" element={<Navigate to="/wiki/units/Normie" replace />} />
      <Route path="/wiki/units/search" element={page(<WikiUnitSearch />)} />
      <Route path="/wiki/units/:rarity" element={page(<UnitsList />)} />
      <Route path="/wiki/units/:rarity/:slug" element={page(<UnitDetail />, 'detail')} />

      <Route path="/wiki/items" element={<Navigate to="/wiki/items/Consumables" replace />} />
      <Route path="/wiki/items/:group" element={page(<ItemsList />)} />
      <Route path="/wiki/items/:group/:slug" element={page(<ItemDetail />, 'detail')} />

      <Route path="/wiki/maps" element={page(<MapsList />)} />
      <Route path="/wiki/reforges" element={page(<ReforgesList />)} />
      <Route path="/wiki/crates" element={page(<CratesList />)} />
      <Route path="/wiki/maps/:slug" element={page(<MapDetail />, 'detail')} />

      <Route path="/wiki/traits" element={page(<TraitsList />)} />
      <Route path="/wiki/traits/:slug" element={page(<TraitDetail />, 'detail')} />

      <Route path="/wiki/skins" element={<Navigate to="/wiki/skins/Normie" replace />} />
      <Route path="/wiki/skins/:category" element={page(<SkinsList shiny={false} />)} />
      <Route path="/wiki/skins/:category/:slug" element={page(<SkinDetail shiny={false} />, 'detail')} />

      <Route path="/wiki/shiny-skins" element={<Navigate to="/wiki/shiny-skins/Normie" replace />} />
      <Route path="/wiki/shiny-skins/:category" element={page(<SkinsList shiny={true} />)} />
      <Route path="/wiki/shiny-skins/:category/:slug" element={page(<SkinDetail shiny={true} />, 'detail')} />

      <Route path="/wiki/fanart" element={page(<FanArt />)} />
      <Route path="/wiki/bug-report" element={<Navigate to="/bug-report" replace />} />

      <Route path="/values" element={page(<ValuesHome />)} />
      <Route path="/values/units" element={<Navigate to="/values/units/Normie" replace />} />
      <Route path="/values/units/search" element={page(<ValuesUnitSearch />)} />
      <Route path="/values/units/:rarity" element={page(<ValueUnitsList />)} />
      <Route path="/values/units/:rarity/:slug" element={page(<ValueUnitDetail />, 'detail')} />
      <Route path="/values/calculator" element={page(<TradeCalculator />)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
