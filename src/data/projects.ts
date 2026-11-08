// 定义产品所属的平台分组类型：iOS/Watch、macOS 桌面、Web 与扩展
export type ProjectGroup = 'ios' | 'macos' | 'web'

// 定义单款产品的数据结构接口
export interface ProjectItem {
  // 产品展示名称
  name: string
  // 平台分组键，用于产品页分区与首页筛选胶囊
  group: ProjectGroup
  // 卡片左上角的细分品类短标签
  category: string
  // 卡片右上角的实际分发渠道或上架状态
  status: string
  // 一句话说明核心功能与本地处理边界
  description: string
  // 精准点明目标适用人群与高频使用瞬间（避免泛泛而谈）
  audience: string
  // 补充说明与使用前提条件
  details?: string
  // 点击主操作跳转的目标链接
  href: string
  // 是否为站外链接（站外链接自动附加新窗口安全属性）
  external: boolean
  // 检索与归类标签数组
  tags: string[]
  // 可选的开源仓库地址
  github?: string
  // 本地静态应用圆角图标路径（位于 public/icons/projects/）
  icon: string
  // 是否作为首页默认展示的精选代表作
  featured?: boolean
  // 可选的自定义主按钮文案
  ctaLabel?: string
}

// 定义首页与产品页共用的平台分组元数据
export const projectGroupDefinitions: { key: ProjectGroup; label: string; shortLabel: string }[] = [
  // iOS 与 Apple Watch 原生应用分组
  { key: 'ios', label: 'iOS 与 Apple Watch 应用', shortLabel: 'iOS · Watch' },
  // macOS 原生桌面应用分组
  { key: 'macos', label: 'macOS 桌面应用', shortLabel: 'macOS 桌面' },
  // 网页工具、浏览器扩展与 AI Skill 分组
  { key: 'web', label: '网页工具、扩展与 AI Skill', shortLabel: 'Web · 插件 · Skill' }
]

// 根据产品状态与内外链属性生成准确的行动按钮文案
export function getProjectCtaLabel(project: ProjectItem): string {
  // 优先使用单项自定义的按钮文案
  if (project.ctaLabel) return project.ctaLabel
  // 中国区 App Store / Mac App Store 已上架应用
  if (project.status === '中国区 App Store') return '查看商店页 ↗'
  // 海外商店应用
  if (project.status === '海外 App Store') return '查看海外商店 ↗'
  // 无需安装打开即用的在线工具
  if (project.status.startsWith('公开可用')) return '立即使用 ↗'
  // 纯开源分发项目
  if (project.status === 'GitHub 开源') return '查看开源仓库 ↗'
  // 站内自建产品主页或公证安装包下载页
  if (!project.external) return '产品主页与下载 →'
  // 兜底外部详情文案
  return '查看详情 ↗'
}

