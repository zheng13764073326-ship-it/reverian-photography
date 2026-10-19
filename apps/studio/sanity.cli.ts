import { defineCliConfig } from "sanity/cli";
export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || "production",
  },
  deployment: {
    appId: "wetbua8n5t96nu2bebxqppv5",
    autoUpdates: false,
  },
});
