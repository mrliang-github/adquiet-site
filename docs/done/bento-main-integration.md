# 网站规划合入 main

日期：2026-10-03。

## 问题与范围

合入已有 feat/bento-content-hub 的首页、日报、英语和内容审批流程。当前 OtterBar 产品页分支叠加在其上，本轮保留那两笔独立提交。

保留后续迭代确认的首页布局和内容页样式。修复正式构建读取仓库外私有 HTML、正式英语课件跳过统一进度播放器的问题，不新增账户、数据库或依赖。

## 主要设计

- 已公开的完整日报和课件正文保存为 content/public 集合的可选 bodyHtml，执行 HTML 白名单清洗并计入审批 revision。
- 构建只读取仓库内公开快照；保留原课件的场景、表达用法、实用句型、参考答案和盲听入口。
- 正式课程与预览共用 speech-player.js，支持点读、停止、语速、中文开关、完成记录和继续练习。
- 旧版 HTML 导入对白只解析数据字面量，拒绝执行源文件表达式。
- 不把原帖、私域链接或圈友昵称带入公开正文。
- 首页四行网格随内容确定行高，修复遗留八行固定高度裁切卡片的问题。

## 文件边界

scripts/content-html.mjs、content-schema.mjs、build-bento-site.mjs、batch-import-materials.mjs、dialogue-literal.mjs、import-published-bodies.mjs，content/public 两个集合，site-assets/speech-player.js 与 personal.css，tests/content-html.test.mjs 与 site.test.mjs，受影响的生成页面和审计记录。

## 验证与交付

通过 workflow-runner 执行构建和回归，临时目录使用受管 scratch。用 Ego 检查桌面、手机首页、真实日报与英语课程、点读控制和刷新后的学习记录。核对最终 diff、分支范围和受管清理结果，再本地合入 main。

GitHub Pages 从 main 根目录自动构建。用户授权合并，但未明确授权发布，因此推送 main 前需要发布授权；本地合并和远端发布分别报告。

## 完成记录

已保存 8 期日报、9 节英语课的完整正文，统一正式和预览播放器，修复首页与地球裁切。30 项回归通过；真实点读、刷新后进度、中文、语速、参考答案和盲听已在 Ego 验证。保留 OtterBar 独立分支。本轮不进行远端生产发布。
