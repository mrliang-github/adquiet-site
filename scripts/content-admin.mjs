import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  CONTENT_FILENAMES,
  CONTENT_KINDS,
  contentRevision,
  validateContent,
  validateContentId,
  validateContentRevision
} from "./content-schema.mjs";
import {
  defaultPublicContentDirectory,
  readContentCollection,
  readJson,
  upsertPublishedContent,
  writeJsonAtomic
} from "./content-store.mjs";

const command = process.argv[2];
const argumentValues = new Map();
const booleanArguments = new Set();
const execFileAsync = promisify(execFile);
const defaultPrivateContentDirectory = join(homedir(), ".liangxiao-ai-content-private");
const builderPath = fileURLToPath(new URL("./build-bento-site.mjs", import.meta.url));

for (let index = 3; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--dry-run") {
    booleanArguments.add("dry-run");
    continue;
  }
  if (!argument.startsWith("--")) {
    throw new Error(`无法识别参数：${argument}`);
  }
  const name = argument.slice(2);
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`参数 --${name} 缺少值`);
  }
  argumentValues.set(name, value);
  index += 1;
}

const valueFor = (name, { required = false, fallback } = {}) => {
  const value = argumentValues.get(name) ?? fallback;
  if (required && !value) {
    throw new Error(`请提供 --${name}`);
  }
  return value;
};

const privateDirectory = resolve(
  valueFor("private-dir", {
    fallback: process.env.LIANGXIAO_PRIVATE_CONTENT_DIR ?? defaultPrivateContentDirectory
  })
);
const publicDirectory = resolve(
  valueFor("public-dir", {
    fallback: process.env.LIANGXIAO_PUBLIC_CONTENT_DIR ?? defaultPublicContentDirectory
  })
);

function ensureKind(value) {
  if (!CONTENT_KINDS.includes(value)) {
    throw new Error("--kind 必须是 daily 或 english");
  }
  return value;
}

function privatePath(...segments) {
  const pathname = resolve(privateDirectory, ...segments);
  const pathFromPrivateDirectory = relative(privateDirectory, pathname);
  if (
    pathFromPrivateDirectory === "" ||
    pathFromPrivateDirectory === ".." ||
    pathFromPrivateDirectory.startsWith(`..${sep}`) ||
    isAbsolute(pathFromPrivateDirectory)
  ) {
    throw new Error("拒绝访问私有内容目录之外的路径");
  }
  return pathname;
}

function contentIdArgument() {
  return validateContentId(valueFor("id", { required: true }), "--id");
}

function revisionArgument() {
  return validateContentRevision(valueFor("revision", { required: true }), "--revision");
}

function draftPath(kind, id) {
  return privatePath("drafts", kind, `${id}.json`);
}

function approvalPath(kind, id) {
  return privatePath("approvals", kind, `${id}.json`);
}

function historyPath(kind, id, revision) {
  return privatePath("history", kind, id, `${revision}.json`);
}

async function readDraft(kind, id) {
  const draft = validateContent(await readJson(draftPath(kind, id)), { expectedKind: kind });
  if (draft.status !== "draft") {
    throw new Error(`草稿 ${id} 的状态不是 draft`);
  }
  return draft;
}

async function importDraft() {
  const kind = ensureKind(valueFor("kind", { required: true }));
  const input = resolve(valueFor("input", { required: true }));
  const source = await readJson(input);
  const validated = validateContent(source, { expectedKind: kind });
  const draft = {
    ...validated,
    status: "draft",
    preview: false,
    revision: contentRevision(validated)
  };
  delete draft.publishedAt;
  delete draft.updatedAt;

  await writeJsonAtomic(draftPath(kind, draft.id), draft);
  console.log(`已导入草稿 ${kind}/${draft.id}，revision=${draft.revision}`);
}

async function validateInput() {
  const kind = ensureKind(valueFor("kind", { required: true }));
  const input = resolve(valueFor("input", { required: true }));
  const content = validateContent(await readJson(input), { expectedKind: kind });
  console.log(`校验通过 ${kind}/${content.id}，revision=${contentRevision(content)}`);
}

