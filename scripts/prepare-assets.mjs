import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const images = resolve(root, "apps/web/public/images");
const generated = resolve(images, "responsive");
await mkdir(generated, { recursive: true });
// Preserve the approved desk photo and reuse its existing projective coordinates.
const prints = [
  {
    key: "stilllight",
    width: 960,
    height: 640,
    quad: [
      [423, 308],
      [810, 220],
      [888, 476],
      [471, 565],
    ],
  },
  {
    key: "gardenchair",
    width: 540,
    height: 900,
    quad: [
      [938, 68],
      [1153, 93],
      [1123, 410],
      [946, 388],
    ],
  },
  {
    key: "afternoon",
    width: 640,
    height: 800,
    quad: [
      [1245, 226],
      [1510, 316],
      [1390, 603],
      [1110, 515],
    ],
  },
];
const { data: pixels, info } = await sharp(resolve(images, "home-desk.png"))
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
for (const p of prints) {
  const [a, b, d, e] = p.quad.map(([x, y]) => [
    (x * info.width) / 1672,
    (y * info.height) / 941,
  ]);
  const dx1 = b[0] - d[0],
    dx2 = e[0] - d[0],
    dx3 = a[0] - b[0] + d[0] - e[0],
    dy1 = b[1] - d[1],
    dy2 = e[1] - d[1],
    dy3 = a[1] - b[1] + d[1] - e[1];
  const det = dx1 * dy2 - dx2 * dy1,
    g = (dx3 * dy2 - dx2 * dy3) / det,
    h = (dx1 * dy3 - dx3 * dy1) / det;
  const ax = b[0] - a[0] + g * b[0],
    bx = e[0] - a[0] + h * e[0],
    ay = b[1] - a[1] + g * b[1],
    by = e[1] - a[1] + h * e[1];
  const out = Buffer.alloc(p.width * p.height * 3);
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++) {
      const u = x / (p.width - 1),
        v = y / (p.height - 1),
        den = g * u + h * v + 1;
      const sx = Math.max(
          0,
          Math.min(info.width - 2, (ax * u + bx * v + a[0]) / den),
        ),
        sy = Math.max(
          0,
          Math.min(info.height - 2, (ay * u + by * v + a[1]) / den),
        );
      const ix = Math.floor(sx),
        iy = Math.floor(sy),
        fx = sx - ix,
        fy = sy - iy,
        idx = (iy * info.width + ix) * 3,
        o = (y * p.width + x) * 3;
      for (let ch = 0; ch < 3; ch++)
        out[o + ch] = Math.round(
          pixels[idx + ch] * (1 - fx) * (1 - fy) +
            pixels[idx + 3 + ch] * fx * (1 - fy) +
            pixels[idx + info.width * 3 + ch] * (1 - fx) * fy +
            pixels[idx + info.width * 3 + 3 + ch] * fx * fy,
        );
    }
  await sharp(out, { raw: { width: p.width, height: p.height, channels: 3 } })
    .jpeg({ quality: 92 })
    .toFile(resolve(images, `${p.key}.jpg`));
}
const manifest = {};
for (const key of [
  "coast",
  "city",
  "town",
  "forest",
  "paris",
  "lake",
  "mountain",
  "field",
  "valley",
  ...prints.map((p) => p.key),
  "home-desk",
]) {
  const input = await readFile(
    resolve(images, `${key}.${key === "home-desk" ? "png" : "jpg"}`),
  );
  const meta = await sharp(input).metadata();
  const widths = [
    ...new Set(
      [400, 800, 1200, 1920].filter((w) => w < meta.width).concat(meta.width),
    ),
  ].sort((a, b) => a - b);
  for (const width of widths)
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 84 })
      .toFile(resolve(generated, `${key}-${width}.webp`));
  manifest[key] = {
    width: meta.width,
    height: meta.height,
    widths,
    lqip: `data:image/webp;base64,${(await sharp(input).resize({ width: 24 }).webp({ quality: 30 }).toBuffer()).toString("base64")}`,
  };
}
await mkdir(resolve(root, "apps/web/src/data"), { recursive: true });
await writeFile(
  resolve(root, "apps/web/src/data/assets.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Prepared ${Object.keys(manifest).length} responsive image sets; originals retained.`,
);
