# 万物生灵与云端视角

页面：`/wild/`（03 · 万物生灵）与 `/above/`（04 · 云端视角）。全站作品集导航为精选作品、光影存档、万物生灵、云端视角、胶片来信。

作品数据独立保存：

- `apps/web/src/data/collections/wild-encounters.json`：`id, title, category, environment, aspectRatio, src`。分类为 `birds / beneath / portraits`，环境为 `WILD / ZOO / AQUARIUM`，比例用 `3:2`、`2:3`、`4:5`。
- `apps/web/src/data/collections/from-above.json`：`id, title, category, meta, layout, src`。分类为 `aerial / window`，`layout` 为 `wide / half`，宽幅用 21:9，半幅用 3:2。每组按 `wide, half, half` 排列，并让同一组三张保持同一分类，筛选后也能保留混排节奏。

当前共 12 + 9 个未曝光占位，物种、环境、地点、航线和高度都是界面示例，尚未对应真实摄影作品。填图时同步核实这些字段。

## 填入作品

将压好的 WebP 放入 `apps/web/public/images/` 对应目录，再把 `src` 填为 `/images/…/photo.webp`；也支持 HTTPS 图片 URL。空字符串不创建图片元素，不请求图片。填入地址后自动渲染带尺寸、`loading="lazy"` 和 `decoding="async"` 的图片，并在点击预览时使用该图片。当前一个 `src` 同时用于列表与预览；建议使用已压缩且最长边不超过 2048px 的文件，原图继续在项目外备份。比例应与真实照片匹配；云端视角按画册版式裁切列表，预览保留整张图。

添加条目时保留唯一、稳定的 `id`。万物生灵每次显示 12 张，超过 12 张会启用“加载更多”；分类切换重新从前 12 张开始。当前所有占位均已显示，按钮禁用并预留样式。云端视角完整显示当前分类。

筛选使用 `?category=birds` 等网址参数，支持直达、刷新和浏览器后退；Lightbox 的上一张 / 下一张仅遍历当前筛选且已显示的作品。支持方向键、Escape、背景点击关闭，关闭后恢复原卡片焦点。

## 街巷观察下线

已移除首页区块、静态页面生成、导航与 sitemap。`/street`、`/street/` 及分页旧址在 Cloudflare 301 转到 `/works/`，旧 `#/street` 也转到精选作品。Sanity 中原有照片、素材和历史 `street` 分类值保留，避免损坏其他作品集引用；它们不再生成独立街巷观察页面。

新增字体与样式仅由两个新页面加载，不增加首页的 Noto Serif SC / JetBrains Mono 请求。继续保留旧手机媒体查询编译目标、首页内联 CSS 和屏外图片延迟策略。
