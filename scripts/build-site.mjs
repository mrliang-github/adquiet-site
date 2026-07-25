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
    <p class="footer-copy">© 2026 良逍 · 把想法做成东西，再把过程写下来。</p>
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
  <p class="writing-side">公众号已发布稿的静态存档。<br><a class="entry-link" href="/writing/${article.slug}/">读全文</a></p>
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
    title: "把想法做成东西",
    description: "良逍的个人主页：记录 AI 产品、独立开发、工具和从想法到上线的过程。",
    body: `<main id="content" class="site-main">
  <div class="site-shell">
    <section class="home-intro" aria-labelledby="home-title">
      <div>
        <p class="home-kicker">LIANGXIAO / PERSONAL WORKBENCH</p>
        <h1 id="home-title" class="home-title">把想法<br>做成<em>东西</em>，<br>再把过程写下来。</h1>
        <p class="home-deck">设计出身的产品经理，主业做跨境电商 CMS/ERP；业余用 AI 做 iOS 和 Web 产品，也把一路上的选择、卡点和工作流留下来。</p>
        <div class="home-links">
          <a class="button-link" href="/writing/">从写作开始</a>
          <a class="button-link button-link--quiet" href="/tools/">看做过的工具</a>
        </div>
      </div>
      <aside class="home-meta">
        <span class="home-meta-title">THIS SITE</span>
        <p>不是产品货架。<br>这里放正在做的事、已经上线的工具，和那些还在继续验证的想法。</p>
        <p><a href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">在 X 关注公开构建</a></p>
      </aside>
    </section>

    <section class="section home-grid" aria-labelledby="now-heading">
      <div>
        <div class="section-head">
          <div><p class="section-kicker">NOW / 2026.07</p><h2 id="now-heading" class="section-title">这会儿在做的事</h2></div>
          <a class="section-link" href="/building/">完整记录</a>
        </div>
        ${currentNotes}
      </div>
      <aside class="home-side-note">
        <p>公开构建不是把每一步都做成公告，而是把我愿意复盘的工作留下来：做了什么、为什么这么做、哪些结论还要继续验证。</p>
        <p class="rule-note">X 的单条更新会在有可核验链接后再同步到这里。</p>
      </aside>
    </section>

    <section class="section" aria-labelledby="writing-heading">
      <div class="section-head">
        <div><p class="section-kicker">WRITING</p><h2 id="writing-heading" class="section-title">最近写下来的</h2></div>
        <a class="section-link" href="/writing/">全部文章</a>
      </div>
      <ol class="writing-list">${featuredWriting}</ol>
    </section>

    <section class="section" aria-labelledby="tools-heading">
      <div class="section-head">
        <div><p class="section-kicker">TOOLS &amp; PRODUCTS</p><h2 id="tools-heading" class="section-title">做过的工具，不放大成产品矩阵</h2></div>
        <a class="section-link" href="/tools/">全部工具</a>
      </div>
      <ol class="tool-list">${tools.slice(0, 3).map(toolRow).join("")}</ol>
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
      <div><p class="page-kicker">WRITING / 公众号已发布稿</p><h1 class="page-heading">把正在发生的事，写成可以回看的东西。</h1><p class="page-lede">这里同步的是已经发布的公众号文章。内容先在自己的笔记库里完成，再整理成对外可读的版本。</p></div>
      <aside class="page-aside"><p>当前收录 ${articles.length} 篇。</p><p>文章不追求结论先行；更想留下真实的过程、选择和仍待验证的部分。</p></aside>
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
  <footer class="article-footer"><p>本文由已发布的公众号稿静态同步；其中的时间、状态和结论以文章发布日期为准。</p></footer>
</main>`
  });
}