// 全站公开在架产品清单（仅收录已上架中国区商店或具备公开可用入口的成品）
export const projects: ProjectItem[] = [
  // ── iOS 与 Apple Watch 应用（8 款，前 6 款按指定顺序作为首页「精选代表作」默认展示） ──
  {
    name: '快量房',
    group: 'ios',
    category: 'iOS 工具',
    status: '中国区 App Store',
    description: '用支持激光雷达的 iPhone 扫描房间生成 2D/3D 户型图，核对实测尺寸并导出 PDF 报告。',
    audience: '自装看房业主、室内设计师与房产经纪现场量房复尺',
    details: '扫描估算值与卷尺实测值分开保留，支持为墙面、门窗与管线位置添加现场照片和备注。',
    href: 'https://apps.apple.com/cn/app/%E5%BF%AB%E9%87%8F%E6%88%BF-%E6%88%BF%E9%97%B4%E6%B5%8B%E9%87%8F%E4%B8%8E3d%E6%88%B7%E5%9E%8B%E5%9B%BE/id6823888335',
    external: true,
    icon: '/icons/projects/kuailiangfang.webp',
    // 首页精选代表作 1/6
    featured: true,
    tags: ['iOS', 'LiDAR', '3D 户型图', '量房']
  },
  {
    name: '听页',
    group: 'ios',
    category: 'iOS 应用',
    status: '中国区 App Store',
    description: '导入自己的 EPUB、TXT 或文字型 PDF，方便时看屏幕阅读，通勤做家务时接着听。',
    audience: '自存电子书与长文档、想在通勤或运动时听完的人',
    details: '需要自行导入有权使用的无 DRM 文件；不支持扫描或加密 PDF。文件与所选声音准备好后可离线使用。',
    href: 'https://apps.apple.com/cn/app/%E5%90%AC%E9%A1%B5-%E5%90%AC%E4%B9%A6%E4%B8%8E%E5%B0%8F%E8%AF%B4%E9%98%85%E8%AF%BB%E5%99%A8/id6794756257',
    external: true,
    icon: '/icons/projects/tingye.webp',
    // 首页精选代表作 2/6
    featured: true,
    tags: ['iOS', '阅读', '听书']
  },
  {
    name: '录一下',
    group: 'ios',
    category: 'iOS · Watch',
    status: '中国区 App Store',
    description: '抬腕用 Apple Watch 录音，传回配对 iPhone 本地离线转写中英文，点时间戳回听并导出。',
    audience: '开会访谈、课堂速记、走路闪念不方便掏手机的人',
    details: '首次使用下载语言资源后可离线转写，录音和正文不上传转写服务器；支持导出 TXT、Markdown 与原始音频。',
    href: 'https://apps.apple.com/cn/app/%E5%BD%95%E4%B8%80%E4%B8%8B-%E6%89%8B%E8%A1%A8%E5%BD%95%E9%9F%B3%E7%AC%94-%E5%BD%95%E9%9F%B3%E8%BD%AC%E6%96%87%E5%AD%97/id6826630601',
    external: true,
    icon: '/icons/projects/luyixia.webp',
    // 首页精选代表作 3/6
    featured: true,
    tags: ['Apple Watch', 'iOS', '离线转写', '录音笔']
  },
  {
    name: 'PhotoSpace',
    group: 'ios',
    category: 'iOS 工具',
    status: '中国区 App Store',
    description: '在手机本地对比相似连拍照、集中筛查截图与大体积视频，按年月清理和整理相册空间。',
    audience: '手机存储空间吃紧、相册攒满截图与连拍照的 iPhone 用户',
    href: 'https://apps.apple.com/cn/app/photospace-%E7%9B%B8%E5%86%8C%E6%B8%85%E7%90%86%E4%B8%8E%E6%95%B4%E7%90%86/id6755833132',
    external: true,
    icon: '/icons/projects/photospace.webp',
    // 首页精选代表作 4/6
    featured: true,
    tags: ['iOS', '相册清理', '拼图压缩']
  },
  {
    name: '上次 Lasti',
    group: 'ios',
    category: 'iOS 工具',
    status: '中国区 App Store',
    description: '记下理发、换床单、换滤芯等低频小事上次发生的时间，通过小组件随时看距今过了多少天。',
    audience: '总记不清换床单、净水器换芯或宠物驱虫过了多久的人',
    href: 'https://apps.apple.com/cn/app/%E4%B8%8A%E6%AC%A1-lasti/id6757007544',
    external: true,
    icon: '/icons/projects/lasti.webp',
    // 首页精选代表作 5/6
    featured: true,
    tags: ['iOS', '小组件', '生活记录']
  },
  {
    name: 'PDF Snap',
    group: 'ios',
    category: 'iOS 工具',
    status: '中国区 App Store',
    description: '在手机本地离线合并、压缩、分割 PDF，也支持把照片与扫描图片快速转成 PDF。',
    audience: '不愿把合同、简历或证件上传云端处理的职场人与学生',
    href: 'https://apps.apple.com/cn/app/pdf-snap-%E5%8E%8B%E7%BC%A9-%E5%90%88%E5%B9%B6%E4%B8%8E%E5%88%86%E5%89%B2/id6743408614',
    external: true,
    icon: '/icons/projects/pdf-snap.webp',
    // 首页精选代表作 6/6
    featured: true,
    tags: ['iOS', 'SwiftUI', 'PDF 工具']
  },
  {
    name: 'Fluxio 视频压缩裁切',
    group: 'ios',
    category: 'iOS 工具',
    status: '中国区 App Store',
    description: '在手机本地批量压缩视频体积、裁切片段，保留原视频不覆盖，导出后方便保存和分享。',
    audience: '常拍高清大视频发聊天受限的创作者与手机用户',
    details: '支持批量处理；提供一次成功处理体验，后续功能需通过一次性购买解锁。',
    href: 'https://apps.apple.com/cn/app/fluxio%E8%A7%86%E9%A2%91%E5%8E%8B%E7%BC%A9%E8%A3%81%E5%88%87/id6749803323',
    external: true,
    icon: '/icons/projects/fluxio-video.webp',
    tags: ['iOS', '视频压缩', '视频裁切']
  },
  {
    name: 'BodyMate',
    group: 'ios',
    category: 'iOS 应用',
    status: '中国区 App Store',
    description: '把体重、体脂和训练组数记录放在一起，离线清爽查看一段时间里的身体变化趋势。',
    audience: '不想被社交广告打扰、只想纯粹记体重与训练数据的健身者',
    details: '支持手动记录身体数据、训练计时与组数次数记录，用于个人记录和趋势查看。',
    href: 'https://apps.apple.com/cn/app/bodymate-%E8%BA%AB%E4%BD%93%E4%B8%8E%E8%AE%AD%E7%BB%83%E8%AE%B0%E5%BD%95/id6789944461',
    external: true,
    icon: '/icons/projects/bodymate.webp',
    tags: ['iOS', '身体数据', '训练记录']
  },

  // ── macOS 桌面应用（3 款，通过首页「macOS 桌面」筛选胶囊或产品页查看） ──
  {
    name: '发票识别工作台',
    group: 'macos',
    category: 'macOS 应用',
    status: '中国区 App Store',
    description: '在 Mac 本地批量识别中文进项发票，人工复核关键字段后一键导出 Excel 报销明细。',
    audience: '每月要整理报销票据的自由职业者、独立开发者与小团队行政',
    details: '支持图片与 PDF 批量识别，关键字段需要人工复核；已有中国区 Mac App Store 入口，也提供开源仓库。',
    href: 'https://apps.apple.com/cn/app/%E5%8F%91%E7%A5%A8%E8%AF%86%E5%88%AB%E5%B7%A5%E4%BD%9C%E5%8F%B0/id6789881930',
    external: true,
    icon: '/icons/projects/invoice-workbench.webp',
    tags: ['开源', 'macOS', 'OCR', '财务工具'],
    github: 'https://github.com/mrliang-github/cn-vat-invoice-ocr'
  },
  {
    // 补充中文名称「水獭菜单栏」，避免纯英文名在中文卡片流里难以一眼认出用途
    name: 'OtterBar · 水獭菜单栏',
    group: 'macos',
    category: 'macOS 应用',
    status: '公开测试 · 可下载',
    description: '按下快捷键快速搜索并打开被 MacBook 刘海遮挡的菜单栏工具，全程在本机离线响应。',
    audience: '菜单栏装满效率工具、图标常被刘海挡住的 Mac 重度用户',
    details: '基于系统辅助功能动态扫描支持的应用入口，支持自定义全局快捷键（Apple Silicon · macOS 13+）。',
    href: '/otterbar/',
    external: false,
    icon: '/icons/projects/otterbar.webp',
    tags: ['macOS', 'Swift', '效率工具'],
    github: 'https://github.com/mrliang-github/OtterBar'
  },
  {
    // 补充中文名称「发热排查」，方便中文访客直观理解机身热量诊断用途
    name: 'HeatSleuth · 发热排查',
    group: 'macos',
    category: 'macOS 应用',
    status: '公开测试 · 可下载',
    description: '查看 Mac 的 CPU、GPU 与高负载异常进程，帮助排查机身发热、风扇狂转和掉电快的原因。',
    audience: '常开多编辑器与浏览器、想快速揪出耗电元凶的 Mac 用户',
    details: '基于系统底层指标采集，不接外部云服务，提供公证安装包下载。',
    href: '/heatsleuth/zh/',
    external: false,
    icon: '/icons/projects/heatsleuth.webp',
    tags: ['macOS', 'Swift', '性能诊断']
  },

  // ── 网页工具、扩展与开源项目（5 款） ──
  {
    name: 'MD 排版',
    group: 'web',
    category: 'Web 工具',
    status: '公开可用',
    description: '把 Markdown 一键排成可直接复制到微信公众号编辑器的文章，内置代码高亮与简洁版式。',
    audience: '习惯用 Markdown / Obsidian 写稿的公众号技术与效率创作者',
    href: 'https://md.liangxiaoaitool.top/',
    external: true,
    icon: '/icons/projects/md-editor.webp',
    tags: ['Web 工具', 'Markdown', '公众号排版']
  },
  {
    name: 'SlideBeaver',
    group: 'web',
    category: 'Web 工具',
    status: '公开可用 · 英文界面',
    description: '把 HTML 幻灯片转换成 PowerPoint（.pptx）文件，方便继续调整文字和基础图形。',
    audience: '常用 AI 生成 HTML 演示稿、但最终需交付 PPT 的职场人',
    href: 'https://www.html-to-pptx.com/',
    external: true,
    icon: '/icons/projects/slidebeaver.webp',
    tags: ['Web 工具', 'HTML 转 PPTX', '办公效率']
  },
  {
    name: 'FileOtter',
    group: 'web',
    category: 'Web 工具',
    status: '公开可用 · 英文界面',
    description: '在浏览器本地压缩和转换图片、PDF 与视频文件，无需注册账号，文件不上传服务器。',
    audience: '在电脑端临时压文件改格式、不想装软件也不想注册账号的人',
    href: 'https://fileotter.org/',
    external: true,
    icon: '/icons/projects/fileotter.webp',
    tags: ['Web 工具', '文件压缩', '格式转换']
  },
  {
    name: 'AdQuiet',
    group: 'web',
    category: 'Chrome 扩展',
    status: 'Chrome Web Store',
    description: '给 YouTube 桌面端观看页减少视频广告打断，保持清爽专注的观看与学习节奏。',
    audience: '常在电脑端看 YouTube 长视频教程、访谈与播客的学习者',
    details: '轻量 Manifest V3 架构，不读取不上传用户浏览隐私数据。',
    href: '/adquiet/',
    external: false,
    icon: '/icons/projects/adquiet.webp',
    tags: ['Chrome 扩展', 'Manifest V3']
  },
  {
    // 苹果独立开发全流程 5 合 1 Skill 套件（站内展示 + 脱敏安装包下载 + 公众号实战承接）
    name: 'Apple 上架与出图套件',
    group: 'web',
    category: 'AI Skill',
    status: '站内打包分享',
    description: '打包原生 UI 审查、App Store 套图策划生成与送审合规预检 5 个自用 Skill，减少截图返工与拒审踩坑。',
    audience: '正在用 Claude Code / Codex 开发并上架 iOS 或 Mac 独立应用的开发者',
    href: '/skills/apple-app-suite/',
    external: false,
    icon: '/icons/projects/apple-app-suite.svg',
    ctaLabel: '查看套件与下载 →',
    tags: ['AI Skill', 'App Store', '上架出图']
  },
  {
    // 麦当劳配餐控热量与核价小票 Skill（含免账号在线滑杆演示页）
    name: '麦麦搭餐',
    group: 'web',
    category: 'AI Skill',
    status: '含在线演示 · 可下载',
    description: '按预算上限、必留餐品与热量控制目标自动核价配餐，并输出适合手机查看和分享的小票网页。',
    audience: '点餐想顺手控热量算差价的人，或想学习 MCP 取数 + 本地脚本核验的 AI 编程学习者',
    href: '/skills/mcd-meal-buddy/',
    external: false,
    icon: '/icons/projects/mcd-meal-buddy.svg',
    ctaLabel: '试玩演示与下载 →',
    tags: ['AI Skill', '热量控制', 'MCP 实战']
  },
  {
    // 旅行规划 Skill（升级为站内详情页 + 川西真实行程网页在线预览 + GitHub 仓库）
    name: '松鼠旅行官 · 良逍旅行规划',
    group: 'web',
    category: 'AI Skill',
    status: 'GitHub 开源 · 含演示',
    description: '面向 AI 助手的旅行规划 Skill，生成结构化攻略、两档预算与手机离线可勾选待办的行程网页。',
    audience: '喜欢用 AI 做自由行攻略、想导出一份清爽手机行程单的人',
    href: '/skills/liangxiao-travel/',
    external: false,
    icon: '/icons/projects/liangxiao-travel.svg',
    ctaLabel: '行程示例与下载 →',
    tags: ['AI Skill', '开源', '旅行规划'],
    github: 'https://github.com/mrliang-github/liangxiao-travel'
  }
]
