#!/usr/bin/env node
// Pre-renders every public route and generates social-card meta — see
// scripts/lib/prerender-core.mjs for the implementation. This wrapper bundles
// it with esbuild so it can import the app's (extensionless) src/ modules.
import { runBundled } from './lib/run-bundled.mjs';

try {
  await runBundled('prerender-core.mjs');
} catch (error) {
  console.error('[prerender] failed:', error);
  process.exit(1);
}
