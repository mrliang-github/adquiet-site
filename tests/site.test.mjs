import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const routes = {
  home: "index.html",
  writing: "writing/index.html",
  building: "building/index.html",
  tools: "tools/index.html",
  about: "about/index.html",
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
  download: "heatsleuth/downloads/HeatSleuth-1.0-build-3.dmg"
};

const heatSleuthDownloadUrl = "/heatsleuth/downloads/HeatSleuth-1.0-build-3.dmg";
const heatSleuthDownloadFilename = "HeatSleuth-1.0-build-3.dmg";
const heatSleuthDownloadHash =
  "f2cc9388f7ba9bc64a9be429d395e93499759fc78e13d1e97dcc8df06759243d";
const heatSleuthDownloadSize = 1380567;
const heatSleuthEnglishUrl = "https://liangxiaoaitool.top/heatsleuth/";
const heatSleuthChineseUrl = "https://liangxiaoaitool.top/heatsleuth/zh/";

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
  assert.match(page, /<html lang="zh-Hans">/u);
  assert.match(page, /把想法[\s\S]*做成/u);
  assert.match(page, /再把过程写下来/u);
  assert.match(page, /href="\/writing\/"/u);
  assert.match(page, /href="\/building\/"/u);
  assert.match(page, /href="\/tools\/"/u);
  assert.match(page, /href="\/adquiet\/"/u);
  assert.match(page, /href="\/heatsleuth\/"/u);
  assert.doesNotMatch(page, /Less interruption\. More watching\./u);
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
  assert.match(firstArticle, /公众号已发布稿/u);
  assert.match(firstArticle, /Codex 一周重置 4 次额度/u);
  assert.match(firstArticle, /https:\/\/img\.liangxiaoaitool\.top\//u);
  assert.ok(tags(firstArticle, "img").length >= 2, "article should retain published images");

  for (const route of personalRoutes) {
    const page = await html(route);
    assert.doesNotMatch(page, /<script\b/iu, route);
    assert.doesNotMatch(page, /<form\b/iu, route);
    assert.doesNotMatch(page, /on(?:click|load|error)\s*=/iu, route);
  }
});

test("publishes RSS, sitemap, legacy redirects, and responsive safeguards", async () => {
  const [legacyCss, personalCss, rss, sitemap, redirects] = await Promise.all([
    readFile(new URL("../assets/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site-assets/personal.css", import.meta.url), "utf8"),
    html("rss.xml"),
    html("sitemap.xml"),
    html("_redirects")
  ]);

  assert.match(legacyCss, /overflow-x:\s*hidden/u);
  assert.match(legacyCss, /\.hero-grid\s*>\s*\*\s*\{\s*min-width:\s*0/u);
  assert.match(personalCss, /--paper:\s*#f3f0e8/u);
  assert.match(personalCss, /overflow-x:\s*hidden/u);
  assert.match(personalCss, /prefers-reduced-motion/u);
  assert.match(rss, /<rss version="2\.0">/u);
  assert.match(rss, /codex-app-production-line/u);
  assert.match(sitemap, /https:\/\/liangxiaoaitool\.top\/writing\//u);
  assert.match(sitemap, /https:\/\/liangxiaoaitool\.top\/heatsleuth\//u);
  assert.match(
    sitemap,
    /<loc>https:\/\/liangxiaoaitool\.top\/heatsleuth\/<\/loc><lastmod>2026-07-25<\/lastmod>/u
  );
  assert.match(
    sitemap,
    /<loc>https:\/\/liangxiaoaitool\.top\/heatsleuth\/zh\/<\/loc><lastmod>2026-07-25<\/lastmod>/u
  );
  assert.match(redirects, /^\/privacy\/ \/adquiet\/privacy\/ 301/mu);
  assert.match(redirects, /^\/support\/ \/adquiet\/support\/ 301/mu);
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
    assert.match(page, /HeatSleuth\s+1\.0\s*\(3\)/u, route);
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
    assert.equal(software.softwareVersion, "1.0 (3)", route);
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
