export type ProjectGroup = 'ios' | 'macos' | 'web'

export interface ProjectItem {
  name: string
  group: ProjectGroup
  category: string
  status: string
  description: string
  details?: string
  href: string
  external: boolean
  tags: string[]
  github?: string
  icon?: string
  ctaLabel?: string
}

export function getProjectCtaLabel(project: ProjectItem): string {
  if (project.ctaLabel) return project.ctaLabel
  if (project.status === '中国区 App Store') return '查看中国区商店 ↗'
  if (project.status === '海外 App Store') return '查看海外商店 ↗'
  if (project.status.startsWith('公开可用')) return '立即使用 ↗'
  if (project.status === 'GitHub 开源') return '查看开源仓库 ↗'
  if (!project.external) return '产品主页 →'
  return '查看详情 ↗'
}

export const projects: ProjectItem[] = [
  // ── iOS 与 Apple Watch 应用 ──
  {
    name: '录一下',
    group: 'ios',
    category: 'iOS · Watch',
    status: '中国区 App Store',
    description: '抬腕用 Apple Watch 录音，传回配对 iPhone 本地离线转写中英文，点时间戳回听并导出。',
    details: '首次使用下载语言资源后可离线转写，录音和正文不上传转写服务器；支持导出 TXT、Markdown 与原始音频。',
    href: 'https://apps.apple.com/cn/app/%E5%BD%95%E4%B8%80%E4%B8%8B-%E6%89%8B%E8%A1%A8%E5%BD%95%E9%9F%B3%E7%AC%94-%E5%BD%95%E9%9F%B3%E8%BD%AC%E6%96%87%E5%AD%97/id6826630601',
    external: true,
    tags: ['Apple Watch', 'iOS', '离线转写', '录音笔']
  },
  {
    name: '听页',
    group: 'ios',
    category: 'iOS 应用',
    status: '中国区 App Store',
    description: '导入自己的 EPUB、TXT 或文字型 PDF，方便时阅读，不方便看屏幕时接着听。',
    details: '需要自行导入有权使用的无 DRM 文件；不支持扫描或加密 PDF。文件与所选声音准备好后可离线使用。',
    href: 'https://apps.apple.com/cn/app/%E5%90%AC%E9%A1%B5-%E5%90%AC%E4%B9%A6%E4%B8%8E%E5%B0%8F%E8%AF%B4%E9%98%85%E8%AF%BB%E5%99%A8/id6794756257',
    external: true,
    tags: ['iOS', '阅读', '听书']
  },
  {
    name: '快量房',
    group: 'ios',
    category: 'iOS 工具',
    status: '中国区 App Store',
    description: '用支持激光雷达的 iPhone 扫描房间生成 2D/3D 户型图，核对实测尺寸并导出 PDF 报告。',
    details: '扫描估算值与卷尺实测值分开保留，支持为墙面、门窗与管线位置添加现场照片和备注。',
    href: 'https://apps.apple.com/cn/app/%E5%BF%AB%E9%87%8F%E6%88%BF-%E6%88%BF%E9%97%B4%E6%B5%8B%E9%87%8F%E4%B8%8E3d%E6%88%B7%E5%9E%8B%E5%9B%BE/id6823888335',
    external: true,
    tags: ['iOS', 'LiDAR', '3D 户型图', '量房']
  },
  {
    name: 'Fluxio 视频压缩裁切',
    group: 'ios',
    category: 'iOS 工具',
    status: '中国区 App Store',
    description: '在手机本地压缩视频、裁切片段，保留原视频，导出后方便保存和分享。',
    details: '支持批量处理；提供一次成功处理体验，后续功能需通过一次性购买解锁。',
    href: 'https://apps.apple.com/cn/app/fluxio%E8%A7%86%E9%A2%91%E5%8E%8B%E7%BC%A9%E8%A3%81%E5%88%87/id6749803323',
    external: true,
    tags: ['iOS', '视频压缩', '视频裁切']
  },
  {
    name: 'PDF Snap',
    group: 'ios',
    category: 'iOS 工具',
    status: '中国区 App Store',
    description: '在手机本地合并、压缩、分割 PDF，也支持照片与图片转 PDF。',
    href: 'https://apps.apple.com/cn/app/pdf-snap-%E5%8E%8B%E7%BC%A9-%E5%90%88%E5%B9%B6%E4%B8%8E%E5%88%86%E5%89%B2/id6743408614',
    external: true,
    tags: ['iOS', 'SwiftUI', 'PDF 工具']
  },
  {
    name: 'PhotoSpace',
    group: 'ios',
    category: 'iOS 工具',
    status: '中国区 App Store',
    description: '在手机本地对比相似照片、集中查看截图与大视频，按年月清理和整理相册空间。',
    href: 'https://apps.apple.com/cn/app/photospace-%E7%9B%B8%E5%86%8C%E6%B8%85%E7%90%86%E4%B8%8E%E6%95%B4%E7%90%86/id6755833132',
    external: true,
    tags: ['iOS', '相册清理', '拼图压缩']
  },
  {
    name: '上次 Lasti',
    group: 'ios',
    category: 'iOS 工具',
    status: '中国区 App Store',
    description: '记下理发、换床单、换滤芯等生活小事上次发生的时间，随时查看距今过了多少天。',
    href: 'https://apps.apple.com/cn/app/%E4%B8%8A%E6%AC%A1-lasti/id6757007544',
    external: true,
    tags: ['iOS', '小组件', '生活记录']
  },
  {
    name: 'BodyMate',
    group: 'ios',
    category: 'iOS 应用',
    status: '中国区 App Store',
    description: '把体重、体脂和训练记录放在一起，查看一段时间里的变化。',
    details: '支持手动记录身体数据、训练计时与组数次数记录，用于个人记录和趋势查看。',
    href: 'https://apps.apple.com/cn/app/bodymate-%E8%BA%AB%E4%BD%93%E4%B8%8E%E8%AE%AD%E7%BB%83%E8%AE%B0%E5%BD%95/id6789944461',
    external: true,
    tags: ['iOS', '身体数据', '训练记录']
  },
  {
    name: 'Network Doctor',
    group: 'ios',
    category: 'iOS 工具',
    status: '海外 App Store',
    description: '检测 Wi-Fi 与蜂窝网络的延迟、抖动与连接稳定性，排查网速正常但通话卡顿的原因。',
    href: 'https://apps.apple.com/us/app/network-doctor-wifi-check/id6789789507',
    external: true,
    tags: ['iOS', '网络诊断', 'Wi-Fi']
  },

  // ── macOS 桌面应用 ──
  {
    name: '发票识别工作台',
    group: 'macos',
    category: 'macOS 应用',
    status: '中国区 App Store',
    description: '在 Mac 本地批量识别中文进项发票，人工复核关键字段后导出 Excel 明细。',
    details: '支持图片与 PDF 批量识别，关键字段需要人工复核；已有中国区 Mac App Store 入口，也提供开源仓库。',
    href: 'https://apps.apple.com/cn/app/%E5%8F%91%E7%A5%A8%E8%AF%86%E5%88%AB%E5%B7%A5%E4%BD%9C%E5%8F%B0/id6789881930',
    external: true,
    tags: ['开源', 'macOS', 'OCR', '财务工具'],
    github: 'https://github.com/mrliang-github/cn-vat-invoice-ocr'
  },
  {
    name: 'OtterBar',
    group: 'macos',
    category: 'macOS 应用',
    status: '公开测试 · 可下载',
    description: '通过快捷键或菜单栏图标快速搜索正在运行的 Mac 菜单栏工具，在本机离线处理。',
    details: '基于系统辅助功能动态扫描支持的应用入口，支持自定义全局快捷键（Apple Silicon · macOS 13+）。',
    href: '/otterbar/',
    external: false,
    tags: ['macOS', 'Swift', '效率工具'],
    github: 'https://github.com/mrliang-github/OtterBar'
  },
  {
    name: 'HeatSleuth',
    group: 'macos',
    category: 'macOS 应用',
    status: '公开测试 · 可下载',
    description: '查看 Mac 的 CPU、GPU 与高负载进程，帮助排查机身发热和资源占用的原因。',
    details: '基于系统底层指标采集，不接外部云服务，提供公证安装包下载。',
    href: '/heatsleuth/zh/',
    external: false,
    tags: ['macOS', 'Swift', '性能诊断']
  },

  // ── 网页工具、扩展与开源项目 ──
  {
    name: 'MD 排版',
    group: 'web',
    category: 'Web 工具',
    status: '公开可用',
    description: '把 Markdown 一键排成可直接复制到微信公众号编辑器的文章，内置代码高亮与简洁版式。',
    href: 'https://md.liangxiaoaitool.top/',
    external: true,
    tags: ['Web 工具', 'Markdown', '公众号排版']
  },
  {
    name: 'SlideBeaver',
    group: 'web',
    category: 'Web 工具',
    status: '公开可用 · 英文界面',
    description: '把 HTML 幻灯片转换成 PowerPoint（.pptx）文件，方便继续调整文字和基础图形。',
    href: 'https://www.html-to-pptx.com/',
    external: true,
    tags: ['Web 工具', 'HTML 转 PPTX', '办公效率']
  },
  {
    name: 'FileOtter',
    group: 'web',
    category: 'Web 工具',
    status: '公开可用 · 英文界面',
    description: '在浏览器本地压缩和转换图片、PDF 与视频文件，无需注册账号。',
    href: 'https://fileotter.org/',
    external: true,
    tags: ['Web 工具', '文件压缩', '格式转换']
  },
  {
    name: 'AdQuiet',
    group: 'web',
    category: 'Chrome 扩展',
    status: 'Chrome Web Store',
    description: '给 YouTube 桌面端观看页减少视频广告打断，专注内容观看。',
    details: '轻量 Manifest V3 架构，不读取不上传用户浏览隐私数据。',
    href: '/adquiet/',
    external: false,
    tags: ['Chrome 扩展', 'Manifest V3']
  },
  {
    name: '良逍旅行规划',
    group: 'web',
    category: 'AI Skill',
    status: 'GitHub 开源',
    description: '面向 AI 助手的旅行规划 Skill，生成行程方案、结构化数据和手机行程页。',
    href: 'https://github.com/mrliang-github/liangxiao-travel',
    external: true,
    tags: ['AI Skill', '开源', '旅行规划'],
    github: 'https://github.com/mrliang-github/liangxiao-travel'
  }
]
