// 引入 Node.js 原生模块：文件读写与路径处理
import sanitizeHtml from "sanitize-html";
import { fileURLToPath } from "node:url";
import { parseDialogueLiteral } from "./dialogue-literal.mjs";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
// 引入内容模式校验器与哈希计算函数
import { contentRevision, validateCollection, validateContent } from "./content-schema.mjs";
// 引入原子化写入与集合路径工具
import { collectionPath, defaultPublicContentDirectory, readContentCollection, writeJsonAtomic } from "./content-store.mjs";

// 定义英语课程源目录
const englishSourceDirectory = "/Users/mrliang/WorkBuddy/automation-2026-09-01-12-53-24/outputs";

/**
 * 辅助函数：将字符串转换为小写 kebab-case 格式的 URL slug 或标识符
 * @param {string} text - 待转换文本
 * @returns {string} 转换后的 kebab-case 字符串
 */
function slugify(text) {
  // 转为小写，移除除了字母、数字、空白和连字符以外的特殊字符
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gu, "")
    .trim()
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-");
}

/**
 * 从 HTML 课程源文件中解析出满足 Schema 规范的英语课程对象
 * @param {string} filePath - 课程 HTML 文件完整路径
 * @param {string} date - 期次日期 (YYYY-MM-DD)
 * @returns {Promise<object>} 结构化英语课程对象
 */
