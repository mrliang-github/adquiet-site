# OtterBar 公开测试版下载

2026-10-10。用户授权将公证安装包发布到 GitHub Releases，并放到官网。

## 结果与范围

- 发行仓库：https://github.com/mrliang-github/OtterBar，仅提供安装包、说明与反馈，不发布本机应用源码历史。
- 发行版本：0.1.0（build 1），Apple Silicon，最低系统构建目标 macOS 13.0；本机启动验证为 macOS 26.6.2。
- 安装包：OtterBar-0.1.0-build-1.dmg，2,357,386 bytes；GitHub 公共发行资产已完成上传并发布。
- SHA-256：235f1e85607c3484e05165ba31ef11d8b0e84af193f2ee8f5f86b55179ca7abf。
- Apple 公证返回 Accepted；DMG 及内嵌 App 均通过票据、签名与 Gatekeeper 验证。

页面从 src/data/otterbar-release.json 生成版本、下载地址、体积、校验值与软件结构化数据，避免多处手动维护。原 public/otterbar/index.html 迁至 Astro 路由；应用截图与专属 CSS 由 Astro 导入并生成带内容指纹的资源地址。页面增加直接下载、安装说明、更新记录与问题反馈，工具列表状态改为可下载，首屏截图更新为当前工具面板。

## 验证与发布

功能提交 98866bd 的 GitHub Actions Site checks 与 Cloudflare Pages 均通过；远端实际执行 npm ci、npm test 与 npm run build:pages。预览为 https://3c89aa7b.liangxiaoai.pages.dev/otterbar/。

预览验收覆盖 1440px 桌面与 390px 手机宽度，无横向溢出、失效锚点或图片；FAQ 和校验栏可展开，版本、校验值与下载链接一致。正式发布沿现有 main → Cloudflare Pages Git 集成进行，最终生产提交和正式域名下载回读证据保存在应用仓库的发行记录中。

本机 web 工作流由既有预览任务 b8780bb9-94b9-4525-bad8-3dd3fb459694 持锁，本次本机构建返回 75，未启动、未产生本轮构建输出。保留原预览服务，未换状态根或端口，使用远端 CI 和 Pages 构建验收。

## 使用边界

当前安装包不支持 Intel Mac，未完成所有 macOS 版本的实机验证。首次使用需要授予辅助功能权限，本地开发签名的授权可能需要重新授予。应用需要运行并通过系统辅助功能接口暴露菜单栏入口；“应用已打开”不保证能被检测到。

下一版本更新时，先完成公证归档和公开发行资产，再更新发行元数据，沿相同检查和 Git 发布流程上线。

## 正式域名缓存修复

首次上线后，正式域名已返回新版 HTML，但浏览器仍使用同名 PNG / CSS 的四小时缓存：首屏显示早期控制中心列表，SHA-256 缺少换行样式，使 390px 手机的内容扩展到 653px。对应 Pages 独立部署和本地源文件已包含新内容，使用 no-cache 回读也可取得新资源。

将三张应用截图迁至 src/assets/otterbar，将专属样式迁至 src/styles/otterbar.css，通过 Astro 导入后为内容生成唯一地址；HTML 与社交预览引用构建后的图片地址。这样每次资源内容更新都使用新 URL，无需调整全站缓存规则或清理浏览器数据。上线验收应同时检查页面、真实资源内容及指定手机宽度，不能仅比较 scrollWidth 与已被内容撑大的 innerWidth。
