import { articleSelection } from './site-data.mjs'

// Only reviewed, published articles belong here. Material folders are never globbed.
const additions = [
  {
    slug: 'grok-bot-workflows',
    sourceFile: '2026-10-13-Muse这么火，但我想聊聊GrokBot我的5个bot和收集到的玩法.md',
    title: 'Muse 这么火，但我想聊聊 Grok Bot：我的 5 个 bot 和收集到的玩法',
    date: '2026-10-13',
    description: '把外链整理、选题、关键词研究和 App 调研分给不同的 Bot，记录我的分工方式，以及哪些环节仍需要自己确认。',
    tags: ['AI 工作流', 'Grok Bot'],
  },
  {
    slug: 'wordpress-security-review',
    sourceFile: '2026-08-05-一封密码已修改邮件后的安全复盘.md',
    title: '我的 WordPress 独立站被黑了：攻击者 10 秒拿下后台权限（附完整排查流程）',
    date: '2026-08-05',
    description: '一封密码修改邮件引出的一次独立站安全复盘：从发现异常账号、保存证据，到清理后门和轮换密钥。',
    tags: ['独立站', 'WordPress', '安全复盘'],
    replacements: [['(待替换：公众号链接)', '(/blog/codex-wordpress-site/)']],
    // The timeline is already in the article; these chat captures expose an account name.
    omitImages: [
      'https://img.liangxiaoaitool.top/2026/08/20260805232512383.png',
      'https://img.liangxiaoaitool.top/2026/08/20260805232639987.png',
    ],
  },
  {
    slug: 'chatgpt-codex-work-notes',
    sourceFile: '2026-07-12-GPT-5.6来了但Codex没了.md',
    title: 'GPT-5.6 来了，但 Codex 没了？',
    date: '2026-07-12',
    description: '记录 7 月新版桌面端的使用体验：讨论、资料整理和项目执行如何衔接，以及当时遇到的入口与额度问题。',
    tags: ['AI 工作流', 'Codex', '工具观察'],
  },
  {
    slug: 'apple-support-live-chat',
    sourceFile: '2026-06-11-苹果英语客服入口怎么找.md',
    title: 'Apple 礼品卡订阅 Claude/GPT 失败，如何联系 Apple 线上官方客服',
    date: '2026-06-11',
    description: '遇到购买无法完成时，如何查找 Apple 官方在线客服、说明问题，并在需要时生成 Support PIN。附当时的操作截图。',
    tags: ['工具使用', 'Apple'],
  },
  {
    slug: 'codex-wordpress-site',
    sourceFile: '2026-06-06-我用Codex搭了一个WordPress独立站.md',
    title: '我用 Codex 搭了一个 WordPress 独立站',
    date: '2026-06-06',
    description: '一个需要持续更新产品和内容的独立站，为什么选择 WordPress，以及我怎样让 Codex 帮忙完成不熟悉的搭建环节。',
    tags: ['独立站', 'Codex', 'WordPress'],
  },
  {
    slug: 'vercel-cloudflare-access',
    sourceFile: '2026-05-28-Vercel项目用Cloudflare加速国内访问.md',
    title: 'Vercel 项目用 Cloudflare 加速国内访问',
    date: '2026-05-28',
    description: '从 DNS、域名验证到代理与缓存，记录小项目接入 Cloudflare 的顺序和限制。实际访问效果仍要按网络和业务测试。',
    tags: ['独立站', 'Vercel', 'Cloudflare'],
  },
  {
    slug: 'ai-figma-team-workflow',
    sourceFile: '2026-05-11-Codex&Claude + Figma，正在改写团队级的产品研发工作流.md',
    title: 'Codex / Claude + Figma，正在改写团队级产品研发工作流',
    date: '2026-05-11',
    description: 'AI 原型要进入团队评审，除了画出页面，还要符合组件、交互和业务边界。这篇记录我对设计资产与 PRD 的整理思路。',
    tags: ['产品与设计', 'Figma', 'AI 原型'],
  },
  {
    slug: 'ai-company-information-check',
    sourceFile: '2026-05-06-我想用 AI 给几家公司做一次公开信息体检.md',
    title: '我想用 AI 给几家公司做一次公开信息体检',
    date: '2026-05-06',
    description: '从企业信息不同步的问题出发，讨论一个小需求：用 AI 整理核对清单、信息差异和沟通材料，再验证是否有人需要。',
    tags: ['产品与设计', '需求验证', '企业信息'],
  },
  {
    slug: 'company-information-correction',
    sourceFile: '2026-05-05-小企业主如何处理公开信息纠错.md',
    title: '企业公开信息不同步？这套流程可以照着做',
    date: '2026-05-05',
    description: '先核对官方源头，再联系第三方平台。从一次实际处理经历中整理信息差异、截图留证和客服沟通的步骤。',
    tags: ['工具使用', '企业信息'],
  },
]

const existingTopics = {
  'codex-app-production-line': 'AI 工作流',
  'two-lark-work-cards': 'AI 工作流',
  'xiaohongshu-comment-intelligence': '产品与设计',
  'claude-codex-limit-reset': 'AI 工作流',
  'codex-google-sheets-store-upload': '独立站',
  'ai-enterprise-prototype-style': '产品与设计',
  'codex-figma-site-design': '产品与设计',
  'mac-invoice-ocr': '工具使用',
}

export const wechatArticles = [
  ...additions,
  ...articleSelection.map(article => ({
    ...article,
    ...(article.slug === 'codex-app-production-line' ? {
      description: '从商店数据、需求整理到截图和审核资料，记录我把两个 App 的送审流程串起来的过程。',
    } : {}),
    tags: [...new Set([existingTopics[article.slug], ...article.tags])],
  })),
].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
