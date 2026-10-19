import { test } from "node:test";
import assert from "node:assert/strict";
import { Schema } from "@sanity/schema";
import { createStructureBuilder } from "sanity/structure";
import { schemaTypes } from "../apps/studio/schemaTypes/index.ts";
import { structure } from "../apps/studio/structure.ts";

test("Chinese Studio navigation serializes with valid IDs and opens each content pane", async () => {
  // Use Sanity's real serializer: a successful TypeScript build does not catch
  // missing IDs inferred from Chinese-only titles. No network/auth is needed.
  const S = createStructureBuilder({
    source: {
      schema: Schema.compile({ name: "reverian", types: schemaTypes }),
      templates: [],
      i18n: { t: (key: string) => key },
      document: { singletons: [], resolveNewDocumentOptions: () => [] },
      projectId: "j0zkvef5",
      dataset: "production",
    } as Parameters<typeof createStructureBuilder>[0]["source"],
    perspectiveStack: ["published"],
  });
  assert.throws(
    () => S.list().title("内容").items([]).serialize(),
    /id.*required/,
  );
  const menu = structure(S).serialize();
  assert.equal(menu.id, "reverian-content");
  const items = menu.items.filter((item) => item.type !== "divider");
  assert.deepEqual(
    items.map((item) => item.id),
    ["siteSettings", "featured", "photo", "album", "journal"],
  );
  for (const item of items) {
    const child =
      typeof item.child === "function"
        ? await item.child(item.id, { parent: menu } as never)
        : item.child;
    const pane = child && "serialize" in child ? child.serialize() : child;
    assert.ok(pane && typeof pane === "object" && "id" in pane && pane.id);
    if (item.id === "siteSettings" || item.id === "featured") {
      assert.equal(pane.options.id, item.id);
      assert.equal(pane.options.type, item.id);
    }
  }
});
