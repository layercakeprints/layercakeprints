// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// Project Pages: served at https://layercakeprints.github.io/layercakeprints
// If you switch to a custom domain, set `site` to it and `base` to '/'.
export default defineConfig({
  site: 'https://layercakeprints.github.io',
  base: '/layercakeprints',
  trailingSlash: 'ignore',
  integrations: [preact({ compat: true })],
  vite: {
    plugins: [tailwindcss()],
  },
});
