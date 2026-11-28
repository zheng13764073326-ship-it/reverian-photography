# 相机选择指南维护说明

页面：/lab/guides/camera/。入口：光学实验室 / 摄影入门 / 相机选择。

内容依据用户提供的 reverian_guide_01_codex.md（2026.11 版）。保持六章结构与预算分档；没有添加单台相机实时价格、购物链接或促销文案。预算分档是比较起点，购买前仍需核对行情、成色和套机组成。

## 维护入口

- apps/web/src/data/guide-data.json：画幅、品牌、题材、预算策略、验机方法、决策表和 74 条独立机型记录。
- apps/web/src/data/guide01CameraData.ts：机型字段类型、中文画幅名与章节目录。
- apps/web/src/pages/lab/guides/camera.astro：六章页面模板。
- apps/web/src/components/guides/CameraImage.astro：本地真实产品照片、文件版本与缺图检查。
- apps/web/src/lib/camera-guide.ts：画幅选择、题材切换、预算与 EVF 联动、阅读进度、目录跟随、验机保存。
- apps/web/src/styles/camera-guide.css：所有选择器限定在 .camera-guide 内，不修改整站变量或首页样式。

新增机型时，在 cameras 数组追加一条独立记录；同一机型进入多个预算或新旧分组，只追加 placements，避免维护重复硬件资料。相机图路径设为 /images/cameras/唯一型号.webp。更改画幅、EVF、快门信息前请核对该具体型号的官方规格。

## 图片

已配齐 74 条机型记录的真实产品照片，覆盖 96 个预算卡片位置。统一为 800 × 600 WebP，每张不超过 80 KB。优先采用品牌产品档案，LX10 与早期 Leica Q 分别补自 Broadway Camera 和 Leica Store Miami。来源逐张记录于 docs/camera-image-sources.json。图片保存在本站，不依赖外部图片加载。

不再渲染线稿。图片文件缺失会令构建失败；网络加载失败提供重新加载按钮。图片地址带内容指纹，替换机身照片后不会继续显示旧缓存。OM-1 已更正为第一代机身。系列记录标注实际图示型号；佳能日版机身标注对应名称，避免把地区名称差异误认为不同代际。

新增机型时必须同时提交对应产品图与来源记录，再执行生产构建。不要用相邻代机型代替缺图型号。

## 交互与内容核对

- 预算直达锚点：#budget-1k-3k、#budget-3k-5k、#budget-5k-8k、#budget-8k-12k、#budget-12k+。支持前进、后退和页面刷新。
- EVF 筛选排除无电子取景器机型，以及仅有光学取景器的单反。
- 验机进度只保存于访客当前浏览器的 localStorage，键为 reverian_guide01_checklist_v1；没有上传服务。无存储权限或旧数据损坏时仍可使用勾选功能。
- 修正原稿中 E/FE 与 X/GFX 卡口混用；区分电子前帘、全机械与纯电子快门；不把大画幅等同于单位像素面积必然更大。
- 验机方法按实际支持的功能检查，防抖组件关机活动声不直接判为故障，快门测试避免把正常曝光差异误判为损坏。

## 验证

使用项目 build:production 与 Astro check。浏览器检查桌面与手机：锚点位置、横向目录、画幅 SVG、题材键盘切换、预算/成色/EVF 联动、空结果、全部机型图片加载与失败重试、14 项勾选保存/恢复/重置、存储异常和原有镜头指南弹窗。截图与运行记录保存在当前工作区 work/camera-guide/；本次配图验证位于 work/camera-images-complete/。
