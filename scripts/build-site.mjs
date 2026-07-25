import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { articleSelection, buildNotes, site, tools } from "./site-data.mjs";

const contentDirectory = resolve("content/writing");

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

      const key = line.slice(0, separator);
      const rawValue = line.slice(separator + 2);
      return [key, JSON.parse(rawValue)];
    })
  );

  return { ...metadata, body: match[2].trim() };
}

function sanitizeArticle(markdown) {
  const rendered = marked.parse(markdown, {
    async: false,
    breaks: false,
    gfm: true
  });

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
        if (!attributes.href) {
          return { tagName: "span", attribs: {} };
        }

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
      if (!expectedSlugs.has(slug)) {
        return null;
      }

      const source = await readFile(join(contentDirectory, filename), "utf8");
      return {
        slug,
        ...parseFrontmatter(source, filename)
      };
    })
  );

  const selectedArticles = articles.filter(Boolean);
  if (selectedArticles.length !== articleSelection.length) {
    const found = new Set(selectedArticles.map((article) => article.slug));
    const missing = articleSelection
      .map((article) => article.slug)
      .filter((slug) => !found.has(slug));
    throw new Error(`Published article archive is incomplete: ${missing.join(", ")}`);
  }

  return selectedArticles.toSorted((left, right) => right.date.localeCompare(left.date));
}

function navLink(pathname, label, currentPath) {
  const current = currentPath === pathname ? ' aria-current="page"' : "";
  return `<li><a href="${pathname}"${current}>${label}</a></li>`;
}

function siteHeader(currentPath) {
  return `<a class="skip-link" href="#content">跳到正文</a>
<header class="site-header">
  <nav class="site-nav" aria-label="主导航">
    <a class="site-brand" href="/" aria-label="良逍，返回首页">良逍</a>
    <ul class="site-nav-links">
      ${navLink("/writing/", "写作", currentPath)}
      ${navLink("/building/", "在做", currentPath)}
      ${navLink("/tools/", "工具", currentPath)}
      ${navLink("/about/", "关于", currentPath)}
    </ul>
  </nav>
</header>`;
}

function siteFooter() {
  return `<footer class="site-footer">
  <div class="footer-grid">
    <p class="footer-copy">© 2026 良逍</p>
    <ul class="footer-links">
      <li><a href="${escapeAttribute(site.githubProfile)}" target="_blank" rel="noopener noreferrer">GitHub</a></li>
      <li><a href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">X</a></li>
      <li><a href="/rss.xml">RSS</a></li>
    </ul>
  </div>
</footer>`;
}

function documentPage({ pathname, title, description, currentPath = pathname, body }) {
  const canonical = pageUrl(pathname);
  const documentTitle = title ? `${title} · ${site.name}` : `${site.name} · ${site.description}`;

  return `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeAttribute(description)}">
  <meta name="theme-color" content="#f3f0e8">
  <title>${escapeHtml(documentTitle)}</title>
  <link rel="canonical" href="${escapeAttribute(canonical)}">
  <link rel="alternate" type="application/rss+xml" title="${site.name} 的 RSS" href="${pageUrl("/rss.xml")}">
  <link rel="stylesheet" href="/site-assets/personal.css">
</head>
<body>
  ${siteHeader(currentPath)}
  ${body}
  ${siteFooter()}
</body>
</html>`;
}

function tagList(tags) {
  return `<ul class="tag-list">${tags
    .map((tag) => `<li class="tag">${escapeHtml(tag)}</li>`)
    .join("")}</ul>`;
}

function writingItem(article) {
  return `<li class="writing-item">
  <time class="writing-date" datetime="${article.date}">${dateLabel(article.date)}</time>
  <div>
    <h3><a href="/writing/${article.slug}/">${escapeHtml(article.title)}</a></h3>
    <p class="writing-summary">${escapeHtml(article.description)}</p>
    ${tagList(article.tags)}
  </div>
  <p class="writing-side">发于公众号。<br><a class="entry-link" href="/writing/${article.slug}/">阅读全文</a></p>
</li>`;
}

