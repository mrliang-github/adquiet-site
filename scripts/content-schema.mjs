import { createHash } from "node:crypto";

export const CONTENT_KINDS = ["daily", "english"];

export const CONTENT_FILENAMES = {
  daily: "daily-reports.json",
  english: "english-lessons.json"
};

function invalid(message) {
  throw new Error(`内容校验失败：${message}`);
}

function asObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid(`${label} 必须是对象`);
  }

  return value;
}

function asArray(value, label, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    invalid(`${label} 的条目数必须在 ${min} 到 ${max} 之间`);
  }

  return value;
}

function asText(value, label, { min = 1, max = 600 } = {}) {
  if (typeof value !== "string") {
    invalid(`${label} 必须是文本`);
  }

  const text = value.trim();
  if (text.length < min || text.length > max || /\u0000/u.test(text)) {
    invalid(`${label} 长度不合法`);
  }

  return text;
}

function asIdentifier(value, label) {
  const identifier = asText(value, label, { max: 96 });
  if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/u.test(identifier)) {
    invalid(`${label} 只能使用小写字母、数字、连字符或下划线`);
  }

  return identifier;
}

function asRevision(value, label) {
  const revision = asText(value, label, { min: 16, max: 16 });
  if (!/^[a-f0-9]{16}$/u.test(revision)) {
    invalid(`${label} 必须是 16 位小写十六进制内容哈希`);
  }

  return revision;
}

export function validateContentId(value, label = "id") {
  return asIdentifier(value, label);
}

export function validateContentRevision(value, label = "revision") {
  return asRevision(value, label);
}

function asSlug(value) {
  const slug = asText(value, "slug", { max: 120 });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
    invalid("slug 必须是小写 URL 片段");
  }

  return slug;
}

function asDate(value, label) {
  const date = asText(value, label, { min: 10, max: 10 });
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(date) ||
    Number.isNaN(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== date
  ) {
    invalid(`${label} 必须是有效的 YYYY-MM-DD 日期`);
  }

  return date;
}

function asTimestamp(value, label) {
  const timestamp = asText(value, label, { max: 64 });
  if (Number.isNaN(Date.parse(timestamp))) {
    invalid(`${label} 必须是有效时间`);
  }

  return timestamp;
}

function asTimeZone(value) {
  const timeZone = asText(value, "publicationTimeZone", { max: 80 });
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    invalid("publicationTimeZone 必须是有效的 IANA 时区");
  }

  return timeZone;
}

function asOptionalUrl(value, label) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const url = asText(value, label, { max: 2048 });
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      invalid(`${label} 只允许 http 或 https 链接`);
    }
  } catch {
    invalid(`${label} 不是有效链接`);
  }

  return url;
}

function unique(values, label) {
  if (new Set(values).size !== values.length) {
    invalid(`${label} 不能重复`);
  }
}

function normalizeBase(raw, expectedKind) {
  const value = asObject(raw, "内容");
  const kind = asText(value.kind, "kind", { max: 16 });
  if (!CONTENT_KINDS.includes(kind)) {
    invalid("kind 必须是 daily 或 english");
  }
  if (expectedKind && kind !== expectedKind) {
    invalid(`内容类型应为 ${expectedKind}`);
  }
  if (value.schemaVersion !== 1) {
    invalid("schemaVersion 必须为 1");
  }

  const status = value.status ?? "draft";
  if (status !== "draft" && status !== "published") {
    invalid("status 必须是 draft 或 published");
  }

  const normalized = {
    schemaVersion: 1,
    kind,
    id: asIdentifier(value.id, "id"),
    slug: asSlug(value.slug),
    title: asText(value.title, "title", { max: 160 }),
    summary: asText(value.summary, "summary", { max: 360 }),
    editionDate: asDate(value.editionDate, "editionDate"),
    publicationTimeZone: asTimeZone(value.publicationTimeZone),
    status,
    preview: value.preview === true
  };

  if (value.revision !== undefined) {
    normalized.revision = asRevision(value.revision, "revision");
  }
  if (value.publishedAt !== undefined) {
    normalized.publishedAt = asTimestamp(value.publishedAt, "publishedAt");
  }
  if (value.updatedAt !== undefined) {
    normalized.updatedAt = asTimestamp(value.updatedAt, "updatedAt");
  }

  return { value, normalized };
}

function normalizeSources(value) {
  const sources = asArray(value, "sources", { min: 1, max: 12 }).map((source, index) => {
    const item = asObject(source, `sources[${index}]`);
    const normalized = {
      id: asIdentifier(item.id, `sources[${index}].id`),
      title: asText(item.title, `sources[${index}].title`, { max: 240 }),
      url: asOptionalUrl(item.url, `sources[${index}].url`)
    };

    if (item.publishedAt !== undefined) {
      normalized.publishedAt = asDate(item.publishedAt, `sources[${index}].publishedAt`);
    }

    return normalized;
  });

  unique(sources.map((source) => source.id), "来源 ID");
  return sources;
}

