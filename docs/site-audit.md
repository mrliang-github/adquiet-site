# 良逍 AI 网站改造审计

原始审计：2026-09-20；合入前复核：2026-10-03。本文记录仓库与本次验证结果，线上状态单独核对。

## 已确认

- 仓库：`/Users/mrliang/Projects/web/adquiet-site`
- Git 远程：`https://github.com/mrliang-github/adquiet-site.git`
- 开发分支：`feat/bento-content-hub`，从当时的 `origin/main` 创建。
- 正式站点 URL：`https://liangxiaoaitool.top`，由 `scripts/site-data.mjs` 的 `site.url` 使用于 canonical、RSS 与 sitemap。
- 技术栈：Node ESM 静态构建，`marked` 和 `sanitize-html` 负责已发布文章的渲染与白名单清洗；没有 Next.js、Astro、数据库或 CMS。
- 包管理器：npm，锁文件为 `package-lock.json`。

## 现有能力与真实文件映射

| 领域 | 现状 | 实际文件 |
| --- | --- | --- |
| 首页、导航、页脚 | 静态 HTML 由构建脚本生成 | `scripts/build-bento-site.mjs`、`site-assets/personal.css` |
| 文章 | 公众号已发布 Markdown 同步到本仓库后构建为静态详情页 | `scripts/sync-published-content.mjs`、`content/writing/` |
| 工具 | 由受控数据清单生成，不再把内部账套工作台放进公开清单 | `scripts/site-data.mjs` |
| 日报与英语 | 本地 HTML 增量同步为快照，构建列表、详情与统一播放器；保留内容审批命令 | `content/public/`、`scripts/preview-fixtures.mjs`、`scripts/content-*.mjs` |
| 地球 | 首页按需加载的交互 SVG 地球 | `site-assets/globe.js`、构建输出的 `site-assets/world-110m.json` 与 vendor 文件 |
| 产品独立页 | AdQuiet、HeatSleuth、PDF Snap 等静态页面与资源独立存在 | `adquiet/`、`heatsleuth/`、`pdf-snap/` |

## 保留、修改与新增

- 保留：`/writing/`、文章详情、`/tools/`、`/building/`、`/about/`，以及 AdQuiet、HeatSleuth、PDF Snap 和既有重定向。
- 修改：公共导航、首页布局、个人内容页色彩与元数据；工具公开清单删除内部工作台入口。
- 新增：`/daily/`、`/english/`、Bento 首页、按需加载的 SVG 地球、英语点读、本地课程进度、运行时内容校验与站长发布命令。

## 内容与发布边界

- `content/public/` 只接受已发布、非预览内容，构建脚本只从这里读取正式内容。
- 合成样稿在 `scripts/preview-fixtures.mjs` 中，只会被显式 `--preview` 构建读入，全部带 `noindex, nofollow`，不会进入 RSS 或 sitemap。
- 草稿、审批、历史快照和私有预览默认保存到仓库外的 `~/.liangxiao-ai-content-private/`；构建脚本不会读取该位置。
- `scripts/content-admin.mjs` 支持 validate → import → preview → approve → publish / rollback。`preview` 会生成仅位于私有工作区的静态预览，`publish` 和 `rollback` 会先在私有临时目录完成候选静态构建，失败时不写入公开集合；`publish --dry-run` 始终不写入公开集合。命令写入的是待提交、待部署的公开源快照，不能代替仓库构建、部署和线上可访问验证；发布前校验当前 revision，重复发布相同 revision 不新增内容，同一期冲突会拒绝写入。
- 英语课程每个英文回合上限 600 字符，保留原课件 09-30 的 374 字符完整对白；中文仍有 360 字符上限。My Turn 固定为 1–2 道任务；每道任务都包含默认折叠的参考表达，可选补充说明。课程 revision 必须是当前内容计算出的 16 位哈希，CLI 的 `id` 和 `revision` 参数也会在访问私有路径前校验。
- 构建器使用受控清单记录它生成的日报与英语详情路由；撤稿或改 slug 后只会删除带有生成标记的旧详情页，不会触碰同目录的手工页面。
- 截至 2026-10-03，本地候选快照包含 18 期日报、20 节英语课和 8 篇已发布文章。新增 10 期日报（09-22 至 10-01）和 11 节英语（09-23 至 10-03）来自已有本地源 HTML；完整正文经清洗保存，不执行源脚本，不公开原帖、私域帖子链接或圈友昵称。没有执行站点部署。
- bodyHtml 经 HTML 白名单清洗后参与内容 revision；构建不再读取本机私有素材目录。正式完整课件与预览共用站内 speech-player.js，支持语速、中文开关、完成标记和继续练习；完整场景、表达用法、实用句型、参考答案与盲听保留。

