# 良逍 AI 网站改造审计

审计日期：2026-09-20。本文记录当前仓库的实际情况，不把开发预览或历史部署记录写成当前生产结论。

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
| 日报与英语 | 本次前没有栏目、数据模型、详情页、播放器或发布边界 | `content/public/`、`scripts/preview-fixtures.mjs`、`scripts/content-*.mjs` |
| 地球 | 本次前没有交互组件 | `site-assets/globe.js`、构建输出的 `site-assets/world-110m.json` 与 vendor 文件 |
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
- 英语课程的 My Turn 固定为 1–2 道任务；每道任务都包含默认折叠的参考表达，可选补充说明。课程 revision 必须是当前内容计算出的 16 位哈希，CLI 的 `id` 和 `revision` 参数也会在访问私有路径前校验。
- 构建器使用受控清单记录它生成的日报与英语详情路由；撤稿或改 slug 后只会删除带有生成标记的旧详情页，不会触碰同目录的手工页面。
- 本次没有运行生成模型、没有导入真实日报或英语素材、没有执行发布命令，也没有部署。

## 构建与检查

```bash
npm run build
npm test
npm run build:preview
npm run content:help
```

`npm run build:preview` 的输出在仓库同级的 `../adquiet-site-preview/`，用于本地演示；预览构建必须显式指定仓库外输出目录，仓库内子目录和解析后指向仓库的符号链接都会被拒绝。正式构建不会把预览样稿作为公开内容。

## 部署与回滚

本仓库没有可核验的当前部署配置文件。历史记录表明曾通过 Cloudflare Pages 的静态上传发布，但本次未验证该状态，也没有执行 Wrangler、推送或部署。生产发布前仍需重新确认项目、域名、部署目标和可回滚版本。
