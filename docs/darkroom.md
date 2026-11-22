# 暗房评片维护说明

入口 `/lab/?tab=critique`，光学实验室第四个子目录 `LAB 暗房评片`。与前三个栏目共用导航、历史记录和独立标题/导语。评片脚本仅在进入该栏目后加载。

## 文件与数据流

- `apps/web/src/components/DarkroomCritique.astro` / `styles/critique.css`：上传取景框、显影等待、四维报告、错误重试。
- `apps/web/src/lib/critique-image.ts`：JPG/PNG/WebP → 纠正 EXIF 方向 → Canvas 等比最长边 1024 → JPEG 质量 0.75。超过 200,000 字节时继续缩小尺寸，保持质量 0.75；移除原图元数据，透明图片垫米白。原图上限 30MB / 8000 万像素。
- `apps/web/src/lib/lab-critique.ts`：立即本地预览；6px 模糊/颗粒等待；成功后 0.6s 合焦。直接 POST JPEG Blob 到 `/api/critique`，不用 Base64；取消旧请求并忽略过期响应。所有模型文字使用 `textContent`，不当 HTML 注入。
- `functions/api/critique.js` → `functions/_critique.ts`：同源 POST、流式体积上限、JPEG/尺寸校验、限额、视觉模型、JSON 容错与中文错误。
- `apps/web/src/lib/critique-contract.ts`：前后端共用验证，分数 0–10、25 字总评、恰好两条亮点/建议；围栏及前后说明通过提取 JSON 对象处理。

## Workers AI 与部署

`wrangler.jsonc` 已配置 `"ai": {"binding":"AI"}`，Pages 读取该文件作为绑定来源，Git 自动部署会带上绑定。使用 `@cf/meta/llama-3.2-11b-vision-instruct` 的 `prompt` + `image` 字节数组输入，最多输出 1000 tokens，temperature 0.2。模型结构校验失败最多重试一次，额度/服务错误不重试；当视觉模型输出英文或总评超过25字时，调用同一 Workers AI 绑定下的 `@cf/meta/llama-3.3-70b-instruct-fp8-fast`（JSON Schema 模式，800 tokens 上限）只做中文整理，不再发送照片，不改变原有评分和画面观察；中文及字数校验不通过不展示报告。整个接口等待上限 45 秒，浏览器请求 55 秒；超时有中文重试提示。

2026-11-23 已按 Cloudflare 官方 `prompt: "agree"` 流程完成 Llama 模型首次启用。更换账户时可能需要重新接受 Meta 模型许可；若未启用，正式接口返回 `MODEL_NOT_READY`，不能以示例报告掩盖。未绑定 AI 的正式域名返回 503。

官方参考：[模型与输入格式](https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/)、[Pages 配置](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)、[免费用量](https://developers.cloudflare.com/workers-ai/platform/pricing/)。截至 2026-11-23，Workers AI 免费额度为账户每天 10,000 Neurons，00:00 UTC（北京时间08:00）重置；这是账户共享额度，不是无限免费。

为控制公开上传接口的用量，复用现有 D1 `quiz_rate_limits` 表，以 `critique-` 前缀隔离匿名计数：同一 IP 每小时最多 6 次、全站每天最多 40 次尝试。IP 经现有服务端密钥做 HMAC 后才存储；不存照片、文件名、评片内容或明文 IP。全局计数在调用前原子预占，失败尝试也计数。没有新增付费计划或数据库。其他应用使用同一账户 AI 额度时，仍可能提前触达 Cloudflare 上限，此时显示中文错误。

## 隐私与本地预览

本站只在请求内将压缩照片交给 Cloudflare Workers AI 推理，不写入 D1、R2、KV、缓存或应用日志；响应 `Cache-Control: no-store`。页面退出释放预览 URL，不把图片/报告写入 localStorage。

`npm run dev` 通过 `scripts/darkroom-dev.mjs` 在 Astro 本地服务器挂载同一接口。只有 localhost/127.0.0.1/::1 且没有 AI 绑定、没有 Cloudflare 请求上下文时，延迟 1.2 秒返回结构完整的 Mock。界面显示“本地示例 · 非AI评片”。构建预览服务器 `npm run preview` 只提供静态文件，不提供 API；本地完整交互应使用 `npm run dev`。

## 验证

`npm test` 包含评片 JSON、输入验证、Mock 隔离、模型失败、同源与 D1 原子限额测试；`npm run check` 检查网页、Studio 和 Functions；`npm run build:production` 检查网站静态输出；`wrangler pages functions build` 检查边缘函数打包。

浏览器验证覆盖真实文件输入、等待/合焦、错误重试、4 个维度/2+2 条内容、栏目切换、320/390/768/1440px 排版、高细节 PNG、带 EXIF 竖图、透明 PNG 和 WebP。测试中高细节图约 179KB，竖图输出 683×1024 且无 EXIF。