## 构建与检查

```bash
npm run build
npm test
npm run build:preview
npm run sync:materials -- --dry-run
npm run preview
npm run content:help
```

`npm run build:preview` 的输出在仓库同级的 `../adquiet-site-preview/`，用于本地演示；预览构建必须显式指定仓库外输出目录，仓库内子目录和解析后指向仓库的符号链接都会被拒绝。正式构建不会把预览样稿作为公开内容。

## 本地素材同步

scripts/batch-import-materials.mjs 扫描约定的英语与日报 HTML 源目录，只补已有收录范围内缺失的期次，保留已收录内容、slug 和 revision。日期按 Asia/Shanghai 判断，未来日期不导入；两个栏目候选都通过校验才写快照。首次建立集合或补更早历史时显式使用 --since。--english-dir、--daily-dir 和 --public-dir 支持其他机器与隔离验证；dry-run 不写入。

npm run preview 会先同步、再构建、最后启动 8080 服务。它在启动时刷新，不是持续监听或每天调度；后续有新源文件时重新运行该入口。普通 npm run build 继续只读公开快照，部署环境不依赖本机素材目录。按个人约定，本机执行以上入口使用 workflow-runner。同步得到的是本地待审阅的候选公开快照，外部发布仍需授权。

当前日报源文件只找到至 2026-10-01，10-02、10-03 未补造。英语源文件与站点均到 2026-10-03。Codex 当前自动化配置没有这两个栏目的站点同步任务；本轮不修改 WorkBuddy 生成任务或新建调度。

## 部署与回滚

2026-10-03 通过 GitHub API 核实：GitHub Pages 使用 legacy 构建，从 main 的根目录发布，cname 为 null；推送 main 会触发 pages-build-deployment。Cloudflare 自定义域名的当前发布关联仍未核验。用户已授权合并，尚未明确授权发布，本轮先完成本地合并，推送 main 需另获发布授权。

## 合入前验证

- 34 项 Node 回归覆盖公开路由、预览隔离、内容审批、正文清洗、隔离正式构建、完整课程和已有产品资产。
- Ego 检查桌面与手机布局、真实英语点读、中文与语速设置、刷新后的完成和上一句记录、参考答案、盲听退出及列表继续练习；测试结束恢复原学习记录。
- 修复四行卡片仍使用八行固定高度造成的裁切，以及地球 SVG 继承 250px 最小高度的问题。
- 增量同步回归覆盖 dry-run、已有快照与链接保留、未来日期、重复同步不写入、坏源文件导致两个栏目均不落盘；脱敏覆盖跨期作者、普通词和数字边界。新增 11 节课程对白与原模板逐字段一致。
- 本轮 Ego 检查最新首页的 10-01 / 10-03 日期、桌面和手机无溢出与卡片裁切；10-01 日报显示 13 条案例、研判和主题表，原帖与私域帖子链接为零；10-03 课程含 12 轮对白、5 个表达，点读与语音控件已加载。
- 构建和临时验证服务通过 workflow-runner 执行，测试临时目录归入受管 scratch；最终截图保存在本任务永久证据目录。
