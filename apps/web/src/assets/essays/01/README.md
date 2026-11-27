# NO. 01 配图

把三张照片放在本目录，文件名分别为 `cover.jpg`、`photo-1.jpg`、`photo-2.jpg`。

没有文件时显示纸灰占位，不会请求不存在的图片。放入文件后重新构建发布即可显示。
源图仅用于构建：Astro 自动输出响应式 WebP，网页以 CSS 显示黑白质感，源图本身不改色。
题图在目录缩略图内裁为 3:2；阅读页按原图比例完整展示。
图注和替代文字在 `src/data/essays/01-a-generation-without-meaning.json` 中维护。
