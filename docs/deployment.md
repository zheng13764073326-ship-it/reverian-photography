# Sanity 与 Cloudflare 接入计划

当前用户尚无两个平台账号，按用户要求先完成本地版本。本文件是准备好的接入方案，不表示已经创建云项目。

## Cloudflare Pages

生产使用 Astro `output: static`，不安装服务端适配器。当前官方 Cloudflare 适配器面向 Workers；本项目继续使用指定的 Pages 托管静态产物。

- 连接 GitHub 上的迁移分支，验收后才切换生产分支。
- 根目录：仓库根目录。
- 构建命令：`npm run build`。
- 输出目录：`apps/web/dist`。
- Node：24（`.node-version`）。
- 构建变量：`CONTENT_MODE=sanity`、`SANITY_PROJECT_ID`、`SANITY_DATASET`、`SITE_URL`（真实 HTTPS 地址）、需要时的 `SANITY_READ_TOKEN`。
- 演示部署可以暂用 `CONTENT_MODE=demo`，但不应作为正式摄影作品发布；它默认 noindex。
- `wrangler.jsonc` 已指向 Pages 产物目录，尚未绑定账号或项目。

只构建 web 工作区；不要把 Studio 的 dist 放进公开网站根目录。Studio 单独托管在 Sanity 管理的 Studio 域名，并使用 Sanity 原生身份登录。

## Sanity

1. 创建项目和 production dataset。需要仅后台读取隐藏内容时，优先采用 private dataset + 构建专用只读 token；公开 CDN 图片地址不应当作私密存储。
2. 配置两个应用的 `.env`。Studio 的项目 ID/dataset 可公开，私密读 token 仅填写 web 构建环境。
3. Studio 本地开发地址使用 CLI 默认端口（通常 3333），在 Sanity 添加该本地 origin。部署后添加实际 Studio origin；不要把带凭据的 CORS 开放给任意域名。
4. 发布照片记录，再创建专辑、札记、首页精选和网站设置。照片库以引用选择和复用，无需复制文件。
5. 对照阶段四验收表验证真实上传、拖动、隐藏、撤回、发布和手机浏览器编辑。

## 发布触发

Cloudflare Pages 创建 Deploy Hook，将其完整地址作为 Sanity Webhook 的私密目标 URL；不要写入 Git、前端或公开文档。HTTP 方法 POST。监听 Create、Update、Delete，**关闭 draft 和 version/release 文档的触发**。

过滤规则在 `apps/web/src/lib/publishing.ts` 的 `webhookFilter` 中。包含 photo、album、journal、featured、siteSettings，并同时用 before()/after() 识别删除事件。正式发布、撤回或删除已发布文档都会更新网站；仅保存草稿不会构建。照片资产上传本身不触发，发布 Photo 文档才触发。

第一版可直接连接 Deploy Hook。若后续集中发布很多照片造成重复构建，再增加签名验证与短时合并的 Worker 接收端；这是后续扩展，不是当前已实现功能。

## 草稿预览

目前本地演示不包含真实草稿预览，生产查询始终只读 published。

阶段四优先采用 Sanity Presentation + 与生产分离的动态预览服务。结合当前 Astro 支持范围，预览服务部署于 Cloudflare Workers，公开网站仍为 Pages。预览入口验证 Sanity preview secret，使用 HttpOnly/Secure cookie，令牌仅服务端读取，响应 no-store/noindex。不能通过公开 query 参数直接开启草稿，也不能把读 token 发给浏览器。

若预览服务暂不配置，则保留 Studio 原生草稿编辑与文档预览，不宣称已提供网站真实草稿预览。

## 官方资料

- Astro Cloudflare 适配器：https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- Astro 部署：https://docs.astro.build/en/guides/deploy/cloudflare/
- Cloudflare Pages 构建配置：https://developers.cloudflare.com/pages/configuration/build-configuration/
- Cloudflare Deploy Hooks：https://developers.cloudflare.com/pages/configuration/deploy-hooks/
- Sanity Webhooks：https://www.sanity.io/docs/http-reference/webhooks
- Sanity 草稿预览：https://www.sanity.io/docs/visual-editing/implementing-draft-mode

真正上线前再次核实平台免费额度、构建设置和当前接口；此次未创建付费资源，也未配置外部触发器。
