// 引入 Node.js 原生文件系统操作模块，用于异步读取和写入文件
import { readFile, writeFile } from "node:fs/promises";
// 引入路径解析工具，用于组装跨平台的绝对路径
import { resolve } from "node:path";
// 引入原生加密模块，用于计算内容指纹
import { createHash } from "node:crypto";
// 引入课件解析器与内容清洗函数
import { parseEnglishLesson } from "./batch-import-materials.mjs";
// 引入官方课件 HTML 清洗与安全转义函数
import { sanitizeContentBody } from "./content-html.mjs";
// 引入集合模式校验函数，确保数据结构 100% 满足前台渲染规范
import { validateCollection } from "./content-schema.mjs";

// 定义课件原始源文件所在目录（来自本地自动化流水线输出）
const SOURCE_DIR = "/Users/mrliang/WorkBuddy/automation-2026-09-01-12-53-24/outputs";
// 定义前台公开集合 JSON 文件的存储路径
const PUBLIC_JSON_PATH = resolve("content/public/english-lessons.json");
// 定义 Astro 页面组件直接引用的源数据 JSON 文件路径
const SRC_DATA_JSON_PATH = resolve("src/data/english-lessons.json");

/**
 * 辅助函数：转义 HTML 中的特殊字符，防止 XSS 并保持属性值合法
 * @param {string} text - 原始字符串
 * @returns {string} 转义后的 HTML 安全字符串
 */
function escapeHtml(text) {
  // 依次替换 &、<、>、"、' 字符
  return text
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;");
}

/**
 * 辅助函数：根据单句对话数据动态组装课件对话 HTML 字符串
 * @param {Array<object>} sentences - 对话单句列表
 * @returns {string} 包含点读按钮和说话人标签的有序列表项 HTML
 */
function renderDialogueHtml(sentences) {
  // 遍历每一句对话，渲染为标准微圆角卡片行
  return sentences
    .map(
      (sentence) =>
        `<li class="line english-sentence" data-sentence-id="${escapeHtml(sentence.id)}">\n` +
        `      <div class="line-head"><span class="speaker">${escapeHtml(sentence.speaker)}</span>` +
        `<button type="button" class="play-line" data-play-sentence="${escapeHtml(sentence.id)}" aria-label="点读第 ${escapeHtml(sentence.id)} 句" aria-pressed="false">🔊</button></div>\n` +
        `      <p class="en-line">${escapeHtml(sentence.text)}</p>` +
        `<p class="cn-line" data-translation>${escapeHtml(sentence.translation)}</p></li>`
    )
    .join("");
}

/**
 * 主执行函数：自动化增量同步课件内容
 */
