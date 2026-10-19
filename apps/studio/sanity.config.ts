import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemaTypes";
const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
if (!projectId)
  throw new Error(
    "请先在 apps/studio/.env 配置真实 SANITY_STUDIO_PROJECT_ID。网站演示请在根目录运行 npm run dev，无需 Sanity 账号。",
  );
const singletons = new Set(["featured", "siteSettings"]);
export default defineConfig({
  name: "reverian",
  title: "Reverian · 摄影编辑室",
  projectId,
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("内容")
          .items([
            S.listItem()
              .title("首页与网站设置")
              .child(
                S.document()
                  .schemaType("siteSettings")
                  .documentId("siteSettings"),
              ),
            S.listItem()
              .title("首页精选顺序")
              .child(
                S.document().schemaType("featured").documentId("featured"),
              ),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (item) => !singletons.has(item.getId()!),
            ),
          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter((t) => !singletons.has(t.schemaType)),
  },
  document: {
    actions: (actions, context) =>
      singletons.has(context.schemaType)
        ? actions.filter(
            (a) =>
              !["delete", "duplicate", "unpublish"].includes(a.action || ""),
          )
        : actions,
  },
});
