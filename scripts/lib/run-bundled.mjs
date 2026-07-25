// ============================================================================
// SCRIPT RUNNER
// ----------------------------------------------------------------------------
// The scripts in scripts/lib import the app's src/ data modules, which use
// Vite-style extensionless imports ("./taxonomy") that plain Node cannot
// resolve. esbuild ships with the project's toolchain, so each heavy script
// is bundled to a temporary file (node_modules/.apex-scripts/) and then
// executed — no extra dev dependencies, and the exact same data the app
// renders is what gets pre-rendered.
// ============================================================================

import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const CACHE_DIR = join(ROOT, 'node_modules', '.apex-scripts');

export async function runBundled(entryName, { external = [] } = {}) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const outfile = join(CACHE_DIR, entryName.replace(/\.mjs$/, '.bundled.mjs'));

  await build({
    entryPoints: [join(ROOT, 'scripts', 'lib', entryName)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile,
    external,
    logLevel: 'warning',
  });

  // The bundled file lives inside node_modules/, so scripts cannot derive the
  // project root from their own location — hand it over explicitly.
  process.env.APEX_PROJECT_ROOT = ROOT;
  await import(pathToFileURL(outfile).href);
}