function buildingPage() {
  const entries = buildNotes
    .map(
      (note) => `<li class="build-entry">
      <time class="build-date" datetime="${note.date}">${dateLabel(note.date)}</time>
      <div class="build-body"><p class="entry-kicker">${escapeHtml(note.label)}</p><h3><a href="/writing/${note.articleSlug}/">${escapeHtml(note.title)}</a></h3><p class="build-copy">${escapeHtml(note.description)}</p><a class="entry-link" href="/writing/${note.articleSlug}/">看这次复盘</a></div>
    </li>`
    )
    .join("");

  return documentPage({
    pathname: "/building/",
    title: "在做",
    description: "良逍公开构建中的产品流程、工作流和需求研究记录。",
    body: `<main id="content" class="site-main"><div class="site-shell">
  <header class="page-header"><div><p class="page-kicker">BUILDING IN PUBLIC</p><h1 class="page-heading">把过程摊开一点，判断就会更具体一点。</h1><p class="page-lede">这里不记录每一次提交，而是整理那些值得复盘的构建节点：我怎么把问题拆开、怎么串流程、哪些地方还没有答案。</p></div><aside class="page-aside"><p>目前以文章复盘为主。</p><p>有明确的 X 帖子链接后，会在这里加入精选同步。</p></aside></header>
  <section class="building-intro"><div><h2>公开构建，对我来说不是连续播报。</h2><p>它更像工作笔记的对外版本：不把未发生的结果提前写成战报，也不把还在试的路径装成方法论。</p></div><aside class="building-aside"><p>想看更短的即时更新，可以到 X。</p><a class="text-link" href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">打开 X 主页</a></aside></section>
  <section class="section"><div class="section-head"><div><p class="section-kicker">BUILD LOG</p><h2 class="section-title">最近的构建节点</h2></div><span class="section-count">${buildNotes.length} 条</span></div><ol class="build-log">${entries}</ol></section>
</div></main>`
  });
}

function toolsPage() {
  return documentPage({
    pathname: "/tools/",
    title: "工具",
    description: "良逍公开产品、开源工具和内部工作台的入口。",
    body: `<main id="content" class="site-main"><div class="site-shell">
  <header class="page-header"><div><p class="page-kicker">TOOLS &amp; PRODUCTS</p><h1 class="page-heading">有些工具已经上线，有些只是把自己的麻烦先处理掉。</h1><p class="page-lede">这里放我实际做过、正在维护，或已经公开出来的工具。内部工作台会明确标注，不把登录入口伪装成公开产品。</p></div><aside class="page-aside"><p>对外产品和个人工具在这里集中；各自的独立官网仍保留原路径。</p></aside></header>
  <section class="section"><ol class="tool-list">${tools.map(toolRow).join("")}</ol></section>
</div></main>`
  });
}

function aboutPage() {
  return documentPage({
    pathname: "/about/",
    title: "关于",
    description: "关于良逍：设计出身的产品经理，持续探索 AI 产品、独立开发和出海工具。",
    body: `<main id="content" class="site-main"><div class="site-shell">
  <header class="page-header page-header--compact"><div><p class="page-kicker">ABOUT</p><h1 class="page-heading">先做，再慢慢把自己的方法长出来。</h1><p class="page-lede">我是良逍。这个站点是我做产品、写文章和继续尝试新工具时共用的入口。</p></div><aside class="page-aside"><p>这里记录的是个人项目和公开内容，不是公司官网。</p></aside></header>
  <div class="about-grid"><div><section class="about-block"><h2>我在做什么</h2><p>我是设计出身的产品经理，主业做跨境电商 CMS/ERP。业余时间，我用 AI 做 iOS 和 Web 产品，也在探索出海和个人产品。</p><p>我不太想把每个尝试都包装成一个确定的故事。更愿意把做出来的工具、真实的限制和当时的判断放在一起，后面再看哪些经得起时间。</p></section><section class="about-block"><h2>这个站点怎么用</h2><p><a href="/writing/">写作</a> 是已经发布的长文；<a href="/building/">在做</a> 是构建过程的复盘入口；<a href="/tools/">工具</a> 放产品、开源项目和需要登录的内部工作台。</p><p>如果你也在做 AI 工具、独立开发或出海产品，欢迎从文章或工具开始了解我在折腾什么。</p></section></div><aside class="about-note"><h2>LINKS</h2><p>更即时的公开更新放在 X；代码和开源项目放在 GitHub。</p><ul class="contact-list"><li><span>X</span><a href="${escapeAttribute(site.xProfile)}" target="_blank" rel="noopener noreferrer">@lingxio71220285</a></li><li><span>GITHUB</span><a href="${escapeAttribute(site.githubProfile)}" target="_blank" rel="noopener noreferrer">mrliang-github</a></li></ul></aside></div>
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
    ...paths.map((pathname) => ({
      pathname,
      lastmod: pathname.startsWith("/heatsleuth/") ? "2026-07-25" : "2026-07-24"
    })),
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
