import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

test("exports a complete production Pages site without repository source files", async () => {
  const output = await mkdtemp(join(tmpdir(), "liangxiao-pages-"));
  try {
    await promisify(execFile)(process.execPath, [
      "scripts/build-bento-site.mjs", "--output-dir", output
    ]);
    const home = await readFile(join(output, "index.html"), "utf8");
    assert.match(home, /class="bento-grid"/u);
    assert.match(home, /rel="canonical" href="https:\/\/liangxiaoai\.dev\/"/u);
    assert.doesNotMatch(home, /noindex|开发预览/u);

    for (const path of [
      "adquiet/index.html", "heatsleuth/index.html", "pdf-snap/support/index.html",
      "heatsleuth/downloads/HeatSleuth-1.0.2-build-5.dmg",
      "site-assets/speech-player.js", "site-assets/globe.js",
      "_headers", "_redirects", ".nojekyll", "THIRD_PARTY_NOTICES.md"
    ]) {
      assert.deepEqual(await readFile(join(output, path)), await readFile(path), path);
    }

    assert.match(await readFile(join(output, "robots.txt"), "utf8"), /Allow: \/\n/u);
    for (const path of ["package.json", "scripts/site-data.mjs", "content/public/english-lessons.json", ".git/config"]) {
      await assert.rejects(readFile(join(output, path)), { code: "ENOENT" }, path);
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
