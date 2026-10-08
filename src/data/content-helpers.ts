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
  speaker?: string
  english: string
  chinese: string
}

export interface EnglishLessonItem {
  id: string
  slug: string
  title: string
  summary: string
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
}

export function getDailyReports(): DailyReportItem[] {
  const rawItems = (dailyData.items || []) as unknown as DailyReportItem[]
  return [...rawItems].sort((a, b) => (b.editionDate || '').localeCompare(a.editionDate || ''))
}

export function getDailyReportBySlug(slug: string): DailyReportItem | undefined {
  const items = getDailyReports()
  return items.find((item) => item.slug === slug || item.id === slug)
}

export function getEnglishLessons(): EnglishLessonItem[] {
  return (englishData.items || []) as unknown as EnglishLessonItem[]
}

export function getEnglishLessonBySlug(slug: string): EnglishLessonItem | undefined {
  const items = getEnglishLessons()
  return items.find((item) => item.slug === slug || item.id === slug)
}
