import { copyFile, cp, mkdir, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { CONTENT_KINDS, validateCollection } from "./content-schema.mjs";
import {
  defaultPublicContentDirectory,
  loadPublishedContent,
  readContentCollection
} from "./content-store.mjs";
import { previewCollections } from "./preview-fixtures.mjs";
import { articleSelection, buildNotes, site, tools } from "./site-data.mjs";

const argumentsList = process.argv.slice(2);
const repositoryDirectory = resolve(".");
const contentDirectory = resolve("content/writing");
const valueOptions = new Set(["--output-dir", "--public-content-dir", "--preview-content-dir"]);
const optionValues = new Map();
let previewMode = false;

for (let index = 0; index < argumentsList.length; index += 1) {
  const argument = argumentsList[index];
  if (argument === "--preview") {
    previewMode = true;
    continue;
  }
  if (!valueOptions.has(argument) || optionValues.has(argument)) {
    throw new Error(
      "用法：node scripts/build-bento-site.mjs [--preview --output-dir <目录>] [--public-content-dir <目录>] [--preview-content-dir <目录>]"
    );
  }
  const value = argumentsList[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${argument} 需要一个目录`);
  }
  optionValues.set(argument, value);
  index += 1;
}

const outputDirectory = resolve(optionValues.get("--output-dir") ?? ".");
const publicContentDirectory = resolve(
  optionValues.get("--public-content-dir") ?? defaultPublicContentDirectory
);
const previewContentDirectory = optionValues.has("--preview-content-dir")
  ? resolve(optionValues.get("--preview-content-dir"))
  : null;

if (!previewMode && previewContentDirectory) {
  throw new Error("--preview-content-dir 只能与 --preview 一起使用");
}

const managedRouteManifestPath = ".bento-generated-routes.json";
const managedRouteMarker = "<!-- liangxiao-bento-managed-route -->";
const managedRoutePattern = /^(?:daily|english)\/[a-z0-9]+(?:-[a-z0-9]+)*\/index\.html$/u;

function isWithinDirectory(parentDirectory, candidateDirectory) {
  const pathFromParent = relative(parentDirectory, candidateDirectory);
  return (
    pathFromParent === "" ||
    (!pathFromParent.startsWith(`..${sep}`) && pathFromParent !== ".." && !isAbsolute(pathFromParent))
  );
}

async function resolvedOutputDirectory() {
  let existingAncestor = outputDirectory;
  while (true) {
    try {
      const resolvedAncestor = await realpath(existingAncestor);
      return resolve(resolvedAncestor, relative(existingAncestor, outputDirectory));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const parentDirectory = dirname(existingAncestor);
      if (parentDirectory === existingAncestor) throw error;
      existingAncestor = parentDirectory;
    }
  }
}

async function assertPreviewOutputIsIsolated() {
  if (!previewMode) return;
  if (isWithinDirectory(repositoryDirectory, outputDirectory)) {
    throw new Error("预览构建必须显式使用仓库外的 --output-dir，不能写入正式站点目录或其子目录");
  }

  const [resolvedRepositoryDirectory, resolvedOutput] = await Promise.all([
    realpath(repositoryDirectory),
    resolvedOutputDirectory()
  ]);
  if (isWithinDirectory(resolvedRepositoryDirectory, resolvedOutput)) {
    throw new Error("预览构建的 --output-dir 解析后位于仓库内，不能通过符号链接写入正式站点目录");
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

function sortByEdition(items) {
  return items.toSorted(
    (left, right) =>
      right.editionDate.localeCompare(left.editionDate) || right.id.localeCompare(left.id)
  );
}

function mergePreviewItems(publishedItems, previewItems) {
  const previewIds = new Set(previewItems.map((item) => item.id));
  const previewSlugs = new Set(previewItems.map((item) => item.slug));
  return sortByEdition([
    ...publishedItems.filter(
      (item) => !previewIds.has(item.id) && !previewSlugs.has(item.slug)
    ),
    ...previewItems
  ]);
}

async function loadPreviewItems() {
  if (previewContentDirectory) {
    const collections = await Promise.all(
      CONTENT_KINDS.map((kind) =>
        readContentCollection(previewContentDirectory, kind, {
          requirePublished: true,
          allowPreview: true
        })
      )
    );
    return Object.fromEntries(collections.map((collection) => [collection.kind, collection.items]));
  }

  return Object.fromEntries(
    CONTENT_KINDS.map((kind) => {
      const collection = validateCollection(previewCollections[kind], {
        expectedKind: kind,
        requirePublished: true,
        allowPreview: true
      });
      return [kind, collection.items];
    })
  );
}

async function loadSiteContent() {
  const published = await loadPublishedContent({
    publicDirectory: publicContentDirectory
  });
  if (!previewMode) return published;

  const previews = await loadPreviewItems();
  return {
    dailyReports: mergePreviewItems(published.dailyReports, previews.daily),
    englishLessons: mergePreviewItems(published.englishLessons, previews.english)
  };
}

function dateLabel(value) {
  return value.replaceAll("-", ".");
}

function pageUrl(pathname) {
  return new URL(pathname, site.url).toString();
}

function externalAttributes(isExternal) {
  return isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
}

function parseFrontmatter(source, filename) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/u);
  if (!match) {
    throw new Error(`${filename} is missing generated frontmatter`);
  }

  const metadata = Object.fromEntries(
    match[1].split(/\r?\n/u).map((line) => {
      const separator = line.indexOf(": ");
      if (separator === -1) {
        throw new Error(`${filename} has an invalid frontmatter line: ${line}`);
      }
      return [line.slice(0, separator), JSON.parse(line.slice(separator + 2))];
    })
  );

  return { ...metadata, body: match[2].trim() };
}

function sanitizeArticle(markdown) {
  const rendered = marked.parse(markdown, { async: false, breaks: false, gfm: true });
  return sanitizeHtml(rendered, {
    allowedTags: [
      "a",
      "blockquote",
      "br",
      "code",
      "del",
      "em",
      "figcaption",
      "figure",
      "h2",
      "h3",
      "h4",
      "hr",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "strong",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "ul"
    ],
    allowedAttributes: {
      a: ["href", "title"],
      code: ["class"],
      img: ["alt", "height", "src", "title", "width"]
    },
    allowedSchemes: ["https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    transformTags: {
      a(tagName, attributes) {
        if (!attributes.href) return { tagName: "span", attribs: {} };
        return {
          tagName,
          attribs: {
            href: attributes.href,
            rel: "noopener noreferrer",
            target: "_blank",
            title: attributes.title
          }
        };
      }
    }
  });
}

async function loadArticles() {
  const expectedSlugs = new Set(articleSelection.map((article) => article.slug));
  const filenames = (await readdir(contentDirectory)).filter((filename) => filename.endsWith(".md"));
  const articles = await Promise.all(
    filenames.map(async (filename) => {
      const slug = filename.replace(/\.md$/u, "");
      if (!expectedSlugs.has(slug)) return null;
      const source = await readFile(join(contentDirectory, filename), "utf8");
      return { slug, ...parseFrontmatter(source, filename) };
    })
  );
  const selected = articles.filter(Boolean);
  if (selected.length !== articleSelection.length) {
    const found = new Set(selected.map((article) => article.slug));
    const missing = articleSelection.map((article) => article.slug).filter((slug) => !found.has(slug));
    throw new Error(`Published article archive is incomplete: ${missing.join(", ")}`);
  }
  return selected.toSorted((left, right) => right.date.localeCompare(left.date));
}

function navLink(pathname, label, currentPath) {
  const current = currentPath === pathname ? ' aria-current="page"' : "";
  return `<li><a href="${pathname}"${current}>${label}</a></li>`;
}

function siteHeader(currentPath) {
  // 生成全站标准顶部导航结构，遵循 v1.2 方案固定的四大中文一级栏目与关于页
  return `<a class="skip-link" href="#content">跳到正文</a>
<header class="site-header">
  <nav class="site-nav" aria-label="主导航">
    <a class="site-brand" href="/" aria-label="良逍，返回首页">良逍 <span>AI</span></a>
    <ul class="site-nav-links">
      ${navLink("/writing/", "文章", currentPath)}
      ${navLink("/tools/", "工具", currentPath)}
      ${navLink("/daily/", "风向标日报", currentPath)}
      ${navLink("/english/", "英语学习", currentPath)}
      ${navLink("/about/", "关于", currentPath)}
    </ul>
  </nav>
</header>`;
}

function siteFooter() {
  return `<footer class="site-footer">
  <div class="footer-grid">
    <p class="footer-copy">© 2026 良逍 · 把产品、过程和每天的学习留在这里。</p>
    <ul class="footer-links">
      <li><a href="${escapeAttribute(site.githubProfile)}" target="_blank" rel="noopener noreferrer">GitHub</a></li>
      <li><a href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">X</a></li>
      <li><a href="/rss.xml">RSS</a></li>
    </ul>
  </div>
</footer>`;
}

function documentPage({
  pathname,
  title,
  description,
  currentPath = pathname,
  body,
  scripts = [],
  scriptData = "",
  robots,
  theme = "paper",
  chrome = true
}) {
  const pageTheme = theme === "home" ? "home" : "paper";
  const canonical = pageUrl(pathname);
  const documentTitle = title ? `${title} · ${site.name}` : `${site.name} · ${site.description}`;
  const robotsMeta = robots ? `\n  <meta name="robots" content="${robots}">` : "";
  const scriptsMarkup = [scriptData, ...scripts.map((source) => `<script src="${escapeAttribute(source)}" defer></script>`)]
    .filter(Boolean)
    .join("\n  ");
  const pageChrome = chrome
    ? `${siteHeader(currentPath)}\n  ${body}\n  ${siteFooter()}`
    : `<a class="skip-link" href="#content">跳到正文</a>\n  ${body}`;
  return `<!doctype html>
<html lang="zh-Hans" data-theme="${pageTheme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeAttribute(description)}">
  <meta name="theme-color" content="${pageTheme === "home" ? "#111111" : "#f3f0e8"}">${robotsMeta}
  <title>${escapeHtml(documentTitle)}</title>
  <link rel="canonical" href="${escapeAttribute(canonical)}">
  <link rel="alternate" type="application/rss+xml" title="${site.name} 的 RSS" href="${pageUrl("/rss.xml")}">
  <link rel="stylesheet" href="/site-assets/personal.css">
</head>
<body${pageTheme === "home" ? ' class="page-home"' : ""}>
  ${pageChrome}${scriptsMarkup ? `\n  ${scriptsMarkup}` : ""}
</body>
</html>`;
}

function tagList(tags) {
  return `<ul class="tag-list">${tags.map((tag) => `<li class="tag">${escapeHtml(tag)}</li>`).join("")}</ul>`;
}

function writingItem(article) {
  return `<li class="writing-item">
  <time class="writing-date" datetime="${article.date}">${dateLabel(article.date)}</time>
  <div><h3><a href="/writing/${article.slug}/">${escapeHtml(article.title)}</a></h3><p class="writing-summary">${escapeHtml(article.description)}</p>${tagList(article.tags)}</div>
  <p class="writing-side">已发布文章的静态存档。<br><a class="entry-link" href="/writing/${article.slug}/">读全文</a></p>
</li>`;
}

function compactArticle(article) {
  return `<article class="bento-list-item"><time datetime="${article.date}">${dateLabel(article.date)}</time><h3><a href="/writing/${article.slug}/">${escapeHtml(article.title)}</a></h3><p>${escapeHtml(article.description)}</p></article>`;
}

function toolRow(tool, index) {
  const linkText = tool.external ? "打开" : "查看";
  return `<li class="tool-row"><span class="tool-number">${String(index + 1).padStart(2, "0")}</span><div><p class="entry-kicker">${escapeHtml(tool.category)}</p><h3><a href="${escapeAttribute(tool.href)}"${externalAttributes(tool.external)}>${escapeHtml(tool.name)}</a></h3></div><div><p class="tool-copy">${escapeHtml(tool.description)}</p><span class="tool-status">${escapeHtml(tool.status)}</span></div><div class="tool-action"><a class="entry-link" href="${escapeAttribute(tool.href)}"${externalAttributes(tool.external)}>${linkText}</a></div></li>`;
}

function compactTool(tool) {
  return `<article class="bento-tool-item"><p>${escapeHtml(tool.category)}</p><h3><a href="${escapeAttribute(tool.href)}"${externalAttributes(tool.external)}>${escapeHtml(tool.name)}</a></h3><span>${escapeHtml(tool.status)}</span></article>`;
}

function previewMarker(item) {
  return item.preview ? '<p class="preview-marker">开发预览样稿，未进入 RSS 或站点地图。</p>' : "";
}

function dailyCard(report) {
  // 如果没有已审核发布的公开日报，展示严谨的空状态与栏目说明入口
  if (!report) {
    return `<p class="bento-empty">暂无公开日报。接入可公开素材并通过审核后，会自动出现在这里。</p><a class="card-link" href="/daily/">查看历史归档</a>`;
  }
  // 日报卡片：展示期次、标题、核心摘要以及分流操作（本期详情与历史归档）
  return `<time class="card-date" datetime="${report.editionDate}">最新一期 · ${dateLabel(report.editionDate)}</time>
    <h2><a href="/daily/${escapeAttribute(report.slug)}/">${escapeHtml(report.title)}</a></h2>
    <p>${escapeHtml(report.summary)}</p>
    ${previewMarker(report)}
    <div class="card-actions">
      <a class="card-link primary-cta" href="/daily/${escapeAttribute(report.slug)}/">阅读本期 →</a>
      <a class="card-link" href="/daily/">历史归档</a>
    </div>`;
}

function lessonCallToAction(lesson) {
  // 详情页或列表页用于触发继续练习状态的结构化属性链接
  return `<a class="card-link" data-lesson-cta data-lesson-id="${escapeAttribute(lesson.id)}" data-lesson-revision="${escapeAttribute(lesson.revision ?? "preview")}" href="/english/${escapeAttribute(lesson.slug)}/">开始练习</a>`;
}

function englishCard(lesson) {
  // 英语卡片空状态：不生成伪造的课程数据
  if (!lesson) {
    return `<p class="bento-empty">暂无公开课程。课程发布后会按期次进入这里。</p><a class="card-link" href="/english/">查看英语栏目</a>`;
  }

  // 映射通俗中文难度分级
  const levelLabels = {
    starter: "入门",
    foundation: "基础",
    intermediate: "进阶",
    advanced: "高级"
  };
  const levelText = levelLabels[lesson.level] ?? lesson.level;

  // 提取本节课真实重点表达的例句或正文单句作为纯静态表达预览（首页严格不挂载播放器）
  const firstExpression = lesson.expressions?.[0];
  const matchedSentence = firstExpression?.sentenceId
    ? lesson.sentences?.find((sentence) => sentence.id === firstExpression.sentenceId)
    : lesson.sentences?.[0];

  const previewEn = matchedSentence?.text || firstExpression?.example || "";
  const previewZh = matchedSentence?.translation || firstExpression?.translation || "";

  // 构造静态表达预览面板
  const previewBox = previewEn
    ? `<div class="lesson-preview-box">
        <p class="preview-box-label">本课表达预览</p>
        <p class="preview-en">${escapeHtml(previewEn)}</p>
        ${previewZh ? `<p class="preview-zh">${escapeHtml(previewZh)}</p>` : ""}
      </div>`
    : "";

  return `<time class="card-date" datetime="${lesson.editionDate}">最新课程 · ${dateLabel(lesson.editionDate)}</time>
    <h2><a href="/english/${escapeAttribute(lesson.slug)}/">${escapeHtml(lesson.title)}</a></h2>
    <p class="lesson-goal">${escapeHtml(lesson.goal || lesson.summary)}</p>
    ${previewBox}
    <p class="lesson-meta-foot">${escapeHtml(levelText)} · 预计 ${lesson.durationMinutes} 分钟</p>
    <p class="lesson-hint">课程内支持对话点读与表达练习</p>
    ${previewMarker(lesson)}
    <div class="lesson-actions">
      <a class="card-link primary-cta" data-lesson-cta data-lesson-id="${escapeAttribute(lesson.id)}" data-lesson-revision="${escapeAttribute(lesson.revision ?? "preview")}" href="/english/${escapeAttribute(lesson.slug)}/">开始练习 →</a>
      <a class="card-link" href="/english/">全部课程</a>
    </div>`;
}

function globeMarkup() {
  return `<section class="bento-card bento-card--globe" data-globe aria-labelledby="globe-title">
  <div class="globe-compact">
    <div class="globe-stage"><svg class="globe-canvas" data-globe-canvas viewBox="0 0 480 480" role="img" aria-label="可交互的世界地球，可左右拖动" tabindex="0"><circle cx="240" cy="240" r="202" class="globe-sphere"></circle><path class="globe-grid" d="M38 240h404M240 38v404M88 108c71 38 233 38 304 0M88 372c71-38 233-38 304 0"></path><path class="globe-outline" d="M240 38a202 202 0 1 0 0 404a202 202 0 1 0 0-404"></path></svg></div>
    <div class="globe-copy"><p id="globe-title" class="globe-label">让视野转一转</p><div class="globe-controls" aria-label="地球控制"><button type="button" data-globe-left aria-label="向左旋转地球" title="向左旋转">←</button><button type="button" data-globe-pause aria-label="暂停旋转" aria-pressed="false" title="暂停旋转">Ⅱ</button><button type="button" data-globe-right aria-label="向右旋转地球" title="向右旋转">→</button><button type="button" data-globe-reset aria-label="重置地球方向" title="重置地球方向">↺</button><button type="button" data-globe-retry hidden>重试</button></div></div>
  </div>
  <p class="globe-status sr-only" data-globe-status aria-live="polite">静态地球轮廓已就绪。</p>
</section>`;
}

function homePage({ articles, dailyReports, englishLessons }) {
  const latestDaily = dailyReports[0];
  const latestLesson = englishLessons[0];
  const latestArticle = articles[0];
  const latestBuildNote = buildNotes[0];
  const scripts = ["/site-assets/globe.js"];
  return documentPage({
    pathname: "/",
    title: "个人产品与学习空间",
    description: "良逍的个人空间：作品、实践记录、风向标日报与英语学习。",
    scripts,
    theme: "home",
    chrome: false,
    robots: previewMode ? "noindex, nofollow" : undefined,
    body: `<main id="content" class="site-main bento-main"><div class="site-shell"><div class="bento-grid">
      <section class="bento-card bento-card--identity" aria-labelledby="home-title"><div class="identity-copy"><p class="card-kicker">WELCOME</p><h1 id="home-title">你好，我是良逍。</h1><p>设计出身的产品经理，主业做跨境电商 CMS/ERP。</p><p>业余时间，我用 AI 做 iOS 和 Web 产品，也在探索出海和个人产品。</p><p>把做出来的工具、真实的限制和当时的判断放在一起。</p><div class="identity-links"><a href="/about/">关于我</a><a href="${escapeAttribute(site.githubProfile)}" target="_blank" rel="noopener noreferrer">GitHub</a><a href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">X</a></div></div></section>
      <section class="bento-card bento-card--tools" aria-labelledby="tools-card-title"><div class="card-heading"><p class="card-kicker">PRODUCTS &amp; TOOLS</p><h2 id="tools-card-title">正在用，也在维护</h2></div><div class="bento-tool-list">${tools.map(compactTool).join("")}</div><a class="card-link" href="/tools/">全部工具</a></section>
      <section class="bento-card bento-card--contact" aria-labelledby="contact-card-title"><p class="card-kicker">STAY IN TOUCH</p><h2 id="contact-card-title">一起交流。</h2><p>AI 工具、独立开发，或出海产品。</p><div class="home-contact-links"><a href="${escapeAttribute(site.githubProfile)}" target="_blank" rel="noopener noreferrer">GitHub</a><a href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">X / @lingxio71220285</a></div></section>
      <section class="bento-card bento-card--daily" aria-labelledby="daily-card-title"><p class="card-kicker"><a href="/daily/">WIND NOTES / 风向标日报</a></p><div id="daily-card-title">${dailyCard(latestDaily)}</div></section>
      <section class="bento-card bento-card--work" aria-labelledby="work-card-title"><a class="work-card-link" href="/adquiet/"><img src="/assets/screenshot-home.jpg" alt="AdQuiet 的产品页面截图"><span><small>FEATURED PROJECT</small><strong id="work-card-title">AdQuiet</strong></span></a></section>
      <section class="bento-card bento-card--now" aria-labelledby="now-card-title"><div class="compact-card-head"><p class="card-kicker">NOW</p>${latestBuildNote ? `<time class="card-date" datetime="${latestBuildNote.date}">${dateLabel(latestBuildNote.date)}</time>` : ""}</div>${latestBuildNote ? `<h2 id="now-card-title"><a href="/writing/${latestBuildNote.articleSlug}/">${escapeHtml(latestBuildNote.title)}</a></h2>` : `<h2 id="now-card-title"><a href="/building/">最近在做</a></h2>`}</section>
      <section class="bento-card bento-card--english" aria-labelledby="english-card-title"><p class="card-kicker"><a href="/english/">DAILY ENGLISH / 英语学习</a></p><div id="english-card-title">${englishCard(latestLesson)}</div></section>
      <section class="bento-card bento-card--writing" aria-labelledby="writing-card-title"><p class="card-kicker">WRITING</p>${latestArticle ? `<article class="bento-list-item"><time datetime="${latestArticle.date}">${dateLabel(latestArticle.date)}</time><h2 id="writing-card-title"><a href="/writing/${latestArticle.slug}/">${escapeHtml(latestArticle.title)}</a></h2></article><a class="card-link" href="/writing/">全部文章</a>` : `<h2 id="writing-card-title"><a href="/writing/">浏览文章</a></h2>`}</section>
      <section class="bento-card bento-card--about" aria-labelledby="about-card-title"><p class="card-kicker">ABOUT</p><h2 id="about-card-title"><a href="/about/">产品、工具和过程</a></h2></section>
      ${globeMarkup()}
      <section class="bento-card bento-card--rss" aria-labelledby="rss-card-title"><p class="card-kicker">RSS</p><h2 id="rss-card-title"><a href="/rss.xml">订阅写作</a></h2></section>
      <footer class="bento-card bento-card--footer"><p>© 2026 良逍</p><p><a href="${escapeAttribute(site.githubProfile)}" target="_blank" rel="noopener noreferrer">GitHub</a> · <a href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">X</a></p></footer>
    </div></div></main>`
  });
}

function writingIndexPage(articles) {
  return documentPage({
    pathname: "/writing/",
    title: "文章",
    description: "良逍已发布的文章，关于 AI 产品、独立开发、工具与工作流。",
    robots: previewMode ? "noindex, nofollow" : undefined,
    body: `<main id="content" class="site-main"><div class="site-shell"><header class="page-header"><div><p class="page-kicker">WRITING / 已发布文章</p><h1 class="page-heading">把正在发生的事，写成可以回看的东西。</h1><p class="page-lede">这里同步已经发布的文章，保留当时的过程、选择和仍待验证的部分。</p></div><aside class="page-aside"><p>当前收录 ${articles.length} 篇。</p><p>时间、状态和结论以文章发布日期为准。</p></aside></header><section class="section" aria-label="文章列表"><ol class="writing-list">${articles.map(writingItem).join("")}</ol></section></div></main>`
  });
}

function articlePage(article) {
  return documentPage({
    pathname: `/writing/${article.slug}/`,
    title: article.title,
    description: article.description,
    currentPath: "/writing/",
    robots: previewMode ? "noindex, nofollow" : undefined,
    body: `<main id="content" class="site-main"><header class="article-header"><a class="article-back" href="/writing/">所有文章</a><p class="entry-kicker">已发布文章</p><h1 class="article-title">${escapeHtml(article.title)}</h1><p class="article-summary">${escapeHtml(article.description)}</p><div class="article-meta"><time datetime="${article.date}">${dateLabel(article.date)}</time><span>${article.tags.map(escapeHtml).join(" · ")}</span></div></header><article class="article-content">${sanitizeArticle(article.body)}</article><footer class="article-footer"><p>本文由已发布文章静态同步；其中的时间、状态和结论以文章发布日期为准。</p></footer></main>`
  });
}

function buildingPage() {
  const entries = buildNotes.map((note) => `<li class="build-entry"><time class="build-date" datetime="${note.date}">${dateLabel(note.date)}</time><div class="build-body"><p class="entry-kicker">${escapeHtml(note.label)}</p><h3><a href="/writing/${note.articleSlug}/">${escapeHtml(note.title)}</a></h3><p class="build-copy">${escapeHtml(note.description)}</p><a class="entry-link" href="/writing/${note.articleSlug}/">看这次复盘</a></div></li>`).join("");
  return documentPage({
    pathname: "/building/",
    title: "在做",
    description: "良逍正在构建的产品流程、工作流和需求研究记录。",
    robots: previewMode ? "noindex, nofollow" : undefined,
    body: `<main id="content" class="site-main"><div class="site-shell"><header class="page-header"><div><p class="page-kicker">BUILDING IN PUBLIC</p><h1 class="page-heading">把过程摊开一点，判断就会更具体一点。</h1><p class="page-lede">只整理值得复盘的构建节点，不把未发生的结果提前写成战报。</p></div><aside class="page-aside"><p>目前以文章复盘为主。</p><p>有可核验的公开链接后，才会加入即时更新。</p></aside></header><section class="section"><div class="section-head"><div><p class="section-kicker">BUILD LOG</p><h2 class="section-title">最近的构建节点</h2></div><span class="section-count">${buildNotes.length} 条</span></div><ol class="build-log">${entries}</ol></section></div></main>`
  });
}

function toolsPage() {
  return documentPage({
    pathname: "/tools/",
    title: "工具",
    description: "良逍公开产品和开源工具的入口。",
    robots: previewMode ? "noindex, nofollow" : undefined,
    body: `<main id="content" class="site-main"><div class="site-shell"><header class="page-header"><div><p class="page-kicker">TOOLS &amp; PRODUCTS</p><h1 class="page-heading">有些工具已经上线，有些只是把自己的麻烦先处理掉。</h1><p class="page-lede">这里放实际做过、正在维护，或已经公开出来的工具。每个产品仍保留自己的独立页面。</p></div><aside class="page-aside"><p>这里只展示公开可用的产品和开源工具。</p></aside></header><section class="section"><ol class="tool-list">${tools.map(toolRow).join("")}</ol></section></div></main>`
  });
}

function aboutPage() {
  return documentPage({
    pathname: "/about/",
    title: "关于",
    description: "关于良逍：设计出身的产品经理，持续探索 AI 产品、独立开发和出海工具。",
    robots: previewMode ? "noindex, nofollow" : undefined,
    body: `<main id="content" class="site-main"><div class="site-shell"><header class="page-header page-header--compact"><div><p class="page-kicker">ABOUT</p><h1 class="page-heading">先做，再慢慢把自己的方法长出来。</h1><p class="page-lede">我是良逍。这个站点是我做产品、写文章和继续尝试新工具时共用的入口。</p></div><aside class="page-aside"><p>这里记录个人项目和公开内容。</p></aside></header><div class="about-grid"><div><section class="about-block"><h2>我在做什么</h2><p>我是设计出身的产品经理，主业做跨境电商 CMS/ERP。业余时间，我用 AI 做 iOS 和 Web 产品，也在探索出海和个人产品。</p><p>我更愿意把做出来的工具、真实的限制和当时的判断放在一起，后面再看哪些经得起时间。</p></section><section class="about-block"><h2>这个站点怎么用</h2><p><a href="/writing/">文章</a> 是已经发布的长文；<a href="/building/">在做</a> 是构建过程的复盘入口；<a href="/tools/">工具</a> 放公开产品和开源项目；<a href="/daily/">风向标</a> 与 <a href="/english/">英语</a> 是可持续更新的两个栏目。</p><p>如果你也在折腾 AI 工具、独立开发或出海产品，欢迎来一起交流。</p></section></div><aside class="about-note"><h2>LINKS</h2><p>更即时的公开更新放在 X；代码和开源项目放在 GitHub。</p><ul class="contact-list"><li><span>X</span><a href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">@lingxio71220285</a></li><li><span>GITHUB</span><a href="${escapeAttribute(site.githubProfile)}" target="_blank" rel="noopener noreferrer">mrliang-github</a></li></ul></aside></div></div></main>`
  });
}

