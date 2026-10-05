# 个人站 Git 自动发布

2026-10-05。

## 问题与方案

现有 Cloudflare Pages 项目 adquiet-site 使用 Direct Upload，没有 Git 连接。
新版已经发布，但还需要让仓库成为后续发布来源。
Cloudflare 不支持将 Direct Upload 项目原地转换为 Git 集成，因此新建连接
mrliang-github/adquiet-site 的 Pages 项目 liangxiaoai，验证后迁入正式域名。

## 构建与边界

- 正式分支 main，Node.js 22，构建命令 npm test && npm run build:pages，发布目录 dist。
- 构建只读取仓库中的已公开内容，不执行本机材料同步或加入预览内容。
- 独立输出包含产品页、安装包、静态资源及 Pages 的 headers/redirects，排除源码和私有内容目录。
- GitHub Actions 检查功能分支和 PR；Cloudflare 发布前也执行测试，失败时保留上一个成功版本。
- 保留旧 Direct Upload 项目以供回退；旧域名 301 与 VPN、图床子域名规则独立保留。

## 验证

先推送功能分支运行 GitHub 检查，通过后合入并推送 main。
Cloudflare Git 构建成功并核对线上资源后再迁移自定义域名。
当前本机 8080 受管预览占用 web 工作流，本轮使用远端 CI 验证，不改状态根、不终止该预览。
