import sanitizeHtml from "sanitize-html";

const coursewareHooks = {
  "play-all": "data-play-all",
  stop: "data-stop",
  speed: "data-playback-rate",
  voice: "data-voice",
  "toggle-dialogue-cn": "data-toggle-translations",
  "toggle-setup-cn": "data-toggle-setup",
  "blind-listen": "data-blind-listen",
  "exit-blind": "data-exit-blind",
  "voice-warn": "data-player-status",
  "show-answer": "data-show-answer"
};
const coursewareIds = new Set([...Object.keys(coursewareHooks), "dialogue-list", "answer-block"]);

export function sanitizeContentBody(html, kind) {
  const english = kind === "english";
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "header", "section", "details", "summary",
      ...(english ? ["button", "label", "select", "option"] : [])
    ],
    allowedAttributes: {
      "*": ["class", ...(english ? ["id", "hidden", ...Object.values(coursewareHooks), "data-play-sentence", "data-line-id"] : [])],
      a: ["href", "target", "rel"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
      button: ["type", "aria-label", "aria-pressed"],
      select: ["aria-label"],
      option: ["value", "selected"]
    },
    allowedSchemes: ["http", "https"],
    allowProtocolRelative: false,
    transformTags: {
      span(tagName, attribs) {
        return kind === "daily" && attribs.class?.split(/\s+/u).includes("au")
          ? { tagName, attribs, text: "实战线索" }
          : { tagName, attribs };
      },
      "*"(tagName, attributes) {
        const attribs = { ...attributes };
        if (!english || !coursewareIds.has(attribs.id)) delete attribs.id;
        const hook = english && coursewareHooks[attribs.id];
        if (hook) attribs[hook] = "";
        if (tagName === "button") attribs.type = "button";
        if (english && tagName === "button" && attribs["data-line-id"] === "answer") {
          attribs["data-play-sentence"] = "answer";
          attribs["aria-label"] = "点读参考答案";
        }
        if (tagName === "a" && attribs.target === "_blank") attribs.rel = "noopener noreferrer";
        return { tagName, attribs };
      }
    },
    exclusiveFilter(frame) {
      if (kind !== "daily") return false;
      if (frame.attribs.class?.split(/\s+/u).includes("orig")) return true;
      if (frame.tag === "a" && /(?:^|\.)zsxq\.com$/iu.test(safeHostname(frame.attribs.href))) {
        return "excludeTag";
      }
      return false;
    }
  }).trim();
}

function safeHostname(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}
