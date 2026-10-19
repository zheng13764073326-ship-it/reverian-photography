import type { StructureBuilder } from "sanity/structure";

export const singletonTypes = new Set(["featured", "siteSettings"]);

export const structure = (S: StructureBuilder) =>
  S.list()
    .id("reverian-content")
    .title("内容")
    .items([
      S.listItem()
        .id("siteSettings")
        .title("首页与网站设置")
        .child(
          S.document().schemaType("siteSettings").documentId("siteSettings"),
        ),
      S.listItem()
        .id("featured")
        .title("首页精选顺序")
        .child(S.document().schemaType("featured").documentId("featured")),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) => !singletonTypes.has(item.getId()!),
      ),
    ]);
