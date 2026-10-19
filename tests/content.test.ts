import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canPublishPhoto,
  isPublishedId,
  pageItems,
  webhookFilter,
} from "../apps/web/src/lib/publishing.ts";
test("only published public photos with valid assets and alt text can be exposed", () => {
  const p = {
    _id: "photo-1",
    isPublic: true,
    alt: "河边的一棵树",
    image: {
      assetRef: "image-example-1200x800-jpg",
      url: "https://cdn.sanity.io/image.jpg",
      width: 1200,
      height: 800,
    },
  };
  assert.equal(canPublishPhoto(p), true);
  for (const patch of [
    { _id: "drafts.photo-1" },
    { _id: "versions.release.photo-1" },
    { isPublic: false },
    { alt: "" },
    { image: undefined },
  ])
    assert.equal(canPublishPhoto({ ...p, ...patch }), false);
  assert.equal(isPublishedId("drafts.photo-1"), false);
});
test("500 photos are paginated without loss or duplicate items", () => {
  const input = Array.from({ length: 500 }, (_, i) => i),
    pages = pageItems(input);
  assert.equal(pages.length, 21);
  assert.ok(pages.every((p) => p.length <= 24));
  assert.deepEqual(pages.flat(), input);
  assert.deepEqual(pageItems([]), [[]]);
  assert.throws(() => pageItems(input, 0));
});
test("publish hook includes deletions and excludes draft/release ids", () => {
  assert.match(webhookFilter, /before\(\)\._type/);
  assert.match(webhookFilter, /before\(\)\._id/);
  assert.match(webhookFilter, /drafts\.\*\*/);
  assert.match(webhookFilter, /versions\.\*\*/);
});