async function validateCandidateStaticBuild(kind, nextCollection) {
  await mkdir(privateDirectory, { recursive: true });
  const stagingRoot = await mkdtemp(join(privateDirectory, ".content-build-check-"));
  const candidateContentDirectory = join(stagingRoot, "content");
  const candidateOutputDirectory = join(stagingRoot, "site");
  try {
    for (const collectionKind of CONTENT_KINDS) {
      const collection =
        collectionKind === kind
          ? nextCollection
          : await readContentCollection(publicDirectory, collectionKind, { requirePublished: true });
      await writeJsonAtomic(join(candidateContentDirectory, CONTENT_FILENAMES[collectionKind]), collection);
    }
    await execFileAsync(
      process.execPath,
      [
        builderPath,
        "--public-content-dir",
        candidateContentDirectory,
        "--output-dir",
        candidateOutputDirectory
      ],
      { cwd: resolve(".") }
    );
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

async function previewDraft() {
  const kind = ensureKind(valueFor("kind", { required: true }));
  const id = contentIdArgument();
  const draft = await readDraft(kind, id);
  const previewRoot = privatePath("previews", kind, draft.id, draft.revision);
  const previewContentDirectory = join(previewRoot, "content");
  const outputDirectory = join(previewRoot, "site");
  const previewedDraft = {
    ...draft,
    status: "published",
    preview: true
  };

  for (const collectionKind of CONTENT_KINDS) {
    await writeJsonAtomic(join(previewContentDirectory, CONTENT_FILENAMES[collectionKind]), {
      schemaVersion: 1,
      kind: collectionKind,
      items: collectionKind === kind ? [previewedDraft] : []
    });
  }
  await execFileAsync(
    process.execPath,
    [
      builderPath,
      "--preview",
      "--public-content-dir",
      publicDirectory,
      "--preview-content-dir",
      previewContentDirectory,
      "--output-dir",
      outputDirectory
    ],
    { cwd: resolve(".") }
  );
  console.log(
    JSON.stringify(
      {
        kind,
        id: draft.id,
        title: draft.title,
        editionDate: draft.editionDate,
        revision: draft.revision,
        previewOutputDirectory: outputDirectory,
        previewRoute: `/${kind === "daily" ? "daily" : "english"}/${draft.slug}/`,
        robots: "noindex, nofollow"
      },
      null,
      2
    )
  );
}

async function approveDraft() {
  const kind = ensureKind(valueFor("kind", { required: true }));
  const id = contentIdArgument();
  const approvedBy = valueFor("approved-by", { required: true }).trim();
  if (!approvedBy) {
    throw new Error("--approved-by 不能为空");
  }

  const draft = await readDraft(kind, id);
  const approval = {
    kind,
    id: draft.id,
    revision: draft.revision,
    approvedBy,
    approvedAt: new Date().toISOString()
  };
  await writeJsonAtomic(approvalPath(kind, draft.id), approval);
  console.log(`已审批 ${kind}/${draft.id} revision=${draft.revision}`);
}

async function publishDraft() {
  const kind = ensureKind(valueFor("kind", { required: true }));
  const id = contentIdArgument();
  const draft = await readDraft(kind, id);
  const dryRun = booleanArguments.has("dry-run");
  const approval = await readJson(approvalPath(kind, id));
  if (approval.kind !== kind || approval.id !== id || approval.revision !== draft.revision) {
    throw new Error("审批版本已失效，请审核当前草稿 revision 后再发布");
  }

  const published = {
    ...draft,
    status: "published",
    preview: false,
    revision: draft.revision,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const preflight = await upsertPublishedContent({
    publicDirectory,
    content: published,
    dryRun: true
  });
  if (preflight.changed) {
    await validateCandidateStaticBuild(kind, preflight.nextCollection);
  }

  if (dryRun) {
    console.log(
      preflight.changed
        ? `dry-run 校验和隔离静态构建通过，尚未写入公开内容：${kind}/${id}`
        : `dry-run 校验通过，当前已是相同公开 revision：${kind}/${id}`
    );
    return;
  }

  const result = await upsertPublishedContent({
    publicDirectory,
    content: published,
    beforeWrite: async (current) => {
      if (current) {
        await writeJsonAtomic(historyPath(kind, id, current.revision), current);
      }
    }
  });

  console.log(
    result.changed
      ? `已通过隔离静态构建校验并写入公开快照，仍需在本仓库构建与部署验证：${kind}/${id}`
      : `已存在相同公开 revision：${kind}/${id}`
  );
}

async function rollbackPublished() {
  const kind = ensureKind(valueFor("kind", { required: true }));
  const id = contentIdArgument();
  const revision = revisionArgument();
  const approvedBy = valueFor("approved-by", { required: true }).trim();
  if (!approvedBy) {
    throw new Error("--approved-by 不能为空");
  }

  const historical = validateContent(await readJson(historyPath(kind, id, revision)), {
    expectedKind: kind
  });
  const restored = {
    ...historical,
    status: "published",
    preview: false,
    updatedAt: new Date().toISOString()
  };
  const preflight = await upsertPublishedContent({
    publicDirectory,
    content: restored,
    dryRun: true
  });
  if (preflight.changed) {
    await validateCandidateStaticBuild(kind, preflight.nextCollection);
  }

  const result = await upsertPublishedContent({
    publicDirectory,
    content: restored,
    beforeWrite: async (current) => {
      if (current) {
        await writeJsonAtomic(historyPath(kind, id, current.revision), current);
      }
    }
  });
  console.log(
    result.changed
      ? `已由 ${approvedBy} 通过隔离静态构建校验后恢复公开快照 ${kind}/${id} 到 revision=${revision}，仍需在本仓库构建与部署验证`
      : `当前已是 revision=${revision}`
  );
}

async function help() {
  await mkdir(privateDirectory, { recursive: true });
  console.log(`用法：
  node scripts/content-admin.mjs validate --kind daily|english --input /abs/content.json
  node scripts/content-admin.mjs import --kind daily|english --input /abs/content.json
  node scripts/content-admin.mjs preview --kind daily|english --id content-id
  node scripts/content-admin.mjs approve --kind daily|english --id content-id --approved-by name
  node scripts/content-admin.mjs publish --kind daily|english --id content-id [--dry-run]
  node scripts/content-admin.mjs rollback --kind daily|english --id content-id --revision revision --approved-by name

草稿、审批、历史和预览默认只写入 ${privateDirectory}，公开快照默认写入 ${publicDirectory}。`);
}

const actions = {
  validate: validateInput,
  import: importDraft,
  preview: previewDraft,
  approve: approveDraft,
  publish: publishDraft,
  rollback: rollbackPublished,
  help
};

if (!actions[command]) {
  await help();
  process.exitCode = command ? 1 : 0;
} else {
  try {
    await actions[command]();
  } catch (error) {
    console.error(`内容操作失败：${error.message}`);
    process.exitCode = 1;
  }
}
