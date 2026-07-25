export const site = {
  name: "良逍",
  description: "文章、工具和最近在做的东西",
  url: "https://liangxiaoaitool.top",
  xProfile: "https://x.com/lingxio71220285",
  githubProfile: "https://github.com/mrliang-github"
};

export const articleSelection = [
  {
    slug: "codex-app-production-line",
    sourceFile: "2026-07-17-Codex一周重置4次额度我推进2个App把送审自动化了.md",
    title: "Codex 一周重置 4 次额度，我推进 2 个 App，把送审自动化了",
    date: "2026-07-17",
    description:
      "这一周 Codex 重置了 4 次额度。我用它推进两个 App，从商店资料一路做到提交审核。",
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
      "我把小红书评论收进飞书多维表，再让 AI 做初步分类。评论只用来找线索，最后还是自己判断。",
    cover: "https://img.liangxiaoaitool.top/2026/07/2026-07-03-小红书评论产品需求情报系统-cover.png",
    tags: ["产品需求", "小红书", "飞书多维表"]
  },
  {
    slug: "claude-codex-limit-reset",
    sourceFile: "2026-07-03-Claude封号Codex重置AI编程工具最伤人的是不解释.md",
    title: "Claude code 不说话，就是一味的封号；Codex 也不说话，就是一味的重置",
    date: "2026-07-03",
    description:
      "一次工具不可用，让我重新比较了 Claude Code 和 Codex 的额度说明、错误提示和工作连续性。",
    cover: "https://img.liangxiaoaitool.top/2026/07/2026-07-03-claude-codex-cover-v1.png",
    tags: ["AI 编程", "Codex", "工具观察"]
  },
  {
    slug: "codex-google-sheets-store-upload",
    sourceFile: "2026-06-23-独立站产品用Codex和GoogleSheets自动上架.md",
    title: "独立站产品，用 Codex + Google Sheets 自动上架",
    date: "2026-06-23",
    description:
      "我把商品内容、图片、价格和状态放进 Google Sheets，再用 Codex 更新独立站，最后手动检查。",
    cover: "https://img.liangxiaoaitool.top/2026/06/gzh-illust-00-cover-independent-site-codex-v4.png",
    tags: ["独立站", "Codex", "自动化"]
  },
  {
    slug: "ai-enterprise-prototype-style",
    sourceFile: "2026-06-19-AI原型为什么不像公司风格.md",
    title: "AI 画企业原型为什么总不像公司产品？我发现问题不在提示词",
    date: "2026-06-19",
    description:
      "AI 能很快画出页面，但没看过公司的组件库、页面样例和交互规则，很难像自家产品。",
    cover: "https://img.liangxiaoaitool.top/2026/06/gzh-enterprise-prototype-cover-image2-v2.png",
    tags: ["AI 原型", "产品设计", "设计系统"]
  },
  {
    slug: "codex-figma-site-design",
    sourceFile: "2026-06-15-独立站前先把网站风格整理进Figma.md",
    title: "免费模板搭完独立站后，我用 Codex + Figma 做了自己的页面设计",
    date: "2026-06-15",
    description:
      "免费模板能很快搭站，但很难同时照顾产品特点和询盘路径。我后来用 Codex + Figma 重新整理页面。",
    cover: "https://img.liangxiaoaitool.top/2026/06/gzh-figma-site-design-cover-image2-v9.png",
    tags: ["独立站", "Figma", "页面设计"]
  },
  {
    slug: "mac-invoice-ocr",
    sourceFile: "2026-06-13-我开源了个Mac发票OCR工具，不接API也能转Excel.md",
    title: "我开源了个 Mac 发票 OCR 工具，不接 API 也能转 Excel",
    date: "2026-06-13",
    description:
      "用 Mac 自带的 Apple Vision 识别发票并导出 Excel，关键字段再手动复核。",
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
    external: false,
    featured: true
  },
  {
    name: "AdQuiet",
    category: "Chrome 扩展",
    status: "Chrome Web Store",
    description: "在 YouTube 桌面观看页里，少一点视频广告打断。",
    href: "/adquiet/",
    external: false
  },
  {
    name: "MD 排版",
    category: "在线工具",
    status: "公开可用",
    description: "把 Markdown 排成公众号编辑器能直接复制的样子。",
    href: "https://md.liangxiaoaitool.top/",
    external: true,
    featured: true
  },
  {
    name: "Mac 发票 OCR",
    category: "开源工具",
    status: "GitHub 开源",
    description: "用 Mac 自带的文字识别，把发票整理成 Excel。",
    href: "https://github.com/mrliang-github/cn-vat-invoice-ocr",
    external: true
  }
];

export const buildNotes = [
  {
    date: "2026-07-17",
    label: "产品流程",
    title: "把两个 App 的送审流程串起来",
    description: "从商店资料、开发到提交审核，记下两个 App 是怎么送审的。",
    articleSlug: "codex-app-production-line"
  },
  {
    date: "2026-07-16",
    label: "工作流",
    title: "把公司和个人的飞书工作分开",
    description: "公司和个人各用一套飞书账号，文档和任务不再混在一起。",
    articleSlug: "two-lark-work-cards"
  },
  {
    date: "2026-07-05",
    label: "需求研究",
    title: "从小红书评论里找产品线索",
    description: "把评论收进飞书多维表，再用 AI 做初步分类。",
    articleSlug: "xiaohongshu-comment-intelligence"
  }
];
