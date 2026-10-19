# 已部署服务

记录日期：2026-10-19。

## 公开摄影网站

- URL：https://reverian-photography.pages.dev/
- 托管：Cloudflare Pages，GitHub 分支 `codex/astro-foundation`。
- 当前内容模式：demo。Sanity 后台部署完成不代表网站已切换到真实数据。
- 之前的 GitHub Pages 网站继续保留。

## 摄影编辑后台

- URL：https://reverian-photography.sanity.studio/
- Sanity project ID：`j0zkvef5`。
- Dataset：`production`（已验证存在并可访问）。
- Studio application ID：`wetbua8n5t96nu2bebxqppv5`。
- 使用用户自己的 Sanity / GitHub 身份登录；此次 CLI 登录已完成。
- Studio TypeScript 检查、生产构建、schema 发布与托管部署成功。
- 本地 `apps/studio/.env` 已配置 project ID 和 dataset，忽略提交。未在源码中保存登录 token。
- 后台版本自动升级关闭，后续在升级依赖并验证后重新部署。

## 接下来

1. 用户打开后台，用相同 GitHub 账号登录，确认看到「首页与网站设置」「首页精选顺序」「照片库」「旅行影集」「影像札记」。
2. 先补齐并发布网站设置。保留原封面时选择「现有照片盒封面」。
3. 上传至少一张真实照片，填写标题和替代文本，确认公开状态并发布；再引用创建影集和首页精选。
4. 验证 Sanity 数据的本地构建。确认 dataset 可见性；如为 private，另行在 Cloudflare 的机密环境变量中配置只读 token。
5. 将 Cloudflare 的 CONTENT_MODE 改为 sanity，填写 SANITY_PROJECT_ID=j0zkvef5、SANITY_DATASET=production 和实际 SITE_URL。
6. 联调仅正式发布、撤回和删除触发的 Deploy Hook。草稿保存不触发。不要在源码或聊天中粘贴 Deploy Hook 私密地址或 API token。

当前未切换 Cloudflare 数据来源，未创建 Webhook，未上传用户真实照片，未完成网站草稿预览。
