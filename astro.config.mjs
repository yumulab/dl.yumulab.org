import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dl.yumulab.org',
  base: '/',
  output: 'static',
  trailingSlash: 'always',
});
