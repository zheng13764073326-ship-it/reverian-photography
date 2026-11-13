# 首页封面

首页采用林荫道路实拍照片和独立网页文字，电脑与手机分别排版，参考用户提供的横、竖版设计。没有 “Kinmen Notes” 副标题。

- 背景复用 `kinmen-2026-14` 的现有压缩 JPEG：`image-b9cd28b14e696b661f0d0e5389f216319216c45a-4096x2678-jpg`。不上传 `E:/上海/1/14.png` 原始大文件，不更改金门影集照片。
- `siteSettings.homePresentation` 为 `photograph`；`homeCover` 和 `mobileCover` 均引用该照片。桌面焦点 `(0.5, 0.05)`，手机焦点 `(0.39, 0.5)`。
- 桌面保留横向画面，居中斜体标题，上方细线导航，下方有编号、分类与 Scroll 入口。
- 800px 以下的竖屏采用独立 9:16 图片候选和裁切位置，放大标题，显示 Explore 入口。照片保持比例；不生成或补画场景。
- 手机图片候选宽度为 400、800、1200px，电脑沿用现有响应式尺寸。生产构建通过 `localize-images.mjs` 生成同站静态图片。
- 导航文字、标题及浏览提示均为 HTML，不写进照片。斜体使用本地 Cormorant Garamond 字体。
- 首页导航品牌显示 Reverian，其他页面保留原导航标识；原有导航菜单、光圈入场、滚动入口与减少动态效果支持继续保留。

主要文件：`HomeCover.astro`、`Header.astro`、`Base.astro`、`global.css`。修改前后的 CMS 快照、浏览器检查和预览保存在忽略提交的 `artifacts/home-cover-redesign/`。
