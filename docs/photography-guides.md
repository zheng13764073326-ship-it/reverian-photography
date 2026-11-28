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

图片放在 `apps/web/public/images/guides/`。建议两层均为 12:7、至少 1200 × 700 像素、机位和主体位置一致。前景用透明 WebP / PNG，仅保留主体与近处景物；背景用完整远景。两层均采用居中 cover，背景外扩 18px 避免模糊边缘漏底，需要给背景预留裁切余量。未传图片时显示内置 SVG，前景不会参与模糊。两项参数可以分别替换。

动画只在精确指针悬停时启动；减少动态效果设置下关闭位移、循环与闪光，滑块仍可操作。
