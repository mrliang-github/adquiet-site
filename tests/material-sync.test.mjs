import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseDailyReport, parseEnglishLesson, syncMaterials } from "../scripts/batch-import-materials.mjs";
import { contentRevision } from "../scripts/content-schema.mjs";
import { previewCollections } from "../scripts/preview-fixtures.mjs";

const dailyHtml = `<div id="ai-view"><h3>AI 判断</h3><div id="ai-body">
  <p>Private Author 提供了两条案例；销量为作者自述。</p><div><p>Nested analysis survives.</p></div></div></div>
  <table class="iv-table"><tr><th>主题</th><td>2</td></tr></table>
  <div class="item"><h3><a href="https://wx.zsxq.com/topic/123">First case</a></h3>
    <div class="meta"><span class="au">Private Author</span></div>
    <div class="body">Private Author says <div>nested summary</div> remains.</div>
    <details class="orig"><summary>原帖</summary>private transcript</details></div>
  <div class="item"><h3>Second case</h3><div class="meta"><span class="au">Private Author</span></div>
    <div class="body">Reported sales need independent evidence.</div></div><script>attack()</script>`;

function englishHtml(title = "A new workflow", firstTurn) {
  const dialogue = Array.from({ length: 8 }, (_, index) => ({
    speaker: index % 2 ? "Partner" : "You", en: index === 0 && firstTurn ? firstTurn : `Use phrase${index % 5} clearly.`, cn: "把要求说清楚。"
  }));
  const expressions = Array.from({ length: 5 }, (_, index) => `<div class="expr">
    <h3>phrase${index} <span class="rev">复习</span><span class="ipa">/test/</span></h3>
    <p class="def"><strong>核心含义：</strong>一个要求。</p>
    <p class="def"><strong>换情境例句：</strong>"Please use phrase${index}."</p></div>`).join("");
  return `<html><body><h1>测试课程<span class="en">${title}</span></h1>
    <div class="meta">职业：独立开发者 · 难度：基础</div><p class="task">Today's task: Set a clear expectation.</p>
    <h3>Where</h3><p class="en">A short call.</p>${expressions}
    <section><div class="my-turn-body"><p><strong>Situation:</strong> Set a boundary.</p>
      <p><strong>They say:</strong> Can you do it now?</p><p><strong>Your turn:</strong> Offer a clear date.</p>
      <p class="en-line">I can do it tomorrow.</p></div></section>
    <script>const dialogue = ${JSON.stringify(dialogue)};</script></body></html>`;
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "adquiet-material-sync-"));
  const publicDirectory = join(root, "public");
  const englishDirectory = join(root, "english");
  const dailyDirectory = join(root, "daily");
  await Promise.all([publicDirectory, englishDirectory, dailyDirectory].map(dir => mkdir(dir)));
  const originals = {};
  for (const kind of ["daily", "english"]) {
    const item = { ...previewCollections[kind].items[0], id: `${kind}-existing`, slug: `curated-${kind}`,
      editionDate: "2000-01-01", status: "published", preview: false, title: "A curated title" };
    item.revision = contentRevision(item);
    originals[kind] = item;
    await writeFile(join(publicDirectory, `${kind === "daily" ? "daily-reports" : "english-lessons"}.json`),
      JSON.stringify({ schemaVersion: 1, kind, items: [item] }));
  }
  const paths = { english: join(publicDirectory, "english-lessons.json"), daily: join(publicDirectory, "daily-reports.json") };
  const options = { publicDirectory, englishDirectory, dailyDirectory, today: "2000-01-02" };
  return { root, paths, originals, options };
}

