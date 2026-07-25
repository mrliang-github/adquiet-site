# 个人主页改造

## 背景

`liangxiaoaitool.top` 的根路径目前是 AdQuiet 的产品落地页，但站内已经有多个独立产品和工具。目标是把根路径改为良逍的个人主页，同时保持已有产品的固定入口不变。

当前 Cloudflare Pages 项目使用 ad-hoc 静态上传，不与 GitHub 分支自动联动，也没有构建命令或输出目录配置。因此本次不引入必须依赖托管后台构建的运行时；站点在仓库根目录生成可直接上传的静态文件。

## 用户与范围

- 访客应先理解：这是一个持续做产品、记录过程的个人站点。
- `writing/` 收录已发布的公众号文章；内容真值来自 Obsidian 的已发布稿。
- `building/` 呈现公开构建线索，并链接 X 主页；没有可核验的单条 X 链接时不伪造同步内容。
- `tools/` 集中列出对外产品、公开工具和开源项目；内部工作台不进入公开导航。
- `about/` 用可核验的个人介绍说明背景和联系方式。

不做：账户、评论、数据库、订阅、CMS、暗色模式、实时 X API 同步或营销数据采集。

## 信息架构

| 路径 | 用途 |
| --- | --- |
| `/` | 个人首页：身份、近期写作、正在构建、工具入口 |
| `/writing/` | 公众号文章索引 |
| `/writing/[slug]/` | 静态文章正文 |
| `/building/` | 公开构建时间线与 X 主页入口 |
| `/tools/` | 工具与产品目录 |
| `/about/` | 个人介绍与外部链接 |
| `/adquiet/` | 原有 Chrome 插件官网，保留 |
| `/heatsleuth/` | 原有 macOS App 官网，保留 |

旧的根级 AdQuiet 隐私和支持入口通过 Cloudflare Pages `_redirects` 指向 `/adquiet/` 下的正式入口。

## 视觉决策

- 中文优先、纸张色背景、深墨色正文、锈红与深蓝做少量强调。
- 使用系统中文字体栈，避免外部字体请求；日期和状态使用等宽字体栈。
- 采用编辑页的标题、分隔线、编号和不对称留白，不使用玻璃拟态、渐变 SaaS 英雄区或通用三栏卖点卡。
- 产品只展示真实名称、状态、截图或已核验链接；不补写效果和数据。

## 技术设计

1. `scripts/sync-published-content.mjs` 从本机 Obsidian 已发布目录导入选定文章，统一为仓库内的 Markdown 存档和前置元数据。它只处理明确列入清单的 8 篇文章。
2. `scripts/build-site.mjs` 读取仓库内存档，生成根首页、四个内容路由、文章页、RSS、sitemap 与 robots 文件。生成结果直接位于仓库根目录，因此可被当前 Cloudflare Pages 和 GitHub Pages 静态发布方式读取。
3. `sanitize-html` 在构建时清理文章 HTML；页面不加载远程脚本，不接受运行时 Markdown 或用户输入。
4. 保留 `adquiet/`、`heatsleuth/`、`assets/` 和下载包原样；仅把 AdQuiet 回到产品自身入口的导航链接改为 `/adquiet/`。

## 内容与真值边界

- 已发布微信公众号文章是文章日期、标题和正文的真值；发布日期以发布看板为准。
- 身份只使用“设计出身的产品经理、主业跨境电商 CMS/ERP、业余用 AI 做 iOS 和 Web 产品”等已给出的事实。
- X 仅链接 `https://x.com/lingxio71220285`，等拿到具体帖子 URL 后再添加精选同步卡片。
- 首页只精选当前最适合作为个人站入口的项目；完整公开项目保留在 `tools/`。
- 内部工作台不作为公开产品宣传，也不在个人站暴露登录入口。

## 文件边界

- `docs/plan/personal-homepage.md`
- `package.json`、`package-lock.json`
- `scripts/site-data.mjs`
- `scripts/sync-published-content.mjs`
- `scripts/build-site.mjs`
- `content/writing/*.md`
- `site-assets/personal.css`
- `index.html`、`writing/**`、`building/index.html`、`tools/index.html`、`about/index.html`
- `rss.xml`、`sitemap.xml`、`robots.txt`、`_redirects`
- `adquiet/index.html`
- `tests/site.test.mjs`

## 验证与发布

- 构建后检查生成路由、RSS、sitemap、canonical、文章数量和旧产品下载链接。
- 运行 Node 测试，验证文章构建产物不含可执行脚本或表单。
- 推送 `feat/personal-homepage` 到 GitHub；不合并或推送 `main`。
- 如果需要可视化预览，单独把生成后的静态文件以该分支名上传至 Cloudflare Pages；单纯 Git 推送不会触发预览。

## 完成记录

- 已实现静态首页、写作、在做、工具和关于五个个人站路由。
- 已导入并构建 8 篇已发布公众号文章，生成 RSS、sitemap、robots 与旧路由重定向。
- 已保留 AdQuiet、HeatSleuth 与 HeatSleuth 下载包，并把 AdQuiet 品牌导航固定回产品路径。
- 首页项目区与完整工具档案已拆分；内部账套工作台已从公开页面移除。
- 已执行内容同步、静态构建、脚本安全扫描与 Node 回归测试；发布状态见 Git 提交与 Cloudflare 预览记录。
