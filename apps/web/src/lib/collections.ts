export interface WildFrame {
  id: string;
  title: string;
  category: 'birds' | 'beneath' | 'portraits';
  environment: 'WILD' | 'ZOO' | 'AQUARIUM';
  aspectRatio: string;
  src: string;
}

export interface AboveFrame {
  id: string;
  title: string;
  category: 'aerial' | 'window';
  meta: string;
  layout: 'wide' | 'half';
  src: string;
}

export interface GalleryFrame {
  id: string;
  title: string;
  category: string;
  src: string;
  aspectRatio?: string;
  environment?: string;
  meta?: string;
  layout?: string;
}

/** Filtering precedes pagination so each category starts with a complete page. */
export function selectFrames<T extends {category: string}>(frames: T[], category: string, limit = Infinity): T[] {
  return frames.filter(frame => category === 'all' || frame.category === category).slice(0, Math.max(0, limit));
}

export function frameGeometry(frame: Pick<GalleryFrame, 'aspectRatio' | 'layout'>) {
  const aspectRatio = frame.aspectRatio || (frame.layout === 'wide' ? '21:9' : '3:2');
  const parts = aspectRatio.split(':').map(Number);
  if (parts.length !== 2 || parts.some(value => !Number.isFinite(value) || value <= 0)) {
    throw new Error(`Invalid frame aspect ratio: ${aspectRatio}`);
  }
  const [width, height] = parts;
  return {aspectRatio, width: width * 100, height: height * 100, padding: height / width * 100};
}
