import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, access } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'

const hash = body => createHash('sha256').update(body).digest('hex')

// This receives Astro's resolved routes, then verifies the actual production files.
export async function checkCacheCost({ root, outDir, routes, buildOutput }) {
  const config = JSON.parse(await readFile(join(root, 'cache-cost.config.json'), 'utf8'))
  assert.equal(buildOutput, config.buildOutput, 'Public catalog must remain static')
  const projectRoutes = routes.filter(route => route.origin === 'project' && ['page', 'endpoint'].includes(route.type))
  assert(projectRoutes.length > 0, 'Missing resolved Astro route metadata')
  const dynamic = projectRoutes.filter(route => !route.isPrerendered)
  assert.deepEqual(dynamic.map(route => route.entrypoint).sort(), config.dynamicExceptions.map(item => item.entrypoint).sort(), 'Unexpected request-time route')
  for (const file of config.publicArtifacts) await access(join(outDir, file))
  for (const forbidden of ['_worker.js', 'functions', '_functions']) {
    await assert.rejects(access(join(outDir, forbidden)), `Unexpected executable output: ${forbidden}`)
  }
  const errorPage = await readFile(join(outDir, config.notFoundArtifact), 'utf8')
  assert(/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(errorPage), '404 must be prebuilt and noindex')
  const headers = await readFile(join(outDir, '_headers'), 'utf8')
  assert.match(headers, /\/data\/agents\/v1\/\*\s+Cache-Control: public, max-age=31536000, immutable/)
  assert.match(headers, /\/data\/agents\/manifest\.json\s+Cache-Control: public, max-age=300, s-maxage=3600/)
  assert(!/^\/\*\s*$/m.test(headers), 'Do not apply public caching to the entire website')
  const manifestBody = await readFile(join(outDir, 'data/agents/manifest.json'))
  assert(manifestBody.length <= config.budgets.maxManifestBytes, 'Agent manifest exceeds its budget')
  const manifest = JSON.parse(manifestBody)
  assert.equal(manifest.schemaVersion, '1.0')
  assert.deepEqual(manifest.datasets.map(dataset => dataset.id).sort(), ['little-giants', 'unicorns'], 'Agent datasets must not silently disappear')
  assert.equal(manifest.access.recommendedParallelDownloads, config.budgets.recommendedParallelDownloads)
  const artifacts = []
  async function resource(item, maxBytes) {
    const url = new URL(item.url)
    assert.equal(url.origin, 'https://liangxiaoai.dev')
    assert.match(url.pathname, /^\/data\/agents\/v1\/(little-giants|unicorns)\/[a-f0-9]{64}\//)
    const file = resolve(outDir, '.' + decodeURIComponent(url.pathname))
    assert(file.startsWith(resolve(outDir) + sep))
    const body = await readFile(file)
    assert.equal(body.length, item.bytes)
    assert.equal(hash(body), item.sha256)
    assert(body.length <= maxBytes, `Data file exceeds its budget: ${relative(outDir, file)}`)
    artifacts.push({ path: relative(outDir, file), bytes: body.length, sha256: item.sha256 })
    return JSON.parse(body)
  }
  const datasets = []
  for (const dataset of manifest.datasets) {
    const snapshot = await resource(dataset.snapshot, config.budgets.maxSnapshotBytes)
    const index = await resource(dataset.index, config.budgets.maxIndexBytes)
    assert.equal(snapshot.recordCount, dataset.recordCount)
    assert.equal(snapshot.companies.length, dataset.recordCount)
    assert.equal(snapshot.version, dataset.version)
    assert.equal(index.version, dataset.version)
    const source = JSON.parse(await readFile(join(root, 'src/data/catalog', `${dataset.id}.json`)))
    assert.deepEqual(snapshot.companies.map(company => company.id), source.companies.map(company => company.id))
    const actual = new Map()
    for (const region of index.regions) {
      let count = 0
      for (const item of region.parts) {
        const part = await resource(item, config.budgets.maxPartBytes)
        assert.equal(part.version, dataset.version)
        assert.equal(part.region, region.name)
        assert.equal(part.recordCount, part.companies.length)
        assert(part.recordCount <= config.budgets.maxPartRecords)
        for (const company of part.companies) {
          assert(!actual.has(company.id), 'Duplicate record across parts')
          actual.set(company.id, company)
        }
        count += part.recordCount
      }
      assert.equal(count, region.recordCount)
    }
    assert.equal(actual.size, dataset.recordCount)
    for (const company of snapshot.companies) assert.deepEqual(actual.get(company.id), company)
    datasets.push({ id: dataset.id, records: actual.size, regions: index.regions.length, version: dataset.version })
  }
  assert(artifacts.length + 3 <= config.budgets.maxAgentFiles, 'Unexpected Agent file growth')
  return { standard: config.standard, platform: config.platform, buildOutput, projectRoutes, dynamicRoutes: dynamic,
    publicArtifacts: config.publicArtifacts, notFoundArtifact: config.notFoundArtifact,
    datasets, agentArtifacts: artifacts, manifestBytes: manifestBody.length,
    budgets: config.budgets, platformUsage: 'unknown; requires a fresh account/project snapshot before release' }
}