function emptyState(title, body) {
  return `<section class="empty-state"><p class="card-kicker">PUBLIC CONTENT</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`;
}

function notFoundPage() {
  return documentPage({
    pathname: "/404.html",
    title: "页面不存在",
    description: "你访问的页面不存在或已移动。",
    robots: "noindex, nofollow",
    body: `<main id="content" class="site-main"><section class="not-found"><p class="page-kicker">404</p><h1>这页不在这里。</h1><p>可能是链接已过期，或内容还没有作为公开快照发布。</p><p class="inline-links"><a class="button-link" href="/">返回首页</a><a class="button-link button-link--quiet" href="/writing/">浏览文章</a></p></section></main>`
  });
}

function dailyListItem(report) {
  return `<article class="content-list-item"><time datetime="${report.editionDate}">${dateLabel(report.editionDate)}</time><div><p class="entry-kicker">${report.preview ? "开发预览样稿" : "风向标日报"}</p><h2><a href="/daily/${report.slug}/">${escapeHtml(report.title)}</a></h2><p>${escapeHtml(report.summary)}</p>${tagList(report.tags)}</div><a class="entry-link" href="/daily/${report.slug}/">阅读</a></article>`;
}

function dailyIndexPage(reports) {
  return documentPage({
    pathname: "/daily/",
    title: "风向标日报",
    description: "良逍整理的公开风向标日报，区分来源事实、个人判断和下一步验证。",
    currentPath: "/daily/",
    robots: previewMode ? "noindex, nofollow" : undefined,
    body: `<main id="content" class="site-main"><div class="site-shell content-shell"><header class="page-header"><div><p class="page-kicker">WIND NOTES / 风向标日报</p><h1 class="page-heading">把看到的线索，整理成下一步能用的判断。</h1><p class="page-lede">只展示已经发布的公开快照。每一期把来源、判断与待验证项分开，修订旧内容不会伪装成新一期。</p></div><aside class="page-aside"><p>首页只读取最新公开期次。</p><p>没有足够且可公开的素材时，会保留空状态。</p></aside></header><section class="content-list" aria-label="日报列表">${reports.length ? reports.map(dailyListItem).join("") : emptyState("暂无公开日报", "栏目、校验与发布流程已经准备好；接入有明确公开权限的素材后才会生成公开期次。")}</section></div></main>`
  });
}

