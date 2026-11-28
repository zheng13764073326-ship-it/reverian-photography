# 摄影指南入口维护

入口为 `/lab/`。`PhotographyGuides.astro` 负责首屏、阅读顺序、四张指南卡片及工具入口；样式仅作用于 `.photography-guides`，不修改公共导航、页脚或其他实验室面板。

- 标题、导语、收获点、价值标签：`apps/web/src/data/lab/guides.json`。
- 相机选购：`/lab/guides/camera/`。
- 其余三篇沿用原有大纲抽屉，可直接访问 `/lab/?guide=lens`、`/lab/?guide=focal-length`、`/lab/?guide=exposure`，支持刷新及浏览器前进/后退。
- 取景器 8 档数据：`apps/web/src/lib/photography-guides.ts`。固定 ISO 100；景深效果用于观察背景清晰程度，参数沿用标准标称整档值。

## 替换取景器为实拍图层

在 `PhotographyGuides.astro` 中向 `ApertureViewfinderDemo` 传入：

```astro
<ApertureViewfinderDemo
  foregroundSrc="/images/guides/viewfinder-foreground.webp"
  backgroundSrc="/images/guides/viewfinder-background.webp"
/>
```

图片放在 `apps/web/public/images/guides/`。两层可以分别替换。建议采用相同机位和对齐的主体位置，画幅为 16:10，尺寸至少 1200 × 750 像素。前景使用透明 WebP 或 PNG，始终清晰。背景使用完整远景，两层均居中裁切，背景四周外扩 18px，请给模糊边缘预留裁切余量。

默认背景是 20 个夜景光源。收小光圈时，散景逐档缩小、边缘变清晰，f/11 和 f/16 有轻微六芒星。默认前景是底部焦点标尺。换成实拍背景后，光圈控制照片的模糊程度。

滑块支持拖动和键盘，刻度数字也可直接选档。启用减少动态效果时，各档即时切换。
