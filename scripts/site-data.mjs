export const site = {
  name: "良逍",
  description: "把想法做成东西，再把过程写下来。",
  url: "https://liangxiaoaitool.top",
  xProfile: "https://x.com/lingxio71220285",
  githubProfile: "https://github.com/mrliang-github",
  // 知识星球（生财有术）专属邀请链接，用于日报详情页合规信息源推荐
  shengcaiInviteUrl: "https://t.zsxq.com/FBJDh"
};

export const articleSelection = [
  {
    slug: "codex-app-production-line",
    sourceFile: "2026-07-17-Codex一周重置4次额度我推进2个App把送审自动化了.md",
    title: "Codex 一周重置 4 次额度，我推进 2 个 App，把送审自动化了",
    date: "2026-07-17",
    description:
      "Codex 一周重置 4 次额度。我这几天用了超过 37 亿 token，推进两个 App，并跑通从商店数据、需求、开发到营销素材、Apple 后台和提交审核的整条流程。",
    cover: "https://img.liangxiaoaitool.top/2026/07/gzh-illust-00-cover.png",
    tags: ["AI 产品", "Codex", "App Store"]
  },
  {
    slug: "two-lark-work-cards",
    sourceFile: "2026-07-16-我给Codex办了两张飞书工卡.md",
    title: "我给 Codex 办了两张飞书工卡：公司和个人分开上岗",
    date: "2026-07-16",
    description:
      "我在 Codex 里同时接入了公司飞书和个人飞书：两套账号和文档空间分开，各自服务不同场景。",
    cover: "https://img.liangxiaoaitool.top/2026/07/gzh-illust-00-cover-v1.png",
    tags: ["Codex", "飞书", "工作流"]
  },
  {
    slug: "xiaohongshu-comment-intelligence",
    sourceFile: "2026-07-05-小红书评论产品需求情报系统.md",
    title: "每天 5 分钟自动收集小红书评论，我用工具 + 飞书多维表搭了个产品需求情报系统",
    date: "2026-07-05",
    description:
      "用工具采集小红书评论，沉淀到飞书多维表，再由 AI 做需求与竞品初筛；评论是线索，最终判断仍由人完成。",
    cover: "https://img.liangxiaoaitool.top/2026/07/2026-07-03-小红书评论产品需求情报系统-cover.png",
    tags: ["产品需求", "小红书", "飞书多维表"]
  },
  {
    slug: "claude-codex-limit-reset",
    sourceFile: "2026-07-03-Claude封号Codex重置AI编程工具最伤人的是不解释.md",
    title: "Claude code 不说话，就是一味的封号；Codex 也不说话，就是一味的重置",
    date: "2026-07-03",
    description:
      "从一次工具不可用的经历出发，记录 Claude Code 和 Codex 在额度、解释和工作连续性上的不同感受。",
    cover: "https://img.liangxiaoaitool.top/2026/07/2026-07-03-claude-codex-cover-v1.png",
    tags: ["AI 编程", "Codex", "工具观察"]
  },
  {
    slug: "codex-google-sheets-store-upload",
    sourceFile: "2026-06-23-独立站产品用Codex和GoogleSheets自动上架.md",
    title: "独立站产品，用 Codex + Google Sheets 自动上架",
    date: "2026-06-23",
    description:
      "把独立站上新整理成一套表格驱动的流程：内容、图片、价格和状态进表，再由 Codex 更新产品内容，并由人做最终审核。",
    cover: "https://img.liangxiaoaitool.top/2026/06/gzh-illust-00-cover-independent-site-codex-v4.png",
    tags: ["独立站", "Codex", "自动化"]
  },
  {
    slug: "ai-enterprise-prototype-style",
    sourceFile: "2026-06-19-AI原型为什么不像公司风格.md",
    title: "AI 画企业原型为什么总不像公司产品？我发现问题不在提示词",
    date: "2026-06-19",
    description:
      "AI 画页面并不难；真正的问题是它没有看过组件库、页面样例、交互规则和评审标准。",
    cover: "https://img.liangxiaoaitool.top/2026/06/gzh-enterprise-prototype-cover-image2-v2.png",
    tags: ["AI 原型", "产品设计", "设计系统"]
  },
  {
    slug: "codex-figma-site-design",
    sourceFile: "2026-06-15-独立站前先把网站风格整理进Figma.md",
    title: "免费模板搭完独立站后，我用 Codex + Figma 做了自己的页面设计",
    date: "2026-06-15",
    description:
      "免费模板虽然完整，却不一定适合产品、竞品风格和询盘路径；于是先用 Codex + Figma 整理自己的页面设计。",
    cover: "https://img.liangxiaoaitool.top/2026/06/gzh-figma-site-design-cover-image2-v9.png",
    tags: ["独立站", "Figma", "页面设计"]
  },
  {
    slug: "mac-invoice-ocr",
    sourceFile: "2026-06-13-我开源了个Mac发票OCR工具，不接API也能转Excel.md",
    title: "我开源了个 Mac 发票 OCR 工具，不接 API 也能转 Excel",
    date: "2026-06-13",
    description:
      "用 macOS 自带 Apple Vision 做本地文字识别，把一批发票先整理成 Excel，再交给人复核关键字段。",
    cover: "https://img.liangxiaoaitool.top/2026/06/00-cover-image2-v2.png",
    tags: ["开源", "macOS", "OCR"]
  }
];

export const tools = [
  {
    name: "HeatSleuth",
    category: "macOS 应用",
    status: "测试版 · 直接下载",
    description: "Mac 发热时，先看清是谁在占用，再决定要不要停。",
    href: "/heatsleuth/",
    external: false
  },
  {
    name: "AdQuiet",
    category: "Chrome 扩展",
    status: "Chrome Web Store",
    description: "给 YouTube 桌面端观看页减少视频广告打断。",
    href: "/adquiet/",
    external: false
  },
  {
    name: "MD 排版",
    category: "在线工具",
    status: "公开可用",
    description: "把 Markdown 排成可复制到公众号编辑器的文章。",
    href: "https://md.liangxiaoaitool.top/",
    external: true
  },
  {
    name: "Mac 发票 OCR",
    category: "开源工具",
    status: "GitHub 开源",
    description: "不接 OCR API，在 Mac 本地把发票先整理成 Excel。",
    href: "https://github.com/mrliang-github/cn-vat-invoice-ocr",
    external: true
  }
];

export const buildNotes = [
  {
    date: "2026-07-17",
    label: "产品流程",
    title: "把两个 App 的送审流程串起来",
    description: "从商店数据、需求、开发、营销素材到 Apple 后台和提交审核，记录一次完整串联。",
    articleSlug: "codex-app-production-line"
  },
  {
    date: "2026-07-16",
    label: "工作流",
    title: "把公司和个人的飞书工作分开",
    description: "两套账号和文档空间服务不同场景，减少资料混在一起带来的摩擦。",
    articleSlug: "two-lark-work-cards"
  },
  {
    date: "2026-07-05",
    label: "需求研究",
    title: "把评论区变成持续积累的线索表",
    description: "先采集、再沉淀、再初筛；评论不是结论，但可以帮助判断下一步该看什么。",
    articleSlug: "xiaohongshu-comment-intelligence"
  }
];
