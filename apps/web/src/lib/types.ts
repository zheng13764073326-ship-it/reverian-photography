import type { PortableTextBlock } from "@portabletext/types";
export type RichText = PortableTextBlock[];
export interface PhotoImage {
  url: string;
  width: number;
  height: number;
  lqip?: string;
  assetRef?: string;
  localKey?: string;
}
export interface Photo {
  id: string;
  title: string;
  alt: string;
  caption?: string;
  takenAt?: string;
  location?: { city?: string; country?: string };
  tags: string[];
  sections: string[];
  featured: boolean;
  isPublic: boolean;
  image: PhotoImage;
}
export interface Cover {
  photo: Photo;
  focusX: number;
  focusY: number;
}
export interface Spread {
  key: string;
  layout: "full" | "pair" | "text";
  photos: Photo[];
  text: RichText;
}
export interface Album {
  id: string;
  slug: string;
  title: string;
  city: string;
  country: string;
  date: string;
  excerpt: string;
  cover: Cover;
  preface: RichText;
  spreads: Spread[];
}
export interface Journal {
  id: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  body: RichText;
  photos: Photo[];
}
export interface Settings {
  title: string;
  photographer: string;
  genres: string;
  motto: string;
  homePresentation: "desk" | "photograph";
  homeCover?: Cover;
  mobileCover?: Cover;
  introduction: string;
  about: RichText;
  portrait?: Cover;
  socialLinks: { label: string; url: string }[];
  seo: { description: string; shareImage?: Cover };
}
export interface Content {
  mode: "demo" | "sanity";
  photos: Photo[];
  albums: Album[];
  journals: Journal[];
  featured: Photo[];
  settings: Settings;
}