function normalizeDaily(raw, expectedKind) {
  const { value, normalized } = normalizeBase(raw, expectedKind);
  const sources = normalizeSources(value.sources);
  const sourceIds = new Set(sources.map((source) => source.id));
  const discoveries = asArray(value.discoveries, "discoveries", { min: 1, max: 5 }).map(
    (discovery, index) => {
      const item = asObject(discovery, `discoveries[${index}]`);
      const discoverySourceIds = asArray(item.sourceIds, `discoveries[${index}].sourceIds`, {
        min: 1,
        max: 5
      }).map((sourceId, sourceIndex) =>
        asIdentifier(sourceId, `discoveries[${index}].sourceIds[${sourceIndex}]`)
      );
      unique(discoverySourceIds, `discoveries[${index}].sourceIds`);
      for (const sourceId of discoverySourceIds) {
        if (!sourceIds.has(sourceId)) {
          invalid(`discoveries[${index}] 引用了不存在的来源 ${sourceId}`);
        }
      }

      return {
        id: asIdentifier(item.id, `discoveries[${index}].id`),
        title: asText(item.title, `discoveries[${index}].title`, { max: 180 }),
        fact: asText(item.fact, `discoveries[${index}].fact`, { max: 700 }),
        judgement: asText(item.judgement, `discoveries[${index}].judgement`, { max: 700 }),
        sourceIds: discoverySourceIds
      };
    }
  );

  unique(discoveries.map((discovery) => discovery.id), "发现 ID");
  return {
    ...normalized,
    overview: asText(value.overview, "overview", { max: 900 }),
    discoveries,
    nextStep: asText(value.nextStep, "nextStep", { max: 600 }),
    tags: asArray(value.tags ?? [], "tags", { max: 5 }).map((tag, index) =>
      asText(tag, `tags[${index}]`, { max: 32 })
    ),
    sources
  };
}

function normalizeEnglish(raw, expectedKind) {
  const { value, normalized } = normalizeBase(raw, expectedKind);
  const levels = ["starter", "foundation", "intermediate", "advanced"];
  const level = asText(value.level, "level", { max: 24 });
  if (!levels.includes(level)) {
    invalid("level 必须是 starter、foundation、intermediate 或 advanced");
  }

  const sentences = asArray(value.sentences, "sentences", { min: 8, max: 24 }).map(
    (sentence, index) => {
      const item = asObject(sentence, `sentences[${index}]`);
      return {
        id: asIdentifier(item.id, `sentences[${index}].id`),
        speaker: asText(item.speaker, `sentences[${index}].speaker`, { max: 40 }),
        text: asText(item.text, `sentences[${index}].text`, { max: 360 }),
        translation: asText(item.translation, `sentences[${index}].translation`, { max: 360 })
      };
    }
  );
  unique(sentences.map((sentence) => sentence.id), "句子 ID");
  const sentenceIds = new Set(sentences.map((sentence) => sentence.id));

  const expressions = asArray(value.expressions, "expressions", { min: 5, max: 5 }).map(
    (expression, index) => {
      const item = asObject(expression, `expressions[${index}]`);
      const sentenceId = asIdentifier(item.sentenceId, `expressions[${index}].sentenceId`);
      if (!sentenceIds.has(sentenceId)) {
        invalid(`expressions[${index}] 引用了不存在的句子 ${sentenceId}`);
      }
      return {
        id: asIdentifier(item.id, `expressions[${index}].id`),
        phrase: asText(item.phrase, `expressions[${index}].phrase`, { max: 140 }),
        translation: asText(item.translation, `expressions[${index}].translation`, { max: 180 }),
        example: asText(item.example, `expressions[${index}].example`, { max: 360 }),
        sentenceId
      };
    }
  );
  unique(expressions.map((expression) => expression.id), "重点表达 ID");

  const practice = asArray(value.practice, "practice", { min: 1, max: 2 }).map((entry, index) => {
    const item = asObject(entry, `practice[${index}]`);
    const normalizedPractice = {
      prompt: asText(item.prompt, `practice[${index}].prompt`, { max: 420 }),
      referenceAnswer: asText(item.referenceAnswer, `practice[${index}].referenceAnswer`, {
        max: 420
      })
    };
    if (item.explanation !== undefined && item.explanation !== "") {
      normalizedPractice.explanation = asText(item.explanation, `practice[${index}].explanation`, {
        max: 420
      });
    }
    return normalizedPractice;
  });
  const durationMinutes = value.durationMinutes;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 15) {
    invalid("durationMinutes 必须是 10 到 15 分钟之间的整数");
  }

  return {
    ...normalized,
    level,
    profession: asText(value.profession, "profession", { max: 80 }),
    scenario: asText(value.scenario, "scenario", { max: 180 }),
    goal: asText(value.goal, "goal", { max: 240 }),
    durationMinutes,
    expressions,
    sentences,
    practice
  };
}

export function validateContent(raw, { expectedKind } = {}) {
  const kind = expectedKind ?? raw?.kind;
  if (kind === "daily") {
    return normalizeDaily(raw, expectedKind);
  }
  if (kind === "english") {
    return normalizeEnglish(raw, expectedKind);
  }

  invalid("缺少有效的 kind");
}

export function validateCollection(raw, { expectedKind, requirePublished = false, allowPreview = false } = {}) {
  const collection = asObject(raw, "内容集合");
  if (collection.schemaVersion !== 1) {
    invalid("内容集合的 schemaVersion 必须为 1");
  }
  if (!CONTENT_KINDS.includes(collection.kind) || collection.kind !== expectedKind) {
    invalid(`内容集合类型应为 ${expectedKind}`);
  }

  const items = asArray(collection.items, "items", { max: 500 }).map((item) =>
    validateContent(item, { expectedKind })
  );
  unique(items.map((item) => item.id), "内容 ID");
  unique(items.map((item) => item.slug), "内容 slug");
  unique(items.map((item) => item.editionDate), "内容期次日期");

  for (const item of items) {
    if (requirePublished && item.status !== "published") {
      invalid("公开集合不能包含未发布草稿");
    }
    if (!allowPreview && item.preview) {
      invalid("正式集合不能包含预览内容");
    }
  }

  return { schemaVersion: 1, kind: expectedKind, items };
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

export function contentRevision(content) {
  const normalized = validateContent(content, { expectedKind: content?.kind });
  const { revision, publishedAt, updatedAt, status, preview, ...payload } = normalized;
  return createHash("sha256").update(JSON.stringify(stableValue(payload))).digest("hex").slice(0, 16);
}
