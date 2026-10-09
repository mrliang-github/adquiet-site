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
    name: 'Mac 发票 OCR',
    category: '开源工具',
    status: 'GitHub 开源',
    description: '不接 OCR API，在 Mac 本地用 Apple Vision 把增值税发票识别并整理成 Excel。',
    details: '完全离线本地处理，保护财务隐私，已开源并在 GitHub 持续维护。',
    href: 'https://github.com/mrliang-github/cn-vat-invoice-ocr',
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
    status: 'App Store 已上线',
    description: '移动端离线 PDF 快速扫描、转换与管理工具，极简轻便，专注文件处理效率。',
    href: '/pdf-snap/privacy/',
    external: false,
    tags: ['iOS', 'SwiftUI', 'PDF 工具']
  },
  {
    name: 'PhotoSpace',
    category: 'iOS 工具',
    status: '持续迭代',
    description: '轻量相册空间清理与多维照片整理工具，本地运行，专注隐私与存储释放。',
    href: '/projects',
    external: false,
    tags: ['iOS', '相册管理', '效率工具']
  },
  {
    name: 'LIT',
    category: 'iOS 工具',
    status: '持续迭代',
    description: '个人生活与习惯记录小工具，低摩擦录入，注重交互微动效与正向反馈。',
    href: '/projects',
    external: false,
    tags: ['iOS', '习惯追踪', '生活方式']
  }
]