function sourceList(report) {
  return `<ol class="source-list">${report.sources.map((source) => `<li><span>${escapeHtml(source.title)}</span>${source.url ? `<a href="${escapeAttribute(source.url)}" target="_blank" rel="noopener noreferrer">打开来源</a>` : '<em>没有公开链接</em>'}${source.publishedAt ? `<time datetime="${source.publishedAt}">${dateLabel(source.publishedAt)}</time>` : ""}</li>`).join("")}</ol>`;
}

function dailyDetailPage(report, reports) {
  const index = reports.findIndex((item) => item.id === report.id);
  const newer = reports[index - 1];
  const older = reports[index + 1];
  const sourcesById = new Map(report.sources.map((source) => [source.id, source]));
  return documentPage({
    pathname: `/daily/${report.slug}/`,
    title: report.title,
    description: report.summary,
    currentPath: "/daily/",
    robots: previewMode || report.preview ? "noindex, nofollow" : undefined,
    body: `<main id="content" class="site-main"><article class="content-detail reading-shell"><a class="article-back" href="/daily/">返回日报</a><p class="entry-kicker">${report.preview ? "开发预览样稿" : "风向标日报"}</p><h1>${escapeHtml(report.title)}</h1><p class="content-summary">${escapeHtml(report.summary)}</p><div class="content-meta"><time datetime="${report.editionDate}">期次 ${dateLabel(report.editionDate)}</time>${report.updatedAt ? `<time datetime="${report.updatedAt}">修订 ${escapeHtml(report.updatedAt.slice(0, 10))}</time>` : ""}</div>${previewMarker(report)}<section><h2>本期概览</h2><p>${escapeHtml(report.overview)}</p></section><section><h2>重点发现</h2><ol class="finding-list">${report.discoveries.map((discovery) => `<li><h3>${escapeHtml(discovery.title)}</h3><p><strong>发生了什么：</strong>${escapeHtml(discovery.fact)}</p><p><strong>我的判断：</strong>${escapeHtml(discovery.judgement)}</p><p class="source-references">来源：${discovery.sourceIds.map((id) => escapeHtml(sourcesById.get(id)?.title ?? id)).join("、")}</p></li>`).join("")}</ol></section><section><h2>下一步</h2><p>${escapeHtml(report.nextStep)}</p></section><section><h2>可公开的来源</h2>${sourceList(report)}</section><nav class="content-pagination" aria-label="日报导航">${newer ? `<a href="/daily/${newer.slug}/">← 更新一期</a>` : "<span></span>"}<a href="/daily/">全部日报</a>${older ? `<a href="/daily/${older.slug}/">较早一期 →</a>` : "<span></span>"}</nav></article></main>`
  });
}

