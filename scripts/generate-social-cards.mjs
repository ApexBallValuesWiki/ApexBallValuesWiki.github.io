#!/usr/bin/env node
// Generates 1200x630 Open Graph social cards into public/social/ — see
// scripts/lib/social-cards-core.mjs for the implementation. This wrapper
// bundles it with esbuild (keeping the native `sharp` module external).
import { runBundled } from './lib/run-bundled.mjs';

try {
  await runBundled('social-cards-core.mjs', { external: ['sharp'] });
} catch (error) {
  console.error('[cards] failed:', error);
  process.exit(1);
}
