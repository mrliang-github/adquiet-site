export interface ProjectItem {
  name: string
  category: string
  status: string
  description: string
  details?: string
  href: string
  external: boolean
  tags: string[]
  github?: string
  icon?: string
}

export const projects: ProjectItem[] = [
  {
    name: '听页',
    category: 'iOS 应用',
    status: '中国区 App Store',
    description: '导入自己的 EPUB、TXT 或文字型 PDF，在阅读和听书之间切换。',
    details: '需要自行导入有权使用的无 DRM 文件；不支持扫描或加密 PDF。文件与所选声音准备好后可离线使用。',
    href: 'https://apps.apple.com/cn/app/%E5%90%AC%E9%A1%B5-%E5%90%AC%E4%B9%A6%E4%B8%8E%E5%B0%8F%E8%AF%B4%E9%98%85%E8%AF%BB%E5%99%A8/id6794756257',
    external: true,
    tags: ['iOS', '阅读', '听书']
  },
  {
    name: 'Fluxio 视频压缩裁切',
    category: 'iOS 工具',
    status: '中国区 App Store',
    description: '在手机本地压缩视频、裁切片段，导出后方便保存和分享。',
    details: '保留原视频，支持批量处理；提供一次成功处理体验，后续功能需通过一次性购买解锁。',
    href: 'https://apps.apple.com/cn/app/fluxio%E8%A7%86%E9%A2%91%E5%8E%8B%E7%BC%A9%E8%A3%81%E5%88%87/id6749803323',
    external: true,
    tags: ['iOS', '视频压缩', '视频裁切']
  },
  {
    name: 'BodyMate',
    category: 'iOS 应用',
    status: '中国区 App Store',
    description: '记录体重、体脂和训练，查看一段时间里的变化。',
    details: '支持手动记录身体数据、训练计时与组数次数记录，用于个人记录和趋势查看。',
    href: 'https://apps.apple.com/cn/app/bodymate-%E8%BA%AB%E4%BD%93%E4%B8%8E%E8%AE%AD%E7%BB%83%E8%AE%B0%E5%BD%95/id6789944461',
    external: true,
    tags: ['iOS', '身体数据', '训练记录']
  },
  {
    name: 'HeatSleuth',
    category: 'macOS 应用',
    status: '测试版 · 直接下载',
    description: 'Mac 发热与重载诊断工具。看清是谁在占用 CPU/GPU/功耗，再决定要不要停。',
    details: '基于系统底层指标采集，直观展现能耗异常，不接外部云服务，轻量极速。',
    href: '/heatsleuth/',
    external: false,
    tags: ['macOS', 'Swift', '性能工具'],
    github: 'https://github.com/mrliang-github/HeatSleuth'
  },
  {
    // 产品名称：定位为快速搜索呼出 Mac 菜单栏工具的独立原生应用
    name: 'OtterBar',
    // 所属类别：macOS 原生桌面应用
    category: 'macOS 应用',
    // 公开测试版安装包已发布到 GitHub Releases。
    status: '测试版 · 直接下载',
    // 简明功能描述：直击菜单栏图标过多、被屏幕刘海遮挡的真实痛点
    description: '快速搜索并呼出 Mac 菜单栏工具。菜单栏太挤、被刘海挡住时，键盘一按随叫随到。',
    // 产品技术细节与特性亮点：基于原生辅助功能接口，纯本地离线扫描与快捷键定制
    details: '基于系统辅助功能，纯本地动态扫描正在运行的菜单栏应用，支持自定义全局快捷键与安全离线处理。',
    // 产品主页与发行元数据在构建时生成静态 HTML。
    href: '/otterbar/',
    // 是否为站外外部链接：false 表示为站内路由导航
    external: false,
    // 标签分类：用于搜索和分类过滤
    tags: ['macOS', 'Swift', '效率工具', '水獭'],
    github: 'https://github.com/mrliang-github/OtterBar'
  },
  {
    name: 'AdQuiet',
    category: 'Chrome 扩展',
    status: 'Chrome Web Store',
    description: '给 YouTube 桌面端观看页减少视频广告打断，专注内容观看。',
    details: '轻量 Manifest V3 架构，隐私友好，不读取不上传任何用户敏感信息。',
    href: '/adquiet/',
    external: false,
    tags: ['Chrome 扩展', '独立开发', '工具'],
    github: 'https://github.com/mrliang-github/youtube-ad-filter-extension'
  },
  {
    name: 'MD 排版',
    category: '在线工具',
    status: '公开可用',
    description: '把 Markdown 一键排成优雅现代、可直接复制到微信公众号编辑器的文章。',
    details: '内置代码高亮、现代化极简版式，专为独立开发者与内容创作者打造。',
    href: 'https://md.liangxiaoaitool.top/',
    external: true,
    tags: ['Web 工具', 'Markdown', '微信排版'],
    github: 'https://github.com/mrliang-github/md-paiban'
  },
  {
    name: '发票识别工作台',
    category: 'macOS 应用',
    status: '中国区 App Store',
    description: '在 Mac 本地识别中文发票，复核后导出 Excel。',
    details: '支持图片与 PDF 批量识别，关键字段需要人工复核；已有中国区 Mac App Store 入口，也提供开源仓库。',
    href: 'https://apps.apple.com/cn/app/%E5%8F%91%E7%A5%A8%E8%AF%86%E5%88%AB%E5%B7%A5%E4%BD%9C%E5%8F%B0/id6789881930',
    external: true,
    tags: ['开源', 'macOS', 'OCR', '财务工具'],
    github: 'https://github.com/mrliang-github/cn-vat-invoice-ocr'
  },
  {
    name: '良逍旅行规划',
    category: 'AI Skill / Agent',
    status: 'GitHub 开源',
    description: '面向 WorkBuddy 的旅行规划 Skill，自动生成个性化行程方案与结构化数据。',
    details: '打通提示词、工作流模具与手机行程页渲染，实践 AI 工作流产品化。',
    href: 'https://github.com/mrliang-github/liangxiao-travel',
    external: true,
    tags: ['AI Agent', 'WorkBuddy', '出海旅行'],
    github: 'https://github.com/mrliang-github/liangxiao-travel'
  },
  {
    name: 'PDF Snap',
    category: 'iOS 工具',
    status: '中国区 App Store',
    description: '在手机上合并、压缩、分割 PDF，也支持图片转 PDF。',
    href: 'https://apps.apple.com/cn/app/pdf-snap-%E5%8E%8B%E7%BC%A9-%E5%90%88%E5%B9%B6%E4%B8%8E%E5%88%86%E5%89%B2/id6743408614',
    external: true,
    tags: ['iOS', 'SwiftUI', 'PDF 工具']
  },
  {
    name: 'PhotoSpace',
    category: 'iOS 工具',
    status: '海外 App Store',
    description: '查看相册占用的空间，整理手机里的照片。当前通过海外 App Store 提供。',
    href: 'https://apps.apple.com/us/app/photospace-photo-cleaner/id6755833132',
    external: true,
    tags: ['iOS', '相册管理', '效率工具']
  },
  {
    name: 'Lasti',
    category: 'iOS 工具',
    status: '海外 App Store',
    description: '记住生活小事上次发生的时间，查看距今过了多久。当前通过海外 App Store 提供。',
    href: 'https://apps.apple.com/us/app/lasti-when-did-i-last/id6757007544',
    external: true,
    tags: ['iOS', '事件记录', '生活方式']
  }
]
