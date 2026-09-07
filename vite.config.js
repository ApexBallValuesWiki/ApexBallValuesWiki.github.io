import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 'base' must match where the site is served. The GitHub Actions deploy sets
// VITE_BASE_PATH="/<repo>/" for GitHub Pages project sites; local builds fall
// back to '/' (override with VITE_BASE_PATH for manual subfolder builds).
const githubRepoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const deployBase = process.env.VITE_BASE_PATH || (process.env.GITHUB_ACTIONS && githubRepoName ? `/${githubRepoName}/` : '/');

export default defineConfig({
  base: deployBase,
  plugins: [react()],
  // `npm run preview` may sit behind a proxy host (e.g. sandbox previews);
  // static output is served as-is, so any host is fine.
  preview: {
    allowedHosts: true,
  },
  build: {
    // Split large third-party libraries into their own chunks so the main
    // app bundle stays small and vendor code (which rarely changes) can be
    // cached separately by the browser across deploys — faster repeat loads.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('lenis')) return 'vendor-lenis';
          if (id.includes('react-router') || id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) {
            return 'vendor-react';
          }
          return 'vendor';
        },
      },
    },
  },
})
