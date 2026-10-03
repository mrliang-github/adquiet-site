import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeContentBody } from "../scripts/content-html.mjs";
import { parseDialogueLiteral } from "../scripts/dialogue-literal.mjs";
import { contentRevision, validateContent } from "../scripts/content-schema.mjs";
import { previewCollections } from "../scripts/preview-fixtures.mjs";

test("keeps rich lesson content while rejecting scripts, event handlers and clobbering IDs", () => {
  const html = sanitizeContentBody(`<section class="setup"><h2>The Setup</h2><p>Keep this.</p></section>
    <script>globalThis.compromised = true;</script><style>body{display:none}</style>
    <button id="play-all" onclick="attack()">Play</button><div id="english-player-data">fake</div>
    <iframe src="https://example.com"></iframe><a href="javascript:attack()">unsafe</a>`, "english");
  assert.match(html, /The Setup/u);
  assert.match(html, /data-play-all/u);
  assert.doesNotMatch(html, /<script|<style|<iframe|onclick|javascript:|id="english-player-data"|compromised/u);
});

test("removes private original posts and links and anonymizes daily authors", () => {
  const html = sanitizeContentBody(`<div class="item"><span class="au">Private Name</span>
    <details class="orig"><summary>原帖</summary>private transcript</details>
    <a href="https://wx.zsxq.com/dweb2/index/topic/123">case</a>
    <table><tr><th>主题</th><td>2</td></tr></table></div>`, "daily");
  assert.match(html, /实战线索/u);
  assert.match(html, /<table>/u);
  assert.doesNotMatch(html, /Private Name|private transcript|zsxq\.com/u);
});

test("includes the complete body in the approval revision", () => {
  const original = validateContent({ ...previewCollections.english.items[0], bodyHtml: "<p>First</p>" });
  assert.notEqual(contentRevision(original), contentRevision({ ...original, bodyHtml: "<p>Changed</p>" }));
});

test("parses template dialogue as data and rejects executable expressions", () => {
  assert.deepEqual(parseDialogueLiteral(`[{ id: 'L1', speaker: 'You', en: "It is fine.", cn: '没问题', searchable: true }]`),
    [{ id: "L1", speaker: "You", en: "It is fine.", cn: "没问题", searchable: true }]);
  assert.throws(() => parseDialogueLiteral("[{en: process.exit()}]"), /字面量|表达式/u);
  assert.throws(() => parseDialogueLiteral("[{en: (() => 'attack')()}]"), /字面量|表达式/u);
});

test("renders every published rich lesson through the shared player and preserves the complete daily body", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const kind of ["daily", "english"]) {
    const filename = kind === "daily" ? "daily-reports.json" : "english-lessons.json";
    const { items } = JSON.parse(await readFile(new URL(`../content/public/${filename}`, import.meta.url), "utf8"));
    for (const item of items) {
      assert.ok(item.bodyHtml, `${item.id} has a committed complete body`);
      assert.equal(item.revision, contentRevision(item));
      const page = await readFile(new URL(`../${kind}/${item.slug}/index.html`, import.meta.url), "utf8");
      assert.doesNotMatch(page, /on(?:click|load|error)\s*=/iu);
      if (kind === "english") {
        assert.match(page, /The Setup/u);
        assert.match(page, /实用句型/u);
        assert.match(page, /data-mark-complete/u);
        assert.match(page, /data-play-all/u);
        assert.match(page, /data-playback-rate/u);
        assert.match(page, /data-player-status/u);
        assert.match(page, /site-assets\/speech-player\.js/u);
        const player = page.match(/<script id="english-player-data" type="application\/json">([\s\S]*?)<\/script>/u);
        assert.ok(player, item.id);
        assert.equal(JSON.parse(player[1]).sentences.length, item.sentences.length);
        for (const sentence of item.sentences) assert.ok(page.includes(`data-sentence-id="${sentence.id}"`));
        assert.doesNotMatch(page, /<script>\s*\(function/iu);
      } else {
        assert.match(page, /AI 商业研判与趋势透视/u);
        assert.doesNotMatch(page, /<script|class="orig"|wx\.zsxq\.com/u);
      }
    }
  }
});

test("isolated production builds use approved body snapshots and clean hostile HTML", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { mkdtemp, mkdir, readFile, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const directory = await mkdtemp(join(tmpdir(), "adquiet-approved-body-"));
  const input = join(directory, "content");
  const output = join(directory, "site");
  try {
    await mkdir(input);
    const original = JSON.parse(await readFile(new URL("../content/public/english-lessons.json", import.meta.url), "utf8")).items[0];
    const english = { ...original, bodyHtml: `<p>Approved course snapshot marker</p>${original.bodyHtml}<script>attack()</script>` };
    english.revision = contentRevision(english);
    const daily = { ...previewCollections.daily.items[0], preview: false, bodyHtml: '<section><h2>Approved daily snapshot marker</h2><img src=x onerror="attack()"></section>' };
    daily.revision = contentRevision(daily);
    for (const [kind, filename, item] of [["daily", "daily-reports.json", daily], ["english", "english-lessons.json", english]]) {
      await writeFile(join(input, filename), JSON.stringify({ schemaVersion: 1, kind, items: [item] }));
    }
    await promisify(execFile)(process.execPath, ["scripts/build-bento-site.mjs", "--public-content-dir", input, "--output-dir", output], {
      cwd: new URL("../", import.meta.url).pathname
    });
    for (const [kind, item, marker] of [["daily", daily, "Approved daily snapshot marker"], ["english", english, "Approved course snapshot marker"]]) {
      const page = await readFile(join(output, kind, item.slug, "index.html"), "utf8");
      assert.ok(page.includes(marker));
      assert.doesNotMatch(page, /attack\(\)|onerror/u);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
