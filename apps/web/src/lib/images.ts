import { createImageUrlBuilder } from "@sanity/image-url";
import assets from "../data/assets.json";
import type { Photo, Cover } from "./types";
export function imageUrl(
  photo: Photo,
  width = 1200,
  cover?: Pick<Cover, "focusX" | "focusY">,
  ratio?: number,
): string {
  const img = photo.image;
  if (img.localKey) {
    const meta = assets[img.localKey as keyof typeof assets];
    const w = meta.widths.find((w) => w >= width) ?? meta.width;
    return `/images/responsive/${img.localKey}-${w}.webp`;
  }
  if (!img.assetRef) return img.url;
  let builder = createImageUrlBuilder({
    projectId: import.meta.env.SANITY_PROJECT_ID,
    dataset: import.meta.env.SANITY_DATASET || "production",
  })
    .image({ asset: { _ref: img.assetRef } })
    .width(Math.min(width, img.width))
    .auto("format")
    .quality(85);
  if (cover && ratio)
    builder = builder
      .height(Math.round(Math.min(width, img.width) / ratio))
      .fit("crop")
      .crop("focalpoint")
      .focalPoint(cover.focusX, cover.focusY);
  else builder = builder.fit("max");
  return builder.url();
}
export function imageSet(
  photo: Photo,
  cover?: Pick<Cover, "focusX" | "focusY">,
  ratio?: number,
): string {
  if (photo.image.localKey) {
    const meta = assets[photo.image.localKey as keyof typeof assets];
    return meta.widths.map((w) => `${imageUrl(photo, w)} ${w}w`).join(", ");
  }
  const widths = [
    ...new Set(
      [400, 800, 1200, 1920]
        .filter((w) => w < photo.image.width)
        .concat(Math.min(photo.image.width, 2400)),
    ),
  ];
  return widths
    .map((w) => `${imageUrl(photo, w, cover, ratio)} ${w}w`)
    .join(", ");
}
