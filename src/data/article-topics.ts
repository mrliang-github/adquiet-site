export const articleTopics = ['AI 工作流', '产品与设计', '独立站', '工具使用'] as const

export function articleTopicHref(topic: string) {
  return `/tags/${encodeURIComponent(topic.toLowerCase())}`
}

export interface PostCategoryInfo {
  category: string
  key: 'agent' | 'guide' | 'workflow' | 'design' | 'other'
}

export const postCategoryDefinitions = [
  { label: 'AI Agent 实战', key: 'agent' },
  { label: '实战攻略', key: 'guide' },
  { label: 'AI 工作流', key: 'workflow' },
  { label: '产品与设计', key: 'design' }
] as const

export function getPostCategory(tags: string[] = []): PostCategoryInfo {
  const lower = tags.map((t) => t.toLowerCase())
  if (lower.some((t) => t.includes('agent'))) {
    return { category: 'AI Agent 实战', key: 'agent' }
  }
  if (lower.some((t) => ['工具使用', '开源', '需求验证', 'ocr', '发票', '小红书'].includes(t))) {
    return { category: '实战攻略', key: 'guide' }
  }
  if (lower.some((t) => ['ai 工作流', 'codex', 'grok bot', '飞书', '自动化'].includes(t))) {
    return { category: 'AI 工作流', key: 'workflow' }
  }
  if (lower.some((t) => ['产品与设计', '独立站', 'figma', 'wordpress', '设计系统'].includes(t))) {
    return { category: '产品与设计', key: 'design' }
  }
  return { category: tags[0] || '实践记录', key: 'other' }
}
