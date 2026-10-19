export const publishableTypes = [
  "photo",
  "album",
  "journal",
  "featured",
  "siteSettings",
];
export const isPublishedId = (id: string) =>
  !id.startsWith("drafts.") && !id.startsWith("versions.");
export function canPublishPhoto(photo: {
  _id?: string;
  isPublic?: boolean;
  alt?: string;
  image?: { assetRef?: string; url?: string; width?: number; height?: number };
}): boolean {
  return (
    !!photo._id &&
    isPublishedId(photo._id) &&
    photo.isPublic === true &&
    !!photo.alt?.trim() &&
    !!photo.image?.assetRef &&
    !!photo.image.url &&
    !!photo.image.width &&
    !!photo.image.height
  );
}
export function pageItems<T>(items: T[], size = 24): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error("Invalid page size");
  return Array.from(
    { length: Math.max(1, Math.ceil(items.length / size)) },
    (_, i) => items.slice(i * size, (i + 1) * size),
  );
}
export const webhookFilter =
  'coalesce(after()._type, before()._type) in ["photo", "album", "journal", "featured", "siteSettings"] && !(coalesce(after()._id, before()._id) in path("drafts.**")) && !(coalesce(after()._id, before()._id) in path("versions.**"))';
