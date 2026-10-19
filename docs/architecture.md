# 目录、组件与技术方案

方案在开始编码前已向用户说明。本文件记录第一阶段实现边界及下一阶段约定。

## 目录

```text
reverian-photography/
  apps/web/
    public/images/                旧原型素材、响应式衍生图、来源声明
    src/pages/                    Astro 路由
    src/layouts/Base.astro        全站外壳、SEO、公共导航、灯箱
    src/components/               HomeCover、Photo、Header、Lightbox 等
    src/lib/                      数据、图片 URL、发布过滤、类型
    src/data/                     显式演示数据与图片尺寸清单
    src/styles/global.css         视觉变量与响应式规则
  apps/studio/
    schemaTypes/index.ts          五类文档与正文/封面/版式对象
    sanity.config.ts              编辑室结构、单例管理
    sanity.cli.ts                 CLI 配置
  scripts/prepare-assets.mjs       现有图片处理，不改动原文件
  scripts/browser-check.mjs        真实 Chrome 响应式与交互检查
  tests/                         内容边界和分页检查
  docs/                          实施和接入说明
  .github/workflows/check.yml      CI，只检查，不自动替换旧网站
  wrangler.jsonc                 Pages 输出目录
```

## 页面与组件

| 页面 | 路径 | 主要组件 |
| --- | --- | --- |
| 首页 | `/` | HomeCover、SectionHeading、Photo、AlbumCard |
| 精选作品 | `/works/`、`/works/2/` | 每页最多 24 张、共用灯箱 |
| 旅行影集 | `/albums/` | 桌面三列、平板/手机两列 |
| 专辑正文 | `/albums/固定slug/` | 序言、full/pair/text 版式、相邻影集 |
| 街巷观察 | `/street/`、`/street/2/` | 栏目照片列表、分页、灯箱 |
| 影像札记 | `/journal/`、`/journal/固定slug/` | 导语、富文本、照片 |
| About | `/about/` | 简介、理念、个人图片、社交链接 |

旧导航的 home、selected、collections、street、film、about hash 在新首页上兼容跳转；film 对应新任务书中的影像札记。旧专辑 hash 的逐项重定向需在正式域名迁移时补充。

## 内容模型

| 文档 | 字段与编辑行为 |
| --- | --- |
| Photo | image、title、caption、takenAt、location、tags、sections、featured、alt、isPublic；上传保留原图，允许多栏目复用 |
| Album | title、slug、city、country、date、cover、excerpt、preface、spreads、order、isPublic |
| Journal | title、slug、date、excerpt、body、photos、isPublic |
| Featured | 单例，photos 引用数组，原生拖动控制首页顺序 |
| SiteSettings | 单例，站名、名字、首页短句、宽幅/手机封面、简介、About、个人配图、社交链接、SEO |

`photoCover` 使用 Photo 引用加 focusX/focusY 数值，范围 0–1。每个封面可独立定位焦点，同一原文件不重复上传。阶段一使用数值定位，后续可在保留数据结构的前提下补充可视化焦点选择。

`spread` 版式为 full（一张大图）、pair（两张照片）、text（一张图与正文）。模块和其中照片可原生拖动排序。被隐藏的引用从公开结果移除，空模块不输出。

Album / Journal 的 slug 首次发布后校验为不可改变。更新标题不影响 URL。确需改网址时必须做明确的重定向迁移，不能只改标题重新生成 slug。单纯隐藏照片通过 isPublic 与发布完成；需要真正撤回已发布文档时用 Sanity 的 Unpublish。

## 图片和 500 张作品

作品、街巷页面每页 24 张；构建时取得内容元数据，浏览器只获得本页图片链接。所有作品图片写入宽高，保留自然比例并生成 srcset；封面才做定比裁切。灯箱打开时加载大图，当前阶段不预下载整个图库。专辑图片懒加载，尺寸与 LQIP 占位减少页面跳动。

Sanity 模式通过图片 CDN 生成 width/quality/format 参数。生产查询使用 published perspective 和非 CDN 的构建请求，以免内容发布后构建读取到旧缓存。只读 token 仅在服务端构建使用，不带 PUBLIC 前缀，也不注入前端脚本。

## 视觉延续

保留照片盒底图、左下名字和短句、左上双行角标、固定导航。颜色使用任务书指定值，正文可读性采用更深的灰色；辅助浅灰用于细线或次要装饰。首页精选非对称排列，详情用纸张式间距组织照片与文字；不加入毛玻璃或滚动动画。

英文已本地打包 Cormorant Garamond。中文目前使用思源宋体/黑体优先的系统字体栈，缺少时回退到宋体或设备字体；跨设备一致的思源中文字体分包、自托管属于阶段二待完善项。
