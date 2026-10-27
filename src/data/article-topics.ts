export const articleTopics = ['AI 工作流', '产品与设计', '独立站', '工具使用'] as const

export function articleTopicHref(topic: string) {
  return `/tags/${encodeURIComponent(topic.toLowerCase())}`
}
