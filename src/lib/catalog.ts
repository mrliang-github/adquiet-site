export interface CompanyProfile {
  description: string
  descriptionKind: string
  products: string[]
  website: string
  websiteSource: string
  websiteAvailability: string
  sources: {label: string; url: string}[]
  checkedAt: string
}

export interface Company {
  id: string
  name: string
  nameEn?: string
  province?: string
  reportingRegion?: string
  sequence?: number
  sourceType?: string
  evidenceUrl?: string
  officialUrl?: string
  verificationNote?: string
  country?: string
  city?: string
  industry?: string
  rank?: number
  valuation?: number
  founders?: string
  profile?: CompanyProfile
}

export interface Catalog {
  metadata: {
    slug: string; kind: string; title: string; year: number; snapshotDate: string
    sourceName: string; sourceUrl: string; sourceFile: string; sourceSha256: string
    note: string; qualificationNote: string; valuationDate: string; valuationUnit: string
    currency: string; publishedDate: string; count: number; profileCount: number; websiteCount: number
  }
  companies: Company[]
}

export interface QueryState {
  q: string; region: string; secondary: string; business: boolean; sort: string; page: number
}

export const PAGE_SIZE = 24
export const defaultQuery = (): QueryState => ({q: '', region: '', secondary: '', business: false, sort: 'original', page: 1})
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/\s+/g, ' ').trim()
export const isRanking = (data: Catalog) => data.metadata.kind === 'ranking'
export const regionOf = (c: Company, data: Catalog) => (isRanking(data) ? c.country : c.province) || ''
export const secondaryOf = (c: Company, data: Catalog) => (isRanking(data) ? c.industry : c.reportingRegion) || ''
export function optionsFor(data: Catalog, field: 'region' | 'secondary') {
  const counts = new Map<string, number>()
  for (const c of data.companies) {
    const value = field === 'region' ? regionOf(c, data) : secondaryOf(c, data)
    if (value) counts.set(value, (counts.get(value) || 0) + 1)
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b, 'zh-CN')).map(([value, count]) => ({value, count}))
}
export function readQuery(params: URLSearchParams): QueryState {
  const page = Number(params.get('page'))
  return {
    q: (params.get('q') || '').slice(0, 120).trim(),
    region: (params.get('region') || '').slice(0, 80),
    secondary: (params.get('category') || '').slice(0, 100),
    business: params.get('business') === '1',
    sort: ['name', 'valuation'].includes(params.get('sort') || '') ? params.get('sort')! : 'original',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1
  }
}
export function queryParams(state: QueryState) {
  const params = new URLSearchParams()
  if (state.q) params.set('q', state.q)
  if (state.region) params.set('region', state.region)
  if (state.secondary) params.set('category', state.secondary)
  if (state.business) params.set('business', '1')
  if (state.sort !== 'original') params.set('sort', state.sort)
  if (state.page > 1) params.set('page', String(state.page))
  return params
}
export function validQuery(data: Catalog, state: QueryState): QueryState {
  return {...state,
    region: optionsFor(data, 'region').some(o => o.value === state.region) ? state.region : '',
    secondary: optionsFor(data, 'secondary').some(o => o.value === state.secondary) ? state.secondary : '',
    sort: state.sort === 'valuation' && !isRanking(data) ? 'original' : state.sort
  }
}
export function filterCompanies(data: Catalog, state: QueryState) {
  const tokens = normalize(state.q).split(' ').filter(Boolean)
  const result = data.companies.filter(c => {
    if (state.region && regionOf(c, data) !== state.region) return false
    if (state.secondary && secondaryOf(c, data) !== state.secondary) return false
    if (state.business && !c.profile?.description) return false
    if (!tokens.length) return true
    const haystack = normalize([c.name, c.nameEn, c.province, c.reportingRegion, c.country, c.city, c.industry, c.profile?.description, ...(c.profile?.products || [])].filter(Boolean).join(' '))
    return tokens.every(token => haystack.includes(token))
  })
  if (state.sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  if (state.sort === 'valuation' && isRanking(data)) result.sort((a, b) => (b.valuation || 0) - (a.valuation || 0))
  return result
}
export function paginate(items: Company[], requestedPage: number) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const page = Math.max(1, Math.min(Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1, pages))
  return {page, pages, items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
}
export function safeExternalUrl(value?: string): string {
  try {
    const url = new URL(value || '')
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''
  } catch { return '' }
}
export const valuationText = (c: Company) => c.valuation === undefined ? '' : `${c.valuation.toLocaleString('zh-CN')} 亿元`
export function locationText(c: Company, data: Catalog) {
  return isRanking(data) ? [c.country, c.city, c.industry].filter(Boolean).join(' · ') : [c.province, c.reportingRegion !== c.province ? `申报地区：${c.reportingRegion}` : ''].filter(Boolean).join(' · ')
}
export function companySources(c: Company, data: Catalog) {
  const sources = isRanking(data)
    ? [{label: '胡润榜单原页', url: data.metadata.sourceUrl}]
    : [{label: '公示记录来源', url: c.evidenceUrl || ''}, {label: '地区官方来源', url: c.officialUrl || ''}]
  return [...sources, ...(c.profile?.sources || [])].map(s => ({...s, url: safeExternalUrl(s.url)})).filter(s => s.url)
}
export function csvCell(value: unknown) {
  const raw = String(value ?? '')
  // Spreadsheet apps can execute formulas even when a CSV cell is quoted.
  const safe = /^[\s\uFEFF]*[=+\-@\t\r\n]/u.test(raw) || /^[\t\r\n]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}
export function exportCsv(data: Catalog, companies: Company[]) {
  const ranking = isRanking(data)
  const header = ['企业名称', ...(ranking ? ['英文名称', '榜单名次', '国家/地区', '城市', '行业', '估值（人民币亿元）', '估值基准日', '榜单负责人'] : ['省份', '申报地区', '名单序号', '公示来源类型', '公示来源网址', '地区官方网址', '公示核验说明']), '业务资料', '业务资料类型', '产品/关键词', '收录网站', '网站核验状态', '资料来源', '业务资料核对日期', '名单/榜单', '数据快照日期', '使用范围说明']
  const websiteStatus: Record<string, string> = {reachable: '采集时可访问，未逐一核验主体', 'not-verified': '未核验当前可用性', unconfirmed: '未确认'}
  const rows = companies.map(c => [c.name, ...(ranking ? [c.nameEn, c.rank, c.country, c.city, c.industry, c.valuation, data.metadata.valuationDate, c.founders] : [c.province, c.reportingRegion, c.sequence, c.sourceType, c.evidenceUrl, c.officialUrl, c.verificationNote]), c.profile?.description, c.profile?.description ? c.profile.descriptionKind === 'excerpt' ? '公开资料摘录' : '资料整理' : '', c.profile?.products.join(' / '), safeExternalUrl(c.profile?.website), c.profile?.website ? websiteStatus[c.profile.websiteAvailability] || '未确认' : '', companySources(c, data).map(s => `${s.label}: ${s.url}`).join(' | '), c.profile?.checkedAt, data.metadata.title, data.metadata.snapshotDate, [data.metadata.note, data.metadata.qualificationNote].filter(Boolean).join('；')])
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
