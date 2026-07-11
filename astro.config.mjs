// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Site canonique = domaine de production final SANS www (le www redirige vers l'apex).
// Tant que les DNS ne sont pas basculés, la préprod est servie sur l'URL *.pages.dev,
// mais les URL canoniques / sitemap pointent vers le domaine définitif.
export default defineConfig({
  site: 'https://verron-laurent.com',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
