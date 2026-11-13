import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile, copyFile, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const sourcePattern = /https:\/\/cdn\.sanity\.io\/images\/j0zkvef5\/production\/[a-f0-9]{40}-\d+x\d+\.[a-z]+(?:\?[^"'<>\\\s]*)?/g;
const maxBytes = 25 * 1024 * 1024;

async function htmlFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(file));
    else if (entry.name.endsWith('.html')) files.push(file);
  }
  return files;
}

function sourceUrl(raw) {
  const url = new URL(raw.replaceAll('&amp;', '&'));
  // Request a deterministic, widely supported format rather than negotiating
  // a format for the build machine. Original assets remain untouched in Sanity.
  url.searchParams.delete('auto');
  url.searchParams.set('fm', 'jpg');
  url.searchParams.sort();
  return url.href;
}

function validJpeg(data) {
  return data.length > 4 && data.length <= maxBytes &&
    data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}

export async function localizeImages({
  dist, cache, site = 'https://reverian-photography.pages.dev',
  fetchImage = fetch, concurrency = 6, attempts = 3,
  delay = ms => new Promise(r => setTimeout(r, ms)), log = console.log,
}) {
  const pages = await Promise.all((await htmlFiles(dist)).map(async file => ({ file, html: await readFile(file, 'utf8') })));
  const replacements = new Map(), assets = new Map();
  for (const { html } of pages) {
    for (const [raw] of html.matchAll(sourcePattern)) {
      const url = sourceUrl(raw);
      const name = createHash('sha256').update(url).digest('hex').slice(0, 32) + '.jpg';
      replacements.set(raw, '/_photos/' + name);
      assets.set(name, url);
    }
  }
  const output = join(dist, '_photos');
  await mkdir(output, { recursive: true });
  await mkdir(cache, { recursive: true });
  let downloaded = 0, cached = 0, bytes = 0, completed = 0;
  const queue = [...assets];
  async function download(name, url) {
    const cachedPath = join(cache, name);
    let data = await readFile(cachedPath).catch(() => null);
    if (data && validJpeg(data)) cached++;
    else {
      let lastError;
      for (let attempt = 0; attempt < attempts; attempt++) {
        try {
          const response = await fetchImage(url, { signal: AbortSignal.timeout(30_000) });
          if (!response.ok) throw Error(`HTTP ${response.status}`);
          if (!response.headers.get('content-type')?.startsWith('image/jpeg')) throw Error('Unexpected image format');
          data = Buffer.from(await response.arrayBuffer());
          if (!validJpeg(data)) throw Error('Invalid or oversized JPEG');
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (attempt + 1 < attempts) await delay(500 * (attempt + 1));
        }
      }
      if (lastError) throw Error(`Cannot publish image ${name}: ${lastError.message}`);
      const temp = cachedPath + '.' + process.pid + '.tmp';
      await writeFile(temp, data);
      await rename(temp, cachedPath);
      downloaded++;
    }
    await copyFile(cachedPath, join(output, name));
    bytes += data.length;
    completed++;
    if (completed % 50 === 0) log(`Prepared ${completed}/${assets.size} photo variants.`);
  }
  // Finish all workers before surfacing an error; never rewrite HTML unless
  // every referenced asset is available. A failed build keeps the live site intact.
  const results = await Promise.allSettled(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const [name, url] = queue.shift();
      await download(name, url);
    }
  }));
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
  for (const { file, html } of pages) {
    let local = html.replace(sourcePattern, raw => replacements.get(raw));
    // Social previews need an absolute URL; browser images and links use the
    // current origin so local previews exercise the same files as production.
    local = local.replace(/(<meta\b[^>]*property="og:image"[^>]*content=")([^" ]+)(")/g,
      (match, before, value, after) => value.startsWith('/_photos/') ? before + new URL(value, site).href + after : match);
    await writeFile(file, local);
  }
  const report = { pages: pages.length, variants: assets.size, downloaded, cached, bytes };
  log(`Photo assets: ${JSON.stringify(report)}`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(import.meta.dirname, '..');
  await localizeImages({ dist: join(root, 'apps/web/dist'), cache: join(root, 'node_modules/.cache/reverian-images') });
}