async function main() {
  // 打印任务启动信息
  console.log("🚀 开始同步出海工作英语课件...");

  // 读取现有的公开课件集合 JSON
  const publicRaw = JSON.parse(await readFile(PUBLIC_JSON_PATH, "utf8"));
  // 读取现有的 Astro 前台引用 JSON
  const srcRaw = JSON.parse(await readFile(SRC_DATA_JSON_PATH, "utf8"));

  // 记录已收录的课程期次日期集合，用于增量排重
  const existingDates = new Set(publicRaw.items.map((item) => item.editionDate));
  console.log(`📌 当前系统已收录 ${existingDates.size} 节课件（最新日期：${[...existingDates].sort().at(-1)}）`);

  // 定义本次待增量同步的 7 节课件文件名与对应期次日期清单
  const targetLessons = [
    { date: "2026-10-05", file: "english-lesson-2026-10-05.html" },
    { date: "2026-10-06", file: "english-lesson-2026-10-06.html" },
    { date: "2026-10-07", file: "english-lesson-2026-10-07.html" },
    { date: "2026-10-08", file: "english-lesson-2026-10-08.html" },
    { date: "2026-10-09", file: "english-lesson-2026-10-09.html" },
    { date: "2026-10-10", file: "english-lesson-2026-10-10.html" },
    { date: "2026-10-11", file: "english-lesson-2026-10-11.html" }
  ];

  // 过滤出真正需要新增的课件
  const pendingLessons = targetLessons.filter((item) => !existingDates.has(item.date));

  // 如果没有待同步内容，直接结束退出
  if (pendingLessons.length === 0) {
    console.log("✅ 所有目标课件已在数据库中，无需重复同步。");
    return;
  }

  // 存储解析后的公开层课件对象数组
  const newPublicItems = [];
  // 存储解析后的 Astro 前台层课件对象数组（包含 coursewareHtml 和 playerData）
  const newSrcItems = [];

  // 逐一解析待导入的课件 HTML 文件
  for (const { date, file } of pendingLessons) {
    // 拼接源 HTML 文件的绝对路径
    const fullPath = resolve(SOURCE_DIR, file);
    console.log(`⏳ 正在解析 [${date}]：${file}...`);

    // 调用官方解析器生成符合 Schema 的课件基础数据
    const normalizedItem = await parseEnglishLesson(fullPath, date);

    // 将基础数据加入公开层集合
    newPublicItems.push(normalizedItem);

    // 为 Astro 前台层生成预渲染对话列表 HTML
    const dialogueHtml = renderDialogueHtml(normalizedItem.sentences);

    // 清洗课件 HTML 并将对话注入到 <ol id="dialogue-list"> 中
    const coursewareHtml = sanitizeContentBody(normalizedItem.bodyHtml, "english").replace(
      /<ol\b(?=[^>]*id="dialogue-list")[^>]*>[\s\S]*?<\/ol>/u,
      `<ol class="dialogue" id="dialogue-list">${dialogueHtml}</ol>`
    );

    // 组装供浏览器端离线语音合成播放器消费的 playerData 节点数据
    const playerData = {
      id: normalizedItem.id,
      revision: normalizedItem.revision,
      sentences: normalizedItem.sentences
    };

    // 组装完整的前台课件对象
    const fullSrcItem = {
      ...normalizedItem,
      coursewareHtml,
      playerData
    };

    // 加入 Astro 前台层数组
    newSrcItems.push(fullSrcItem);
    console.log(`   ✨ 成功提取：${normalizedItem.title} (${normalizedItem.slug})`);
  }

  // 合并并按照期次日期正序排列公开集合
  const mergedPublicItems = [...publicRaw.items, ...newPublicPublicItems(newPublicItems)].sort(
    (a, b) => a.editionDate.localeCompare(b.editionDate)
  );

  // 合并并按照期次日期正序排列前台完整集合
  const mergedSrcItems = [...srcRaw.items, ...newSrcItems].sort(
    (a, b) => a.editionDate.localeCompare(b.editionDate)
  );

  // 辅助函数：去重处理
  function newPublicPublicItems(items) {
    return items;
  }

  // 构造并校验合并后的公开集合对象
  const updatedPublicCollection = validateCollection(
    {
      schemaVersion: 1,
      kind: "english",
      items: mergedPublicItems
    },
    { expectedKind: "english", requirePublished: true }
  );

  // 构造合并后的前台集合对象
  const updatedSrcCollection = {
    schemaVersion: 1,
    kind: "english",
    items: mergedSrcItems
  };

  // 格式化写入 content/public/english-lessons.json
  await writeFile(
    PUBLIC_JSON_PATH,
    `${JSON.stringify(updatedPublicCollection, null, 2)}\n`,
    "utf8"
  );
  console.log(`💾 成功更新 ${PUBLIC_JSON_PATH}（总计 ${updatedPublicCollection.items.length} 节）`);

  // 格式化写入 src/data/english-lessons.json
  await writeFile(
    SRC_DATA_JSON_PATH,
    `${JSON.stringify(updatedSrcCollection, null, 2)}\n`,
    "utf8"
  );
  console.log(`💾 成功更新 ${SRC_DATA_JSON_PATH}（总计 ${updatedSrcCollection.items.length} 节）`);

  // 输出成功总结
  console.log(`🎉 同步圆满完成！新增 ${newPublicItems.length} 节课件，总课数达到 ${updatedSrcCollection.items.length} 节。`);
}

// 启动同步任务并捕获潜在异常
main().catch((error) => {
  console.error("❌ 同步过程中发生错误：", error);
  process.exitCode = 1;
});
