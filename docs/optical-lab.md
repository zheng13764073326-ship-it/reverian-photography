# 光学实验室

入口 `/lab/` 与作品集平级，顶部导航为首页 / 作品集 / 光学实验室 / 关于我。光学实验室为与作品集同样的下拉菜单，包含摄影入门 / AI 影像 / 火烧云三个子目录；页面内不再显示胶囊切换栏。分享直达：`/lab/?tab=ai`、`/lab/?tab=sunset`；提示词分类例如 `?tab=ai&use=film`。

## 数据与界面

- `apps/web/src/data/lab/guides.json`：4 篇结构化指南大纲。字段 `id, index, tag, title, summary, readTime, content`；content 为 `{heading, points: string[]}` 数组。标题、内容以文本渲染，不接受未处理 HTML。阅读抽屉支持 Escape、背景关闭、键盘焦点与关闭后返回卡片。
- `apps/web/src/data/lab/prompts.json`：6 个用途各一条示例提示词，字段 `id, index, category, title, style, src, prompt`。src 为空时不创建 img；填写压缩后的图片 URL 即显示 16:9、lazy/async 样片。复制完整 prompt，代码框可滚动 / 选择文字；Clipboard 成功后反馈 1.5 秒，权限拒绝时不显示虚假成功，提示手动复制并选中文字。
- `apps/web/src/data/lab/cities.json`：上海 / 南京 / 杭州固定坐标、英文名及明确标记的本地模拟云量数据。
- 页面 `pages/lab.astro`、样式 `styles/lab.css`、交互 `lib/optical-lab.ts`。顶部三个子目录在实验室页内支持无刷新切换、URL / 后退，在其他页面使用正常链接直达；菜单可用键盘 Enter / Tab / Escape 操作，当前子目录通过 aria-current 标记。手机选择后收起菜单并解除滚动 / inert 限制，焦点移到栏目标题；筛选使用 aria-pressed。
- 采用 #F4F3EE / #EAE8E0 / #222222 / #1E4D54 / #B86B35；Noto Serif SC Variable 与 JetBrains Mono 本地托管，只在实验室页面引入。按钮沿用全站 .95 按压与弹簧回弹，减少动态效果偏好生效。

## 天气请求、时间与兜底

首次打开火烧云栏目才动态加载 `lib/lab-weather.ts`，再从浏览器直接请求 Open-Meteo（支持 CORS，无 API Key）。接口为 `https://api.open-meteo.com/v1/forecast`，参数：三个固定坐标各一次请求；`daily=sunset`；`hourly=cloud_cover_high,cloud_cover_mid,cloud_cover_low,precipitation_probability,wind_speed_10m`；`timezone=Asia/Shanghai`；`forecast_days=1`；`wind_speed_unit=ms`。

每个城市独立 10 秒超时，不让一城故障影响其他城市。浏览器内存与 localStorage 缓存原始响应，校验城市、日期、格式及获取时间，只复用 15 分钟内同日有效预报。手动刷新跳过缓存尝试请求；失败时仍可用有效缓存，否则用本地模拟数据。所有缓存 / 模拟来源在卡片上明示；模拟数据不写入预报缓存。

`lib/sunset.ts` 为纯计算 / 校验模块。Open-Meteo 的本地 ISO 字符串显式附 `+08:00` 解析，不依赖浏览者时区。日期均按北京时间，检查响应的 UTC 偏移为 28800，过期日期或不完整变量触发兜底。日落后显示“今日日落已过”，不悄悄切到明天。

日落前后 1 小时内取小时采样（一般 2–3 个），高 / 中 / 低云与风速取均值，降水概率取最高值。null、缺失或越界值不按 0 处理，避免误判晴空。风速单位严格验证为 m/s。

SunCalc **2.1.4** 已固定版本且含类型。v2 的 azimuth 是以正北为 0°、顺时针的角度，**不是 v1 的弧度 / 正南基准**。真实预报采用 API 日落时刻计算方位；兜底用 SunCalc 按 UTC+8 当日计算日落，再计算方位，标为天文估算。

## 指数模型

这是用于摄影条件参考的启发式模型，未经发生概率校准。高 / 中云各自 30%–75% 时云质因子为 1；低于 30% 时线性从 0 升到 1，高于 75% 时线性降到 100% 云量的 0。

`score = 35 × 高云质因子 + 30 × 中云质因子 + 25 × (1 - 低云/100) + 10 × (1 - 降水概率/100) - 0.2 × 降水概率`

低云 >60% 时总分再乘 0.35，最后四舍五入并限制 0–100。风速只展示，不参与评分。页面注明未纳入西侧远端云墙、能见度等条件，分数不是火烧云发生概率。

来源与维护参考：[Open-Meteo Forecast API](https://open-meteo.com/en/docs)、[数据许可](https://open-meteo.com/en/license)、[SunCalc](https://github.com/mourner/suncalc)。页面已显示 Open-Meteo / CC BY 4.0 署名及“指数由本站计算”。当前按个人非商业摄影站点的免费接口接入。

## 验证

`tests/optical-lab.test.ts` 覆盖模型边界 / 惩罚、日落窗口、时区跨日、天气缺失 / null / 单位错误、缓存过期 / 城市隔离、冬夏方位角、请求超时 / HTTP 错误及内容结构。与现有测试共 41 项通过。

初版验证脚本 `work/optical-lab/verify.mjs`（原页内 Tab 选择器已由下述新版导航验证替代） 以 320 / 390 / 768 / 801 / 1024 / 1440px 检查页面、抽屉、键盘切换、历史、筛选、复制成功 / 拒绝 / 1.5 秒还原、同日缓存、单城失败、10 秒超时兜底和刷新恢复。剪贴板 UI 测试通过替代 writeText 记录完整内容，不覆盖用户系统剪贴板。天气 UI 分支用确定性 fixture 测试，随后撤销拦截，另行从浏览器实连三城 API 验证 CORS 和实际返回值。截图带 fixture 的值只用于界面验收，实时值以 `*-weather-real.png` 为准。

首页没有引入本模块、天气请求或新的首屏字体。原开场动画、CSS 内联、32 张屏外图片延迟仍保留。现有与本任务无关的 `docs/deployment.md`、`docs/live-services.md` 未混入提交。

导航改版后使用 `work/lab-navigation/verify.mjs`，在 320 / 390 / 801 / 1024 / 1440px 验证三个子目录、两个下拉菜单互斥、键盘 Enter / Tab / Escape、页面内无刷新切换与历史、首页直达、手机菜单关闭与滚动恢复。摄影指南、AI 筛选及火烧云直达均通过。类型检查与生产构建通过，首页保留 32 张屏外图片延迟加载。
