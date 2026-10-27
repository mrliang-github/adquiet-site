import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { resolve, join, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { wechatArticles } from './wechat-articles.mjs'

export function prepareArticle(source, article) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) throw new Error('Invalid article slug')
  if (basename(article.sourceFile) !== article.sourceFile || !article.sourceFile.startsWith(`${article.date}-`)) {
    throw new Error(`Invalid published source: ${article.slug}`)
  }
  let body = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
    .replace(/^---\n[\s\S]*?\n---\n*/, '')
    .replace(/<!--[\s\S]*?-->/g, '').trim()
    .replace(/^#\s+[^\n]+\n+/, '')
    .replace(/!\[([^\]\n|]*)(?:\|[^\]\n]*)?\]\(/g, '![$1](')
    .replaceAll('我是良逍，产品经理，', '我是良逍，做产品，')
    .replaceAll('现在做产品经理', '现在做产品')
    .replaceAll('设计出身的产品经理', '设计出身，现在做产品')
  for (const [before, after] of article.replacements ?? []) {
    if (!body.includes(before)) throw new Error(`Source correction no longer matches: ${article.slug}`)
    body = body.replaceAll(before, after)
  }
  body = body.replace(/!\[[^\]]*\]\(([^\s)]+)\)/g, (image, url) => article.omitImages?.includes(url) ? '' : image)
  // Fail closed on incomplete/editorial content; never silently publish a draft.
  if (/(?:待替换[：:]|\/Users\/|file:\/\/|preview-only|未发布|建议配图[：:]|标题备选[：:]|核心关键词[：:])/i.test(body)) {
    throw new Error(`Unresolved editorial content: ${article.slug}`)
  }
  if (/<(?:script|iframe|object|embed|form)\b|\bon\w+\s*=|(?:javascript|vbscript|data):/i.test(body)) {
    throw new Error(`Unsafe embedded content: ${article.slug}`)
  }
  const links = [...body.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)].map(m => m[1])
  for (const href of links) {
    if (href.startsWith('/') && !href.startsWith('//') || href.startsWith('#')) continue
    let url
    try { url = new URL(href) } catch { throw new Error(`Invalid article link: ${article.slug}`) }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`Unsafe article link: ${article.slug}`)
  }
  const fields = {
    title: article.title,
    publishDate: article.date,
    description: article.description,
    tags: article.tags,
    sourcePlatform: '微信公众号',
    source: article.sourceFile,
  }
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n${body.trim()}\n`
}

export async function syncArticles({ sourceDirectory, outputDirectory, write = false }) {
  const slugs = new Set()
  const prepared = []
  // Validate the whole selected batch before creating any files.
  for (const article of wechatArticles) {
    if (slugs.has(article.slug)) throw new Error(`Duplicate slug: ${article.slug}`)
    slugs.add(article.slug)
    const source = await readFile(join(sourceDirectory, article.sourceFile), 'utf8')
    const output = prepareArticle(source, article)
    const path = join(outputDirectory, `${article.slug}.md`)
    const exists = await access(path).then(() => true, error => {
      if (error.code !== 'ENOENT') throw error
      return false
    })
    if (exists) {
      const current = await readFile(path, 'utf8')
      if (!current.includes(`source: ${JSON.stringify(article.sourceFile)}`) ||
          !current.includes(`publishDate: ${JSON.stringify(article.date)}`)) {
        throw new Error(`Existing article identity mismatch: ${article.slug}`)
      }
    }
    prepared.push({ path, output, slug: article.slug, exists })
  }
  if (write) {
    await mkdir(outputDirectory, { recursive: true })
    for (const item of prepared.filter(item => !item.exists)) {
      await writeFile(item.path, item.output, { flag: 'wx' })
    }
  }
  return { mode: write ? 'write' : 'check', total: prepared.length,
    added: prepared.filter(item => !item.exists).map(item => item.slug),
    preserved: prepared.filter(item => item.exists).map(item => item.slug) }
}

async function main() {
  const args = process.argv.slice(2)
  const sourceIndex = args.indexOf('--source')
  if (sourceIndex < 0 || !args[sourceIndex + 1] || args[sourceIndex + 1].startsWith('--')) {
    throw new Error('Usage: node scripts/sync-wechat-articles.mjs --source <published-directory> [--write]')
  }
  const permitted = args.filter((_, i) => i !== sourceIndex && i !== sourceIndex + 1)
  if (permitted.some(arg => arg !== '--write')) throw new Error('Unknown argument')
  console.log(JSON.stringify(await syncArticles({
    sourceDirectory: resolve(args[sourceIndex + 1]),
    outputDirectory: resolve('src/content/blog'),
    write: args.includes('--write'),
  }), null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
