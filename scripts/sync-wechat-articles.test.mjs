import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { prepareArticle, syncArticles } from './sync-wechat-articles.mjs'
import { wechatArticles } from './wechat-articles.mjs'

const sample = { slug: 'example-article', sourceFile: '2026-01-01-example.md', date: '2026-01-01', title: '示例文章', description: '示例摘要', tags: ['工具使用'] }

test('public body keeps examples while excluding source metadata and editorial comments', () => {
  const output = prepareArticle('---\nstatus: published\n---\n<!-- SEO notes -->\n# 原标题\n\n我是良逍，产品经理，记录工具。\n\n<!-- 建议配图：内部说明 -->\n正文。\n\n```sh\n# command comment\n```\n![图片|600](https://example.com/image.png)', sample)
  assert(!output.includes('SEO notes'))
  assert(!output.includes('内部说明'))
  assert(!output.includes('# 原标题'))
  assert(output.includes('我是良逍，做产品，'))
  assert(output.includes('# command comment'))
  assert(output.includes('![图片](https://example.com/image.png)'))
  const withoutAccountCapture = prepareArticle('正文\n![截图](https://example.com/account.png)\n![图解](https://example.com/diagram.png)', { ...sample, omitImages: ['https://example.com/account.png'] })
  assert(!withoutAccountCapture.includes('account.png'))
  assert(withoutAccountCapture.includes('diagram.png'))
})

test('incomplete sources, local paths and active embedded content cannot be imported', () => {
  for (const body of ['[后续阅读](待替换：公众号链接)', 'file:///Users/example/private.png', '<script>alert(1)</script>', '[链接](javascript:alert)', '[链接](https://user:password@example.com)', '[链接](//example.com)', '尚未发布']) {
    assert.throws(() => prepareArticle(body, sample))
  }
  assert.throws(() => prepareArticle('正文', { ...sample, sourceFile: '../private.md' }))
  assert.throws(() => prepareArticle('正文', { ...sample, replacements: [['不存在的文本', '替换']] }))
})

async function fixture() {
  assert(process.env.XWR_SCRATCH, 'Run these file tests through workflow-runner')
  const root = await mkdtemp(join(process.env.XWR_SCRATCH, 'wechat-sync-'))
  const sourceDirectory = join(root, 'source')
  const outputDirectory = join(root, 'output')
  await mkdir(sourceDirectory)
  for (const article of wechatArticles) {
    const correction = article.replacements?.map(([before]) => before).join('\n') ?? ''
    await writeFile(join(sourceDirectory, article.sourceFile), `# 标题\n\n公开正文。${correction}\n`)
  }
  return { sourceDirectory, outputDirectory }
}

test('check mode does not write; subsequent sync preserves existing curated text', async () => {
  const options = await fixture()
  const check = await syncArticles(options)
  assert.equal(check.added.length, wechatArticles.length)
  await assert.rejects(access(options.outputDirectory))
  await syncArticles({ ...options, write: true })
  const path = join(options.outputDirectory, `${wechatArticles[0].slug}.md`)
  const curated = `${await readFile(path, 'utf8')}\n网站人工补充。\n`
  await writeFile(path, curated)
  const repeat = await syncArticles({ ...options, write: true })
  assert.equal(repeat.added.length, 0)
  assert.equal(repeat.preserved.length, wechatArticles.length)
  assert.equal(await readFile(path, 'utf8'), curated)
  await writeFile(path, curated.replace('source:', 'wrongSource:'))
  await assert.rejects(syncArticles({ ...options, write: true }), /identity mismatch/)
})

test('a later invalid article prevents a partially imported batch', async () => {
  const options = await fixture()
  await writeFile(join(options.sourceDirectory, wechatArticles.at(-1).sourceFile), '[链接](待替换：公众号链接)')
  await assert.rejects(syncArticles({ ...options, write: true }))
  await assert.rejects(access(options.outputDirectory))
})
