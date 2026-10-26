# 关于页与国内产品展示核对（内部）

核对日期：2026-10-26；产品展示更新于 2026-10-27。本文是给网站负责人的选品与编辑记录，不作为页面正文。

## 本次调整

用户要求自我介绍只说“做产品”，将误写的 LIT 更正为 Lasti，并查看还有哪些产品适合面向国内读者介绍。

- 关于页使用“我是良逍，学的是设计，做的是产品”。
- 首页、关于页、产品数据中的 LIT 统一改成 Lasti，介绍改为记录事件上次发生的时间。
- Lasti、PhotoSpace 标注“海外 App Store”，链接到实际商店页。
- “Mac 发票 OCR”使用已上架名称“发票识别工作台”，增加中国区 Mac App Store 入口，产品列表保留开源仓库链接。
- PDF Snap 使用中国区 App Store 下载入口，功能介绍改成合并、压缩、分割与图片转 PDF。
- 关于页加入听页和 Fluxio，保留八款代表作，顺序为听页、Fluxio、PDF Snap、发票识别工作台、MD 排版、HeatSleuth、OtterBar、Lasti；HeatSleuth 指向中文产品页。
- 完整产品页加入听页、Fluxio 和 BodyMate，首页通过已有产品数据展示这三款。PhotoSpace 和 AdQuiet 继续保留在完整产品页，关于页增加全部产品入口。

## 证据范围