export async function parseEnglishLesson(filePath, date) {
  // 读取 HTML 文件全部内容
  const html = await readFile(filePath, "utf8");

  // 1. 提取中英文标题
  const h1Match = html.match(/<h1>(.*?)<span class="en">(.*?)<\/span><\/h1>/su);
  // 中文主标题
  const cnTitle = h1Match ? h1Match[1].trim() : "";
  // 英文副标题
  const enTitle = h1Match ? h1Match[2].trim() : "";
  // 完整合成标题
  const title = `${cnTitle} · ${enTitle}`;
  // 基于英文副标题生成规范的 URL slug（2026-09-21 保持既有已发布的永久链接一致）
  const slug = date === "2026-09-21" ? "following-up-on-overdue-invoice" : slugify(enTitle);

  // 2. 提取 Meta 信息（职业与沟通动作）
  const metaMatch = html.match(/<div class="meta">(.*?)<\/div>/su);
  const metaText = metaMatch ? metaMatch[1] : "";
  // 提取职业信息并去除多余括号说明
  const professionMatch = metaText.match(/职业：(.*?)(?:·|$)/u);
  const profession = professionMatch
    ? professionMatch[1].replace(/（.*?）/gu, "").trim()
    : "独立开发者 / AI 内容创作者";

  // 3. 提取任务目标
  const taskMatch = html.match(/<p class="task">(?:Today's task:\s*)?(.*?)<\/p>/su);
  const goal = taskMatch ? taskMatch[1].trim() : "";

  // 4. 提取场景背景（从 Setup 区域的 Where 段落提取）
  const setupWhereMatch = html.match(/<h3>Where<\/h3>\s*<p class="en">(.*?)<\/p>/su);
  const scenario = setupWhereMatch
    ? setupWhereMatch[1].trim().slice(0, 150)
    : goal.slice(0, 150);

  // 5. 生成简明摘要
  const summary = `练习在「${cnTitle}」场景下，用清晰、地道、专业的英语展开有效沟通。`;

  // 6. 提取对白脚本中的 JSON 数据
  const dialogueMatch = html.match(/const dialogue = (\[.*?\]);/su);
  if (!dialogueMatch) {
    throw new Error(`在文件 ${filePath} 中未能找到对白 dialogue 数据`);
  }
  const dialogueRaw = parseDialogueLiteral(dialogueMatch[1]);

  // 映射为 Schema 标准的 sentences 数组，统一使用小写 id (l1, l2, ...)
  const sentences = dialogueRaw.map((dialogueItem, index) => ({
    // 句子唯一标识符
    id: `l${index + 1}`,
    // 说话角色
    speaker: dialogueItem.speaker.trim(),
    // 英文文本
    text: dialogueItem.en.trim(),
    // 中文翻译
    translation: dialogueItem.cn.trim()
  }));

  // 7. 提取重点表达（严格提取 5 个）
  const exprRegex = /<div class="expr">\s*<h3>(.*?)(?:<span class="ipa">.*?<\/span>)?<\/h3>(.*?)<\/div>/gsu;
  const expressions = [];
  let exprMatch;
  while ((exprMatch = exprRegex.exec(html)) !== null) {
    // 提取短语名称
    const rawPhrase = plainText(exprMatch[1].replace(/<span\b[^>]*>[\s\S]*?<\/span>/giu, ""));
    const exprBody = exprMatch[2];
    // 提取核心含义
    const defMatch = exprBody.match(/<p class="def"><strong>核心含义：<\/strong>(.*?)<\/p>/su);
    // 提取换情境例句
    const exampleMatch =
      exprBody.match(/<p class="def"><strong>换情境例句：<\/strong>["“](.*?)["”]/su) ??
      exprBody.match(/<p class="def"><strong>换情境例句：<\/strong>(.*?)<\/p>/su);

    const translation = defMatch ? defMatch[1].replace(/<[^>]+>/gu, "").trim() : "重点表达";
    let example = exampleMatch ? exampleMatch[1].replace(/<[^>]+>/gu, "").trim() : "";
    // 若例句带中文括号解释，剥离中文保留纯英文例句
    if (example.includes("（")) {
      example = example.split("（")[0].trim();
    }
    if (!example) example = rawPhrase;

    // 在对白中匹配该短语出现的句子 ID，做关联绑定
    const lowerPhrase = rawPhrase.toLowerCase().replace(/[^a-z0-9 ]/gu, "");
    let matchedSentenceId = "l1";
    for (const sentence of sentences) {
      if (sentence.text.toLowerCase().includes(lowerPhrase)) {
        matchedSentenceId = sentence.id;
        break;
      }
    }

    // 生成合法标识符 id
    const expressionId = slugify(rawPhrase) || `expr-${expressions.length + 1}`;
    expressions.push({
      id: expressionId,
      phrase: rawPhrase,
      translation: translation.slice(0, 160),
      example: example.slice(0, 300),
      sentenceId: matchedSentenceId
    });
  }

  // 8. 提取演练题目（My Turn）
  const myTurnBodyMatch = html.match(/<div class="my-turn-body">(.*?)<\/div>\s*<\/section>/su);
  const practice = [];
  if (myTurnBodyMatch) {
    const body = myTurnBodyMatch[1];
    // 提取场景情境
    const situationMatch = body.match(/<strong>Situation:<\/strong>\s*(.*?)(?:<\/p>|$)/su);
    // 提取对方说的话
    const theySayMatch = body.match(/<strong>They say:<\/strong>\s*(.*?)(?:<\/p>|$)/su);
    // 提取轮到你的要求
    const yourTurnMatch = body.match(/<strong>Your turn:<\/strong>\s*(.*?)(?:<\/p>|$)/su);
    // 提取英文参考答案
    const answerMatch = body.match(/<p class="en-line"[^>]*>(.*?)<\/p>/su);
    // 提取解析思路
    const explanationMatch = body.match(/<p><em>思路：<\/em>(.*?)<\/p>/su);

    // 组合演练题目 prompt
    const prompt = [
      situationMatch ? situationMatch[1].replace(/<[^>]+>/gu, "").trim() : "",
      theySayMatch ? `对方说: ${theySayMatch[1].replace(/<[^>]+>/gu, "").trim()}` : "",
      yourTurnMatch ? `你的任务: ${yourTurnMatch[1].replace(/<[^>]+>/gu, "").trim()}` : ""
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 400);

    const referenceAnswer = answerMatch
      ? answerMatch[1].replace(/<[^>]+>/gu, "").trim().slice(0, 400)
      : "Practice your response out loud.";
    const explanation = explanationMatch
      ? explanationMatch[1].replace(/<[^>]+>/gu, "").trim().slice(0, 400)
      : undefined;

    practice.push({
      prompt: prompt || "练习本课核心沟通动作与句型。",
      referenceAnswer,
      ...(explanation ? { explanation } : {})
    });
  }

  // 组装完整的英文课程对象
  const lesson = {
    schemaVersion: 1,
    kind: "english",
    id: `english-${date}`,
    slug,
    title,
    summary,
    editionDate: date,
    publicationTimeZone: "Asia/Shanghai",
    status: "published",
    preview: false,
    publishedAt: new Date().toISOString(),
    level: "foundation",
    profession,
    scenario,
    goal,
    durationMinutes: 12,
    bodyHtml: html.match(/<body[^>]*>([\s\S]*?)<\/body>/u)?.[1],
    expressions,
    sentences,
    practice
  };

  // 经由 Schema 严格规范化
  const normalized = validateContent(lesson, { expectedKind: "english" });
  // 计算版本指纹 revision
  const revision = contentRevision(normalized);
  return { ...normalized, revision };
}


const dailySourceDirectory = "/Users/mrliang/Projects/项目/生财有术/风向标";

function plainText(html) {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/giu, (entity, name) => {
    if (!name.startsWith("#")) return entities[name.toLowerCase()];
    const point = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  }).replace(/\s+/gu, " ").trim();
}

// Source templates nest divs; a non-greedy match would truncate analyses or cards.
function templateDivs(html, marker) {
  const opening = new RegExp('<div\\b[^>]*\\b(?:id|class)=["\\x27]' + marker + '["\\x27][^>]*>', "giu");
  const result = [];
  for (let match; (match = opening.exec(html));) {
    const tags = /<\/?div\b[^>]*>/giu;
    tags.lastIndex = opening.lastIndex;
    let depth = 1;
    let closing;
    for (let tag; (tag = tags.exec(html));) {
      depth += /^<\/div/iu.test(tag[0]) ? -1 : 1;
      if (depth === 0) { closing = tag; break; }
    }
    if (!closing) throw new Error(`日报模板 ${marker} 未闭合`);
    result.push({ html: html.slice(match.index, tags.lastIndex), inner: html.slice(opening.lastIndex, closing.index) });
    opening.lastIndex = tags.lastIndex;
  }
  return result;
}

function sourceAuthorNames(html) {
  return [...html.matchAll(/<span\b[^>]*class="au"[^>]*>([\s\S]*?)<\/span>/giu)]
    .map(match => plainText(match[1])).filter(Boolean);
}

export function parseDailyReport(html, date, { knownAuthors = [] } = {}) {
  const authors = [...new Set([...sourceAuthorNames(html), ...knownAuthors])];
  let source = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, "");
  const aliases = authors.map((name, index) => [name, `实战作者 ${index + 1}`]).sort((a, b) => b[0].length - a[0].length);
  // Mask text nodes, preserving HTML attributes and ordinary words that contain a nickname.
  source = source.replace(/>([^<]+)</gu, (fragment, text) => {
    for (const [name, alias] of aliases) {
      if (name.length < 2 || /^\d+$/u.test(name)) continue;
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      const suffix = /^[a-z]/iu.test(name) ? '(?![A-Za-z0-9_])' : '';
      text = text.replace(new RegExp('(?<![\\p{L}_])' + escaped + suffix, "gu"), alias);
      text = text.replace(new RegExp('(出自|来自|作者|剔除|只有|被|叠加|加上|注意|表扬|是|为|由|与|和|里|但|且|归|加|把|而|若|的|了)\\s*' + escaped + suffix, "gu"), '$1' + alias);
    }
    return '>' + text + '<';
  });
  const ai = templateDivs(source, "ai-slot")[0]?.inner
    ?? templateDivs(source, "ai-body")[0]?.inner
    ?? templateDivs(source, "ai-view")[0]?.inner;
  const items = templateDivs(source, "item");
  if (!ai || !items.length) throw new Error(`日报 ${date} 缺少完整研判或案例卡片`);
  const table = source.match(/<table\b[^>]*class="iv-table"[^>]*>[\s\S]*?<\/table>/iu)?.[0] ?? "";
  const overview = plainText(ai.match(/<p\b[^>]*>([\s\S]*?)<\/p>/iu)?.[1] ?? ai);
  const sourceId = `daily-insight-${date.replaceAll("-", "")}`;
  const report = validateContent({
    schemaVersion: 1, kind: "daily", id: `daily-${date}`, slug: `daily-${date}`,
    title: `风向标日报 · ${date}`, summary: overview.slice(0, 320), editionDate: date,
    publicationTimeZone: "Asia/Shanghai", status: "published", preview: false,
    publishedAt: new Date().toISOString(), overview: overview.slice(0, 900),
    bodyHtml: `<section class="daily-ai-section"><h2>AI 商业研判与趋势透视</h2><div class="daily-ai-content">${ai}</div></section>
      ${table ? `<section><h2>主题分布</h2><div class="daily-table-wrapper">${table}</div></section>` : ""}
      <section class="daily-items-section"><h2>全部 ${items.length} 条商业线索</h2><div class="daily-items-list">${items.map(item => item.html).join("")}</div></section>`,
    discoveries: items.slice(0, 3).map((item, index) => ({
      id: `case-${index + 1}`,
      title: plainText(item.inner.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/iu)?.[1] ?? "").slice(0, 180),
      fact: (plainText(templateDivs(item.html, "body")[0]?.inner ?? "") || "源日报未提供正文摘要；仅保留标题线索。").slice(0, 700),
      judgement: "案例数据来自素材中的作者自述，未经本站独立审计；先核对同口径证据，再判断可复制性。",
      sourceIds: [sourceId]
    })),
    nextStep: "结合本期研判核对案例证据、投入成本与自身能力，再选择小规模验证动作。",
    tags: [...new Set([...source.matchAll(/<span\b[^>]*class="tag"[^>]*>([\s\S]*?)<\/span>/giu)]
      .map(match => plainText(match[1]).slice(0, 32)).filter(Boolean))].slice(0, 5),
    sources: [{ id: sourceId, title: `每日商业与 AI 趋势观察记录（${date}）`, url: null, publishedAt: date }]
  }, { expectedKind: "daily" });
  return { ...report, revision: contentRevision(report) };
}

