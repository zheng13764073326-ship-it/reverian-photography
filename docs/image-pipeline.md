# 图片压缩与发布

列表使用 WebP 缩略图，点击灯箱才请求高清图。图片经过 EXIF 方向纠正，按最长边等比缩放，不放大小图；既有影集封面的焦点裁切保留。

| 用途 | 最长边 | WebP 质量 |
| --- | --- | --- |
| 首页精选、作品 / 影集列表、胶片列表 | 1200 px | 80 |
| 点击后的 Lightbox 高清预览 | 2048 px | 84 |
| 首页封面 | 2400 px | 84 |

竖图按高度限边，`srcset` 的宽度描述使用真实输出宽度。本地图片另生成最长边 480 / 800 px 的小图；CMS 图片也生成按需的响应式尺寸。手机首页仍使用已确认的完整道路竖版构图，原始尺寸不足上限时不放大。

## 本地 JPG / PNG

```powershell
npm run images:optimize -- --backup "C:\Users\13764\Pictures\Reverian-originals-YYYY-MM-DD" --remove-originals
```

默认扫描 `apps/web/public/images`，输出同目录的 `name_thumb.webp`、`name.webp`、`name_thumb-480.webp` 和 `name_thumb-800.webp`，并更新 `apps/web/src/data/local-images.json`。脚本打印原图、缩略图、高清图、响应式小图和总输出体积。

脚本先将所有 JPG / PNG 复制到项目外，并逐一校验 SHA-256。完成全部转换后，只有传入 `--remove-originals` 才删除已校验备份的原图；任意转换失败会保留全部原图。备份目录在项目内会被拒绝，同路径已有不同内容的备份也不会覆盖。没有新增原图时会保留现有 WebP 和清单。

可通过 `--input`、`--output`、`--manifest` 指定路径；`--hero` 接受逗号分隔的相对原图路径。默认封面为 `home-desk.png` 和 `covers/kinmen-portrait-v3-941.jpg`。`npm run assets -- ...` 是兼容入口，也要求外部备份路径。

新增本地作品时使用 `local-images.json` 的真实尺寸和路径。胶片数据中 `original` 字段表示灯箱高清 WebP，`preview` / `srcset` 是缩略图；`sha256` 保留原始照片的来源校验值，`optimizedSha256` 校验压缩后的高清文件。

## CMS 照片

继续在 Sanity 编辑室上传照片。生产构建通过 `images.ts` 请求指定尺寸、质量和 WebP 格式，`scripts/localize-images.mjs` 校验并缓存到同站点 `/_photos/`。原图保留在 Sanity，不复制到 Git 或 Cloudflare 发布目录。后续正常发布 CMS 内容时会自动采用这条流程。

下载失败、返回非 WebP、方向未归一或尺寸超出上限时构建失败，避免发布坏图；缓存会再次验证。所有图片准备完毕后才替换 HTML 引用。社交预览使用同站点绝对地址。

## 加载与检查

首页封面为 `fetchpriority="high" loading="eager" decoding="sync"`。其他图片为 `loading="lazy" decoding="async"`，相框使用 `#EAE8E0` 背景并通过尺寸 / 宽高比保留空间；灯箱在点击后加载高清文件。

首页另由 `scripts/optimize-home.mjs` 在构建结束、CMS 图片本地化后处理：将首页的编译后 CSS 按原顺序内联，取消首屏阻塞样式请求，同时保留旧浏览器兼容规则。其他页面仍使用可缓存的外部 CSS。不要直接运行 `astro build` 来代替项目的 `npm run build` / `npm run build:production` 发布入口。

首页非封面图片的真实地址暂存于 `data-src` / `data-srcset`，使用相同宽高比的内联 SVG 占位。封面加载期间，仅进入视窗的图片开始请求；封面加载完成或失败后，接近视窗 200 px 的图片提前请求。用户快速下滑不必等待封面，键盘聚焦图片链接也会触发加载。加载器直接内联于首页，不依赖额外脚本下载；不支持 IntersectionObserver 时回退到原生懒加载，禁用 JavaScript 时由 `noscript` 提供原始图片。开场光圈和封面对焦动画不变。

构建检查也会确认首页不再引用外部样式、延迟图片带有真实地址和占位图，以及内联 / 外部 CSS 均未出现旧手机浏览器不支持的范围媒体查询。`tests/home-delivery.test.ts` 覆盖生成结果、回退内容、重复执行和异常输入。

```powershell
npm run check
npm test
npm run build:production
```

生产构建检查所有页面的本地引用、真实 `srcset` 宽度、WebP 格式 / 尺寸 / EXIF 方向、灯箱高清尺寸与加载属性。发现发布目录含任何 JPG / JPEG / PNG 时会失败。`.gitignore` 同时排除图片目录下大小写扩展名的原图；已在历史提交中的旧原图本次从当前版本删除，不重写 Git 历史。

2026-11-22 本机原图备份位置为 `C:\Users\13764\Pictures\Reverian-originals-2026-11-22`：`public-images` 保留改动前 244 个本地图片文件，`sanity-originals` 保留 92 张发布中的 CMS 原始文件；清单提供逐项哈希验证。该目录位于仓库外，不参与发布。
