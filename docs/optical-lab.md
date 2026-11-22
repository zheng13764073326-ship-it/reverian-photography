# 光学实验室

入口 `/lab/` 与作品集平级，顶部导航为首页 / 作品集 / 光学实验室 / 关于我。光学实验室为与作品集同样的下拉菜单，包含摄影入门 / AI 影像 / 火烧云三个子目录；页面内不再显示胶囊切换栏。分享直达：`/lab/?tab=ai`、`/lab/?tab=sunset`；提示词分类例如 `?tab=ai&use=film`。

页面大标题及浏览器标题随当前子目录显示「摄影入门」「AI 影像」「火烧云」，直接进入查询链接、菜单切换和历史返回均同步更新。页内二级标题采用「入门指南」「提示词档案」「晚霞观测台」，避免与大标题重复。三个实验室子菜单统一以 Noto Serif SC / 中文宋体字体栈呈现中英文、字重 500，避免 AI 单独落到 Cormorant。全站不额外加载首屏字体；实验室复用现有本地 Noto 字库，其余页面沿用中文宋体回退。

三个栏目的导语独立存放于 `data/lab/introductions.json`：摄影入门介绍相机、镜头、焦距与曝光；AI 影像介绍修图提示词与保留原片故事；火烧云介绍未来三天云层、降水与朝晚霞观测。页面导语与浏览器内 description / og:description 随直达、切换和历史同步更新；静态默认页使用摄影入门导语。

## 数据与界面

- `apps/web/src/data/lab/guides.json`：4 篇结构化指南大纲。字段 `id, index, tag, title, summary, readTime, content`；content 为 `{heading, points: string[]}` 数组。标题、内容以文本渲染，不接受未处理 HTML。阅读抽屉支持 Escape、背景关闭、键盘焦点与关闭后返回卡片。
- `apps/web/src/data/lab/prompts.json`：6 个用途各一条示例提示词，字段 `id, index, category, title, style, src, prompt`。src 为空时不创建 img；填写压缩后的图片 URL 即显示 16:9、lazy/async 样片。复制完整 prompt，代码框可滚动 / 选择文字；Clipboard 成功后反馈 1.5 秒，权限拒绝时不显示虚假成功，提示手动复制并选中文字。
- `apps/web/src/data/lab/cities.json`：上海 / 南京 / 杭州固定坐标、英文名及明确标记的本地模拟云量数据。
- 页面 `pages/lab.astro`、样式 `styles/lab.css`、交互 `lib/optical-lab.ts`。顶部三个子目录在实验室页内支持无刷新切换、URL / 后退，在其他页面使用正常链接直达；菜单可用键盘 Enter / Tab / Escape 操作，当前子目录通过 aria-current 标记。手机选择后收起菜单并解除滚动 / inert 限制，焦点移到栏目标题；筛选使用 aria-pressed。
- 采用 #F4F3EE / #EAE8E0 / #222222 / #1E4D54 / #B86B35；Noto Serif SC Variable 与 JetBrains Mono 本地托管，只在实验室页面引入。按钮沿用全站 .95 按压与弹簧回弹，减少动态效果偏好生效。

## 追光观测台（2026-11-23 重设计）

