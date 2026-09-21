import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import { contentRevision, validateContent } from "../scripts/content-schema.mjs";
import { readContentCollection, upsertPublishedContent } from "../scripts/content-store.mjs";
import { previewCollections } from "../scripts/preview-fixtures.mjs";

const execFileAsync = promisify(execFile);
const projectDirectory = new URL("../", import.meta.url).pathname;

const routes = {
  home: "index.html",
  writing: "writing/index.html",
  building: "building/index.html",
  tools: "tools/index.html",
  about: "about/index.html",
  daily: "daily/index.html",
  englishLearning: "english/index.html",
  notFound: "404.html",
  product: "adquiet/index.html",
  support: "adquiet/support/index.html",
  privacy: "adquiet/privacy/index.html",
  chinesePrivacy: "adquiet/zh/privacy/index.html"
};

const articleSlugs = [
  "codex-app-production-line",
  "two-lark-work-cards",
  "xiaohongshu-comment-intelligence",
  "claude-codex-limit-reset",
  "codex-google-sheets-store-upload",
  "ai-enterprise-prototype-style",
  "codex-figma-site-design",
  "mac-invoice-ocr"
];

const personalRoutes = [
  routes.home,
  routes.writing,
  routes.building,
  routes.tools,
  routes.about,
  routes.daily,
  routes.englishLearning,
  ...articleSlugs.map((slug) => `writing/${slug}/index.html`)
];

const scriptFreePersonalRoutes = [
  routes.writing,
  routes.building,
  routes.tools,
  routes.about,
  routes.daily,
  routes.englishLearning,
  ...articleSlugs.map((slug) => `writing/${slug}/index.html`)
];

const chromeWebStoreUrl =
  "https://chromewebstore.google.com/detail/adquiet/bdcapbcpjlogldlhenkppjamadnmffim?hl=zh-cn";

const heatSleuth = {
  english: "heatsleuth/index.html",
  chinese: "heatsleuth/zh/index.html",
  styles: "heatsleuth/assets/styles.css",
  languageScript: "heatsleuth/assets/language.js",
  englishScreenshot: "heatsleuth/assets/heat-sleuth-overview-en.png",
  chineseScreenshot: "heatsleuth/assets/heat-sleuth-overview.png",
  icon: "heatsleuth/assets/icon.svg",
  download: "heatsleuth/downloads/HeatSleuth-1.0.2-build-5.dmg"
};

const heatSleuthDownloadUrl = "/heatsleuth/downloads/HeatSleuth-1.0.2-build-5.dmg";
const heatSleuthDownloadFilename = "HeatSleuth-1.0.2-build-5.dmg";
const heatSleuthDownloadHash =
  "d59ed4d246fd7f1cfe817b4e81e1f482cd8395342f45d8aeb1bddd024de045b8";
const heatSleuthDownloadSize = 1397131;
const heatSleuthEnglishUrl = "https://liangxiaoaitool.top/heatsleuth/";
const heatSleuthChineseUrl = "https://liangxiaoaitool.top/heatsleuth/zh/";
const pdfSnap = {
  support: "pdf-snap/support/index.html",
  privacy: "pdf-snap/privacy/index.html"
};