function toolRow(tool, index) {
  const statusClass = tool.status === "需要登录" ? " tool-status--internal" : "";
  const linkText = tool.external ? "打开" : "查看";

  return `<li class="tool-row">
  <span class="tool-number">${String(index + 1).padStart(2, "0")}</span>
  <div>
    <p class="entry-kicker">${escapeHtml(tool.category)}</p>
    <h3><a href="${escapeAttribute(tool.href)}"${externalAttributes(tool.external)}>${escapeHtml(tool.name)}</a></h3>
  </div>
  <div>
    <p class="tool-copy">${escapeHtml(tool.description)}</p>
    <span class="tool-status${statusClass}">${escapeHtml(tool.status)}</span>
  </div>
  <div class="tool-action"><a class="entry-link" href="${escapeAttribute(tool.href)}"${externalAttributes(tool.external)}>${linkText}</a></div>
</li>`;
}

function homePage(articles) {
  const featuredWriting = articles.slice(0, 3).map(writingItem).join("");
  const featuredTools = tools.filter((tool) => tool.featured);
  const currentNotes = buildNotes
    .map(
      (note) => `<article class="now-note">
      <span class="now-note-label">${dateLabel(note.date)} / ${escapeHtml(note.label)}</span>
      <h3><a href="/writing/${note.articleSlug}/">${escapeHtml(note.title)}</a></h3>
      <p>${escapeHtml(note.description)}</p>
    </article>`
    )
    .join("");

  return documentPage({
    pathname: "/",
    title: "",
    description: "良逍的个人主页。这里放我写的文章、做过的工具，以及最近在忙的项目。",
    body: `<main id="content" class="site-main">
  <div class="site-shell">
    <section class="home-intro" aria-labelledby="home-title">
      <div>
        <p class="home-kicker">LIANGXIAO / PERSONAL SITE</p>
        <h1 id="home-title" class="home-title">你好，<br>我是<em>良逍</em>。<br>这里放我做的东西。</h1>
        <p class="home-deck">设计出身，现在做产品。白天做跨境电商 CMS/ERP，业余时间写代码，做 iOS App 和 Web 工具。</p>
        <div class="home-links">
          <a class="button-link" href="/writing/">看文章</a>
          <a class="button-link button-link--quiet" href="/tools/">看工具</a>
        </div>
      </div>
      <aside class="home-meta">
        <span class="home-meta-title">ABOUT THIS SITE</span>
        <p>这个域名最早只是 AdQuiet 的官网。后来又有了 App、文章和几个小工具，就慢慢变成了现在这样。</p>
        <p><a href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">去 X 看零碎更新</a></p>
      </aside>
    </section>

    <section class="section home-grid" aria-labelledby="now-heading">
      <div>
        <div class="section-head">
          <div><p class="section-kicker">RECENTLY / 2026.07</p><h2 id="now-heading" class="section-title">最近做了什么</h2></div>
          <a class="section-link" href="/building/">查看更多</a>
        </div>
        ${currentNotes}
      </div>
      <aside class="home-side-note">
        <p>项目做完一段，我会在这里记一笔。更零碎的进度发在 X。</p>
        <p class="rule-note"><a href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">去 X 看看</a></p>
      </aside>
    </section>

    <section class="section" aria-labelledby="writing-heading">
      <div class="section-head">
        <div><p class="section-kicker">WRITING</p><h2 id="writing-heading" class="section-title">最近写的文章</h2></div>
        <a class="section-link" href="/writing/">查看全部</a>
      </div>
      <ol class="writing-list">${featuredWriting}</ol>
    </section>

    <section class="section" aria-labelledby="tools-heading">
      <div class="section-head">
        <div><p class="section-kicker">TOOLS</p><h2 id="tools-heading" class="section-title">做过的工具</h2></div>
        <a class="section-link" href="/tools/">查看全部</a>
      </div>
      <ol class="tool-list">${featuredTools.map(toolRow).join("")}</ol>
    </section>
  </div>
</main>`
  });
}

