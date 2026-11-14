import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://yumulab.github.io',
  base: '/dl.yumulab.org',
  output: 'static',
  trailingSlash: 'always',
});
