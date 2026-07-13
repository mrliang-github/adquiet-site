import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const routes = {
  root: "index.html",
  product: "adquiet/index.html",
  support: "adquiet/support/index.html",
  privacy: "adquiet/privacy/index.html",
  chinesePrivacy: "adquiet/zh/privacy/index.html"
};

async function html(route) {
  return readFile(new URL(`../${route}`, import.meta.url), "utf8");
}

test("publishes every required Chrome Web Store route", async () => {
  for (const route of Object.values(routes)) {
    assert.match(await html(route), /<!doctype html>/iu, route);
  }
});

test("uses the AdQuiet product page at both root and product paths", async () => {
  for (const route of [routes.root, routes.product]) {
    const page = await html(route);
    assert.match(page, /<html lang="en">/u);
    assert.match(page, /<meta name="viewport"/u);
    assert.match(page, /Less interruption\. More watching\./u);
    assert.match(page, /Chrome extension for YouTube desktop/u);
    assert.match(page, /adquiet\/support\//u);
    assert.match(page, /adquiet\/privacy\//u);
  }
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

test("keeps the static site free of remote scripts and forms", async () => {
  for (const route of Object.values(routes)) {
    const page = await html(route);
    assert.doesNotMatch(page, /<script\b/iu, route);
    assert.doesNotMatch(page, /<form\b/iu, route);
  }
});

test("includes explicit mobile overflow safeguards", async () => {
  const css = await readFile(new URL("../assets/styles.css", import.meta.url), "utf8");
  assert.match(css, /overflow-x:\s*hidden/u);
  assert.match(css, /\.hero-grid\s*>\s*\*\s*\{\s*min-width:\s*0/u);
  assert.match(css, /\.nav\s*\{[^}]*flex-direction:\s*column/su);
  assert.match(css, /\.hero-panel\s*\{[^}]*width:\s*100%/su);
});