function writingIndexPage(articles) {
  return documentPage({
    pathname: "/writing/",
    title: "写作",
    description: "良逍已发布的公众号文章：AI 产品、独立开发、工具与工作流。",
    body: `<main id="content" class="site-main">
  <div class="site-shell">
    <header class="page-header">
      <div><p class="page-kicker">WRITING</p><h1 class="page-heading">写过的文章</h1><p class="page-lede">主要写 AI 工具、独立开发和工作流。这里收录的是已经发过的公众号文章。</p></div>
      <aside class="page-aside"><p>当前共 ${articles.length} 篇。</p><p>内容来自我的笔记库。</p></aside>
    </header>
    <section class="section" aria-label="文章列表"><ol class="writing-list">${articles.map(writingItem).join("")}</ol></section>
  </div>
</main>`
  });
}

function articlePage(article) {
  return documentPage({
    pathname: `/writing/${article.slug}/`,
    title: article.title,
    description: article.description,
    currentPath: "/writing/",
    body: `<main id="content" class="site-main">
  <header class="article-header">
    <a class="article-back" href="/writing/">所有文章</a>
    <p class="entry-kicker">公众号已发布稿</p>
    <h1 class="article-title">${escapeHtml(article.title)}</h1>
    <p class="article-summary">${escapeHtml(article.description)}</p>
    <div class="article-meta"><time datetime="${article.date}">${dateLabel(article.date)}</time><span>${article.tags.map(escapeHtml).join(" · ")}</span></div>
  </header>
  <article class="article-content">${sanitizeArticle(article.body)}</article>
  <footer class="article-footer"><p>这篇文章同步自公众号，内容按原发布日期保留。</p></footer>
</main>`
  });
}

function buildingPage() {
  const entries = buildNotes
    .map(
      (note) => `<li class="build-entry">
      <time class="build-date" datetime="${note.date}">${dateLabel(note.date)}</time>
      <div class="build-body"><p class="entry-kicker">${escapeHtml(note.label)}</p><h3><a href="/writing/${note.articleSlug}/">${escapeHtml(note.title)}</a></h3><p class="build-copy">${escapeHtml(note.description)}</p><a class="entry-link" href="/writing/${note.articleSlug}/">读这篇</a></div>
    </li>`
    )
    .join("");

  return documentPage({
    pathname: "/building/",
    title: "在做",
    description: "良逍最近做项目时留下的记录。",
    body: `<main id="content" class="site-main"><div class="site-shell">
  <header class="page-header"><div><p class="page-kicker">BUILDING</p><h1 class="page-heading">最近做过的几件事</h1><p class="page-lede">最近在处理 App 送审，也整理了飞书账号和小红书评论采集流程。</p></div><aside class="page-aside"><p>长一点的记录放这里，零碎进度在 X。</p><p><a class="text-link" href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">去 X 看看</a></p></aside></header>
  <section class="section"><div class="section-head"><div><p class="section-kicker">NOTES</p><h2 class="section-title">最近的记录</h2></div><span class="section-count">${buildNotes.length} 条</span></div><ol class="build-log">${entries}</ol></section>
</div></main>`
  });
}

function toolsPage() {
  return documentPage({
    pathname: "/tools/",
    title: "工具",
    description: "良逍做过的 Mac 应用、Chrome 插件、在线工具和开源项目。",
    body: `<main id="content" class="site-main"><div class="site-shell">
  <header class="page-header"><div><p class="page-kicker">TOOLS</p><h1 class="page-heading">做过的一些工具</h1><p class="page-lede">这里目前有四个项目：Mac 应用、Chrome 插件、在线排版工具和开源 OCR 工具。</p></div><aside class="page-aside"><p>HeatSleuth 和 AdQuiet 有自己的介绍页；另外两个可以直接打开。</p></aside></header>
  <section class="section"><ol class="tool-list">${tools.map(toolRow).join("")}</ol></section>
</div></main>`
  });
}

