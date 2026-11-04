import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'
import { buildAgentBundle, AGENT_CHUNK_SIZE, sha256 } from '../src/lib/agent-data.ts'

const catalogs = ['little-giants', 'unicorns'].map(slug => JSON.parse(readFileSync(new URL(`../src/data/catalog/${slug}.json`, import.meta.url))))
const schema = JSON.parse(readFileSync(new URL('../src/data/agent-schema.json', import.meta.url)))
const bundle = buildAgentBundle(catalogs)
const byUrl = url => bundle.assets.find(asset => asset.path === new URL(url).pathname)

test('Agent snapshots preserve all records, source facts, enrichment and historical units', () => {
  for (const [i, dataset] of bundle.datasets.entries()) {
    const snapshot = JSON.parse(byUrl(dataset.snapshot.url).body)
    assert.equal(snapshot.recordCount, catalogs[i].metadata.count)
    assert.equal(snapshot.metadata.snapshotDate, catalogs[i].metadata.snapshotDate)
    assert.deepEqual(snapshot.companies, catalogs[i].companies)
    assert.equal(snapshot.metadata.sourceSha256, catalogs[i].metadata.sourceSha256)
    if (dataset.id === 'unicorns') {
      assert.equal(snapshot.metadata.currency, 'CNY')
      assert.equal(snapshot.metadata.valuationUnit, '100m')
      assert.equal(snapshot.metadata.valuationDate, '2026-01-01')
    }
  }
})

test('region chunks cover every company exactly once, remain bounded and match full snapshots', () => {
  for (const dataset of bundle.datasets) {
    const snapshot = JSON.parse(byUrl(dataset.snapshot.url).body)
    const index = JSON.parse(byUrl(dataset.index.url).body)
    const companies = []
    for (const region of index.regions) {
      let count = 0
      for (const resource of region.parts) {
        const part = JSON.parse(byUrl(resource.url).body)
        assert.equal(part.region, region.name)
        assert.equal(part.recordCount, part.companies.length)
        assert(part.recordCount > 0 && part.recordCount <= AGENT_CHUNK_SIZE)
        assert(part.companies.every(company => (dataset.id === 'little-giants' ? company.province : company.country) === region.name))
        companies.push(...part.companies)
        count += part.recordCount
      }
      assert.equal(count, region.recordCount)
    }
    assert.equal(companies.length, dataset.recordCount)
    assert.equal(new Set(companies.map(company => company.id)).size, dataset.recordCount)
    assert.deepEqual(new Map(companies.map(company => [company.id, company])), new Map(snapshot.companies.map(company => [company.id, company])))
  }
})

test('versions are reproducible and change when public enrichment changes', () => {
  assert.deepEqual(buildAgentBundle(catalogs), bundle)
  const changed = structuredClone(catalogs)
  changed[0].companies[0].profile.description += ' 更新'
  const next = buildAgentBundle(changed)
  assert.notEqual(next.datasets[0].version, bundle.datasets[0].version)
  assert.equal(next.datasets[1].version, bundle.datasets[1].version)
  assert.notEqual(next.datasets[0].snapshot.url, bundle.datasets[0].snapshot.url)
})

test('unapproved metadata, company, profile and source fields never enter Agent assets', () => {
  const changed = structuredClone(catalogs)
  changed[0].metadata.privatePath = '/private/internal-source'
  changed[0].companies[0].internalNote = 'private-company-note'
  changed[0].companies[0].profile.internalPrompt = 'private-profile-note'
  changed[0].companies[0].profile.sources[0].token = 'private-source-token'
  const next = buildAgentBundle(changed)
  assert.equal(next.datasets[0].version, bundle.datasets[0].version)
  assert.deepEqual(next.assets, bundle.assets)
})

test('declared resources, byte sizes, compression estimates and SHA-256 match the published body', () => {
  const urls = new Set()
  const resources = bundle.datasets.flatMap(dataset => [dataset.snapshot, dataset.index, ...JSON.parse(byUrl(dataset.index.url).body).regions.flatMap(region => region.parts)])
  for (const resource of resources) {
    assert(!urls.has(resource.url)); urls.add(resource.url)
    const { body } = byUrl(resource.url)
    assert.equal(resource.sha256, sha256(body))
    assert.equal(resource.bytes, Buffer.byteLength(body))
    assert.equal(resource.gzipBytes, gzipSync(body).length)
    assert.equal(gunzipSync(gzipSync(body)).toString('utf8'), body)
    assert.match(new URL(resource.url).pathname, /\/v1\/(little-giants|unicorns)\/[a-f0-9]{64}\//)
  }
})

test('published enterprise and profile fields are documented by the JSON Schema', () => {
  assert.equal(schema.properties.schemaVersion.const, bundle.manifest.schemaVersion)
  for (const dataset of bundle.datasets) {
    for (const company of JSON.parse(byUrl(dataset.snapshot.url).body).companies) {
      for (const key of Object.keys(company)) assert(Object.hasOwn(schema.$defs.company.properties, key), key)
      if (company.profile) for (const key of Object.keys(company.profile)) assert(Object.hasOwn(schema.$defs.company.properties.profile.properties, key), key)
    }
  }
  assert.equal(bundle.manifest.access.maxRecordsPerPart, AGENT_CHUNK_SIZE)
})

test('invalid counts or duplicated identities stop publishing rather than silently omit records', () => {
  const changed = structuredClone(catalogs)
  changed[0].companies.pop()
  assert.throws(() => buildAgentBundle(changed), /Invalid public catalog/)
  const duplicate = structuredClone(catalogs)
  duplicate[0].companies[1].id = duplicate[0].companies[0].id
  assert.throws(() => buildAgentBundle(duplicate), /Invalid public catalog/)
})