test("daily import preserves nested analysis while removing authors throughout prose and private originals", () => {
  const report = parseDailyReport(dailyHtml.replace("Nested analysis survives.", "Previous Author报过类似案例。今晚注定不平凡，不平凡的夜晚，这是阈值假象，17 条线索，Bend 是产品名。①Previous Author·另一条旧案例。数字最全的Previous Author有五条。Nested analysis survives."), "2000-01-02", { knownAuthors: ["Previous Author", "平凡", "17", "Ben"] });
  assert.match(report.bodyHtml, /Nested analysis survives/u);
  assert.match(report.bodyHtml, /今晚注定不平凡，不平凡的夜晚，这是阈值假象，17 条线索，Bend 是产品名/u);
  assert.doesNotMatch(report.bodyHtml, /Previous Author/u);
  assert.match(report.bodyHtml, /nested summary/u);
  assert.match(report.overview, /实战作者 1/u);
  assert.equal(report.discoveries.length, 2);
  assert.doesNotMatch(JSON.stringify(report), /Private Author|private transcript|wx\.zsxq\.com|attack\(\)|class=\\"orig\\"/u);
  assert.equal(report.revision, contentRevision(report));
});

test("English import keeps expression text separate from review and pronunciation badges", async () => {
  const root = await mkdtemp(join(tmpdir(), "adquiet-english-import-"));
  try {
    const file = join(root, "lesson.html");
    const longTurn = "Please use phrase0 clearly. ".repeat(15).trim();
    await writeFile(file, englishHtml("A new workflow", longTurn));
    const lesson = await parseEnglishLesson(file, "2000-01-02");
    assert.deepEqual(lesson.expressions.map(item => item.phrase), ["phrase0", "phrase1", "phrase2", "phrase3", "phrase4"]);
    assert.equal(lesson.expressions[4].sentenceId, "l5");
    assert.equal(lesson.sentences.length, 8);
    assert.ok(longTurn.length > 360);
    assert.equal(lesson.sentences[0].text, longTurn);
    assert.equal(lesson.practice[0].referenceAnswer, "I can do it tomorrow.");
    assert.doesNotMatch(lesson.bodyHtml, /<script/u);
    await writeFile(file, englishHtml("A new workflow", "x".repeat(601)));
    await assert.rejects(parseEnglishLesson(file, "2000-01-02"), /长度不合法/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("incremental sync preserves curated snapshots and routes, skips future sources and is idempotent", async () => {
  const f = await fixture();
  try {
    for (const date of ["2000-01-01", "2000-01-03"]) {
      await writeFile(join(f.options.englishDirectory, `english-lesson-${date}.html`), "Intentionally invalid; must not be parsed.");
      await writeFile(join(f.options.dailyDirectory, `风向标日报_${date}.html`), "Intentionally invalid; must not be parsed.");
    }
    await writeFile(join(f.options.englishDirectory, "english-lesson-2000-01-02.html"), englishHtml());
    await writeFile(join(f.options.dailyDirectory, "风向标日报_2000-01-02.html"), dailyHtml);
    const result = await syncMaterials(f.options);
    assert.ok(result.every(item => item.added.length === 1 && item.futureSourcesSkipped === 1));
    for (const kind of ["daily", "english"]) {
      const { items } = JSON.parse(await readFile(f.paths[kind], "utf8"));
      assert.equal(items.length, 2);
      assert.deepEqual(items[0], f.originals[kind]);
    }
    const before = await Promise.all(Object.values(f.paths).map(file => readFile(file, "utf8")));
    assert.ok((await syncMaterials(f.options)).every(item => item.added.length === 0));
    assert.deepEqual(await Promise.all(Object.values(f.paths).map(file => readFile(file, "utf8"))), before);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("dry runs and a malformed second column leave both original snapshots untouched", async () => {
  const f = await fixture();
  try {
    await writeFile(join(f.options.englishDirectory, "english-lesson-2000-01-02.html"), englishHtml());
    const dailyFile = join(f.options.dailyDirectory, "风向标日报_2000-01-02.html");
    await writeFile(dailyFile, dailyHtml);
    const before = await Promise.all(Object.values(f.paths).map(file => readFile(file, "utf8")));
    assert.ok((await syncMaterials({ ...f.options, dryRun: true })).every(item => item.added.length === 1));
    assert.deepEqual(await Promise.all(Object.values(f.paths).map(file => readFile(file, "utf8"))), before);
    await writeFile(dailyFile, '<div id="ai-view">unfinished');
    await assert.rejects(syncMaterials(f.options), /未闭合|缺少完整/u);
    assert.deepEqual(await Promise.all(Object.values(f.paths).map(file => readFile(file, "utf8"))), before);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
