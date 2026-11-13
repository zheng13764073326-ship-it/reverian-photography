import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const astro = resolve(
  dirname(require.resolve("astro/package.json")),
  "bin/astro.mjs",
);
const production =
  process.argv.includes("--production") || process.env.CF_PAGES === "1";

// The public deployment always builds published Sanity content. Keep the
// account-free demo available via `npm run build` outside Cloudflare.
const result = spawnSync(process.execPath, [astro, "build"], {
  cwd: resolve(root, "apps/web"),
  env: {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: "1",
    ...(production
      ? {
          CONTENT_MODE: "sanity",
          SANITY_PROJECT_ID: "j0zkvef5",
          SANITY_DATASET: "production",
          SITE_URL: "https://reverian-photography.pages.dev",
        }
      : {}),
  },
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (!production) process.exit(0);
const localized = spawnSync(process.execPath, [resolve(root, "scripts/localize-images.mjs")], { cwd: root, stdio: "inherit" });
if (localized.error) throw localized.error;
if (localized.status !== 0) process.exit(localized.status ?? 1);
const checked = spawnSync(
  process.execPath,
  [resolve(root, "scripts/check-built.mjs"), "--production"],
  {
    cwd: root,
    stdio: "inherit",
  },
);
if (checked.error) throw checked.error;
process.exit(checked.status ?? 1);