参考 [Sunsetbot](https://www.sunsetbot.top/) 的地点 / 日出日落选择和分项判断，以及 [天文通官方界面](https://twtapp.com/) 的日期、小时矩阵与观测方位层次；界面保留本站米白、墨青、焦糖橙、衬线中文与等宽参数，没有复制外部图表或接入对方私有模型。

- 页面组件 `components/SunsetObservatory.astro`，独立样式 `styles/observatory.css`。原三张并排城市卡片已替换。保留上海 / 南京 / 杭州快捷选择，支持中国大陆城市搜索、今天 / 明天 / 后天、朝霞 / 晚霞、条件分、太阳方位、黄金 / 蓝调窗口、云层与逐小时趋势表。所有按钮沿用全站快门按压。
- `lib/lab-weather.ts` 管理选择、请求、缓存和渲染，仍只在打开火烧云时动态加载。`lib/observatory.ts` 负责三天数据校验、选定日出日落窗口、太阳位置、缓存及搜索解析，复用 `lib/sunset.ts` 的评分和 UTC+8 工具。旧单日解析函数仅保留兼容测试，新界面不再调用旧 fetchForecast / parseForecast。
- 一次仅请求当前地点的三天预报：`forecast_days=3`、`daily=sunrise,sunset`、`timezone=Asia/Shanghai`、`wind_speed_unit=ms`；小时变量为高 / 中 / 低云、降水概率、风速、气温和能见度。切换日期与朝晚霞复用同一响应，不重复请求。
- 高 / 中 / 低云、风速取所选事件前后 1 小时均值，降水概率取峰值；完整小时数组严格校验日期连续性、单位、null 和越界值。气温 / 能见度为可选字段，缺失时显示「—」，不按零计算。逐小时趋势覆盖事件附近约 7 小时，可点击时刻或用键盘激活查看明细。
- 浏览器内存 / localStorage 使用 `reverian-observatory-v2-纬度,经度` 缓存原始响应，最多 15 分钟，跨北京时间日期失效。刷新跳过缓存发起请求；失败时沿用有效缓存，否则明显显示「模拟示例 · 非预报」。示例不生成逐小时趋势、气温或能见度，日期按钮也不把示例分数当预报展示。
- 超时 10 秒；切换地点取消前一个请求并用序号隔离迟到结果，避免旧城市覆盖新城市。页面重新可见或跨午夜时检查更新。搜索接口超时 8 秒，失败保留常用城市入口，结果以 textContent 构造；搜索仅过滤 CN 且坐标在支持范围内，固定显示北京时间。
- [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) 返回城市名、行政区与坐标供选择，保留 GeoNames 来源署名。没有自动请求用户定位。
- SunCalc **2.1.4** 的方位角是正北为零、顺时针的度数。太阳方位使用 API 日出 / 日落时刻；模拟时刻和光影窗口由天文算法估算。新增 −4° 与 −8° 高度事件，黄金时刻采用 −4°～+6°、蓝调采用 −8°～−4°；晨昏顺序相反，支持各自的到达建议。时间窗是约定的摄影参考，不保证实际色彩。

## 指数模型

这是用于摄影条件参考的启发式模型，未经发生概率校准。高 / 中云各自 30%–75% 时云质因子为 1；低于 30% 时线性从 0 升到 1，高于 75% 时线性降到 100% 云量的 0。

`score = 35 × 高云质因子 + 30 × 中云质因子 + 25 × (1 - 低云/100) + 10 × (1 - 降水概率/100) - 0.2 × 降水概率`

低云 >60% 时总分再乘 0.35，最后四舍五入并限制 0–100。风速只展示，不参与评分。能见度与气温只作补充参考。页面注明未纳入远端云墙和 AOD 光路计算，分数不是火烧云发生概率，也不等同于 Sunsetbot 或天文通的鲜艳度 / 概率。

来源与维护参考：[Open-Meteo Forecast API](https://open-meteo.com/en/docs)、[数据许可](https://open-meteo.com/en/license)、[SunCalc](https://github.com/mourner/suncalc)。页面已显示 Open-Meteo / CC BY 4.0 署名及“指数由本站计算”。当前按个人非商业摄影站点的免费接口接入。

## 验证

完整测试 49 项通过。新增 `tests/observatory.test.ts` 验证三天六时段、冬夏太阳方位、黄金 / 蓝调顺序、跨年 / UTC+8 日期、缺失与异常气象字段、可选变量、缓存隔离 / 过期、取消 / 超时以及城市解析。旧指南、提示词及评分边界测试继续通过。

本机 `work/sunset-redesign/verify.mjs` 用确定性 fixture 验证 320 / 390 / 768 / 1024 / 1440px 布局、六时段、无额外请求、小时选择、缓存回退、10 秒超时模拟、刷新恢复、快速城市切换竞态、城市搜索成功 / 失败、仅进入火烧云后加载。fixture 图不代表实际预报。

`work/sunset-redesign/real.mjs` 无拦截实连浏览器 Open-Meteo / Geocoding：三城及搜索北京均获得有效预报、七个附近小时数据，无 CORS 或脚本异常；`real-data.json` 与 `real-*.png` 记录实际数据。正式发布后使用 --live 复核。

类型检查 66 文件无错；生产构建 17 页 / 1028 本地引用 / 616 WebP 通过。首页 CSS 仍为 56,337 字节，32 张屏外延迟图与开场动画保留，无新增首屏天气请求或图表依赖。旧 `work/optical-lab/`、`work/lab-navigation/` 脚本中基于三张天气卡片的断言已过时。

现有与本任务无关的 `docs/deployment.md`、`docs/live-services.md` 未混入提交。