async function html(route) {
  return readFile(new URL(`../${route}`, import.meta.url), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function tags(page, name) {
  return page.match(new RegExp(`<${name}\\b[^>]*>`, "giu")) ?? [];
}

function attributeValue(tag, name) {
  const match = tag.match(
    new RegExp(
      `\\b${escapeRegExp(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
      "iu"
    )
  );
  return match?.[1] ?? match?.[2] ?? null;
}

function hasAttribute(tag, name, value) {
  if (value === undefined) {
    return new RegExp(`\\b${escapeRegExp(name)}(?:\\s|=|>|/)`, "iu").test(tag);
  }

  return attributeValue(tag, name) === value;
}

function hasTagWithAttributes(page, name, attributes) {
  return tags(page, name).some((tag) =>
    Object.entries(attributes).every(([attribute, value]) =>
      hasAttribute(tag, attribute, value)
    )
  );
}

function hasSimplifiedChineseAlternate(page) {
  return ["zh-Hans", "zh-CN"].some((hreflang) =>
    hasTagWithAttributes(page, "link", {
      rel: "alternate",
      hreflang,
      href: heatSleuthChineseUrl
    })
  );
}

function scriptBlocks(page) {
  return page.match(/<script\b[^>]*>[\s\S]*?<\/script>/giu) ?? [];
}

function openingTag(block) {
  return block.match(/^<script\b[^>]*>/iu)?.[0] ?? "";
}

function jsonLdNodes(page, route) {
  const payloads = scriptBlocks(page)
    .filter((block) => attributeValue(openingTag(block), "type") === "application/ld+json")
    .map((block) => {
      const body = block.replace(/^<script\b[^>]*>/iu, "").replace(/<\/script>$/iu, "");
      try {
        return JSON.parse(body.trim());
      } catch (error) {
        assert.fail(`${route} contains invalid JSON-LD: ${error.message}`);
      }
    });

  return payloads.flatMap((payload) => {
    const entries = Array.isArray(payload) ? payload : [payload];
    return entries.flatMap((entry) =>
      Array.isArray(entry?.["@graph"]) ? [entry, ...entry["@graph"]] : [entry]
    );
  });
}

function hasSchemaType(node, type) {
  const types = node?.["@type"];
  return Array.isArray(types) ? types.includes(type) : types === type;
}

function visibleCopy(page) {
  return page
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ");
}

test("publishes every required personal-site and AdQuiet route", async () => {
  for (const route of Object.values(routes)) {
    assert.match(await html(route), /<!doctype html>/iu, route);
  }

  for (const route of personalRoutes) {
    assert.match(await html(route), /<!doctype html>/iu, route);
  }
});

test("uses the root route as a Chinese-first personal homepage", async () => {
  const page = await html(routes.home);
  assert.match(page, /<html lang="zh-Hans" data-theme="home">/u);
  assert.match(page, /<body class="page-home">/u);
  assert.match(page, /你好，我是良逍/u);
  assert.match(page, /bento-card--identity/u);
  assert.match(page, /bento-card--work/u);
  assert.match(page, /bento-card--about/u);
  assert.match(page, /bento-card--rss/u);
  assert.match(page, /bento-card--footer/u);
  assert.match(page, /href="\/writing\/"/u);
  assert.match(page, /href="\/tools\/"/u);
  assert.match(page, /href="\/daily\/"/u);
  assert.match(page, /href="\/english\/"/u);
  assert.match(page, /site-assets\/globe\.js/u);
  assert.match(page, /aria-label="地球控制"/u);
  assert.match(page, /class="globe-compact"/u);
  // 验证首页包含规范的四大一级栏目全称
  assert.match(page, /风向标日报/u);
  assert.match(page, /英语学习/u);
  assert.doesNotMatch(page, /<header class="site-header">/u);
  assert.doesNotMatch(page, /别只盯着一个窗口/u);
  assert.doesNotMatch(page, /公司账套工作台/u);
  assert.doesNotMatch(page, /voucher\.liangxiaoaitool\.top/u);
  assert.doesNotMatch(page, /Less interruption\. More watching\./u);

  // 验证内容页通用顶部导航的一级栏目名称
  const aboutPageHtml = await html(routes.about);
  assert.match(aboutPageHtml, /<nav class="site-nav"/u);
  assert.match(aboutPageHtml, /风向标日报/u);
  assert.match(aboutPageHtml, /英语学习/u);
});

test("keeps AdQuiet on its own product route and Chrome Web Store listing", async () => {
  const page = await html(routes.product);
  assert.match(page, /<html lang="en">/u);
  assert.match(page, /Less interruption\. More watching\./u);
  assert.match(page, /Chrome extension for YouTube desktop/u);
  assert.match(page, /href="\/adquiet\/"/u);
  assert.match(page, /Add to Chrome/u);
  assert.ok(page.includes(`href="${chromeWebStoreUrl}" target="_blank"`));
});

test("shows three real extension screenshots with useful alt text", async () => {
  const page = await html(routes.product);
  assert.doesNotMatch(page, /loading="lazy"/u);
  for (const image of [
    "screenshot-home.jpg",
    "screenshot-stats.jpg",
    "screenshot-feedback.jpg"
  ]) {
    assert.match(page, new RegExp(`<img[^>]+${image}[^>]+alt="[^"]+"`, "u"));
  }
});

test("support page offers practical help without collecting sensitive data", async () => {
  const page = await html(routes.support);
  assert.match(page, /AdQuiet Support/u);
  assert.match(page, /Reload the current YouTube watch page/u);
  assert.match(page, /do not include passwords/u);
  assert.match(page, /\.\.\/privacy\//u);
});

test("publishes accurate public PDF Snap support and privacy pages", async () => {
  const [support, privacy] = await Promise.all([
    html(pdfSnap.support),
    html(pdfSnap.privacy)
  ]);

  assert.match(support, /PDF Snap Support/u);
  assert.match(support, /228239753@qq\.com/u);
  assert.match(support, /Core PDF processing runs on your device/u);
  assert.match(privacy, /does not require an account/u);
  assert.match(privacy, /Apple's public App Store lookup service/u);
  assert.match(privacy, /does not include third-party advertising or analytics SDKs/u);
  assert.match(privacy, /PDF Snap 隐私政策/u);
  assert.doesNotMatch(privacy, /记痕/u);
});

test("privacy pages disclose local storage, permissions, and Limited Use", async () => {
  const english = await html(routes.privacy);
  const chinese = await html(routes.chinesePrivacy);
  assert.match(english, /chrome\.storage\.local/u);
  assert.match(english, /Chrome Web Store User Data Policy/u);
  assert.match(english, /https:\/\/www\.youtube\.com\/\*/u);
  assert.match(chinese, /Chrome 应用商店/u);
  assert.match(chinese, /不出售或传输用户个人数据/u);
});

test("generates a complete, script-free published writing archive", async () => {
  const index = await html(routes.writing);
  for (const slug of articleSlugs) {
    assert.match(index, new RegExp(`href="/writing/${slug}/"`, "u"));
  }

  const firstArticle = await html(`writing/${articleSlugs[0]}/index.html`);
  assert.match(firstArticle, /已发布文章/u);
  assert.match(firstArticle, /Codex 一周重置 4 次额度/u);
  assert.match(firstArticle, /https:\/\/img\.liangxiaoaitool\.top\//u);
  assert.ok(tags(firstArticle, "img").length >= 2, "article should retain published images");

  for (const route of scriptFreePersonalRoutes) {
    const page = await html(route);
    assert.doesNotMatch(page, /<script\b/iu, route);
    assert.doesNotMatch(page, /<form\b/iu, route);
    assert.doesNotMatch(page, /on(?:click|load|error)\s*=/iu, route);
  }
});

test("publishes RSS, sitemap, legacy redirects, and responsive safeguards", async () => {
  const [legacyCss, personalCss, rss, sitemap, redirects, robots] = await Promise.all([
    readFile(new URL("../assets/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site-assets/personal.css", import.meta.url), "utf8"),
    html("rss.xml"),
    html("sitemap.xml"),
    html("_redirects"),
    html("robots.txt")
  ]);

  assert.match(legacyCss, /overflow-x:\s*hidden/u);
  assert.match(legacyCss, /\.hero-grid\s*>\s*\*\s*\{\s*min-width:\s*0/u);
  assert.match(personalCss, /color-scheme:\s*light/u);
  assert.match(personalCss, /--paper:\s*#f3f0e8/u);
  assert.match(personalCss, /html\[data-theme="home"\]/u);
  assert.match(personalCss, /grid-template-rows:\s*repeat\(8,/u);
  assert.match(personalCss, /grid-column:\s*1\s*\/\s*span\s*3/u);
  assert.match(personalCss, /overflow-x:\s*hidden/u);
  assert.match(personalCss, /prefers-reduced-motion/u);
  assert.match(personalCss, /touch-action:\s*pan-y\s+pinch-zoom/u);
  assert.match(rss, /<rss version="2\.0">/u);
  assert.match(rss, /codex-app-production-line/u);
  assert.match(sitemap, /https:\/\/liangxiaoaitool\.top\/writing\//u);
  assert.match(sitemap, /https:\/\/liangxiaoaitool\.top\/daily\//u);
  assert.match(sitemap, /https:\/\/liangxiaoaitool\.top\/english\//u);
  assert.doesNotMatch(sitemap, /preview-content-boundaries/u);
  assert.match(sitemap, /https:\/\/liangxiaoaitool\.top\/heatsleuth\//u);
  assert.match(sitemap, /https:\/\/liangxiaoaitool\.top\/pdf-snap\/support\//u);
  assert.match(sitemap, /https:\/\/liangxiaoaitool\.top\/pdf-snap\/privacy\//u);
  assert.match(
    sitemap,
    /<loc>https:\/\/liangxiaoaitool\.top\/heatsleuth\/<\/loc><lastmod>2026-08-30<\/lastmod>/u
  );
  assert.match(
    sitemap,
    /<loc>https:\/\/liangxiaoaitool\.top\/heatsleuth\/zh\/<\/loc><lastmod>2026-08-30<\/lastmod>/u
  );
  assert.match(redirects, /^\/privacy\/ \/adquiet\/privacy\/ 301/mu);
  assert.match(redirects, /^\/support\/ \/adquiet\/support\/ 301/mu);
  assert.match(robots, /User-agent: \*\nAllow: \/\nSitemap:/u);
});

test("keeps the compact desktop homepage card map", async () => {
  const personalCss = await readFile(new URL("../site-assets/personal.css", import.meta.url), "utf8");
  const homepageCss = personalCss.slice(personalCss.indexOf("/* Homepage visual correction"));
  const desktopCss = homepageCss.slice(0, homepageCss.indexOf("@media (max-width: 1024px)"));
  const positions = [
    ["identity", /1\s*\/\s*span\s*3/u, /1\s*\/\s*span\s*4/u],
    ["tools", /4/u, /1\s*\/\s*span\s*6/u],
    ["contact", /1/u, /5\s*\/\s*span\s*4/u],
    ["daily", /2/u, /5\s*\/\s*span\s*2/u],
    ["work", /3/u, /5/u],
    ["now", /3/u, /6/u],
    ["english", /2/u, /7/u],
    ["writing", /3/u, /7/u],
    ["about", /4/u, /7/u],
    ["globe", /2/u, /8/u],
    ["rss", /3/u, /8/u],
    ["footer", /4/u, /8/u]
  ];

  for (const [card, column, row] of positions) {
    const rule = desktopCss.match(
      new RegExp(`\\.page-home \\.bento-card--${card}\\s*\\{([\\s\\S]*?)\\}`, "u")
    );
    assert.ok(rule, `${card} card should have a desktop rule`);
    assert.match(rule[1], new RegExp(`grid-column:\\s*${column.source}\\s*;`, "u"), `${card} column`);
    assert.match(rule[1], new RegExp(`grid-row:\\s*${row.source}\\s*;`, "u"), `${card} row`);
  }
});

test("keeps preview content out of the production build and renders it only in an isolated preview output", async () => {
  const [home, daily, english, sitemap, rss] = await Promise.all([
    html(routes.home),
    html(routes.daily),
    html(routes.englishLearning),
    html("sitemap.xml"),
    html("rss.xml")
  ]);
  for (const page of [home, daily, english, sitemap, rss]) {
    assert.doesNotMatch(page, /栏目预览：把素材、判断和公开范围分开/u);
    assert.doesNotMatch(page, /项目延期时，怎么把下一步说清楚/u);
  }

  const previewDirectory = await mkdtemp(join(tmpdir(), "liangxiao-bento-preview-"));
  const symlinkDirectory = await mkdtemp(join(tmpdir(), "liangxiao-bento-preview-link-"));
  try {
    await assert.rejects(
      execFileAsync(process.execPath, ["scripts/build-bento-site.mjs", "--preview"], {
        cwd: projectDirectory
      }),
      (error) => {
        assert.match(error.stderr, /必须显式使用仓库外/u);
        return true;
      }
    );
    const repositoryLink = join(symlinkDirectory, "back-to-repository");
    await symlink(projectDirectory, repositoryLink);
    await assert.rejects(
      execFileAsync(
        process.execPath,
        ["scripts/build-bento-site.mjs", "--preview", "--output-dir", join(repositoryLink, "preview")],
        { cwd: projectDirectory }
      ),
      (error) => {
        assert.match(error.stderr, /解析后位于仓库内/u);
        return true;
      }
    );
    await assert.rejects(
      execFileAsync(
        process.execPath,
        ["scripts/build-bento-site.mjs", "--preview", "--output-dir", ".preview-must-not-write"],
        { cwd: projectDirectory }
      ),
      (error) => {
        assert.match(error.stderr, /正式站点目录或其子目录/u);
        return true;
      }
    );
    await execFileAsync(
      process.execPath,
      ["scripts/build-bento-site.mjs", "--preview", "--output-dir", previewDirectory],
      { cwd: projectDirectory }
    );
    const [
      previewHome,
      previewDaily,
      previewEnglish,
      previewLesson,
      previewSitemap,
      previewProjectScreenshot,
      previewAdQuiet,
      previewHeatSleuth,
      previewPdfSnap,
      previewRedirects,
      previewRobots
    ] = await Promise.all([
      readFile(join(previewDirectory, "index.html"), "utf8"),
      readFile(join(previewDirectory, "daily/index.html"), "utf8"),
      readFile(join(previewDirectory, "english/index.html"), "utf8"),
      readFile(join(previewDirectory, "english/preview-project-delay/index.html"), "utf8"),
      readFile(join(previewDirectory, "sitemap.xml"), "utf8"),
      readFile(join(previewDirectory, "assets/screenshot-home.jpg")),
      readFile(join(previewDirectory, "adquiet/index.html"), "utf8"),
      readFile(join(previewDirectory, "heatsleuth/index.html"), "utf8"),
      readFile(join(previewDirectory, "pdf-snap/support/index.html"), "utf8"),
      readFile(join(previewDirectory, "_redirects"), "utf8"),
      readFile(join(previewDirectory, "robots.txt"), "utf8")
    ]);
    assert.match(previewHome, /栏目预览：把素材、判断和公开范围分开/u);
    // 验证 v1.2 首页英语卡片：必须包含静态表达预览面板与明确的双操作按钮
    assert.match(previewHome, /本课表达预览/u);
    assert.match(previewHome, /开始练习 →/u);
    assert.match(previewHome, /全部课程/u);
    // 验证 v1.2 首页风向标日报卡片：必须同时包含阅读本期与历史归档双入口
    assert.match(previewHome, /阅读本期 →/u);
    assert.match(previewHome, /历史归档/u);
    // 验证四大栏目名称统一采用规范中文全称
    assert.match(previewHome, /风向标日报/u);
    assert.match(previewHome, /英语学习/u);
    assert.match(previewDaily, /开发预览样稿/u);
    assert.match(previewEnglish, /开发预览课程/u);
    assert.match(previewLesson, /site-assets\/speech-player\.js/u);
    assert.match(previewLesson, /点读例句/u);
    assert.match(previewLesson, /查看参考表达/u);
    assert.match(previewLesson, /We ran into an issue during the final check/u);
    assert.match(previewLesson, /name="robots" content="noindex, nofollow"/u);
    assert.doesNotMatch(previewSitemap, /preview-content-boundaries/u);
    assert.ok(previewProjectScreenshot.byteLength > 0, "preview must include the featured project screenshot");
    assert.match(previewAdQuiet, /Less interruption\. More watching\./u);
    assert.match(previewHeatSleuth, /HeatSleuth/u);
    assert.match(previewPdfSnap, /PDF Snap/u);
    assert.match(previewRedirects, /^\/privacy\/ \/adquiet\/privacy\/ 301/mu);
    assert.match(previewRobots, /User-agent: \*\nDisallow: \/\n/u);
  } finally {
    await rm(previewDirectory, { recursive: true, force: true });
    await rm(symlinkDirectory, { recursive: true, force: true });
  }
});

test("prunes only generator-owned stale daily and English detail routes", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "liangxiao-route-manifest-"));
  const publicDirectory = join(temporaryDirectory, "public");
  const outputDirectory = join(temporaryDirectory, "site");
  const daily = validateContent(
    {
      ...previewCollections.daily.items[0],
      preview: false,
      status: "published"
    },
    { expectedKind: "daily" }
  );
  const publishedDaily = {
    ...daily,
    revision: contentRevision(daily),
    publishedAt: "2026-09-20T09:00:00.000Z",
    updatedAt: "2026-09-20T09:00:00.000Z"
  };
  const generatedRoute = join(outputDirectory, "daily", `${daily.slug}/index.html`);
  const handwrittenRoute = join(outputDirectory, "daily", "handwritten/index.html");

  try {
    await mkdir(publicDirectory, { recursive: true });
    await writeFile(
      join(publicDirectory, "daily-reports.json"),
      JSON.stringify({ schemaVersion: 1, kind: "daily", items: [publishedDaily] }),
      "utf8"
    );
    await writeFile(
      join(publicDirectory, "english-lessons.json"),
      JSON.stringify({ schemaVersion: 1, kind: "english", items: [] }),
      "utf8"
    );
    const buildArguments = [
      "scripts/build-bento-site.mjs",
      "--public-content-dir",
      publicDirectory,
      "--output-dir",
      outputDirectory
    ];
    await execFileAsync(process.execPath, buildArguments, { cwd: projectDirectory });
    assert.match(await readFile(generatedRoute, "utf8"), /liangxiao-bento-managed-route/u);

    await mkdir(join(outputDirectory, "daily", "handwritten"), { recursive: true });
    await writeFile(handwrittenRoute, "keep this manually maintained page\n", "utf8");
    await writeFile(
      join(publicDirectory, "daily-reports.json"),
      JSON.stringify({ schemaVersion: 1, kind: "daily", items: [] }),
      "utf8"
    );
    await execFileAsync(process.execPath, buildArguments, { cwd: projectDirectory });

    await assert.rejects(readFile(generatedRoute, "utf8"), { code: "ENOENT" });
    assert.equal(await readFile(handwrittenRoute, "utf8"), "keep this manually maintained page\n");
    assert.deepEqual(
      JSON.parse(await readFile(join(outputDirectory, ".bento-generated-routes.json"), "utf8")).routes,
      []
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("validates, version-gates, and atomically de-duplicates public content", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "liangxiao-content-pipeline-"));
  const publicDirectory = join(temporaryDirectory, "public");
  try {
    await mkdir(publicDirectory, { recursive: true });
    await writeFile(
      join(publicDirectory, "daily-reports.json"),
      JSON.stringify({ schemaVersion: 1, kind: "daily", items: [] }),
      "utf8"
    );

    const raw = previewCollections.daily.items[0];
    const draft = validateContent({ ...raw, preview: false, status: "draft" }, { expectedKind: "daily" });
    const published = {
      ...draft,
      status: "published",
      preview: false,
      revision: contentRevision(draft),
      publishedAt: "2026-09-20T09:00:00.000Z",
      updatedAt: "2026-09-20T09:00:00.000Z"
    };
    const first = await upsertPublishedContent({ publicDirectory, content: published });
    assert.equal(first.changed, true);
    const repeat = await upsertPublishedContent({ publicDirectory, content: published });
    assert.equal(repeat.changed, false);
    await assert.rejects(
      upsertPublishedContent({
        publicDirectory,
        content: {
          ...published,
          id: "daily-conflicting-edition",
          slug: "conflicting-edition",
          title: "同一期冲突内容",
          revision: undefined
        }
      }),
      /拒绝重复发布/u
    );
    const collection = await readContentCollection(publicDirectory, "daily", {
      requirePublished: true
    });
    assert.equal(collection.items.length, 1);
    assert.throws(
      () => validateContent({ ...draft, editionDate: "2026-02-31" }, { expectedKind: "daily" }),
      /日期/u
    );
    assert.throws(
      () =>
        validateContent(
          { ...previewCollections.english.items[0], revision: 'x" onmouseover="alert(1)' },
          { expectedKind: "english" }
        ),
      /revision/u
    );
    assert.throws(
      () =>
        validateContent(
          { ...previewCollections.english.items[0], practice: ["只给题目，没有参考表达"] },
          { expectedKind: "english" }
        ),
      /practice\[0\]/u
    );
    await assert.rejects(
      upsertPublishedContent({
        publicDirectory,
        content: {
          ...published,
          title: "revision 已被篡改",
          revision: "0000000000000000"
        }
      }),
      /revision 与当前内容哈希不一致/u
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("keeps private previews isolated and version-gates publish, dry-run, and rollback", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "liangxiao-content-approval-"));
  const privateDirectory = join(temporaryDirectory, "private");
  const publicDirectory = join(temporaryDirectory, "public");
  const inputPath = join(temporaryDirectory, "daily.json");
  const baseInput = previewCollections.daily.items[0];
  const runContentCommand = (argumentsList) =>
    execFileAsync(process.execPath, ["scripts/content-admin.mjs", ...argumentsList], {
      cwd: projectDirectory
    });

  try {
    await mkdir(publicDirectory, { recursive: true });
    await writeFile(
      join(publicDirectory, "daily-reports.json"),
      JSON.stringify({ schemaVersion: 1, kind: "daily", items: [] }),
      "utf8"
    );
    await writeFile(
      join(publicDirectory, "english-lessons.json"),
      JSON.stringify({ schemaVersion: 1, kind: "english", items: [] }),
      "utf8"
    );
    await writeFile(inputPath, JSON.stringify({ ...baseInput, preview: false }), "utf8");

    const sharedArguments = ["--kind", "daily", "--private-dir", privateDirectory, "--public-dir", publicDirectory];
    await runContentCommand(["import", "--input", inputPath, ...sharedArguments]);
    const firstDraft = JSON.parse(
      await readFile(join(privateDirectory, "drafts/daily", `${baseInput.id}.json`), "utf8")
    );
    await runContentCommand([
      "approve",
      "--id",
      baseInput.id,
      "--approved-by",
      "reviewer",
      ...sharedArguments
    ]);
    const dryRun = await runContentCommand([
      "publish",
      "--id",
      baseInput.id,
      "--dry-run",
      ...sharedArguments
    ]);
    assert.match(dryRun.stdout, /隔离静态构建通过/u);
    assert.equal(
      JSON.parse(await readFile(join(publicDirectory, "daily-reports.json"), "utf8")).items.length,
      0
    );
    const published = await runContentCommand(["publish", "--id", baseInput.id, ...sharedArguments]);
    assert.match(published.stdout, /已通过隔离静态构建校验并写入公开快照/u);

    await assert.rejects(
      runContentCommand(["preview", "--id", "../../outside", ...sharedArguments]),
      (error) => {
        assert.match(error.stderr, /--id/u);
        return true;
      }
    );

    await writeFile(
      inputPath,
      JSON.stringify({ ...baseInput, preview: false, title: "已修改、需要重新审批的日报" }),
      "utf8"
    );
    await runContentCommand(["import", "--input", inputPath, ...sharedArguments]);
    await assert.rejects(
      runContentCommand(["publish", "--id", baseInput.id, ...sharedArguments]),
      (error) => {
        assert.match(error.stderr, /审批版本已失效/u);
        return true;
      }
    );

    await runContentCommand([
      "approve",
      "--id",
      baseInput.id,
      "--approved-by",
      "reviewer",
      ...sharedArguments
    ]);
    await runContentCommand(["preview", "--id", baseInput.id, ...sharedArguments]);
    const currentDraft = JSON.parse(
      await readFile(join(privateDirectory, "drafts/daily", `${baseInput.id}.json`), "utf8")
    );
    const privatePreview = await readFile(
      join(
        privateDirectory,
        "previews/daily",
        baseInput.id,
        currentDraft.revision,
        "site/daily",
        `${baseInput.slug}/index.html`
      ),
      "utf8"
    );
    assert.match(privatePreview, /已修改、需要重新审批的日报/u);
    assert.match(privatePreview, /name="robots" content="noindex, nofollow"/u);
    assert.equal(
      JSON.parse(await readFile(join(publicDirectory, "daily-reports.json"), "utf8")).items[0].title,
      baseInput.title
    );
    await runContentCommand(["publish", "--id", baseInput.id, "--dry-run", ...sharedArguments]);
    assert.equal(
      JSON.parse(await readFile(join(publicDirectory, "daily-reports.json"), "utf8")).items[0].title,
      baseInput.title
    );
    await runContentCommand(["publish", "--id", baseInput.id, ...sharedArguments]);
    const collection = JSON.parse(
      await readFile(join(publicDirectory, "daily-reports.json"), "utf8")
    );
    assert.equal(collection.items.length, 1);
    assert.equal(collection.items[0].title, "已修改、需要重新审批的日报");
    await runContentCommand([
      "rollback",
      "--id",
      baseInput.id,
      "--revision",
      firstDraft.revision,
      "--approved-by",
      "reviewer",
      ...sharedArguments
    ]);
    assert.equal(
      JSON.parse(await readFile(join(publicDirectory, "daily-reports.json"), "utf8")).items[0].title,
      baseInput.title
    );
    await assert.rejects(
      runContentCommand([
        "rollback",
        "--id",
        baseInput.id,
        "--revision",
        "../../outside",
        "--approved-by",
        "reviewer",
        ...sharedArguments
      ]),
      (error) => {
        assert.match(error.stderr, /--revision/u);
        return true;
      }
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("publishes complete bilingual HeatSleuth pages with locale-matched product assets", async () => {
  const pages = [
    {
      route: heatSleuth.english,
      lang: "en",
      screenshot: "/heatsleuth/assets/heat-sleuth-overview-en.png"
    },
    {
      route: heatSleuth.chinese,
      lang: "zh-(?:Hans|CN)",
      screenshot: "/heatsleuth/assets/heat-sleuth-overview.png"
    }
  ];

  for (const { route, lang, screenshot } of pages) {
    const page = await html(route);
    assert.match(page, /<!doctype html>/iu, route);
    assert.match(page, new RegExp(`<html\\s+lang="${lang}"`, "u"), route);
    assert.match(page, /<meta\s+name="viewport"/iu, route);
    assert.match(page, /<header\b/iu, route);
    assert.match(page, /<main\b/iu, route);
    assert.match(page, /<footer\b/iu, route);
    assert.ok(
      hasTagWithAttributes(page, "link", {
        rel: "stylesheet",
        href: "/heatsleuth/assets/styles.css"
      }),
      `${route} must load the shared HeatSleuth stylesheet`
    );

    assert.ok(tags(page, "section").length >= 6, `${route} must contain the planned content sections`);
    for (const id of ["how-it-works"]) {
      assert.ok(
        hasTagWithAttributes(page, "section", { id }),
        `${route} must include the #${id} product section`
      );
    }

    const images = tags(page, "img");
    assert.ok(images.length >= 2, `${route} must include an icon and product screenshot`);
    assert.ok(
      images.some(
        (image) =>
          attributeValue(image, "src") === screenshot &&
          Boolean(attributeValue(image, "alt")?.trim())
      ),
      `${route} must include the real HeatSleuth overview screenshot with alt text`
    );

    for (const image of images) {
      assert.ok(
        hasAttribute(image, "alt"),
        `${route} image is missing an alt attribute: ${image}`
      );
    }
  }
});

test("uses the approved HeatSleuth titles and hero messages", async () => {
  const english = await html(heatSleuth.english);
  const chinese = await html(heatSleuth.chinese);

  assert.match(
    english,
    /<title>\s*HeatSleuth — Find What’s Heating Your Mac\s*<\/title>/u
  );
  assert.match(
    english,
    /<h1[^>]*>\s*See what’s heating your Mac\. Decide what to do next\.\s*<\/h1>/u
  );
  assert.match(chinese, /<title>\s*HeatSleuth｜找出 Mac 发热的真正原因\s*<\/title>/u);
  assert.match(
    chinese,
    /<h1[^>]*>\s*Mac 发热时，先看清是谁在占用，再决定要不要停。\s*<\/h1>/u
  );
});

test("uses locale-matched HeatSleuth screenshots and a navigation-style language link", async () => {
  const [english, chinese, styles] = await Promise.all([
    html(heatSleuth.english),
    html(heatSleuth.chinese),
    readFile(new URL(`../${heatSleuth.styles}`, import.meta.url), "utf8")
  ]);
  const englishScreenshotUrl = "/heatsleuth/assets/heat-sleuth-overview-en.png";
  const chineseScreenshotUrl = "/heatsleuth/assets/heat-sleuth-overview.png";

  assert.ok(
    hasTagWithAttributes(english, "img", { src: englishScreenshotUrl }),
    "English product image must use the English app screenshot"
  );
  assert.ok(
    hasTagWithAttributes(english, "meta", {
      property: "og:image",
      content: `${heatSleuthEnglishUrl}assets/heat-sleuth-overview-en.png`
    }),
    "English social preview must use the English app screenshot"
  );
  assert.ok(
    hasTagWithAttributes(chinese, "img", { src: chineseScreenshotUrl }),
    "Chinese product image must keep the Chinese app screenshot"
  );

  const languageLinkRule =
    styles.match(/\.language-link\s*\{(?<rule>[^}]*)\}/u)?.groups?.rule ?? "";
  assert.doesNotMatch(languageLinkRule, /\bborder\s*:/u);
  assert.doesNotMatch(languageLinkRule, /\bborder-radius\s*:/u);
  assert.match(styles, /\.language-link::before\s*\{/u);
});

test("sets canonical and reciprocal hreflang links for HeatSleuth", async () => {
  const pages = [
    { route: heatSleuth.english, canonical: heatSleuthEnglishUrl },
    { route: heatSleuth.chinese, canonical: heatSleuthChineseUrl }
  ];

  for (const { route, canonical } of pages) {
    const page = await html(route);
    assert.ok(
      hasTagWithAttributes(page, "link", { rel: "canonical", href: canonical }),
      `${route} must declare its canonical URL`
    );
    assert.ok(
      hasTagWithAttributes(page, "link", {
        rel: "alternate",
        hreflang: "en",
        href: heatSleuthEnglishUrl
      }),
      `${route} must link to the English alternate`
    );
    assert.ok(hasSimplifiedChineseAlternate(page), `${route} must link to the Simplified Chinese alternate`);
    assert.ok(
      hasTagWithAttributes(page, "link", {
        rel: "alternate",
        hreflang: "x-default",
        href: heatSleuthEnglishUrl
      }),
      `${route} must provide the x-default alternate`
    );
  }
});

test("links both HeatSleuth pages to the verified versioned download", async () => {
  for (const route of [heatSleuth.english, heatSleuth.chinese]) {
    const page = await html(route);
    const downloadLinks = tags(page, "a").filter(
      (anchor) => attributeValue(anchor, "href") === heatSleuthDownloadUrl
    );
    assert.ok(
      downloadLinks.some((anchor) => hasAttribute(anchor, "download")),
      `${route} must use the versioned DMG as its direct download target`
    );
    assert.ok(page.includes(heatSleuthDownloadFilename), `${route} must expose the download filename`);
    assert.match(page, /HeatSleuth\s+1\.0\.2\s*\(5\)/u, route);
    assert.match(page, new RegExp(heatSleuthDownloadHash, "u"), route);
  }
});

test("keeps technical package verification optional on the HeatSleuth download cards", async () => {
  const english = await html(heatSleuth.english);
  const chinese = await html(heatSleuth.chinese);

  for (const [page, route, summary, trust] of [
    [english, heatSleuth.english, "Verify this download", "Apple notarized · Developer ID signed"],
    [chinese, heatSleuth.chinese, "验证下载文件", "Apple 已公证 · Developer ID 签名"]
  ]) {
    assert.match(page, /<details class="download-verification">/u, `${route} must provide an optional verification disclosure`);
    assert.match(page, new RegExp(`<summary>${escapeRegExp(summary)}</summary>`, "u"), route);
    assert.ok(page.includes(heatSleuthDownloadHash), `${route} must retain the exact package hash`);
    assert.ok(page.includes(trust), `${route} must keep the concise notarization and signing signal`);
    assert.doesNotMatch(page, /<dt>SHA-256<\/dt>/u, `${route} must not put the long hash in primary metadata`);
  }
});

test("discloses HeatSleuth installation, compatibility, and local-only privacy boundaries", async () => {
  const english = visibleCopy(await html(heatSleuth.english));
  const chinese = visibleCopy(await html(heatSleuth.chinese));
  const macOS14OrLater = /macOS\s*14(?:\.0)?(?:\+|\s+(?:or\s+later|或\s*更高版本))/iu;

  for (const [pattern, description] of [
    [macOS14OrLater, "macOS 14+ requirement"],
    [/Intel/u, "Intel support"],
    [/Apple Silicon/u, "Apple Silicon support"],
    [/Developer ID/u, "Developer ID distribution"],
    [/\bbeta\b/iu, "beta status"],
    [/(?:local|on[- ]device).{0,120}memory|memory.{0,120}(?:local|Mac|device)/iu, "in-memory processing"],
    [/(?:does not|doesn't|no).{0,120}(?:administrator|admin).{0,120}(?:helper|privilege)/iu, "no administrator helper"],
    [/(?:not|without).{0,80}App Sandbox|App Sandbox.{0,80}disabled/iu, "App Sandbox boundary"],
    [/current[-\s]user.{0,80}(?:process|task)/iu, "current-user process access explanation"],
    [/sensor.{0,120}(?:unavailable|not available)/iu, "sensor availability boundary"],
    [/(?:open).{0,80}(?:DMG|\.dmg)/iu, "DMG installation step"],
    [/HeatSleuth.{0,100}Applications/iu, "Applications installation step"]
  ]) {
    assert.match(english, pattern, description);
  }

  for (const [pattern, description] of [
    [macOS14OrLater, "macOS 14+ requirement"],
    [/Intel/u, "Intel support"],
    [/Apple Silicon/u, "Apple Silicon support"],
    [/Developer ID/u, "Developer ID distribution"],
    [/测试版/u, "beta status"],
    [/(?:只|仅).{0,80}本机.{0,80}内存/u, "in-memory processing"],
    [/(?:不需要|无需).{0,80}管理员.{0,80}(?:Helper|辅助)/u, "no administrator helper"],
    [/(?:未启用|没有启用).{0,80}App Sandbox/u, "App Sandbox boundary"],
    [/当前用户进程/u, "current-user process access explanation"],
    [/传感器.{0,120}(?:不可用|无法使用)/u, "sensor availability boundary"],
    [/(?:打开).{0,80}(?:DMG|\.dmg)/u, "DMG installation step"],
    [/HeatSleuth.{0,100}(?:应用程序|Applications)/u, "Applications installation step"]
  ]) {
    assert.match(chinese, pattern, description);
  }
});

test("keeps HeatSleuth structured data valid and aligned with visible FAQ copy", async () => {
  for (const route of [heatSleuth.english, heatSleuth.chinese]) {
    const page = await html(route);
    const nodes = jsonLdNodes(page, route);
    const software = nodes.find((node) => hasSchemaType(node, "SoftwareApplication"));
    const faq = nodes.find((node) => hasSchemaType(node, "FAQPage"));

    assert.ok(software, `${route} must publish SoftwareApplication JSON-LD`);
    assert.equal(software.name, "HeatSleuth", route);
    assert.equal(software.softwareVersion, "1.0.2 (5)", route);
    assert.match(
      String(software.operatingSystem),
      /macOS\s*14(?:\.0)?(?:\+|\s+(?:or\s+later|或\s*更高版本))/iu,
      route
    );
    assert.equal(software.downloadUrl, `${heatSleuthEnglishUrl}downloads/${heatSleuthDownloadFilename}`, route);

    assert.ok(faq, `${route} must publish FAQPage JSON-LD`);
    assert.ok(Array.isArray(faq.mainEntity), `${route} FAQPage must include questions`);
    assert.ok(faq.mainEntity.length >= 3, `${route} FAQPage needs at least three questions`);

    const copy = visibleCopy(page);
    for (const question of faq.mainEntity) {
      assert.ok(hasSchemaType(question, "Question"), `${route} FAQ item must be a Question`);
      assert.ok(typeof question.name === "string" && question.name.trim(), `${route} FAQ name is required`);
      assert.ok(
        hasSchemaType(question.acceptedAnswer, "Answer"),
        `${route} FAQ answer must use the Answer type`
      );
      assert.ok(
        typeof question.acceptedAnswer?.text === "string" && question.acceptedAnswer.text.trim(),
        `${route} FAQ answer text is required`
      );
      assert.ok(
        copy.includes(question.name),
        `${route} FAQ question must also be visible to visitors: ${question.name}`
      );
    }
  }
});

test("uses only local HeatSleuth scripts, safe external links, and explicit language hooks", async () => {
  const pages = [
    {
      route: heatSleuth.english,
      languageHrefs: ["/heatsleuth/zh/"]
    },
    {
      route: heatSleuth.chinese,
      languageHrefs: ["/heatsleuth/", "/heatsleuth/?lang=en"]
    }
  ];

  for (const { route, languageHrefs } of pages) {
    const page = await html(route);
    assert.doesNotMatch(page, /<form\b/iu, route);

    const blocks = scriptBlocks(page);
    assert.ok(
      blocks.some(
        (block) => attributeValue(openingTag(block), "src") === "/heatsleuth/assets/language.js"
      ),
      `${route} must load the local language behaviour script`
    );
    for (const block of blocks) {
      const opener = openingTag(block);
      const source = attributeValue(opener, "src");
      if (source) {
        assert.equal(source, "/heatsleuth/assets/language.js", `${route} must not load remote scripts`);
      } else {
        assert.equal(
          attributeValue(opener, "type"),
          "application/ld+json",
          `${route} permits inline scripts only for JSON-LD`
        );
      }
    }

    const languageLink = tags(page, "a").find(
      (anchor) => languageHrefs.includes(attributeValue(anchor, "href"))
    );
    assert.ok(languageLink, `${route} must link to the other language`);
    assert.ok(
      hasAttribute(languageLink, "data-language-toggle") ||
        hasAttribute(languageLink, "data-language-choice"),
      `${route} language link must expose a data-language hook`
    );

    for (const anchor of tags(page, "a")) {
      if (attributeValue(anchor, "target") === "_blank") {
        const rel = attributeValue(anchor, "rel") ?? "";
        assert.match(rel, /\b(?:noopener|noreferrer)\b/iu, `${route} external link is missing a safe rel`);
      }
    }
  }

  const languageScript = await readFile(
    new URL(`../${heatSleuth.languageScript}`, import.meta.url),
    "utf8"
  );
  assert.match(languageScript, /navigator\.(?:language|languages)/u);
  assert.match(languageScript, /\/heatsleuth\/zh\//u);
  assert.match(languageScript, /\blocation\b/u);
  assert.match(languageScript, /data-language-(?:choice|toggle)/u);
});

test("ships the exact notarized HeatSleuth package and local visual assets", async () => {
  const [styles, icon, englishScreenshot, chineseScreenshot, archive] = await Promise.all([
    readFile(new URL(`../${heatSleuth.styles}`, import.meta.url), "utf8"),
    readFile(new URL(`../${heatSleuth.icon}`, import.meta.url), "utf8"),
    readFile(new URL(`../${heatSleuth.englishScreenshot}`, import.meta.url)),
    readFile(new URL(`../${heatSleuth.chineseScreenshot}`, import.meta.url)),
    readFile(new URL(`../${heatSleuth.download}`, import.meta.url))
  ]);

  assert.ok(styles.trim(), "HeatSleuth stylesheet must not be empty");
  assert.doesNotMatch(styles, /@import\s+(?:url\()?['"]?https?:\/\//iu);
  assert.match(icon, /<svg\b/iu);
  for (const screenshot of [englishScreenshot, chineseScreenshot]) {
    assert.deepEqual(
      screenshot.subarray(0, 8),
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    );
    assert.equal(screenshot.readUInt32BE(16), 2520);
    assert.equal(screenshot.readUInt32BE(20), 1100);
  }
  assert.equal(archive.length, heatSleuthDownloadSize);
  assert.equal(archive.subarray(-512, -508).toString("ascii"), "koly");
  assert.equal(createHash("sha256").update(archive).digest("hex"), heatSleuthDownloadHash);
});