function englishListItem(lesson) {
  return `<article class="content-list-item english-list-item"><time datetime="${lesson.editionDate}">${dateLabel(lesson.editionDate)}</time><div><p class="entry-kicker">${lesson.preview ? "开发预览课程" : "英语练习"}</p><h2><a href="/english/${lesson.slug}/">${escapeHtml(lesson.title)}</a></h2><p>${escapeHtml(lesson.scenario)} · ${escapeHtml(lesson.level)} · ${lesson.durationMinutes} 分钟</p></div>${lessonCallToAction(lesson)}</article>`;
}

function englishIndexPage(lessons) {
  return documentPage({
    pathname: "/english/",
    title: "英语练习",
    description: "短时、职业情境导向的英语练习：先看懂，再点读、跟读和表达。",
    currentPath: "/english/",
    scripts: lessons.length ? ["/site-assets/lesson-progress.js"] : [],
    robots: previewMode ? "noindex, nofollow" : undefined,
    body: `<main id="content" class="site-main"><div class="site-shell content-shell"><header class="page-header"><div><p class="page-kicker">DAILY ENGLISH / 英语练习</p><h1 class="page-heading">先看懂，再听、跟读和表达。</h1><p class="page-lede">每节课围绕一个具体工作场景。英文默认可见，中文按需展开，点读和进度只保存在当前浏览器。</p></div><aside class="page-aside"><p>每课保留 5 个重点表达。</p><p>完成标记表示一次练习，不等于语言能力结论。</p></aside></header><section class="content-list" aria-label="英语课程">${lessons.length ? lessons.map(englishListItem).join("") : emptyState("暂无公开课程", "课程模板和点读能力已经准备好；通过校验、审核和发布后，课程会出现在这里。")}</section></div></main>`
  });
}

