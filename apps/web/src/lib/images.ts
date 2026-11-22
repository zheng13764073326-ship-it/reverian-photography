import {createImageUrlBuilder} from '@sanity/image-url';
import localImages from '../data/local-images.json';
import type {Photo, Cover} from './types';
import {imageSize, imageWidths, imagePresets, type ImagePurpose} from './image-sizing';

export function imageUrl(photo: Photo, width = 1200, cover?: Pick<Cover, 'focusX' | 'focusY'>, ratio?: number, purpose: ImagePurpose = 'thumbnail'): string {
  const img = photo.image;
  if (img.localKey) {
    const meta = localImages[img.localKey as keyof typeof localImages];
    if (purpose !== 'thumbnail') return meta.full.src;
    return (meta.thumbnails.find(item => item.width >= width) || meta.thumbnail).src;
  }
  if (!img.assetRef) return img.url;
  const size = imageSize(img.width, img.height, width, purpose, cover ? ratio : undefined);
  let builder = createImageUrlBuilder({projectId: import.meta.env.SANITY_PROJECT_ID, dataset: import.meta.env.SANITY_DATASET || 'production'})
    .image({asset: {_ref: img.assetRef}}).width(size.width).format('webp').quality(imagePresets[purpose].quality);
  if (cover && ratio) builder = builder.height(size.height).fit('crop').crop('focalpoint').focalPoint(cover.focusX, cover.focusY);
  else builder = builder.fit('max');
  return builder.url();
}

export function imageSet(photo: Photo, cover?: Pick<Cover, 'focusX' | 'focusY'>, ratio?: number, purpose: ImagePurpose = 'thumbnail'): string {
  if (photo.image.localKey) {
    const meta = localImages[photo.image.localKey as keyof typeof localImages];
    const candidates = purpose === 'thumbnail' ? meta.thumbnails : [...meta.thumbnails.filter(item => item.width < meta.full.width), meta.full];
    return candidates.map(item => `${item.src} ${item.width}w`).join(', ');
  }
  return imageWidths(photo.image.width, photo.image.height, purpose, cover ? ratio : undefined)
    .map(width => `${imageUrl(photo, width, cover, ratio, purpose)} ${width}w`).join(', ');
}
