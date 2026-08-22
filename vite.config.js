import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site is a GitHub Pages *organization* site, served from the domain root
// at https://sebi38.github.io/ — so assets need no path prefix.
// If this ever moves back to a project page (served under /<repo>/), base has
// to become '/<repo>/' or every asset 404s.
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    // The photo is large; don't try to inline anything near that size.
    assetsInlineLimit: 4096,
  },
});
