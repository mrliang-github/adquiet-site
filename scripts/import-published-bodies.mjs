import { readFile } from "node:fs/promises";
import { collectionPath, defaultPublicContentDirectory, writeJsonAtomic } from "./content-store.mjs";
import { CONTENT_KINDS, contentRevision, validateCollection, validateContent } from "./content-schema.mjs";

// Capture only HTML already selected for this public site, never a private source directory.
const collections = [];
for (const kind of CONTENT_KINDS) {
  const pathname = collectionPath(defaultPublicContentDirectory, kind);
  const collection = JSON.parse(await readFile(pathname, "utf8"));
  for (const item of collection.items) {
    if (item.bodyHtml) continue;
    const route = `${kind}/${item.slug}/index.html`;
    const html = await readFile(route, "utf8");
    let bodyHtml;
    if (kind === "english") {
      bodyHtml = html.match(/<div class="lesson-courseware">\s*([\s\S]*?)\s*<\/div>\s*<nav class="content-pagination"/u)?.[1];
    } else {
      const start = html.indexOf('<section class="daily-ai-view">');
      const end = html.indexOf('<section class="community-recommendation">', start);
      if (start !== -1 && end !== -1) bodyHtml = html.slice(start, end);
    }
    if (!bodyHtml) throw new Error(`缺少已发布的完整正文：${route}`);
    const normalized = validateContent({ ...item, bodyHtml }, { expectedKind: kind });
    Object.assign(item, normalized, { revision: contentRevision(normalized) });
  }
  collections.push([pathname, validateCollection(collection, { expectedKind: kind, requirePublished: true })]);
}
for (const [pathname, collection] of collections) await writeJsonAtomic(pathname, collection);
console.log("已将完整公开正文纳入可校验的内容快照。");