export async function syncMaterials({
  englishDirectory = englishSourceDirectory,
  dailyDirectory = dailySourceDirectory,
  publicDirectory = defaultPublicContentDirectory,
  dryRun = false,
  since,
  today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
} = {}) {
  const candidates = [];
  const reports = [];
  for (const [kind, directory, pattern, parse] of [
    ["english", englishDirectory, /^english-lesson-(\d{4}-\d{2}-\d{2})\.html$/u, (html, date, file) => parseEnglishLesson(file, date)],
    ["daily", dailyDirectory, /^风向标日报_(\d{4}-\d{2}-\d{2})\.html$/u, (html, date, file, knownAuthors) => parseDailyReport(html, date, { knownAuthors })]
  ]) {
    const existing = await readContentCollection(publicDirectory, kind, { requirePublished: true });
    const knownDates = new Set(existing.items.map(item => item.editionDate));
    const floor = since ?? [...knownDates].sort()[0] ?? today;
    const files = (await readdir(directory)).flatMap(file => {
      const match = file.match(pattern);
      return match ? [{ file, date: match[1] }] : [];
    }).sort((a, b) => a.date.localeCompare(b.date));
    const eligible = files.filter(item => item.date <= today);
    const rawDaily = new Map();
    const knownAuthors = new Set();
    if (kind === "daily") for (const { file, date } of eligible.filter(item => item.date >= floor)) {
      const html = await readFile(join(directory, file), "utf8");
      rawDaily.set(date, html);
      for (const name of sourceAuthorNames(html)) knownAuthors.add(name);
    }
    const added = [];
    for (const { file, date } of eligible) {
      if (date < floor || knownDates.has(date)) continue;
      const fullPath = join(directory, file);
      try {
        added.push(await parse(kind === "daily" ? rawDaily.get(date) : null, date, fullPath, [...knownAuthors]));
      } catch (error) {
        throw new Error(`${kind} ${date}：${error.message}`);
      }
    }
    const collection = validateCollection({ ...existing, items: [...existing.items, ...added] }, { expectedKind: kind, requirePublished: true });
    candidates.push({ kind, collection, added });
    reports.push({
      kind, sourceLatest: eligible.at(-1)?.date ?? null,
      siteLatest: collection.items.map(item => item.editionDate).sort().at(-1) ?? null,
      added: added.map(item => item.editionDate), total: collection.items.length,
      futureSourcesSkipped: files.length - eligible.length, dryRun
    });
  }
  // Parse and validate both columns before writing either published snapshot.
  if (!dryRun) for (const { kind, collection, added } of candidates) {
    if (added.length) await writeJsonAtomic(collectionPath(publicDirectory, kind), collection);
  }
  return reports;
}

async function main() {
  const options = {};
  const optionNames = new Map([
    ["--english-dir", "englishDirectory"], ["--daily-dir", "dailyDirectory"],
    ["--public-dir", "publicDirectory"], ["--since", "since"]
  ]);
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") { options.dryRun = true; continue; }
    const name = optionNames.get(arg);
    const value = args[++index];
    if (!name || !value || value.startsWith("--")) throw new Error(`无法识别参数或缺少值：${arg}`);
    options[name] = name === "since" ? value : resolve(value);
  }
  if (options.since && (!/^\d{4}-\d{2}-\d{2}$/u.test(options.since)
    || new Date(`${options.since}T00:00:00Z`).toISOString().slice(0, 10) !== options.since)) {
    throw new Error("--since 必须是有效的 YYYY-MM-DD 日期");
  }
  console.log(JSON.stringify(await syncMaterials(options), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => {
    console.error(`素材同步失败：${error.message}`);
    process.exitCode = 1;
  });
}
