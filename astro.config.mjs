import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dl.yumulab.org',
  base: '/',
  output: 'static',
  trailingSlash: 'always',
  redirects: {
    '/ec79-ota/': '/ec79-oota/',
    '/papers/ec79-ota/': '/ec79-oota/',
  },
});
