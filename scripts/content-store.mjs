import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  CONTENT_FILENAMES,
  CONTENT_KINDS,
  contentRevision,
  validateCollection,
  validateContent
} from "./content-schema.mjs";

const sleep = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));

export const defaultPublicContentDirectory = resolve("content/public");

function lockOwnerIsAlive(lockContents) {
  const ownerPid = Number(lockContents.trim().split(":", 1)[0]);
  if (!Number.isInteger(ownerPid) || ownerPid <= 0) return false;
  try {
    process.kill(ownerPid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

export function collectionPath(directory, kind) {
  if (!CONTENT_KINDS.includes(kind)) {
    throw new Error(`未知内容类型：${kind}`);
  }

  return join(resolve(directory), CONTENT_FILENAMES[kind]);
}

export async function readJson(pathname) {
  let source;
  try {
    source = await readFile(pathname, "utf8");
  } catch (error) {
    throw new Error(`无法读取 ${pathname}：${error.message}`);
  }

  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`无法解析 ${pathname}：${error.message}`);
  }
}

export async function readContentCollection(directory, kind, options = {}) {
  const pathname = collectionPath(directory, kind);
  const raw = await readJson(pathname);
  return validateCollection(raw, { expectedKind: kind, ...options });
}

export async function writeJsonAtomic(pathname, value) {
  await mkdir(dirname(pathname), { recursive: true });
  const temporaryPath = `${pathname}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, pathname);
}

async function acquireLock(lockPath) {
  const deadline = Date.now() + 5_000;
  const owner = `${process.pid}:${randomUUID()}`;
  const lockContents = `${owner}\n`;
  while (Date.now() < deadline) {
    try {
      await mkdir(dirname(lockPath), { recursive: true });
      const handle = await open(lockPath, "wx");
      await handle.writeFile(lockContents, "utf8");
      return async () => {
        await handle.close();
        try {
          if ((await readFile(lockPath, "utf8")) === lockContents) {
            await rm(lockPath, { force: true });
          }
        } catch {
          // A recovered or already released lock must not mask a completed write.
        }
      };
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }

      try {
        const lockStats = await stat(lockPath);
        if (Date.now() - lockStats.mtimeMs > 5 * 60_000) {
          if (lockOwnerIsAlive(await readFile(lockPath, "utf8"))) {
            await sleep(80);
            continue;
          }
          const stalePath = `${lockPath}.${process.pid}.${randomUUID()}.stale`;
          try {
            await rename(lockPath, stalePath);
            await rm(stalePath, { force: true });
          } catch (recoveryError) {
            if (recoveryError.code !== "ENOENT") throw recoveryError;
          }
          continue;
        }
      } catch {
        // The owner released the lock between the open and stat calls.
      }

      await sleep(80);
    }
  }

  throw new Error("内容发布锁未释放，请确认没有另一个发布任务正在运行");
}

export async function loadPublishedContent({
  publicDirectory = defaultPublicContentDirectory
} = {}) {
  const collections = await Promise.all(
    CONTENT_KINDS.map((kind) => readContentCollection(publicDirectory, kind, { requirePublished: true }))
  );
  const byKind = Object.fromEntries(collections.map((collection) => [collection.kind, collection.items]));

  for (const kind of CONTENT_KINDS) {
    byKind[kind] = byKind[kind].toSorted((left, right) =>
      right.editionDate.localeCompare(left.editionDate) || right.id.localeCompare(left.id)
    );
  }

  return { dailyReports: byKind.daily, englishLessons: byKind.english };
}

export async function upsertPublishedContent({
  publicDirectory = defaultPublicContentDirectory,
  content,
  beforeWrite = async () => {},
  dryRun = false
}) {
  const normalized = validateContent(content, { expectedKind: content?.kind });
  if (normalized.status !== "published" || normalized.preview) {
    throw new Error("只能写入已审批的非预览公开内容");
  }

  const pathname = collectionPath(publicDirectory, normalized.kind);
  const release = await acquireLock(`${pathname}.lock`);
  try {
    const collection = await readContentCollection(publicDirectory, normalized.kind, {
      requirePublished: true
    });
    const revision = contentRevision(normalized);
    if (normalized.revision && normalized.revision !== revision) {
      throw new Error("内容 revision 与当前内容哈希不一致，请重新导入或审批");
    }
    const nextContent = { ...normalized, revision };
    const currentIndex = collection.items.findIndex((item) => item.id === nextContent.id);
    const current = currentIndex === -1 ? null : collection.items[currentIndex];

    if (current?.revision === nextContent.revision) {
      return { changed: false, current, nextContent, collection, nextCollection: collection };
    }

    const sameEdition = collection.items.find(
      (item) => item.editionDate === nextContent.editionDate && item.id !== nextContent.id
    );
    if (sameEdition) {
      throw new Error(
        `${nextContent.editionDate} 已有 ${nextContent.kind} 内容 ${sameEdition.id}，拒绝重复发布`
      );
    }

    const items = [...collection.items];
    if (currentIndex === -1) {
      items.push(nextContent);
    } else {
      items[currentIndex] = nextContent;
    }

    const nextCollection = validateCollection(
      { schemaVersion: 1, kind: nextContent.kind, items },
      { expectedKind: nextContent.kind, requirePublished: true }
    );

    if (dryRun) {
      return { changed: true, current, nextContent, collection, nextCollection };
    }

    await beforeWrite(current, nextContent);
    await writeJsonAtomic(pathname, nextCollection);
    return { changed: true, current, nextContent, collection: nextCollection, nextCollection };
  } finally {
    await release();
  }
}
