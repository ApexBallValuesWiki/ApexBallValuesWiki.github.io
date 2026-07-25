import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Clean URLs need absolute asset paths, so 'base' must match where the site
// is actually served from. The GitHub Actions deploy sets
//   VITE_BASE_PATH="/${{ github.event.repository.name }}/"
// so GitHub Pages project sites (zenithvalues.github.io/<repo>/) always get
// the right base automatically, even if the repo is renamed. Local dev/builds
// fall back to '/' — override with VITE_BASE_PATH when manually building for
// a subfolder deployment.
const githubRepoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const deployBase = process.env.VITE_BASE_PATH || (process.env.GITHUB_ACTIONS && githubRepoName ? `/${githubRepoName}/` : '/');

export default defineConfig({
  base: deployBase,
  plugins: [react()],
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
