# 相机选择指南维护说明

页面：/lab/guides/camera/。入口：光学实验室 / 摄影入门 / 相机选择。

内容依据用户提供的 reverian_guide_01_codex.md（2026.11 版）。保持六章结构与预算分档；没有添加单台相机实时价格、购物链接或促销文案。预算分档是比较起点，购买前仍需核对行情、成色和套机组成。

## 维护入口

- apps/web/src/data/guide-data.json：画幅、品牌、题材、预算策略、验机方法、决策表和 74 条独立机型记录。
- apps/web/src/data/guide01CameraData.ts：机型字段类型、中文画幅名与章节目录。
- apps/web/src/pages/lab/guides/camera.astro：六章页面模板。
- apps/web/src/components/guides/CameraImage.astro：官方产品图与线稿回退。
- apps/web/src/lib/camera-guide.ts：画幅选择、题材切换、预算与 EVF 联动、阅读进度、目录跟随、验机保存。
- apps/web/src/styles/camera-guide.css：所有选择器限定在 .camera-guide 内，不修改整站变量或首页样式。

新增机型时，在 cameras 数组追加一条独立记录；同一机型进入多个预算或新旧分组，只追加 placements，避免维护重复硬件资料。相机图路径设为 /images/cameras/唯一型号.webp。更改画幅、EVF、快门信息前请核对该具体型号的官方规格。

## 图片

本次接入 47 张品牌官方产品图，均为透明背景 800 × 600 WebP，单张不超过 80 KB。尽量采用官方正面或斜侧展示照；不伪造硬件视角。来源逐张记录于 docs/camera-image-sources.json。

另有 27 个型号没有取得能确认型号的官方产品图，显示带品牌与画幅说明的线稿，不用相邻代产品替代。高预算的系列方向仍用对照表，不强行指定单一机身。图片不存在时构建自动使用线稿；图片网络加载失败也切回线稿。日后补入对应图片并重新构建即可。

## 交互与内容核对

- 预算直达锚点：#budget-1k-3k、#budget-3k-5k、#budget-5k-8k、#budget-8k-12k、#budget-12k+。支持前进、后退和页面刷新。
- EVF 筛选排除无电子取景器机型，以及仅有光学取景器的单反。
- 验机进度只保存于访客当前浏览器的 localStorage，键为 reverian_guide01_checklist_v1；没有上传服务。无存储权限或旧数据损坏时仍可使用勾选功能。
- 修正原稿中 E/FE 与 X/GFX 卡口混用；区分电子前帘、全机械与纯电子快门；不把大画幅等同于单位像素面积必然更大。
- 验机方法按实际支持的功能检查，防抖组件关机活动声不直接判为故障，快门测试避免把正常曝光差异误判为损坏。

## 验证

使用项目 build:production 与 Astro check。浏览器检查桌面与手机：锚点位置、横向目录、画幅 SVG、题材键盘切换、预算/成色/EVF 联动、空结果、图片失败回退、14 项勾选保存/恢复/重置、存储异常和原有镜头指南弹窗。截图与运行记录保存在当前工作区 work/camera-guide/。
