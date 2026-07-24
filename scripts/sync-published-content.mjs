import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { articleSelection } from "./site-data.mjs";

const defaultSourceDirectory =
  "/Users/mrliang/Documents/Note/Obsidian Vault/自媒体/03-内容生产/公众号/已发布";
const sourceDirectory = process.env.LIANGXIAO_CONTENT_SOURCE ?? defaultSourceDirectory;
const outputDirectory = resolve("content/writing");

function stripSourceMetadata(markdown) {
  return markdown
    .replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n*/u, "")
    .replace(/^\s*<!--[\s\S]*?-->\s*/u, "")
    .replace(/^#\s+[^\n]+\r?\n+/u, "")
    .replace(/!\[([^\]\n|]*)(?:\|[^\]\n]*)?\]\(/gu, "![$1](")
    .replace(/[ \t]{2,}(?=\r?\n)/gu, "\\")
    .trim();
}

function frontmatter(article) {
  const values = [
    ["title", article.title],
    ["date", article.date],
    ["description", article.description],
    ["cover", article.cover],
    ["tags", article.tags],
    ["source", article.sourceFile]
  ];

  return `---\n${values.map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---\n\n`;
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });

  for (const article of articleSelection) {
    const sourcePath = join(sourceDirectory, article.sourceFile);
    const outputPath = join(outputDirectory, `${article.slug}.md`);
    const source = await readFile(sourcePath, "utf8");
    const output = `${frontmatter(article)}${stripSourceMetadata(source)}\n`;

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output, "utf8");
    console.log(`Synced ${article.slug}`);
  }
}

main().catch((error) => {
  console.error(`Unable to sync published content: ${error.message}`);
  process.exitCode = 1;
});
