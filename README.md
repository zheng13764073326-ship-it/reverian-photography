# Reverian Photography

Astro + TypeScript 网站与 Sanity Studio 的本地开发版本。基于现有摄影网站迁移，保留已确认的照片盒封面、Reverian 字标、双行角标与米白纸张视觉。

## 本地运行

需要 Node.js 24 与 npm。在本目录运行：

```sh
npm ci
npm run dev
```

打开 http://localhost:4321 。这台电脑已安装依赖，可以直接运行 `npm run dev`，也可以双击「启动网站.cmd」。这是本机预览地址，不能发给别人作为公开网址。

```sh
npm run check       # Astro 与 Studio 类型检查
npm test            # 公开内容过滤、500 张照片分页
npm run build       # 生成 apps/web/dist
npm run preview     # 预览静态构建结果
npm run assets      # 从保留的原素材生成响应式 WebP
```

浏览器检查：先运行 `npm run preview -w @reverian/web -- --port 4322`，另开终端运行 `node scripts/browser-check.mjs`。默认使用 Windows 本机 Chrome；其他路径通过 `CHROME_PATH` 指定，其他服务地址通过 `PREVIEW_URL` 指定。测试截图在 `artifacts/`。

## 当前交付

- 第一阶段本地基础：Astro 静态构建、TypeScript、Sanity 内容模型、独立 Studio 配置、Cloudflare Pages 配置、GitHub CI。
- 为检验基础提供可运行的页面初版：首页、精选作品、旅行影集目录与 6 个详情、街巷观察、2 篇影像札记、About、404。
- 保留照片盒封面的三个可点击区域与大图浏览；移动端全屏裁切封面、汉堡导航、灯箱左右切换和触摸滑动。
- 演示模式无需账户或密钥；现有素材生成了响应式 WebP 与尺寸占位信息。
- **尚未接入真实 Sanity 项目，也未创建 Cloudflare 线上项目。** Studio 的 schema 可离线检查，但登录、上传、保存、发布、手机编辑必须在创建真实项目后联调。
- 这次没有覆盖现有 GitHub Pages 线上网站。阶段二、三页面是可运行初版，仍待视觉细化与真实内容验证。

## 数据与后台

演示数据在 `apps/web/src/data/demo.ts`。页面统一通过 `getContent()` 读取数据，不能在页面中另写一套 CMS 逻辑。

账户准备好后，复制两个应用各自的 `.env.example` 为 `.env`，填写 Sanity 项目配置。在 web 中将 `CONTENT_MODE` 改为 `sanity`，运行 `npm run studio` 编辑内容。Sanity 模式配置缺失或请求失败会明确报错，不会偷偷回退到示例内容。

Studio 提供 `Photo`、`Album`、`Journal`、`Featured`、`SiteSettings` 五类内容。照片只入库一次；专辑、封面与首页引用同一照片。封面焦点分别保存，作品大图不裁切。照片公开状态统一过滤，未发布或隐藏照片不会被其他栏目间接展示。

## 演示内容来源

示例图片沿用旧原型的 Unsplash 占位图，来源保存在 `apps/web/public/images/sources.json`。桌面封面是此前确认的生成式场景，三张大图由原型中既有投影参数提取，不是摄影师真实原片。示例地点、日期与文字不代表真实经历。演示模式禁用搜索引擎索引。

## 进一步阅读

- [目录、组件与内容模型](docs/architecture.md)
- [Cloudflare 与 Sanity 接入计划](docs/deployment.md)
- [阶段进度与后续验收](docs/stages.md)
