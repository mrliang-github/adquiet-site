import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, join } from 'node:path'

const args = process.argv.slice(2)
const sourceArg = args.indexOf('--source')
if (sourceArg < 0 || !args[sourceArg + 1]) throw new Error('Usage: node scripts/import-catalog.mjs --source /path/to/atlas/data')
const sourceRoot = resolve(args[sourceArg + 1])
const outputRoot = resolve('src/data/catalog')

const text = (value, max = 1500) => {
  const result = typeof value === 'string' ? value.trim() : ''
  if (result.length > max) throw new Error(`Text exceeds ${max} characters; review source before importing`)
  return result
}
function url(value) {
  if (!value) return ''
  try {
    const parsed = new URL(value)
    return /^https?:$/.test(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : ''
  } catch { return '' }
}
function profile(value) {
  if (!value) return undefined
  return {
    description: text(value.description),
    descriptionKind: value.descriptionKind === 'excerpt' ? 'excerpt' : 'summary',
    products: Array.isArray(value.products) ? value.products.slice(0, 12).map(v => text(v, 100)) : [],
    website: url(value.website),
    websiteSource: url(value.websiteSource),
    websiteAvailability: ['reachable', 'not-verified', 'unconfirmed'].includes(value.websiteAvailability) ? value.websiteAvailability : 'not-verified',
    sources: Array.isArray(value.sources) ? value.sources.slice(0, 5).map(s => ({label: text(s.label, 160), url: url(s.url)})).filter(s => s.url) : [],
    checkedAt: text(value.checkedAt, 10)
  }
}
const specifications = [
  {slug: 'little-giants', count: 3482, kind: 'directory', title: '2025 年第七批专精特新“小巨人”公示名单'},
  {slug: 'unicorns', count: 1602, kind: 'ranking', title: '2026 胡润全球独角兽榜'}
]
const prepared = []
for (const spec of specifications) {
  const raw = await readFile(join(sourceRoot, `${spec.slug}.json`))
  const source = JSON.parse(raw.toString('utf8'))
  if (!Array.isArray(source.companies) || source.companies.length !== spec.count) throw new Error(`${spec.slug}: unexpected source count`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.metadata.snapshotDate)) throw new Error(`${spec.slug}: missing snapshot date`)
  if (spec.kind === 'ranking' && (source.metadata.sourceName !== '胡润研究院' || source.metadata.currency !== 'CNY' || source.metadata.valuationUnit !== '100m')) throw new Error('Ranking source or valuation unit changed; review before importing')
  const ids = new Set()
  const companies = source.companies.map(c => {
    if (!/^[a-z0-9-]+$/.test(c.id) || ids.has(c.id) || !text(c.name, 160)) throw new Error(`${spec.slug}: invalid company identity`)
    ids.add(c.id)
    const base = {id: c.id, name: text(c.name, 160), profile: profile(c.profile)}
    if (spec.kind === 'directory') {
      if (!Number.isInteger(c.sequence) || !text(c.province) || !text(c.reportingRegion)) throw new Error(`${c.id}: invalid directory fields`)
      return {...base, sequence: c.sequence, province: text(c.province, 80), reportingRegion: text(c.reportingRegion, 80), sourceType: text(c.sourceType, 160), evidenceUrl: url(c.evidenceUrl), officialUrl: url(c.officialUrl), verificationNote: text(c.verificationNote, 3000)}
    }
    if (!Number.isInteger(c.rank) || c.rank < 1 || !Number.isFinite(c.valuation) || c.valuation <= 0) throw new Error(`${c.id}: invalid ranking fields`)
    return {...base, rank: c.rank, valuation: c.valuation, nameEn: text(c.nameEn, 160), country: text(c.country, 80), city: text(c.city, 80), industry: text(c.industry, 100), founders: text(c.founders, 500)}
  })
  const metadata = {
    slug: spec.slug, kind: spec.kind, title: spec.title, year: source.metadata.year,
    snapshotDate: source.metadata.snapshotDate, sourceName: source.metadata.sourceName,
    sourceUrl: url(source.metadata.sourceUrl), sourceFile: text(source.metadata.sourceFile, 200),
    sourceSha256: createHash('sha256').update(raw).digest('hex'),
    note: text(source.metadata.note, 1500), qualificationNote: text(source.metadata.qualificationNote),
    valuationDate: text(source.metadata.valuationDate, 10), valuationUnit: text(source.metadata.valuationUnit, 20),
    currency: text(source.metadata.currency, 10), publishedDate: text(source.metadata.publishedDate, 10),
    count: companies.length, profileCount: companies.filter(c => c.profile?.description).length,
    websiteCount: companies.filter(c => c.profile?.website).length
  }
  prepared.push({slug: spec.slug, metadata, companies})
}
await mkdir(outputRoot, {recursive: true})
for (const {slug, ...dataset} of prepared) {
  await writeFile(join(outputRoot, `${slug}.json`), JSON.stringify(dataset) + '\n')
  console.log(JSON.stringify({slug, ...dataset.metadata}))
}
