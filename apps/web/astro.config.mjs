import {defineConfig} from 'astro/config';
import {loadEnv} from 'vite';
const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
export default defineConfig({
  output: 'static',
  site: env.SITE_URL || process.env.SITE_URL || 'http://localhost:4321',
  trailingSlash: 'always',
  // Built CSS must keep legacy min/max-width media queries for mobile WebViews.
  // Vite's newer default otherwise rewrites them as unsupported (width <= ...).
  vite: {build: {cssTarget: ['chrome88', 'safari15']}},
});
