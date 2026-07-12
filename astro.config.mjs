// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Site canonique = domaine de production final AVEC www (l'apex sans-www redirige vers www).
// Les URL canoniques / sitemap pointent vers le domaine définitif www.verron-laurent.com.
export default defineConfig({
  site: 'https://www.verron-laurent.com',
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