function englishDetailPage(lesson, lessons) {
  const index = lessons.findIndex((item) => item.id === lesson.id);
  const newer = lessons[index - 1];
  const older = lessons[index + 1];
  const playerData = escapeJsonForHtml({ id: lesson.id, revision: lesson.revision ?? "preview", sentences: lesson.sentences });
  return documentPage({
    pathname: `/english/${lesson.slug}/`,
    title: lesson.title,
    description: lesson.summary,
    currentPath: "/english/",
    scripts: ["/site-assets/speech-player.js"],
    scriptData: `<script id="english-player-data" type="application/json">${playerData}</script>`,
    robots: previewMode || lesson.preview ? "noindex, nofollow" : undefined,
    body: `<main id="content" class="site-main"><article class="lesson-detail reading-shell" data-english-player><a class="article-back" href="/english/">返回课程列表</a><p class="entry-kicker">${lesson.preview ? "开发预览课程" : "英语练习"}</p><h1>${escapeHtml(lesson.title)}</h1><p class="content-summary">${escapeHtml(lesson.summary)}</p><div class="lesson-context"><p><strong>场景：</strong>${escapeHtml(lesson.scenario)}</p><p><strong>目标：</strong>${escapeHtml(lesson.goal)}</p><p><strong>适合：</strong>${escapeHtml(lesson.profession)} · ${escapeHtml(lesson.level)} · ${lesson.durationMinutes} 分钟</p></div>${previewMarker(lesson)}<section><div class="lesson-section-head"><div><p class="card-kicker">KEY EXPRESSIONS</p><h2>5 个重点表达</h2></div><button type="button" class="text-button" data-toggle-translations aria-pressed="true">隐藏中文</button></div><ol class="expression-list">${lesson.expressions.map((expression) => `<li><h3>${escapeHtml(expression.phrase)}</h3><p data-translation>${escapeHtml(expression.translation)}</p><p>${escapeHtml(expression.example)}</p><button type="button" class="sentence-button" data-play-sentence="${escapeAttribute(expression.sentenceId)}">点读例句</button></li>`).join("")}</ol></section><section><div class="lesson-section-head"><div><p class="card-kicker">DIALOGUE</p><h2>完整对话</h2></div><div class="player-controls"><label>语速 <select data-playback-rate aria-label="播放语速"><option value="0.8">0.8×</option><option value="1">1.0×</option><option value="1.2">1.2×</option></select></label><button type="button" data-play-all>按句播放</button><button type="button" data-stop>停止</button></div></div><p class="player-status" data-player-status aria-live="polite">点击任一句开始点读。</p><ol class="dialogue-list">${lesson.sentences.map((sentence) => `<li class="english-sentence" data-sentence-id="${escapeAttribute(sentence.id)}"><div><p class="speaker">${escapeHtml(sentence.speaker)}</p><p class="sentence-text">${escapeHtml(sentence.text)}</p><p class="translation" data-translation>${escapeHtml(sentence.translation)}</p></div><button type="button" class="sentence-button" data-play-sentence="${escapeAttribute(sentence.id)}" aria-pressed="false">点读</button></li>`).join("")}</ol></section><section><div class="lesson-section-head"><div><p class="card-kicker">MY TURN</p><h2>轮到你说</h2></div><button type="button" class="text-button" data-mark-complete aria-pressed="false">标记本课完成</button></div><ol class="practice-list">${lesson.practice.map((practice) => `<li><p>${escapeHtml(practice.prompt)}</p><details><summary>查看参考表达</summary><p class="practice-reference">${escapeHtml(practice.referenceAnswer)}</p>${practice.explanation ? `<p class="practice-explanation">${escapeHtml(practice.explanation)}</p>` : ""}</details></li>`).join("")}</ol></section><nav class="content-pagination" aria-label="课程导航">${newer ? `<a href="/english/${newer.slug}/">← 更新课程</a>` : "<span></span>"}<a href="/english/">全部课程</a>${older ? `<a href="/english/${older.slug}/">较早课程 →</a>` : "<span></span>"}</nav></article></main>`
  });
}

