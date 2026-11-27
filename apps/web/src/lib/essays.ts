import type {ImageMetadata} from 'astro';
import {essayCatalog} from './essay-catalog';
const documents=import.meta.glob<{default:unknown}>('../data/essays/*.json',{eager:true});
const images=import.meta.glob<{default:ImageMetadata}>('../assets/essays/**/*.{jpg,jpeg,png,webp,avif}',{eager:true});
export const essays=essayCatalog(Object.values(documents).map(module=>module.default));
export const essayImage=(src:string)=>images[`../assets/essays/${src}`]?.default;