function aboutPage() {
  return documentPage({
    pathname: "/about/",
    title: "关于",
    description: "良逍，设计出身的产品经理，业余做 iOS App 和 Web 工具。",
    body: `<main id="content" class="site-main"><div class="site-shell">
  <header class="page-header page-header--compact"><div><p class="page-kicker">ABOUT</p><h1 class="page-heading">你好，我是良逍。</h1><p class="page-lede">设计出身，现在做产品。</p></div><aside class="page-aside"><p>主业是跨境电商 CMS/ERP，业余做 iOS App 和 Web 工具。</p></aside></header>
  <div class="about-grid"><div><section class="about-block"><h2>最近的项目</h2><p>最近做了 HeatSleuth，一款查看 Mac 发热原因的菜单栏工具。更早一些还做过 AdQuiet、MD 排版和 Mac 发票 OCR。</p></section><section class="about-block"><h2>这个网站</h2><p>这个域名最早只是为了给 AdQuiet 放一个官网。后来又做了 HeatSleuth，写的文章和小工具也越来越多，于是把根目录改成了个人主页。</p><p><a href="/writing/">写作</a> 里是发过的公众号文章，<a href="/building/">在做</a> 里是最近的项目记录，<a href="/tools/">工具</a> 里列着做过的产品和小工具。</p></section></div><aside class="about-note"><h2>LINKS</h2><p>零碎更新在 X，代码和开源项目在 GitHub。</p><ul class="contact-list"><li><span>X</span><a href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">@lingxio71220285</a></li><li><span>GITHUB</span><a href="${escapeAttribute(site.githubProfile)}" target="_blank" rel="noopener noreferrer">mrliang-github</a></li></ul></aside></div>
</div></main>`
  });
}

function rss(articles) {
  const items = articles
    .map((article) => {
      const link = pageUrl(`/writing/${article.slug}/`);
      const pubDate = new Date(`${article.date}T00:00:00Z`).toUTCString();
      return `<item><title>${escapeHtml(article.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${pubDate}</pubDate><description>${escapeHtml(article.description)}</description></item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${site.name} · 写作</title><link>${pageUrl("/writing/")}</link><description>${escapeHtml(site.description)}</description><language>zh-CN</language>${items}</channel></rss>`;
}

function sitemap(articles) {
  const paths = ["/", "/writing/", "/building/", "/tools/", "/about/", "/adquiet/", "/heatsleuth/", "/heatsleuth/zh/"];
  const entries = [
    ...paths.map((pathname) => ({ pathname, lastmod: "2026-07-24" })),
    ...articles.map((article) => ({ pathname: `/writing/${article.slug}/`, lastmod: article.date }))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries
    .map(({ pathname, lastmod }) => `<url><loc>${pageUrl(pathname)}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join("")}</urlset>`;
}

async function writeRoute(pathname, output) {
  const outputPath = resolve(pathname);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${output.trim()}\n`, "utf8");
  console.log(`Built ${pathname}`);
}

async function main() {
  const articles = await loadArticles();
  const outputs = [
    ["index.html", homePage(articles)],
    ["writing/index.html", writingIndexPage(articles)],
    ["building/index.html", buildingPage()],
    ["tools/index.html", toolsPage()],
    ["about/index.html", aboutPage()],
    ["rss.xml", rss(articles)],
    ["sitemap.xml", sitemap(articles)],
    [
      "robots.txt",
      `User-agent: *\nAllow: /\nSitemap: ${pageUrl("/sitemap.xml")}\n`
    ],
    ...articles.map((article) => [
      `writing/${article.slug}/index.html`,
      articlePage(article)
    ])
  ];

  for (const [pathname, output] of outputs) {
    await writeRoute(pathname, output);
  }
}

main().catch((error) => {
  console.error(`Unable to build personal site: ${error.message}`);
  process.exitCode = 1;
});
