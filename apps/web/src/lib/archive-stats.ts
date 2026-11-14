import type {Album, Photo} from './types';
import {hasPhotoStory} from './photo-stories.ts';

/** Only photographs in published albums belong to the geographic archive. */
export function getArchiveStats(albums: Album[]) {
 const cities = new Set<string>();
 const photos = new Map<string, Photo>();
 for (const album of albums) {
  const city = album.city.trim().normalize('NFKC');
  if (city) cities.add(`${album.country.trim().normalize('NFKC')}\0${city}`);
  for (const photo of [album.cover.photo, ...album.spreads.flatMap(spread => spread.photos)]) {
   photos.set(photo.id, photo);
  }
 }
 return {
  cities: cities.size,
  frames: photos.size,
  stories: [...photos.values()].filter(photo => hasPhotoStory(photo.caption)).length,
 };
}
