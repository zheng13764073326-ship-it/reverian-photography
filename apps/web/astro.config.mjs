import {defineConfig} from 'astro/config';
import {loadEnv} from 'vite';
const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
export default defineConfig({
  output: 'static',
  site: env.SITE_URL || process.env.SITE_URL || 'http://localhost:4321',
  trailingSlash: 'always',
});
