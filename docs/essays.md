# 随笔 / ESSAYS

入口：`/essays/`。首篇：`/essays/a-generation-without-meaning/`。

## 文件与职责

- `apps/web/src/data/essays/*.json`：每篇一个数据文件。目录、独立文章 URL、sitemap 从这个目录自动生成，最新日期在前，同日按期号倒序。
- `apps/web/src/assets/essays/`：照片源文件，不直接发布原始 JPG。
- `apps/web/src/lib/essay-catalog.ts`：数据校验、排序、日期与 URL。
- `apps/web/src/lib/essays.ts`：自动发现文章和图片。
- `apps/web/src/layouts/EssayLayout.astro`：独立页面文档、SEO 与共享网页字体。
- `apps/web/src/styles/essays.css`：只在随笔页面加载，全部选择器限制于 `.essay-site` 或 `.essay-document`。不导入全站 global.css、照片灯箱、光圈转场、全局按钮样式或自定义鼠标。文末向上箭头单独复用 elastic-buttons.ts 的弹性逻辑，样式仍限定在随笔作用域内。
- `apps/web/src/components/essays/`：图片与缺图占位、行内斜体、阅读导航和进度，以及共用细线箭头和文末操作栏。
- `apps/web/src/pages/essays/index.astro`、`[id].astro`：目录和文章模板。
- 原站 `Header.astro` 只增加同级入口和窄桌面导航间距；移动菜单复用原有交互。`sitemap.xml.ts` 加入自动生成的文章 URL。

## 替换 NO. 01 的三张照片

把图片放在以下实际源码位置：

```text
apps/web/src/assets/essays/01/cover.png
apps/web/src/assets/essays/01/photo-1.jpg
apps/web/src/assets/essays/01/photo-2.jpg
```

当前三张原图均已接入：cover.png 用作目录封面和开篇题图；photo-1.jpg 放在第三节与第四节之间，配左图右斜体旁注；photo-2.jpg 放在全文最后一段之后、文末日期之前。第五节之前的旧占位已移除，首篇不再显示 Fig. 图注。没有文件时，服务端直接输出纸灰色占位与文件名，不发送不存在的图片请求。已有图片加载失败时同样退回占位。

保持以上文件名即可，无须修改模板。可以使用其他文件名或 JPG/PNG/WebP/AVIF，但须同步修改文章数据的 `src`。`src` 是相对 `assets/essays/` 的路径，如 `01/cover.jpg`。图片说明在 `alt`。`caption` 为可选图注，不需要时直接省略；不输出空图注或额外图注间距。

Astro 自动输出最大长边受限的响应式 WebP；目录缩略图为 3:2，阅读页显示原图比例。黑白和微对比来自 CSS，不修改源照片颜色。不要把源 JPG 放到 `public/`，否则会违反原站仅发布优化图的构建检查。

源文件在构建时读取；添加或替换后需要重新构建、提交并推送生产分支（不是上传后热更新）：

```powershell
D:/npm.cmd run check
D:/npm.cmd run build:production
git add -- apps/web/src/data/essays apps/web/src/assets/essays
git commit -m "content: update essays"
git push origin codex/astro-foundation
```

## 新增 NO. 02

1. 复制 `apps/web/src/data/essays/01-a-generation-without-meaning.json` 为 `02-your-essay.json`。
2. 修改 `id`（唯一英文短横线标识，例如 `a-walk-after-rain`）、`issueNumber`（`NO. 02`）、标题、副标题、日期（`YYYY-MM-DD`）、地点、阅读分钟数、摘要和文末 `closingNote`。
3. 修改 `coverImage`，在 `assets/essays/02/` 放照片。暂时没有照片可先只填写路径，会自动占位。
4. 按顺序编辑 `content`。支持 `paragraph`（段落）、`heading`（章节）、`quote`（独立引文）、`image`（图片及图注）。把 image 对象放在哪个位置，插图就出现在哪里。段落中 `\n` 保留换行，`*斜体文字*` 会渲染为斜体；其余文字按纯文本转义，不执行 HTML。
5. 构建并发布。新文章会自动出现在目录、`/essays/a-walk-after-rain/` 和 sitemap，不用改路由或模板。

图片可增加 `sideNote: {"heading":"拍摄于澳门 / 发财树","paragraphs":["旁注正文"]}`。带旁注的图片自动使用左图右注：桌面与正文同宽，最大 640px、54% 图片 / 6% 间距 / 40% 旁注，底部对齐；小于 768px 改为上下排列，整个图文模块两侧留 24px，图片与旁注不重复添加内边距。旁注为 14px / 1.85 的中文衬线斜体、#55544F。旁注代替常规 caption，不影响目录缩略图。

内容块示例：

```json
[
  {"type":"paragraph","text":"第一段正文。"},
  {"type":"heading","text":"一、雨停以后"},
  {"type":"paragraph","text":"这里可以写 *斜体书名*。"},
  {"type":"image","src":"02/photo-1.jpg","alt":"照片中实际出现的内容","caption":"Fig. 02 — 图注"},
  {"type":"quote","text":"单独呈现的一句话。"}
]
```

编号与 id 不能重复，非法日期、空正文或目录穿越路径会使构建失败，避免错误内容悄悄上线。尚未准备好的文章不要放入 `src/data/essays/`；放在目录外整理完毕后再移入。

## 排版与验证

桌面正文 640px / 17px / 1.95，手机左右 24px / 16px / 1.85。标题与正文使用本站 Noto Serif SC Variable，继续按字符分片加载；元数据使用同源无衬线/等宽字体。字体显示策略为 swap，不阻塞阅读。

所有文章都由静态 HTML 直接输出，关闭 JavaScript 也能阅读和跳转；脚本控制导航显隐、阅读进度、失败图片占位和文末箭头反馈。浏览器原生前进/后退与直接访问无需客户端路由。减少动态效果设置会关闭平滑滚动与过渡。

验证入口：`npm test` 中的 essay-catalog 测试、生产构建检查，以及本地工作区 `work/essays/` 的浏览器检查与截图。首篇正文按用户提供原文录入，未改写其观点或事实陈述。

阅读页标题区仅显示刊号与年份、28px 细横线、主标题和副标题；日期、地点与阅读时长仍保留在数据中；目录条目仅显示刊号和年月，文章头部不再重复显示日期信息。主标题桌面 36px、手机 28px，500 字重；副标题 16px、400 字重；章节 600 字重。本站自托管的 Noto Serif SC 可变字体涵盖 200–900 字重，包含上述 400 / 500 / 600。

顶部导航使用半透明纸色与 8px 背景模糊，初始无底线，向下隐藏后向上滚动显示极淡底线。左侧为细线箭头和“随笔”，右侧 ESSAYS。文末按钮按最新要求沿用主站样式：左侧“随笔目录”为深青色衬线胶囊按钮，右侧为 56px 圆形向上箭头。两者都支持轻微跟随、按压和回弹；目录按钮悬停加深青色、按下变金色，向上箭头悬停即变金色。减弱动态效果设置下关闭位移动效。仅这两个控件使用圆角，图片与正文容器仍保持直角。

阅读页的题图、正文插图和结尾图片均与正文左右边界对齐：最大宽度 640px，窄屏两侧 24px；保持照片原比例，取消先前手机通栏出血。带旁注的图文模块也遵循相同外侧边界，桌面仍采用左右分栏。目录缩略图不受影响。

目录不再展示地点与阅读时长（例如“上海 · 6 min”）；窄屏编号/年月行到标题的间距为 16px，取消旧地点行对应的跨栏样式。
