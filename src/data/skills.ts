// 定义站内公开分享的 AI Skill 详情页数据结构
export interface SkillShowcaseItem {
  // 路由唯一标识（对应 /skills/[slug]/）
  slug: string
  // 页面主标题
  name: string
  // 顶部简短副标题
  tagline: string
  // 适用宿主环境标签
  hostEnv: string
  // 适合谁用（精准点明目标读者与使用场景）
  audience: string
  // ZIP 下载包站内路径
  downloadHref: string
  // 下载按钮文案
  downloadLabel: string
  // 安装包体积说明
  fileSizeLabel: string
  // 可选的在线真实效果演示页路径
  demoHref?: string
  // 可选的演示按钮文案
  demoLabel?: string
  // 可选的开源 GitHub 仓库地址
  githubHref?: string
  // 核心解决的问题与亮点列表
  highlights: string[]
  // 可选的子技能拆分说明（适用于多模块套件）
  subSkills?: Array<{
    id: string
    title: string
    summary: string
  }>
  // 终端一键安装或手动放置命令示例
  installCommand: string
  // 分步上手说明
  installSteps: string[]
  // 诚实能力边界与前置条件（不夸大承诺）
  boundaries: string[]
}

// 统一维护站内公开分享的 3 套原创 AI Skill 数据
export const skillShowcases: SkillShowcaseItem[] = [
  {
    slug: 'apple-app-suite',
    name: 'Apple 独立开发上架与出图套件',
    tagline: '把多款 iOS / Watch / Mac 应用真实过审沉淀下来的原生 UI 审查、商店宣传图策划出图与送审预检流程打包成可复用的 5 个 Agent Skill。',
    hostEnv: 'Claude Code · Codex · 通用 Agent',
    audience: '正在用 AI 开发并上架 iOS / macOS 独立应用、不想在截图返工与审核被拒上反复踩坑的开发者',
    downloadHref: '/skills/apple-app-suite/apple-indie-skills.zip',
    downloadLabel: '下载脱敏套件包（.zip）',
    fileSizeLabel: '约 101 KB · 含 5 个独立 Skill 与说明文档',
    highlights: [
      '强制隔离「内部制作说明」与「顾客可见文案（Public Copy）」，防止生图模型把内部提示词或备注错印到 App Store 截图画面里。',
      '坚持从真实代码与当前 UI 提炼卖点，严禁编造未实现的功能或虚假数据，从源头规避 Apple 审核 2.3 元数据误导拒审。',
      '内置模拟审核员视角的只读预检清单，逐项核查二进制配置、隐私披露、内购恢复购买与商店描述一致性。'
    ],
    subSkills: [
      {
        id: 'apple-native-ui',
        title: '原生界面与交互审查',
        summary: '按 iOS / watchOS 习惯核对页面任务、文字层级、状态反馈与辅助功能，不套空泛模板。'
      },
      {
        id: 'apple-image',
        title: '商店与社媒宣传图策划（Director）',
        summary: '梳理产品事实、目标地区与单图唯一卖点，输出经过事实校验的 Public Copy 与视觉简报。'
      },
      {
        id: 'apple-image-studio',
        title: '商店套图视觉成片（Studio）',
        summary: '承接策划契约，结合真实 App 截图与设备机框生成 App Store 或小红书宣传成片。'
      },
      {
        id: 'apple-app-review-audit',
        title: '送审前合规与拒审排查',
        summary: '默认只读运行，从审核员视角交叉核对权限文案、内购边界、账号删除与测试说明。'
      },
      {
        id: 'app-store-release',
        title: '多地区关键词覆盖与发布核对',
        summary: '逐地区映射标题、副标题与隐藏关键词覆盖，串联版本构建与元数据检查。'
      }
    ],
    installCommand: `unzip apple-indie-skills.zip\ncp -R apple-indie-skills/apple-* apple-indie-skills/app-store-release ~/.agents/skills/`,
    installSteps: [
      '下载上方 ZIP 压缩包并解压，里面包含 5 个独立的子技能文件夹与中文总览说明。',
      '按你常用的工具，将子目录复制到 ~/.claude/skills/、~/.codex/skills/ 或 ~/.agents/skills/。',
      '如需使用 apple-image-studio 生成带机框宣传图，请先从 Apple Design Resources 官方下载 iPhone PNG 机框放入 apple-image/assets/device-frames/。'
    ],
    boundaries: [
      '为遵守素材版权边界，公开压缩包不包含 Apple 官方设备机框原图，需自行从苹果官网免费下载放入指定目录。',
      'apple-image-studio 生成完整宣传图需要你的 Agent 宿主环境具备图像生成工具（如 image_gen）与看图工具（view_image）。',
      'apple-app-review-audit 属于基于公开规则的上架前自查辅助，不代表 Apple 官方审核承诺，也不会未经授权自动提交构建。'
    ]
  },
  {
    slug: 'mcd-meal-buddy',
    name: '麦麦搭餐 · mcd-meal-buddy',
    tagline: '告诉 Agent 你在哪、预算多少、想吃什么或热量上限多少，自动调取官方核价与营养表算出最多三套搭配，并导出干净好看的小票网页。',
    hostEnv: 'WorkBuddy · Claude Code · 通用 Agent',
    audience: '平时点麦当劳想顺手控热量/算优惠差价的人，或想参考“官方 MCP 取数 + 本地脚本严密核验”架构的 AI 编程学习者',
    downloadHref: '/skills/mcd-meal-buddy/mcd-meal-buddy.zip',
    downloadLabel: '下载 Skill 安装包（.zip）',
    fileSizeLabel: '约 220 KB · MIT 开源协议 · 含离线样例',
    demoHref: '/skills/mcd-meal-buddy/demo.html',
    demoLabel: '在线试玩配餐与热量滑杆演示 ↗',
    highlights: [
      '把模糊口语（如“30 元以内、保留薯条、饮料换无糖、控制热量”）拆解成确定性的代码约束核验，而不是让大模型心算瞎编价格。',
      '严格区分已知与未知营养数据：对官方营养表缺失的单品绝不当作 0 卡路里糊弄，控热量模式下自动剔除数据不全方案。',
      '支持一键输出自包含 HTML 餐单小票，手机端浏览清爽，分享版默认脱敏隐藏门店定位与个人交易指纹。'
    ],
    installCommand: `unzip mcd-meal-buddy.zip -d ~/.agents/skills/\n# 免账号直接体验离线核价与小票生成：\ncd ~/.agents/skills/mcd-meal-buddy && python3 scripts/meal_plan.py analyze examples/light.json`,
    installSteps: [
      '可以先直接点击上方「在线试玩演示」，无需安装、无需申请 Token 即可拖动预算与热量滑杆查看真实门店核价快照。',
      '下载 ZIP 解压到 ~/.workbuddy/skills/mcd-meal-buddy/ 或 ~/.agents/skills/mcd-meal-buddy/（仅依赖 Python 3.9+ 标准库）。',
      '如需查询实时门店与领券核价，按包内 references/setup.md 指引接入你自己的麦当劳官方 MCP 连接器即可。'
    ],
    boundaries: [
      '这是一个给 Agent 调用的 Skill，不是独立手机 App；安装包内不包含任何个人 Token，也不会自动代付下单。',
      '在线演示页展示的是真实接口采集的历史快照，实际点餐价格与可用优惠券会随门店、餐段及个人账户变动。'
    ]
  },
  {
    slug: 'liangxiao-travel',
    name: '松鼠旅行官 · 良逍旅行规划',
    tagline: '给 AI 一段出行需求，整理交通比选、逐日路线、住宿门票、两档预算与行前清单，同时生成适合手机随时翻看的单文件行程网页。',
    hostEnv: 'WorkBuddy · Claude Code · Codex',
    audience: '做自由行攻略嫌零散笔记难翻看、希望导出一份手机离线也能勾选待办的行程单的人',
    downloadHref: '/skills/liangxiao-travel/liangxiao-travel-1.2.0.zip',
    downloadLabel: '下载 v1.2.0 安装包（.zip）',
    fileSizeLabel: '约 53 KB · MIT 开源协议',
    demoHref: '/skills/liangxiao-travel/demo.html',
    demoLabel: '在线查看川西行程网页示例 ↗',
    githubHref: 'https://github.com/mrliang-github/liangxiao-travel',
    highlights: [
      '同一份结构化 travel-data.json 同时驱动 Markdown 文档与单文件手机行程网页，避免改一处日程要手工同步三份文档。',
      '手机行程页内置交通、路线、每日行程、门票、美食与待办 6 个标签页，行前待办勾选状态自动保存在本地浏览器。',
      '严守信息诚实边界：把实时查到的班次票价、估算预算与未核实信息明确区分标注，默认公开分享页不泄露个人地图 Key。'
    ],
    installCommand: `mkdir -p ~/.workbuddy/skills\ngit clone https://github.com/mrliang-github/liangxiao-travel.git ~/.workbuddy/skills/liangxiao-travel`,
    installSteps: [
      '点击「在线查看川西行程网页示例」，直观体验最终生成的手机端多标签行程单与待办交互。',
      '在 WorkBuddy「技能 → 添加技能 → 上传技能」直接导入上方 ZIP 包，或通过 Git 克隆到技能目录。',
      '支持「基础攻略模式」（零外部 Key 即可生成结构化行程页）与「增强模式」（配合同程连接器与腾讯地图助手查询实时班次路线）。'
    ],
    boundaries: [
      '仓库内 Python 脚本仅用标准库，但若需实时查票价与地图路线，需在宿主环境按引导授权同程与腾讯地图助手。',
      '生成的 HTML 为生成时刻的资料快照，不会自动刷新景区营业时间或余票库存，出发前请核对关键预约项。'
    ]
  }
]

// 根据 slug 查询对应的 Skill 详情配置
export function getSkillBySlug(slug: string): SkillShowcaseItem | undefined {
  return skillShowcases.find((item) => item.slug === slug)
}
