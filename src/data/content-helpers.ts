import dailyData from './daily-reports.json'
import englishData from './english-lessons.json'

export interface DailyDiscovery {
  id?: string
  title: string
  fact?: string
  judgement?: string
  detail?: string
  keyPoint?: string
  sourceIds?: string[]
}

export interface DailyReportItem {
  id: string
  slug: string
  title: string
  summary: string
  editionDate: string
  overview?: string
  discoveries?: DailyDiscovery[]
  nextStep?: string
  tags?: string[]
  sources?: Array<{
    id?: string
    name: string
    url: string
  }>
  bodyHtml?: string
}

export interface EnglishExpression {
  id?: string
  phrase: string
  translation?: string
  meaning?: string
  example?: string
  chineseExample?: string
  sentenceId?: string
}

export interface EnglishSentence {
  id?: string
  speaker?: string
  text?: string
  translation?: string
  english?: string
  chinese?: string
}

export interface EnglishLessonItem {
  id: string
  slug: string
  title: string
  summary: string
  revision?: string
  editionDate?: string
  level?: string
  profession?: string
  scenario?: string
  goal?: string
  durationMinutes?: number
  expressions?: EnglishExpression[]
  sentences?: EnglishSentence[]
  practice?: string
  bodyHtml?: string
  coursewareHtml?: string
  playerData?: {
    id: string
    revision: string
    sentences: Array<{
      id: string
      speaker: string
      text: string
      translation: string
    }>
  }
  // 固定课程序号（1 到 27），按发布时间升序永久绑定
  lessonNumber?: number
}

// 获取全部风向标日报（默认按期次日期倒序排列，最新在最前）
export function getDailyReports(): DailyReportItem[] {
  // 读取原始集合条目
  const rawItems = (dailyData.items || []) as unknown as DailyReportItem[]
  // 按 editionDate 字段进行降序排序
  return [...rawItems].sort((a, b) => (b.editionDate || '').localeCompare(a.editionDate || ''))
}

// 根据 slug 或 id 查找单篇风向标日报
export function getDailyReportBySlug(slug: string): DailyReportItem | undefined {
  // 获取全部日报列表
  const items = getDailyReports()
  // 查找匹配的记录
  return items.find((item) => item.slug === slug || item.id === slug)
}

// 获取全部英语课程（时间正序排列，用于生成静态路由与自然的上下课导航）
export function getEnglishLessons(): EnglishLessonItem[] {
  // 读取原始集合条目
  const rawItems = (englishData.items || []) as unknown as EnglishLessonItem[]
  // 保证按时间正序排列
  const sorted = [...rawItems].sort((a, b) => (a.editionDate || '').localeCompare(b.editionDate || ''))
  // 为每节课程赋予永久唯一的真实递增课号（Lesson 01 至 Lesson 27）
  sorted.forEach((item, index) => {
    item.lessonNumber = index + 1
  })
  return sorted
}

// 获取按最新日期倒序排列的英语课程（最新日期在最前，用于首页切片与列表页打卡浏览）
export function getEnglishLessonsByDate(): EnglishLessonItem[] {
  // 获取带有固定真实课号的完整课程列表
  const lessons = getEnglishLessons()
  // 按照 editionDate 倒序排列（今天最新的排第一位）
  return [...lessons].sort((a, b) => (b.editionDate || '').localeCompare(a.editionDate || ''))
}

// 根据 slug 或 id 查找单节英语课程
export function getEnglishLessonBySlug(slug: string): EnglishLessonItem | undefined {
  // 获取课程列表
  const items = getEnglishLessons()
  // 查找匹配的记录
  return items.find((item) => item.slug === slug || item.id === slug)
}