核对了项目现有文件、公开产品主页，以及 Apple 官方 [中国区开发者产品查询](https://itunes.apple.com/lookup?id=1799607125&entity=software&country=cn&limit=200) 和 [美国区查询](https://itunes.apple.com/lookup?id=1799607125&entity=software&country=us&limit=200)。另按 app ID 查询两地区记录。

本次中国区返回 PDF Snap、听页、Fluxio 视频压缩裁切、BodyMate、发票识别工作台五款。商店记录可以支持“已有中国区上架入口”；没有进行中国区账号实际购买、安装或国内无代理网络下的完整功能验证。商店状态会变化，以阅读时页面为准。这里的推荐是面向读者与分发条件的判断，不是法规或备案审查。

## 优先补充的三款应用

| 产品与入口 | 建议展示文字 | 判断与边界 |
| --- | --- | --- |
| [听页：听书与小说阅读器](https://apps.apple.com/cn/app/%E5%90%AC%E9%A1%B5-%E5%90%AC%E4%B9%A6%E4%B8%8E%E5%B0%8F%E8%AF%B4%E9%98%85%E8%AF%BB%E5%99%A8/id6794756257) | 导入自己的 EPUB、TXT 或文字型 PDF，方便时阅读，不方便看屏幕时接着听。 | 中国区已有 1.1；中文名称清楚，阅读和听书场景容易解释。需要用户自备有权使用的无 DRM 文件；扫描和加密 PDF 不支持。文件与系统声音下载后可离线使用。公开英文名为 SoundPage，不用旧项目名 LeafVox。 |
| [Fluxio 视频压缩裁切](https://apps.apple.com/cn/app/fluxio%E8%A7%86%E9%A2%91%E5%8E%8B%E7%BC%A9%E8%A3%81%E5%88%87/id6749803323) | 在手机本地压缩视频、裁切片段，导出后方便保存和分享。 | 中国区已有 1.16；普通手机用户与内容创作者都能理解用途。有一次成功处理体验，后续功能需购买解锁；不能写成永久免费或保证压缩比例。不要与另一款 Fluxio Compress 混淆。 |
| [BodyMate：身体与训练记录](https://apps.apple.com/cn/app/bodymate-%E8%BA%AB%E4%BD%93%E4%B8%8E%E8%AE%AD%E7%BB%83%E8%AE%B0%E5%BD%95/id6789944461) | 把体重、体脂和训练记录放在一起，查看一段时间里的变化。 | 中国区已有 1.0；按当前商店描述介绍个人记录与趋势，不承诺减脂效果，不把本地尚未发布的硬件适配写成已上线功能。 |

已按上述安排更新：关于页优先展示听页与 Fluxio，BodyMate 放在完整产品页；三款均提供中国区 App Store 入口。

## 已有产品中的国内入口

| 产品 | 判断 |
| --- | --- |
| [发票识别工作台](https://apps.apple.com/cn/app/%E5%8F%91%E7%A5%A8%E8%AF%86%E5%88%AB%E5%B7%A5%E4%BD%9C%E5%8F%B0/id6789881930) | 中国区 Mac App Store 已有 1.0。中文进项发票批量识别、人工复核和 Excel 导出适合具体办公场景；保留复核要求，不宣传为发票真伪查验或自动记账系统。 |
| [PDF Snap](https://apps.apple.com/cn/app/pdf-snap-%E5%8E%8B%E7%BC%A9-%E5%90%88%E5%B9%B6%E4%B8%8E%E5%88%86%E5%89%B2/id6743408614) | 中国区已有 1.6.3，可继续展示手机本地 PDF 处理用途。 |
| [MD 排版](https://md.liangxiaoaitool.top/) | 中文公众号排版工具，读者与场景直接相关；本次确认主页 HTTP 200，未重新完成编辑与复制流程验证。 |
| [HeatSleuth](https://liangxiaoai.dev/heatsleuth/zh/) | 有中文产品页和经过签名、公证的 Mac 安装包，适合 Mac 用户。支持条件与具体指标限制以产品页为准。 |
| [OtterBar](https://liangxiaoai.dev/otterbar/) | 已有公开测试版，可面向 Mac 用户介绍菜单栏搜索。当前要求 Apple Silicon 与 macOS 13+；只能操作支持的入口，不是通用图标重排或隐藏工具。GitHub 下载在国内的网络表现待实际验证。 |

## 网页产品候选

| 产品 | 建议展示文字 | 推广前最值得补的一步 |
| --- | --- | --- |
| [SlideBeaver](https://www.html-to-pptx.com/) | 把 HTML 幻灯片转换成 PowerPoint 文件，继续调整文字和基础图形。 | 适合网站现有 AI 编程、办公读者。官网目前是英文；可补中文使用说明，并用实际 HTML 样例走一遍国内网络下的导入与导出。部分元素会转成图片，动画、脚本和字体嵌入不能按完整可编辑保留宣传。 |
| [FileOtter](https://fileotter.org/) | 在浏览器里处理 PDF、图片和视频文件，不用注册账号。 | 当前公开站点提供本地浏览器工具，免费、无需账号；英文界面。先选一两个明确场景写中文教程，并验证国内网络下资源加载与实际文件处理。不要沿用旧仓库名称 ToolKit。 |
| [DoubleClickTest](https://doubleclicktest.xyz/) | 检查鼠标是否出现连击，查看按键和滚轮响应。 | 功能单一，适合有明确鼠标问题的读者，优先级低于前两项；不需要放进关于页主要代表作。 |

本机能打开网页不等于所有国内网络都可稳定使用。上述网页候选没有完成国内无代理网络的功能复测。

## 暂不作为普通国内用户下载主推

- [Lasti](https://apps.apple.com/us/app/lasti-when-did-i-last/id6757007544) 和 [PhotoSpace](https://apps.apple.com/us/app/photospace-photo-cleaner/id6755833132)：美国区记录存在，中国区按 ID 查询未返回；对应中国区页面当次请求为 404。可作为作品展示，但注明海外商店，不以中国区可下载介绍。Lasti 当前美国区为 2.0.2，PhotoSpace 为 1.3.13。
- RoomMark、Fluxio Compress：本次中国区查询未返回，不据此推断所有产品缺失原因相同。
- Network Doctor、CoinLens 等：本次未确认中国区入口，且当前英文内容为主，优先级低于已有中文产品。
- 录一下 / VoxPocket：本地发布记录仍是审核阶段，本次未找到可确认的公开上架入口；待商店实际可用后再更新。
- FormCamera：查到的是本地开发与预览材料，本次未确认公开下载入口。
- [IELTS Writing Check](https://mywritingchecker.com/)：公开产品已存在，但 Google 登录和现有支付方式对普通国内用户增加了使用门槛，暂不列为这轮国内宣传首选。

## 交付与验证

本次沿用同一关于页任务分支 `fix/about-natural-copy`。已有首页 Hero 与全局样式改动保留，未纳入本次提交；首页通过已有产品数据读取新增项目。状态为 `merge-ready`，未推送、合并或部署。

- `npm test` / `astro check`：147 个文件，0 errors、0 warnings、3 hints。
- 2026-10-27 完整静态构建成功：86 页、49 项图片处理完成，没有调整依赖、旧文章或构建配置。
- Ego 对本轮完整构建产物复核：关于页桌面与手机截图均已阅读；关于页、产品页和首页在 390px 下都无横向溢出，新增介绍未被截断，名称、用途、地区与跳转地址已核对。
- 关于页的“产品页”链接在桌面点击后正常打开完整产品页。手机自动点击首次误触 Lasti 卡片，随后重新观察页面并在桌面完成该链接检查；不将这次误触记作手机点击验证成功。
- 关于页保留八张卡片；产品页与首页均显示听页、Fluxio 与 BodyMate。预览使用当前工作目录，包含保留的既有样式改动，不是真机验证。
- 初轮完整构建曾在两张旧文章远程图片处报错，独立 Node 请求也出现过 `ETIMEDOUT`。本轮两张图片分别返回 HTTP 200，未改变图片或网络配置即可完成整站构建。这与临时网络请求失败的判断一致，但不保证外部图片服务后续不会波动。
- 预览服务与 Ego 任务空间 21 已结束。Runner `7c830fa4-4bd2-4864-b62e-e2fd230f061f` 返回 0，`scratch_removed=true`、`cleanup_verified=true`，scratch 为 0 字节。临时依赖与本任务的 `node_modules` 链接均已回收；既有 `.astro/` 不在 Runner 清理覆盖范围，保留。

详细证据与干净正文保存在本次聊天的永久素材目录：`about-review-v3.md`、`about-copy-v3.md`、`about-desktop-v3.png`、`about-mobile-v3.png`、`projects-mobile-v3.png` 与 `about-browser-check-v3.json`。前两轮材料保留作历史记录，不是当前页面版本。
