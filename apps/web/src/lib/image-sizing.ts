export type ImagePurpose = 'thumbnail' | 'lightbox' | 'hero';
export const imagePresets = {
  thumbnail: {maxEdge: 1200, quality: 80},
  lightbox: {maxEdge: 2048, quality: 84},
  hero: {maxEdge: 2400, quality: 84},
} as const;

/** Width descriptors must describe the real encoded width, including portraits. */
export function imageSize(width: number, height: number, requestedWidth: number, purpose: ImagePurpose = 'thumbnail', cropRatio?: number) {
  const ratio = cropRatio || width / height;
  const {maxEdge} = imagePresets[purpose];
  const outputWidth = Math.max(1, Math.floor(Math.min(requestedWidth, width, height * ratio, maxEdge, maxEdge * ratio)));
  return {width: outputWidth, height: Math.max(1, Math.round(outputWidth / ratio))};
}

export function imageWidths(width: number, height: number, purpose: ImagePurpose = 'thumbnail', cropRatio?: number) {
  const maximum = imageSize(width, height, imagePresets[purpose].maxEdge, purpose, cropRatio).width;
  const candidates = purpose === 'hero' ? [480, 800, 1200, 1600, 1920] : [400, 800];
  return [...new Set([...candidates.filter(w => w < maximum), maximum])];
}
