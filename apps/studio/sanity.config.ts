import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemaTypes";
import { structure, singletonTypes as singletons } from "./structure";
import { QuizRecords } from "./tools/QuizRecords";
const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
if (!projectId)
  throw new Error(
    "请先在 apps/studio/.env 配置真实 SANITY_STUDIO_PROJECT_ID。网站演示请在根目录运行 npm run dev，无需 Sanity 账号。",
  );
export default defineConfig({
  name: "reverian",
  title: "Reverian · 摄影编辑室",
  projectId,
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  plugins: [
    structureTool({
      structure,
    }),
  ],
  tools: [{name:'quiz-records',title:'答题记录',component:QuizRecords}],
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