function rss(articles) {
  const items = articles.map((article) => {
    const link = pageUrl(`/writing/${article.slug}/`);
    const pubDate = new Date(`${article.date}T00:00:00Z`).toUTCString();
    return `<item><title>${escapeHtml(article.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${pubDate}</pubDate><description>${escapeHtml(article.description)}</description></item>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${site.name} · 写作</title><link>${pageUrl("/writing/")}</link><description>${escapeHtml(site.description)}</description><language>zh-CN</language>${items}</channel></rss>`;
}

function sitemap(articles, dailyReports, englishLessons) {
  const paths = ["/", "/writing/", "/building/", "/tools/", "/about/", "/daily/", "/english/", "/adquiet/", "/heatsleuth/", "/heatsleuth/zh/", "/pdf-snap/support/", "/pdf-snap/privacy/"];
  const entries = [
    ...paths.map((pathname) => ({ pathname, lastmod: pathname.startsWith("/pdf-snap/") ? "2026-07-31" : pathname.startsWith("/heatsleuth/") ? "2026-08-30" : "2026-09-20" })),
    ...articles.map((article) => ({ pathname: `/writing/${article.slug}/`, lastmod: article.date })),
    ...dailyReports.filter((report) => !report.preview).map((report) => ({ pathname: `/daily/${report.slug}/`, lastmod: report.updatedAt?.slice(0, 10) ?? report.editionDate })),
    ...englishLessons.filter((lesson) => !lesson.preview).map((lesson) => ({ pathname: `/english/${lesson.slug}/`, lastmod: lesson.updatedAt?.slice(0, 10) ?? lesson.editionDate }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(({ pathname, lastmod }) => `<url><loc>${pageUrl(pathname)}</loc><lastmod>${lastmod}</lastmod></url>`).join("")}</urlset>`;
}

function outputPath(pathname) {
  const destination = resolve(outputDirectory, pathname);
  if (!isWithinDirectory(outputDirectory, destination)) {
    throw new Error(`拒绝写入输出目录之外的路径：${pathname}`);
  }
  return destination;
}

async function writeRoute(pathname, output) {
  const destination = outputPath(pathname);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${output.trim()}\n`, "utf8");
  console.log(`Built ${pathname}`);
}

async function copyGlobeAssets() {
  const assets = [
    ["node_modules/d3-array/dist/d3-array.min.js", "site-assets/vendor/d3-array.min.js"],
    ["node_modules/d3-geo/dist/d3-geo.min.js", "site-assets/vendor/d3-geo.min.js"],
    ["node_modules/topojson-client/dist/topojson-client.min.js", "site-assets/vendor/topojson-client.min.js"],
    ["node_modules/world-atlas/countries-110m.json", "site-assets/world-110m.json"]
  ];
  await Promise.all(assets.map(async ([source, destination]) => {
    const output = resolve(destination);
    await mkdir(dirname(output), { recursive: true });
    await copyFile(resolve(source), output);
  }));
}

async function copyStaticAssetsForPreview() {
  if (outputDirectory === repositoryDirectory) return;
  await mkdir(outputDirectory, { recursive: true });
  const staticDirectories = previewMode
    ? ["site-assets", "assets", "adquiet", "heatsleuth", "pdf-snap", "privacy", "support", "zh"]
    : ["site-assets", "assets"];
  const staticFiles = previewMode ? ["_headers", "_redirects", ".nojekyll"] : [];
  await Promise.all([
    ...staticDirectories.map((directory) =>
      cp(resolve(directory), join(outputDirectory, directory), { recursive: true, force: true })
    ),
    ...staticFiles.map((file) => copyFile(resolve(file), join(outputDirectory, file)))
  ]);
}

function managedDetailRoute(kind, slug) {
  const pathname = `${kind}/${slug}/index.html`;
  if (!managedRoutePattern.test(pathname)) {
    throw new Error(`拒绝记录不安全的动态详情路由：${pathname}`);
  }
  return pathname;
}

async function readManagedRoutes() {
  try {
    const manifest = JSON.parse(await readFile(outputPath(managedRouteManifestPath), "utf8"));
    if (manifest?.version !== 1 || !Array.isArray(manifest.routes)) {
      console.warn("Ignoring malformed generated-route manifest.");
      return [];
    }
    return [...new Set(manifest.routes.filter((pathname) => managedRoutePattern.test(pathname)))];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    console.warn(`Ignoring unreadable generated-route manifest: ${error.message}`);
    return [];
  }
}

async function removeStaleManagedRoutes(nextRoutes) {
  const nextRouteSet = new Set(nextRoutes);
  const previousRoutes = await readManagedRoutes();
  for (const pathname of previousRoutes) {
    if (nextRouteSet.has(pathname)) continue;
    const destination = outputPath(pathname);
    try {
      const existing = await readFile(destination, "utf8");
      if (!existing.includes(managedRouteMarker)) {
        console.warn(`Skipping non-generated stale route: ${pathname}`);
        continue;
      }
      await rm(destination, { force: true });
      console.log(`Removed stale ${pathname}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

async function main() {
  await assertPreviewOutputIsIsolated();
  const [articles, content] = await Promise.all([loadArticles(), loadSiteContent()]);
  await copyGlobeAssets();
  await copyStaticAssetsForPreview();
  const { dailyReports, englishLessons } = content;
  const robots = previewMode
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\nSitemap: ${pageUrl("/sitemap.xml")}\n`;
  const managedRoutes = [
    ...dailyReports.map((report) => managedDetailRoute("daily", report.slug)),
    ...englishLessons.map((lesson) => managedDetailRoute("english", lesson.slug))
  ];
  const outputs = [
    ["index.html", homePage({ articles, dailyReports, englishLessons })],
    ["writing/index.html", writingIndexPage(articles)],
    ["building/index.html", buildingPage()],
    ["tools/index.html", toolsPage()],
    ["about/index.html", aboutPage()],
    ["daily/index.html", dailyIndexPage(dailyReports)],
    ["english/index.html", englishIndexPage(englishLessons)],
    ["rss.xml", rss(articles)],
    ["sitemap.xml", sitemap(articles, dailyReports, englishLessons)],
    ["robots.txt", robots],
    ["404.html", notFoundPage()],
    ...articles.map((article) => [`writing/${article.slug}/index.html`, articlePage(article)]),
    ...dailyReports.map((report) => [
      managedDetailRoute("daily", report.slug),
      `${managedRouteMarker}\n${dailyDetailPage(report, dailyReports)}`
    ]),
    ...englishLessons.map((lesson) => [
      managedDetailRoute("english", lesson.slug),
      `${managedRouteMarker}\n${englishDetailPage(lesson, englishLessons)}`
    ])
  ];
  for (const [pathname, output] of outputs) await writeRoute(pathname, output);
  await removeStaleManagedRoutes(managedRoutes);
  await writeRoute(
    managedRouteManifestPath,
    JSON.stringify({ version: 1, routes: managedRoutes }, null, 2)
  );
}

main().catch((error) => {
  console.error(`Unable to build personal site: ${error.message}`);
  process.exitCode = 1;
});
