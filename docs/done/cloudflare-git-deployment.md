# 个人站 Git 自动发布

2026-10-05。

## 问题与方案

现有 Cloudflare Pages 项目 adquiet-site 使用 Direct Upload，没有 Git 连接。
新版已经发布，但还需要让仓库成为后续发布来源。
Cloudflare 不支持将 Direct Upload 项目原地转换为 Git 集成，因此已新建连接
mrliang-github/adquiet-site 的 Pages 项目 liangxiaoai，正式域名为 liangxiaoai.dev。

## 构建与边界

- 正式分支 main，Node.js 22，构建命令 npm test && npm run build:pages，发布目录 dist。
- 构建只读取仓库中的已公开内容，不执行本机材料同步或加入预览内容。
- 独立输出包含产品页、安装包、静态资源及 Pages 的 headers/redirects，排除源码和私有内容目录。
- GitHub Actions 检查功能分支和 PR；Cloudflare 发布前也执行测试，失败时保留上一个成功版本。
- 保留旧 Direct Upload 项目以供回退；旧域名 301 与 VPN、图床子域名规则独立保留。

## 后续更新

- 修改源文件后推送功能分支，GitHub Actions 执行 Site checks。
- 检查通过并按授权合入、推送 main，Cloudflare 自动拉取该提交，检查并发布 dist。
- 在 Cloudflare 的 liangxiaoai 项目核对提交 SHA、部署状态和正式 URL。
- 需要回退时在该项目选择先前成功部署，不再用本机 ZIP 覆盖生产。
- 日报与英语材料仍需通过既有内容同步、审批流程写入仓库；Git 发布不等于自动生成或同步材料。

## 完成验证

功能分支和 main 的 GitHub 检查均通过，35/35 测试、正式目录构建成功。
Cloudflare 已从 main 的 7c0ad17 构建成功，部署为
c0a6370e-899e-45b0-8c08-e0ab9d78c1d8；88 项公开资源与已发布新版完全一致。
liangxiaoai.dev 与 www.liangxiaoai.dev 的绑定迁入新项目，CNAME 目标为
liangxiaoai.pages.dev。旧 .top 主域名继续在边缘执行 301，保留路径与查询参数。
当前本机 8080 受管预览占用 web 工作流，本轮使用远端 CI 验证，不改状态根、不终止该预览。

参考：[Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)、
[Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)。
