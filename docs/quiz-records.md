# 私人答题记录

访客在“关于我”点击默契度按钮，填写名字或昵称后答题。完成后提交到 `/api/quiz`。

网站主人登录 https://reverian-photography.sanity.studio/ ，打开顶部“答题记录”。列表按提交时间倒序排列，每页 50 条；展开一条记录可看每道题的选择与正确答案。昵称由访客自行填写，不代表经过身份验证的真实姓名。

记录保存在 Cloudflare D1 `reverian-quiz`，不写入公开的 Sanity dataset。读取接口 `/api/quiz-records` 会向 Sanity 验证当前登录令牌，并将用户 ID 与服务端 `QUIZ_OWNER_ID` 比较。其他账号即使能登录编辑室也无权读取。令牌不写入数据库，也不进入网站构建文件。

Cloudflare Pages 生产环境需要：

- `QUIZ_DB`：D1 绑定，见根目录 `wrangler.jsonc`。
- `QUIZ_OWNER_ID`：网站主人的 Sanity 用户 ID。
- `QUIZ_RATE_SECRET`：随机密钥，仅服务端使用，存为 secret。

初始化 SQL 在 `migrations/0001_quiz.sql`。每小时每个来源最多提交 30 条；限流只保存按小时加盐的不可逆摘要，不保存 IP 原文，过期摘要自动清除。匿名接口只能写入，服务器验证所有答案并重新计分。重试使用同一 UUID，避免重复记录。读取响应带 `Cache-Control: no-store`。

题目更新时同步提升 `apps/web/src/lib/tacit.ts` 中的 `QUIZ_VERSION`。旧记录保存题目和答案的文字快照，因此不受后续修改影响。社媒链接在 Sanity“首页与网站设置 → 社交链接”修改，发布后会触发网站构建。

验证：`npm run check`、`npm test`、`npm run build:production`。本地端到端测试通过 Wrangler Pages dev 使用本地 D1，避免污染正式记录。
