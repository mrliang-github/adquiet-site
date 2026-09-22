// 引入 Node.js 原生模块：文件读写与路径处理
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
// 引入内容模式校验器与哈希计算函数
import { contentRevision, validateCollection, validateContent } from "./content-schema.mjs";
// 引入原子化写入与集合路径工具
import { collectionPath, defaultPublicContentDirectory, writeJsonAtomic } from "./content-store.mjs";

// 定义英语课程源目录
const englishSourceDirectory = "/Users/mrliang/WorkBuddy/automation-2026-09-01-12-53-24/outputs";

/**
 * 辅助函数：将字符串转换为小写 kebab-case 格式的 URL slug 或标识符
 * @param {string} text - 待转换文本
 * @returns {string} 转换后的 kebab-case 字符串
 */
function slugify(text) {
  // 转为小写，移除除了字母、数字、空白和连字符以外的特殊字符
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gu, "")
    .trim()
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-");
}

/**
 * 从 HTML 课程源文件中解析出满足 Schema 规范的英语课程对象
 * @param {string} filePath - 课程 HTML 文件完整路径
 * @param {string} date - 期次日期 (YYYY-MM-DD)
 * @returns {Promise<object>} 结构化英语课程对象
 */
async function parseEnglishLesson(filePath, date) {
  // 读取 HTML 文件全部内容
  const html = await readFile(filePath, "utf8");

  // 1. 提取中英文标题
  const h1Match = html.match(/<h1>(.*?)<span class="en">(.*?)<\/span><\/h1>/su);
  // 中文主标题
  const cnTitle = h1Match ? h1Match[1].trim() : "";
  // 英文副标题
  const enTitle = h1Match ? h1Match[2].trim() : "";
  // 完整合成标题
  const title = `${cnTitle} · ${enTitle}`;
  // 基于英文副标题生成规范的 URL slug（2026-09-21 保持既有已发布的永久链接一致）
  const slug = date === "2026-09-21" ? "following-up-on-overdue-invoice" : slugify(enTitle);

  // 2. 提取 Meta 信息（职业与沟通动作）
  const metaMatch = html.match(/<div class="meta">(.*?)<\/div>/su);
  const metaText = metaMatch ? metaMatch[1] : "";
  // 提取职业信息并去除多余括号说明
  const professionMatch = metaText.match(/职业：(.*?)(?:·|$)/u);
  const profession = professionMatch
    ? professionMatch[1].replace(/（.*?）/gu, "").trim()
    : "独立开发者 / AI 内容创作者";

  // 3. 提取任务目标
  const taskMatch = html.match(/<p class="task">(?:Today's task:\s*)?(.*?)<\/p>/su);
  const goal = taskMatch ? taskMatch[1].trim() : "";

  // 4. 提取场景背景（从 Setup 区域的 Where 段落提取）
  const setupWhereMatch = html.match(/<h3>Where<\/h3>\s*<p class="en">(.*?)<\/p>/su);
  const scenario = setupWhereMatch
    ? setupWhereMatch[1].trim().slice(0, 150)
    : goal.slice(0, 150);

  // 5. 生成简明摘要
  const summary = `练习在「${cnTitle}」场景下，用清晰、地道、专业的英语展开有效沟通。`;

  // 6. 提取对白脚本中的 JSON 数据
  const dialogueMatch = html.match(/const dialogue = (\[.*?\]);/su);
  if (!dialogueMatch) {
    throw new Error(`在文件 ${filePath} 中未能找到对白 dialogue 数据`);
  }
  // 使用 Function 安全求值获得对白对象数组
  const dialogueRaw = new Function(`return ${dialogueMatch[1]}`)();

  // 映射为 Schema 标准的 sentences 数组，统一使用小写 id (l1, l2, ...)
  const sentences = dialogueRaw.map((dialogueItem, index) => ({
    // 句子唯一标识符
    id: `l${index + 1}`,
    // 说话角色
    speaker: dialogueItem.speaker.trim(),
    // 英文文本
    text: dialogueItem.en.trim(),
    // 中文翻译
    translation: dialogueItem.cn.trim()
  }));

  // 7. 提取重点表达（严格提取 5 个）
  const exprRegex = /<div class="expr">\s*<h3>(.*?)(?:<span class="ipa">.*?<\/span>)?<\/h3>(.*?)<\/div>/gsu;
  const expressions = [];
  let exprMatch;
  while ((exprMatch = exprRegex.exec(html)) !== null) {
    // 提取短语名称
    const rawPhrase = exprMatch[1].replace(/<[^>]+>/gu, "").trim();
    const exprBody = exprMatch[2];
    // 提取核心含义
    const defMatch = exprBody.match(/<p class="def"><strong>核心含义：<\/strong>(.*?)<\/p>/su);
    // 提取换情境例句
    const exampleMatch =
      exprBody.match(/<p class="def"><strong>换情境例句：<\/strong>["“](.*?)["”]/su) ??
      exprBody.match(/<p class="def"><strong>换情境例句：<\/strong>(.*?)<\/p>/su);

    const translation = defMatch ? defMatch[1].replace(/<[^>]+>/gu, "").trim() : "重点表达";
    let example = exampleMatch ? exampleMatch[1].replace(/<[^>]+>/gu, "").trim() : "";
    // 若例句带中文括号解释，剥离中文保留纯英文例句
    if (example.includes("（")) {
      example = example.split("（")[0].trim();
    }
    if (!example) example = rawPhrase;

    // 在对白中匹配该短语出现的句子 ID，做关联绑定
    const lowerPhrase = rawPhrase.toLowerCase().replace(/[^a-z0-9 ]/gu, "");
    let matchedSentenceId = "l1";
    for (const sentence of sentences) {
      if (sentence.text.toLowerCase().includes(lowerPhrase)) {
        matchedSentenceId = sentence.id;
        break;
      }
    }

    // 生成合法标识符 id
    const expressionId = slugify(rawPhrase) || `expr-${expressions.length + 1}`;
    expressions.push({
      id: expressionId,
      phrase: rawPhrase,
      translation: translation.slice(0, 160),
      example: example.slice(0, 300),
      sentenceId: matchedSentenceId
    });
  }

  // 8. 提取演练题目（My Turn）
  const myTurnBodyMatch = html.match(/<div class="my-turn-body">(.*?)<\/div>\s*<\/section>/su);
  const practice = [];
  if (myTurnBodyMatch) {
    const body = myTurnBodyMatch[1];
    // 提取场景情境
    const situationMatch = body.match(/<strong>Situation:<\/strong>\s*(.*?)(?:<\/p>|$)/su);
    // 提取对方说的话
    const theySayMatch = body.match(/<strong>They say:<\/strong>\s*(.*?)(?:<\/p>|$)/su);
    // 提取轮到你的要求
    const yourTurnMatch = body.match(/<strong>Your turn:<\/strong>\s*(.*?)(?:<\/p>|$)/su);
    // 提取英文参考答案
    const answerMatch = body.match(/<p class="en-line"[^>]*>(.*?)<\/p>/su);
    // 提取解析思路
    const explanationMatch = body.match(/<p><em>思路：<\/em>(.*?)<\/p>/su);

    // 组合演练题目 prompt
    const prompt = [
      situationMatch ? situationMatch[1].replace(/<[^>]+>/gu, "").trim() : "",
      theySayMatch ? `对方说: ${theySayMatch[1].replace(/<[^>]+>/gu, "").trim()}` : "",
      yourTurnMatch ? `你的任务: ${yourTurnMatch[1].replace(/<[^>]+>/gu, "").trim()}` : ""
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 400);

    const referenceAnswer = answerMatch
      ? answerMatch[1].replace(/<[^>]+>/gu, "").trim().slice(0, 400)
      : "Practice your response out loud.";
    const explanation = explanationMatch
      ? explanationMatch[1].replace(/<[^>]+>/gu, "").trim().slice(0, 400)
      : undefined;

    practice.push({
      prompt: prompt || "练习本课核心沟通动作与句型。",
      referenceAnswer,
      ...(explanation ? { explanation } : {})
    });
  }

  // 组装完整的英文课程对象
  const lesson = {
    schemaVersion: 1,
    kind: "english",
    id: `english-${date}`,
    slug,
    title,
    summary,
    editionDate: date,
    publicationTimeZone: "Asia/Shanghai",
    status: "published",
    preview: false,
    publishedAt: `${date}T10:00:00+08:00`,
    level: "foundation",
    profession,
    scenario,
    goal,
    durationMinutes: 12,
    expressions,
    sentences,
    practice
  };

  // 经由 Schema 严格规范化
  const normalized = validateContent(lesson, { expectedKind: "english" });
  // 计算版本指纹 revision
  const revision = contentRevision(normalized);
  return { ...normalized, revision };
}

/**
 * 完整脱敏的 8 期风向标日报脱敏数据定义（2026-09-14 至 2026-09-21）
 * 严格红线：去中心化、无圈友姓名、无原帖、无外部私密圈子链接，仅保留商业趋势、硬线索与批判性判断
 */
const dailyReportsData = [
  {
    schemaVersion: 1,
    kind: "daily",
    id: "daily-2026-09-14",
    slug: "ai-monetization-infrastructure-and-virtual-goods",
    title: "变现基建降低收款门槛，低粉小额虚拟品跑通闭环",
    summary: "变现主题占超五成，小额支付与自动交付基建逐步成熟；低粉账号借助互动单词游戏、心理测试与相亲测评跑通变现闭环。",
    editionDate: "2026-09-14",
    publicationTimeZone: "Asia/Shanghai",
    status: "published",
    preview: false,
    publishedAt: "2026-09-14T10:00:00+08:00",
    overview: "变现与小额数字品成为核心信号。关键增量在于支付与交付基础设施使独立开发者小额变现门槛进一步降低；同时低粉虚拟品案例在小红书等平台展现出极高转化效率。",
    discoveries: [
      {
        id: "infrastructure-lowers-threshold",
        title: "AI 变现与轻量收款基础设施降低交付门槛",
        fact: "轻量收款与小额支付工具陆续上线，个人作品在生成后可直接衔接自动计费与交付。",
        judgement: "即时小额结算的成熟将进一步推高独立开发者轻量工具与虚拟资产的供给密度。",
        sourceIds: ["daily-insight-20260914"]
      },
      {
        id: "low-follower-virtual-goods",
        title: "低粉账号通过小额刚需虚拟品实现高转化",
        fact: "英语单词互动游戏周销 600+ 单（累计 4700+ 单），千粉心理测试与相亲定位测评均跑出千单规模。",
        judgement: "高频刚需（备考、情感、测评）配合低门槛小额单价，是低权重个人账号跑通闭环的核心公式。",
        sourceIds: ["daily-insight-20260914"]
      },
      {
        id: "workflow-template-noise",
        title: "开发工作流模板增多但需警惕同质化噪音",
        fact: "大量同构的“刷到需求即开发”模板帖出现，实际跑通商业闭环的案例仍集中在少数垂直刚需。",
        judgement: "需严格区分概念性模板与真实商业闭环，避免被高频重复的开发范式误导为实际变现能力。",
        sourceIds: ["daily-insight-20260914"]
      }
    ],
    nextStep: "跟踪小额支付工具的稳定性与合规边界；关注相亲与测试类虚拟品是否有跨平台复制扩散信号。",
    tags: ["变现基建", "低粉虚拟品", "小红书", "商业洞察"],
    sources: [
      {
        id: "daily-insight-20260914",
        title: "每日商业与 AI 趋势观察记录（2026-09-14）",
        url: null,
        publishedAt: "2026-09-14"
      }
    ]
  },
  {
    schemaVersion: 1,
    kind: "daily",
    id: "daily-2026-09-15",
    slug: "node-driven-virtual-products-and-distillation",
    title: "节点驱动低价虚拟品集中爆发，AI知识蒸馏成新探索点",
    summary: "变现主题达近六成高位，职业天赋测试与AI测评批量涌现；99元AI知识蒸馏书籍显现高客单与高信息密度潜力。",
    editionDate: "2026-09-15",
    publicationTimeZone: "Asia/Shanghai",
    status: "published",
    preview: false,
    publishedAt: "2026-09-15T10:00:00+08:00",
    overview: "秋招与备考时间节点催化了低价虚拟品的集中爆发：职业测试、颜值测评单品走量达万单级；同时，99元客单的 AI 蒸馏书籍成为知识库变现的新样本。合规方面，网信办对未评估 API 中转站的通报为技术套壳敲响警钟。",
    discoveries: [
      {
        id: "node-driven-testing-products",
        title: "时间节点驱动下测评类虚拟品集中跑量",
        fact: "天赋职业测试（千粉以内出单过万）与低价测评类虚拟品同日涌现多起案例，借助秋招与节点流量爆发。",
        judgement: "低单价叠加刚需情绪具有瞬时爆发力，但极低客单价依赖走量，需综合考虑服务成本与退款结构。",
        sourceIds: ["daily-insight-20260915"]
      },
      {
        id: "knowledge-distillation-model",
        title: "AI 蒸馏专业内容跑通高客单变现",
        fact: "通过 AI 将长篇专业书籍或行业语料蒸馏为精华指南，以 99 元单价售出近 5 万元。",
        judgement: "用 AI 蒸馏并交付“浓缩经验”符合垂直知识库商业逻辑，为高信息密度卡片与手册产品提供了可行定价参照。",
        sourceIds: ["daily-insight-20260915"]
      },
      {
        id: "security-compliance-redline",
        title: "未备案中转服务受罚明确合规底线",
        fact: "地方网信部门对未经安全评估的中转接口服务进行依法通报。",
        judgement: "提示个人与团队在构建 AI 工具时，必须从第一天起将接口来源与安全合规纳入立项核查清单。",
        sourceIds: ["daily-insight-20260915"]
      }
    ],
    nextStep: "关注测试类虚拟品在节点退潮后的留存表现；小成本验证高客单知识蒸馏卡片形态的转化率。",
    tags: ["虚拟品", "知识蒸馏", "合规红线", "商业洞察"],
    sources: [
      {
        id: "daily-insight-20260915",
        title: "每日商业与 AI 趋势观察记录（2026-09-15）",
        url: null,
        publishedAt: "2026-09-15"
      }
    ]
  },
  {
    schemaVersion: 1,
    kind: "daily",
    id: "daily-2026-09-16",
    slug: "cross-platform-digital-goods-and-template-replication",
    title: "小红书与低价数字品多源交汇，相亲定位测试形成确定性共识",
    summary: "多品类低价数字品在小红书集中爆发，相亲测试获三源互证；供给侧进入模板复制阶段，需警惕低质内卷。",
    editionDate: "2026-09-16",
    publicationTimeZone: "Asia/Shanghai",
    status: "published",
    preview: false,
    publishedAt: "2026-09-16T10:00:00+08:00",
    overview: "工具效率与变现选品并列第一。核心真实信号是小红书与低价数字品的深度重叠：AI头像、相亲定位、记账工具、单词漫画等低价品批量上线。其中相亲定位测试已获连续三日、多位独立创作者多源印证，成为当前周期确定性最高的方向。",
    discoveries: [
      {
        id: "triple-source-matchmaking",
        title: "相亲定位测试三源印证确立周期主线",
        fact: "连续数日有不同创作者独立验证相亲定位测试出单，单日录得数万元销售额。",
        judgement: "跨创作者的三源互证排除了单点噪声，表明婚恋情绪与自我定位属于强付费意愿的高确定性赛道。",
        sourceIds: ["daily-insight-20260916"]
      },
      {
        id: "template-replication-cluster",
        title: "低价数字品供给侧正在极速模板化复制",
        fact: "AI头像（1.99元）、记账工具（26.9元）、英语记单词（40元）等多个品类同日出现。",
        judgement: "供给端正快速搬运已跑通模板，标的正在从文本资料泛化至交互小工具，竞争将迅速转向交付体验与分发效率。",
        sourceIds: ["daily-insight-20260916"]
      },
      {
        id: "noise-identification",
        title: "连发案例与概念性论断需做降噪过滤",
        fact: "单日多起高频连发或缺少转化数据的工具分享，实际商业验证度不足。",
        judgement: "对未附带实际留存与转化数据的工具，仅做技术选型参考，不宜直接作为商业立项依据。",
        sourceIds: ["daily-insight-20260916"]
      }
    ],
    nextStep: "观察相亲测试模板在不同平台的延伸形态；梳理垂直交互小工具在交付环节上的自动化瓶颈。",
    tags: ["数字品", "小红书", "模式验证", "商业洞察"],
    sources: [
      {
        id: "daily-insight-20260916",
        title: "每日商业与 AI 趋势观察记录（2026-09-16）",
        url: null,
        publishedAt: "2026-09-16"
      }
    ]
  },
  {
    schemaVersion: 1,
    kind: "daily",
    id: "daily-2026-09-17",
    slug: "monetization-segmentation-and-service-arbitrage",
    title: "变现品类结构分化，轻量服务差价与垂直工具展现韧性",
    summary: "变现主题内部分化为服务差价、实物、虚拟品与内容矩阵四类；流量转包与精准交付跑通闭环，避免笼统定性。",
    editionDate: "2026-09-17",
    publicationTimeZone: "Asia/Shanghai",
    status: "published",
    preview: false,
    publishedAt: "2026-09-17T10:00:00+08:00",
    overview: "变现选品呈现高度分化特征：涵盖了精准本地服务差价、实物代发、垂直虚拟品与内容矩阵。创作者分布健康，无单人刷屏。硬线索表明，避开泛流量大盘、利用精准流量做轻量服务转包或垂直生产力工具具有更高的确定性。",
    discoveries: [
      {
        id: "service-arbitrage-closing",
        title: "精准小流量对接成熟履约跑通服务差价",
        fact: "数百粉丝账号通过聚焦垂直维修或同城服务需求，将询盘精准转包给第三方专业师傅赚取差价。",
        judgement: "证明流量价值取决于转化精准度而非粉丝量级，无履约资产的轻团队完全可通过“精准流量+外部交付”跑通现金流。",
        sourceIds: ["daily-insight-20260917"]
      },
      {
        id: "productivity-templates-validation",
        title: "垂直生产力工具模板展现稳定付费需求",
        fact: "Obsidian 知识管理模板与儿童专项训练工具等垂直领域小众虚拟品稳定出单。",
        judgement: "聚焦特定软件生态的模板化配置，交付确定性极高，是个人创作者极佳的低运维产品形态。",
        sourceIds: ["daily-insight-20260917"]
      },
      {
        id: "theme-homogeneity-risk",
        title: "警惕粗放分类掩盖的不同商业底层",
        fact: "数据统计中将实物重资产、线下服务与纯数字品均粗暴归为“变现”。",
        judgement: "做独立开发与轻资产创业必须拆解底层模式，数字资产的可扩展性远优于重履约服务。",
        sourceIds: ["daily-insight-20260917"]
      }
    ],
    nextStep: "评估个人项目在工作流模板化方向的可复用资产；持续拆解低粉丝高转化账号的引流钩子。",
    tags: ["服务差价", "生产力模板", "轻资产", "商业洞察"],
    sources: [
      {
        id: "daily-insight-20260917",
        title: "每日商业与 AI 趋势观察记录（2026-09-17）",
        url: null,
        publishedAt: "2026-09-17"
      }
    ]
  },
  {
    schemaVersion: 1,
    kind: "daily",
    id: "daily-2026-09-18",
    slug: "tool-aggregation-and-developer-workflows",
    title: "变现热度单日回落，开发者工具与场景化信息聚合成为焦点",
    summary: "变现主题占比降至 25%，工具与研发场景聚合占半壁江山；场景化 AI 助手与深度信息过滤工具凸显长期价值。",
    editionDate: "2026-09-18",
    publicationTimeZone: "Asia/Shanghai",
    status: "published",
    preview: false,
    publishedAt: "2026-09-18T10:00:00+08:00",
    overview: "变现选品类内容降至阶段性低位（25%），工具与效率类（50%）主导当天趋势。核心增量集中在 AI 工具与专业开发/科研场景的结合，如代码仓库导航、垂直论文/视频学习助手。市场从快速套现的短期噱头向沉淀效率生产力工具转移。",
    discoveries: [
      {
        id: "specialized-developer-tools",
        title: "面向代码与研发场景的 AI 辅助工具深化",
        fact: "多款面向专业场景的代码解析、上下文增强与科研学习辅助工具成为讨论焦点。",
        judgement: "通用对话 AI 渐成红海，但在具有严格技术上下文的开发工作流中，垂类 Agent 仍具备坚固的效率价值。",
        sourceIds: ["daily-insight-20260918"]
      },
      {
        id: "monetization-noise-retreat",
        title: "纯变现口号暂时回落，技术深耕显现价值",
        fact: "单日缺乏大额或新增低价爆款数字品，整体内容更聚焦技术实现与功能落地。",
        judgement: "短期流量驱动型玩法天然存在波动，技术型独立开发者更应关注工具沉淀与长期用户留存。",
        sourceIds: ["daily-insight-20260918"]
      },
      {
        id: "information-aggregation-need",
        title: "高密度信息过滤与转录需求持续存在",
        fact: "多款针对长视频、长文档进行自动提取与要点提炼的工具获持续关注。",
        judgement: "长内容降噪与结构化输出依然是高频刚需，关键在于输出结构的实用度而非单纯翻译。",
        sourceIds: ["daily-insight-20260918"]
      }
    ],
    nextStep: "优化自身开发流中的知识库与自动提取脚本；关注下一轮变现周期中工具与产品的结合点。",
    tags: ["研发工具", "Agent工作流", "信息聚合", "商业洞察"],
    sources: [
      {
        id: "daily-insight-20260918",
        title: "每日商业与 AI 趋势观察记录（2026-09-18）",
        url: null,
        publishedAt: "2026-09-18"
      }
    ]
  },
  {
    schemaVersion: 1,
    kind: "daily",
    id: "daily-2026-09-19",
    slug: "platform-policy-shifts-and-blue-ocean-observations",
    title: "主题分布趋于均势，平台规则变动与存量赛道迁移成焦点",
    summary: "四大主题平分秋色，无单一爆发爆款；二手平台AI关键词管控与图文推荐流量池成为创作者关注核心。",
    editionDate: "2026-09-19",
    publicationTimeZone: "Asia/Shanghai",
    status: "published",
    preview: false,
    publishedAt: "2026-09-19T10:00:00+08:00",
    overview: "各大主题比例极为分散，处于“无明显主线”的过渡阶段。讨论焦点转向平台规则与存量赛道观察，如闲鱼对部分 AI 关键词的下架管控、微信公众号公域流量推荐规则的实测。",
    discoveries: [
      {
        id: "platform-policy-friction",
        title: "平台对 AI 关键词监管趋严增加分发摩擦",
        fact: "多位创作者反馈闲鱼等二手电商对直接带有“AI”特征的词条进行搜索降权或下架。",
        judgement: "在分发端包装产品时应弱化“AI噱头”，转向直陈“解决什么问题/交付什么成果”，降低平台合规拦截风险。",
        sourceIds: ["daily-insight-20260919"]
      },
      {
        id: "recommendation-traffic-mechanisms",
        title: "公众号公域推荐机制验证互动权重",
        fact: "多个实测案例显示，图文内容的评论区互动与转发是撬动公域推荐流量池的核心杠杆。",
        judgement: "在内容设计上必须前置植入“争鸣点”或“轻互动钩子”，而非单向灌输完整定论。",
        sourceIds: ["daily-insight-20260919"]
      },
      {
        id: "meta-discussion-saturation",
        title: "赛道讨论增多往往预示早期红利衰退",
        fact: "同日出现多起“教你如何找赛道”的宏观分析，而一手实操交易样本减少。",
        judgement: "当某种商业模式被大规模封装为方法论传播时，说明第一波窗口期已进入饱和，跟进需格外谨慎。",
        sourceIds: ["daily-insight-20260919"]
      }
    ],
    nextStep: "审视自身产品文案，移除过度标榜 AI 的营销词，改为痛点直述；在分发端测试互动型内容结构。",
    tags: ["平台规则", "公域推荐", "风险预警", "商业洞察"],
    sources: [
      {
        id: "daily-insight-20260919",
        title: "每日商业与 AI 趋势观察记录（2026-09-19）",
        url: null,
        publishedAt: "2026-09-19"
      }
    ]
  },
  {
    schemaVersion: 1,
    kind: "daily",
    id: "daily-2026-09-20",
    slug: "virtual-goods-and-skill-products",
    title: "变现主题回升，教育虚拟品与Skill形态成新信号",
    summary: "变现主题在连续两日低迷后回升，硬线索集中在多位独立作者观察到的「教育知识点可视化虚拟品」及小红书低价Skill模具。",
    editionDate: "2026-09-20",
    publicationTimeZone: "Asia/Shanghai",
    status: "published",
    preview: false,
    publishedAt: "2026-09-21T10:43:00+08:00",
    overview: "变现主题虽有回升，但硬线索集中在两位独立作者各自发现的初中漫画图解与小学语文导图，指向低粉+虚拟自动发货+按知识点拆品矩阵的打法；同时出现将名师语料封装为Skill低价分发的模具。",
    discoveries: [
      {
        id: "edu-visual-products",
        title: "教育知识点可视化虚拟品成独立共识",
        fact: "初中知识点漫画图解（手绘版销量5000+）与小学语文导图（2500~3000+）同日被不同作者独立观察到，均采用低粉+电子版自动发货+AI生成+按年级课文拆品矩阵。",
        judgement: "硬线索在于两位作者无关联，非单点噪声。题材虽是K12，但其可不断拆细品（SKU矩阵）的模具逻辑可直接复用到其他知识库赛道。",
        sourceIds: ["daily-insight-20260920"]
      },
      {
        id: "xiaohongshu-skill-product",
        title: "小红书低价卖定制 Skill 模具验证",
        fact: "有作者将名师考公视频沉淀为语料投喂 AI 封装成 Skill，在小红书以 10 元单价卖出 1000+ 份，并尝试迁移到四六级和高中知识点。",
        judgement: "10 元单价对应的价值是模具而非收入量级：把垂直语料封装为开箱即用的 Agent Skill，低门槛直接交付，具有清晰的跨赛道复用潜力。",
        sourceIds: ["daily-insight-20260920"]
      },
      {
        id: "platform-native-agents",
        title: "平台正将 Agent 能力原生内置到开发工具",
        fact: "微信开发者工具官方 Skill 上线，直接内置自动化工作流辅助。",
        judgement: "平台官方持续将通用 Agent 工具收编原生化，对单一转稿或搬运类 Agent 形成挤压，独立开发者需尽早建立垂直业务壁垒与私有语料护城河。",
        sourceIds: ["daily-insight-20260920"]
      }
    ],
    nextStep: "持续关注教育类知识点虚拟品是否出现第三位独立验证者，以确认新周期主线；同时关注小红书 Skill 形态低价品是否被他人快速复现。",
    tags: ["虚拟品", "AgentSkill", "商业洞察"],
    sources: [
      {
        id: "daily-insight-20260920",
        title: "每日商业与 AI 趋势观察记录（2026-09-20）",
        url: null,
        publishedAt: "2026-09-20"
      }
    ]
  },
  {
    schemaVersion: 1,
    kind: "daily",
    id: "daily-2026-09-21",
    slug: "ai-video-pipeline-servitization",
    title: "AI视频从自营内容走向接单服务，小红书测评迎“卖铲人”形态",
    summary: "变现主题维持高位，暗线指向AI视频产线的服务化接单与外包；小红书测评资料出现打包转售的“卖铲子”上游分化。",
    editionDate: "2026-09-21",
    publicationTimeZone: "Asia/Shanghai",
    status: "published",
    preview: false,
    publishedAt: "2026-09-21T10:00:00+08:00",
    overview: "变现与选品达 53.3%，但最值得关注的暗线是 AI 视频产线的服务化：爆款转工作流、穿搭视频流水线、海外电商剪辑师招聘等互不相关信号同时涌现，标志着 AI 视频从“自己做号赌流量”演进为“稳定接单做交付”。同时，测评类虚拟品出现 9.9 元打包上游货源的“卖铲”新形态。",
    discoveries: [
      {
        id: "video-pipeline-servitization",
        title: "AI 视频生产线全面向接单与服务外包收敛",
        fact: "把爆款视频代码化复刻工具、电商广告 AI 剪辑师月薪岗位与垂直穿搭流水线同日被多方独立关注。",
        judgement: "行业正从碰运气的自媒体博弈，转变为标准产能的供给。拥有稳定自动化产线的开发者更容易通过 B 端服务获得确定性收入。",
        sourceIds: ["daily-insight-20260921"]
      },
      {
        id: "seller-of-shovels-model",
        title: "测评类虚拟品形态上移至“卖铲子供货”",
        fact: "小红书测评资料出现打包为 9.9 元大礼包直接向做测评的创作者供货的案例，单帖获高关注。",
        judgement: "当下游创作者密集入局时，上游提供原料包与工具模具的商业确定性显著提高，是经典的“卖铲”模式演进。",
        sourceIds: ["daily-insight-20260921"]
      },
      {
        id: "reused-case-distinction",
        title: "老案例二次流转需剔除虚假增量",
        fact: "某小红书测试小店在 9-15 出现后再次被其他作者提及，相关销售额为作者自算而非独立新增。",
        judgement: "需建立跨期次去重意识，避免同一存量样本在圈内扩散时被误判为行业爆发新信号。",
        sourceIds: ["daily-insight-20260921"]
      }
    ],
    nextStep: "评估自身工作流向可复用产线化封装的可能；测试长文档检索与高互动内容钩子在私域的分发效果。",
    tags: ["视频产线", "服务化", "卖铲模式", "商业洞察"],
    sources: [
      {
        id: "daily-insight-20260921",
        title: "每日商业与 AI 趋势观察记录（2026-09-21）",
        url: null,
        publishedAt: "2026-09-21"
      }
    ]
  }
];

/**
 * 主执行函数：批量解析、验证、更新内容集合并写入磁盘
 */
async function main() {
  console.log("=== 开始批量导入历史英语课程与风向标日报 ===");

  // 1. 读取并解析所有英语课程
  console.log("\n[1/4] 解析英语课程源文件...");
  const englishFiles = (await readdir(englishSourceDirectory))
    .filter((fileName) => fileName.startsWith("english-lesson-") && fileName.endsWith(".html"))
    .sort();

  const englishLessons = [];
  for (const fileName of englishFiles) {
    // 匹配日期字符串
    const dateMatch = fileName.match(/\d{4}-\d{2}-\d{2}/u);
    if (!dateMatch) continue;
    const date = dateMatch[0];
    const fullPath = join(englishSourceDirectory, fileName);
    const parsedLesson = await parseEnglishLesson(fullPath, date);
    englishLessons.push(parsedLesson);
    console.log(`  ✓ 已解析英语课 [${date}]: ${parsedLesson.title} (rev: ${parsedLesson.revision})`);
  }

  // 2. 规范化并计算风向标日报
  console.log("\n[2/4] 规范化脱敏风向标日报...");
  const dailyReports = [];
  for (const report of dailyReportsData) {
    // 经由 Schema 校验
    const normalized = validateContent(report, { expectedKind: "daily" });
    // 计算 revision
    const revision = contentRevision(normalized);
    dailyReports.push({ ...normalized, revision });
    console.log(`  ✓ 已规范日报 [${report.editionDate}]: ${report.title} (rev: ${revision})`);
  }

  // 3. 校验集合完整性并写入 public 内容目录
  console.log("\n[3/4] 写入内容数据库...");
  const englishCollection = validateCollection(
    { schemaVersion: 1, kind: "english", items: englishLessons },
    { expectedKind: "english", requirePublished: true }
  );
  const dailyCollection = validateCollection(
    { schemaVersion: 1, kind: "daily", items: dailyReports },
    { expectedKind: "daily", requirePublished: true }
  );

  const englishPath = collectionPath(defaultPublicContentDirectory, "english");
  const dailyPath = collectionPath(defaultPublicContentDirectory, "daily");

  await writeJsonAtomic(englishPath, englishCollection);
  console.log(`  ✓ 已成功更新: ${englishPath} (共 ${englishLessons.length} 篇课程)`);

  await writeJsonAtomic(dailyPath, dailyCollection);
  console.log(`  ✓ 已成功更新: ${dailyPath} (共 ${dailyReports.length} 篇日报)`);

  console.log("\n[4/4] 批量导入完成！请运行静态构建构建新页面。");
}

main().catch((error) => {
  console.error(`导入失败：${error.stack || error.message}`);
  process.exitCode = 1;
});
