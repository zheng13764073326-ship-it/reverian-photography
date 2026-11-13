import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
const root = resolve(import.meta.dirname, "../apps/web/dist");
const production = process.argv.includes("--production");
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}
const files = await walk(root),
  htmlFiles = files.filter((f) => f.endsWith(".html"));
let links = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  for (const match of html.matchAll(/(?:src|href)="(\/[^"#?]*)/g)) {
    const target = decodeURIComponent(match[1]);
    const path = join(
      root,
      target.endsWith("/") ? target + "index.html" : target,
    );
    assert.ok(
      (await stat(path).catch(() => null))?.isFile(),
      `${file}: broken ${target}`,
    );
    links++;
  }
  assert.match(html, /<html lang="zh-CN"/);
  if (production) {
    assert.doesNotMatch(html, /https:\/\/cdn\.sanity\.io\/images\//, file + ': external photo dependency');
    for (const [target] of html.matchAll(/\/_photos\/[a-f0-9]+\.jpg/g)) {
      assert.ok((await stat(join(root, target)).catch(() => null))?.isFile(), file + ': missing ' + target);
    }
    assert.doesNotMatch(html, /演示版 · 照片、地点与文字为占位内容/);
    assert.doesNotMatch(html, /name="robots" content="noindex, nofollow"/);
    assert.match(
      html,
      /rel="canonical" href="https:\/\/reverian-photography\.pages\.dev\//,
    );
  } else {
    assert.match(html, /name="robots" content="noindex, nofollow"/);
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (m[0].includes('id="viewer-image"')) continue;
    assert.match(m[0], /alt="[^"]+"/, `${file}: missing alt`);
    assert.match(m[0], /width="\d+"/, `${file}: missing width`);
    assert.match(m[0], /height="\d+"/, `${file}: missing height`);
  }
  assert.doesNotMatch(
    html,
    /(?:sk_live_|SANITY_READ_TOKEN\s*=|ghp_[A-Za-z0-9]+)/,
  );
}
console.log(
  `PASS ${htmlFiles.length} pages, ${links} local asset/navigation references; image dimensions, alt text, ${production ? "production content and canonical URLs" : "demo noindex"}.`,
);
