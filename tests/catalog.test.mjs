import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {defaultQuery, filterCompanies, paginate, readQuery, queryParams, validQuery, optionsFor, exportCsv, csvCell, safeExternalUrl, valuationText, companySources} from '../src/lib/catalog.ts'

const load = slug => JSON.parse(readFileSync(new URL(`../src/data/catalog/${slug}.json`, import.meta.url), 'utf8'))
const giants = load('little-giants')
const unicorns = load('unicorns')

test('public snapshots preserve counts, unique identities, business coverage and valuation units', () => {
  for (const [data, count, profiles, websites] of [[giants, 3482, 2193, 685], [unicorns, 1602, 15, 15]]) {
    assert.equal(data.metadata.count, count)
    assert.equal(data.companies.length, count)
    assert.equal(new Set(data.companies.map(c => c.id)).size, count)
    assert.equal(data.companies.filter(c => c.profile?.description).length, profiles)
    assert.equal(data.companies.filter(c => c.profile?.website).length, websites)
    assert.match(data.metadata.sourceSha256, /^[a-f0-9]{64}$/)
    for (const c of data.companies) {
      assert.ok(c.name)
      if (c.profile?.description) assert.ok(c.profile.sources.length, `${c.id} is missing business provenance`)
      for (const s of companySources(c, data)) assert.ok(safeExternalUrl(s.url))
    }
  }
  assert.equal(unicorns.metadata.sourceName, '胡润研究院')
  assert.equal(unicorns.metadata.currency, 'CNY')
  assert.equal(unicorns.metadata.valuationUnit, '100m')
  assert.equal(unicorns.metadata.valuationDate, '2026-01-01')
  assert.match(giants.metadata.qualificationNote, /未逐家核验/)
  assert.equal(valuationText(unicorns.companies[0]), '65,600 亿元')
})

test('business search uses AND tokens and combines filters without inventing missing descriptions', () => {
  const query = {...defaultQuery(), q: '北京 导航', region: '北京市', business: true}
  const matches = filterCompanies(giants, query)
  assert.ok(matches.length)
  assert.ok(matches.some(c => c.name === '北京和协导航科技有限公司'))
  assert.ok(matches.every(c => c.province === '北京市' && c.profile.description))
  assert.equal(filterCompanies(giants, {...query, q: '北京 导航 绝不可能匹配的文字xyz'}).length, 0)
  const english = filterCompanies(unicorns, {...defaultQuery(), q: 'ｏｐｅｎａｉ'})
  assert.ok(english.some(c => c.nameEn === 'OpenAI'))
  assert.equal(filterCompanies(giants, {...defaultQuery(), business: true}).length, 2193)
})

test('province and reporting region remain distinct, and filters intersect', () => {
  const region = optionsFor(giants, 'region')
  assert.equal(region.reduce((sum, item) => sum + item.count, 0), 3482)
  const shenzhen = filterCompanies(giants, {...defaultQuery(), region: '广东省', secondary: '深圳市'})
  assert.ok(shenzhen.length)
  assert.ok(shenzhen.every(c => c.province === '广东省' && c.reportingRegion === '深圳市'))
  assert.equal(filterCompanies(giants, {...defaultQuery(), region: '北京市', secondary: '深圳市'}).length, 0)
})

test('share URL round trips Unicode queries, filters, sort and page; invalid values are bounded', () => {
  const state = {q:'北京 导航', region:'北京市', secondary:'北京市', business:true, sort:'name', page:2}
  assert.deepEqual(readQuery(queryParams(state)), state)
  assert.equal(queryParams(defaultQuery()).toString(), '')
  for (const invalid of ['-2', '1.3', 'Infinity', 'x', '9007199254740992']) assert.equal(readQuery(new URLSearchParams({page:invalid})).page, 1)
  assert.equal(readQuery(new URLSearchParams({q:'a'.repeat(200)})).q.length, 120)
  const clean = validQuery(giants, {...state, region:'虚构地区', secondary:'虚构行业', sort:'valuation'})
  assert.equal(clean.region, ''); assert.equal(clean.secondary, ''); assert.equal(clean.sort, 'original')
})

test('pagination clamps invalid/empty pages and sorting does not mutate source order', () => {
  const before = giants.companies.slice(0, 3).map(c => c.id)
  const sorted = filterCompanies(giants, {...defaultQuery(), sort:'name'})
  assert.deepEqual(giants.companies.slice(0, 3).map(c => c.id), before)
  assert.equal(paginate(sorted, 1).items.length, 24)
  const last = paginate(sorted, 99999)
  assert.equal(last.page, last.pages)
  assert.equal(last.items.length, 2)
  assert.deepEqual(paginate([], 9), {page:1, pages:1, items:[]})
})

test('CSV includes all matching rows and provenance, escapes delimiters and disables formula cells', () => {
  const matches = filterCompanies(giants, {...defaultQuery(), business:true})
  const csv = exportCsv(giants, matches)
  assert.ok(csv.startsWith('\uFEFF'))
  assert.equal(csv.split('\r\n').length, matches.length + 2)
  assert.ok(csv.includes('数据快照日期') && csv.includes('公示核验说明') && csv.includes('2026-10-25'))
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"')
  for (const value of ['=HYPERLINK("bad")', '+cmd', '-cmd', '@SUM(1)', '\tformula', '  =cmd', '\n@cmd']) assert.ok(csvCell(value).startsWith('"\''))
  assert.equal(csvCell('普通企业'), '"普通企业"')
  assert.ok(exportCsv(unicorns, unicorns.companies.slice(0, 1)).includes('估值（人民币亿元）'))
})

test('external URL policy rejects script/data schemes and credential-bearing addresses', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,bad', 'https://user:pass@example.com', '//example.com', 'not a URL']) assert.equal(safeExternalUrl(value), '')
  assert.equal(safeExternalUrl('https://example.com/about'), 'https://example.com/about')
  assert.equal(safeExternalUrl('http://example.com'), 'http://example.com/')
})

test('optional source audit validates exact input files against recorded hashes', {skip:!process.env.CATALOG_SOURCE}, () => {
  for (const data of [giants, unicorns]) {
    const raw = readFileSync(`${process.env.CATALOG_SOURCE}/${data.metadata.slug}.json`)
    assert.equal(createHash('sha256').update(raw).digest('hex'), data.metadata.sourceSha256)
    const source = JSON.parse(raw)
    assert.deepEqual(data.companies.map(c => c.name), source.companies.map(c => c.name))
    data.companies.forEach((c, i) => assert.equal(c.profile?.description || '', source.companies[i].profile?.description || ''))
  }
})
