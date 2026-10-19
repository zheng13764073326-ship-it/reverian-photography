import { createClient } from "@sanity/client";
import { demo } from "../data/demo";
import { canPublishPhoto } from "./publishing";
import type {
  Content,
  Photo,
  Cover,
  Album,
  Journal,
  Settings,
  RichText,
} from "./types";
type Ref = { _ref: string };
type RawCover = { photo?: Ref; focusX?: number; focusY?: number };
type RawPhoto = Omit<Photo, "id"> & { _id: string };
type RawAlbum = Omit<Album, "id" | "slug" | "cover" | "spreads"> & {
  _id: string;
  slug: { current: string };
  cover: RawCover;
  spreads?: {
    _key: string;
    layout: "full" | "pair" | "text";
    photos?: Ref[];
    text?: RichText;
  }[];
};
type RawJournal = Omit<Journal, "id" | "slug" | "photos"> & {
  _id: string;
  slug: { current: string };
  photos?: Ref[];
};
type RawSettings = Omit<
  Settings,
  "homeCover" | "mobileCover" | "portrait" | "seo"
> & {
  homeCover?: RawCover;
  mobileCover?: RawCover;
  portrait?: RawCover;
  seo?: { description?: string; shareImage?: RawCover };
};
export const contentQuery = `{
 "photos": *[_type == "photo" && isPublic == true && !(_id in path("drafts.**")) && !(_id in path("versions.**"))] | order(takenAt desc, _id asc) {
   _id,title,alt,caption,takenAt,location,tags,sections,featured,isPublic,
   "image": {"assetRef":image.asset._ref,"url":image.asset->url,"width":image.asset->metadata.dimensions.width,"height":image.asset->metadata.dimensions.height,"lqip":image.asset->metadata.lqip}
 },
 "albums": *[_type == "album" && isPublic == true && defined(slug.current)] | order(order asc, date desc) {_id,slug,title,city,country,date,excerpt,cover,preface,spreads},
 "journals": *[_type == "journal" && isPublic == true && defined(slug.current)] | order(date desc) {_id,slug,title,date,excerpt,body,photos},
 "featured": *[_id == "featured"][0].photos,
 "settings": *[_id == "siteSettings"][0]{title,photographer,genres,motto,homePresentation,homeCover,mobileCover,introduction,about,portrait,socialLinks,seo}
}`;
let pending: Promise<Content> | undefined;
async function loadContent(): Promise<Content> {
  const mode = import.meta.env.CONTENT_MODE || "demo";
  if (mode === "demo") return demo;
  if (mode !== "sanity")
    throw new Error("CONTENT_MODE 必须为 demo 或 sanity。");
  const projectId = import.meta.env.SANITY_PROJECT_ID;
  if (!projectId)
    throw new Error(
      "Sanity 模式缺少 SANITY_PROJECT_ID；不会自动回退到示例内容。",
    );
  const client = createClient({
    projectId,
    dataset: import.meta.env.SANITY_DATASET || "production",
    apiVersion: "2025-02-19",
    useCdn: false,
    perspective: "published",
    token: import.meta.env.SANITY_READ_TOKEN || undefined,
  });
  const raw = await client.fetch<{
    photos: RawPhoto[];
    albums: RawAlbum[];
    journals: RawJournal[];
    featured: Ref[] | null;
    settings: RawSettings | null;
  }>(contentQuery);
  if (!raw.settings) throw new Error("请在 Studio 发布「网站设置」。");
  const photos: Photo[] = raw.photos
    .filter(canPublishPhoto)
    .map((p) => ({
      ...p,
      id: p._id,
      tags: p.tags || [],
      sections: p.sections || [],
      featured: p.featured === true,
    }));
  const byId = new Map(photos.map((p) => [p.id, p]));
  const resolveRefs = (refs: Ref[] = []): Photo[] =>
    refs.map((r) => byId.get(r._ref)).filter((p): p is Photo => !!p);
  const resolveCover = (c?: RawCover): Cover | undefined => {
    const p = c?.photo && byId.get(c.photo._ref);
    return p
      ? {
          photo: p,
          focusX: Math.min(1, Math.max(0, c?.focusX ?? 0.5)),
          focusY: Math.min(1, Math.max(0, c?.focusY ?? 0.5)),
        }
      : undefined;
  };
  const albums: Album[] = raw.albums.flatMap((a) => {
    const cover = resolveCover(a.cover);
    if (!cover) return []; // Do not leak hidden or unpublished referenced photographs.
    return [
      {
        ...a,
        id: a._id,
        slug: a.slug.current,
        cover,
        excerpt: a.excerpt || "",
        preface: a.preface || [],
        spreads: (a.spreads || [])
          .map((s) => ({
            key: s._key,
            layout: s.layout,
            photos: resolveRefs(s.photos),
            text: s.text || [],
          }))
          .filter((s) => s.photos.length),
      },
    ];
  });
  const journals: Journal[] = raw.journals.map((j) => ({
    ...j,
    id: j._id,
    slug: j.slug.current,
    excerpt: j.excerpt || "",
    body: j.body || [],
    photos: resolveRefs(j.photos),
  }));
  const s = raw.settings;
  return {
    mode: "sanity",
    photos,
    albums,
    journals,
    featured: resolveRefs(raw.featured || []),
    settings: {
      ...s,
      title: s.title || "Reverian Photography",
      photographer: s.photographer || "Reverian",
      genres: s.genres || "",
      motto: s.motto || "",
      homePresentation: s.homePresentation || "photograph",
      homeCover: resolveCover(s.homeCover),
      mobileCover: resolveCover(s.mobileCover),
      portrait: resolveCover(s.portrait),
      introduction: s.introduction || "",
      about: s.about || [],
      socialLinks: (s.socialLinks || []).filter((l) =>
        /^(https?:\/\/|mailto:)/i.test(l.url),
      ),
      seo: {
        description: s.seo?.description || "",
        shareImage: resolveCover(s.seo?.shareImage),
      },
    },
  };
}
export const getContent = () => (pending ??= loadContent());
