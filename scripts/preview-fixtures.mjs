// Synthetic local-only fixtures. They are deliberately kept out of the public
// content tree and are merged only by an explicit `--preview` build.
export const previewCollections = {
  daily: {
    schemaVersion: 1,
    kind: "daily",
    items: [
      {
        schemaVersion: 1,
        kind: "daily",
        id: "daily-preview-content-boundaries",
        slug: "preview-content-boundaries",
        title: "栏目预览：把素材、判断和公开范围分开",
        summary:
          "这是一篇开发预览样稿，只用于验证日报的阅读、来源和发布边界，不代表当天资讯或任何第三方官方内容。",
        editionDate: "2026-09-20",
        publicationTimeZone: "Asia/Shanghai",
        status: "published",
        preview: true,
        publishedAt: "2026-09-20T09:00:00+08:00",
        overview:
          "先把每条材料对应的来源和公开权限留在内容记录里，才不会在生成页面时把私人笔记、待核实观点和公开摘要混在一起。",
        discoveries: [
          {
            id: "source-first",
            title: "先写来源，再写摘要",
            fact:
              "本样稿没有导入外部新闻或会员材料；它只验证一篇内容可以引用已登记来源，而没有 URL 时不会生成假链接。",
            judgement:
              "日报真正有价值的部分不是把链接排满，而是读者能区分看到的事实、个人判断和还需要验证的假设。",
            sourceIds: ["preview-brief"]
          },
          {
            id: "publish-gate",
            title: "发布必须检查当前修订",
            fact:
              "本项目的本地发布命令会为草稿生成修订号，只有与已审批修订一致时才会写入公开集合。",
            judgement:
              "这让内容改完后必须重新审核，避免用旧审批把新文本直接推到公开页。",
            sourceIds: ["preview-brief"]
          }
        ],
        nextStep:
          "接入真实且可公开的素材前，先逐条确认引用权限、来源链接和期次日期；没有足够材料时保留空状态，不把样稿当作日报发布。",
        tags: ["开发预览", "内容流程"],
        sources: [
          {
            id: "preview-brief",
            title: "本站内容流程开发说明（预览样稿）",
            url: null,
            publishedAt: "2026-09-20"
          }
        ]
      }
    ]
  },
  english: {
    schemaVersion: 1,
    kind: "english",
    items: [
      {
        schemaVersion: 1,
        kind: "english",
        id: "english-preview-project-delay",
        slug: "preview-project-delay",
        title: "项目延期时，怎么把下一步说清楚",
        summary:
          "开发预览课程：练习在项目延期时解释现状、提出可执行的下一步，并确认对方的预期。",
        editionDate: "2026-09-20",
        publicationTimeZone: "Asia/Shanghai",
        status: "published",
        preview: true,
        publishedAt: "2026-09-20T09:00:00+08:00",
        level: "foundation",
        profession: "产品经理",
        scenario: "向合作方解释一个功能为什么要延后一周",
        goal: "说明影响、给出新的交付时间，并约定下一次同步点。",
        durationMinutes: 12,
        expressions: [
          {
            id: "run-into",
            phrase: "run into an issue",
            translation: "遇到一个问题",
            example: "We ran into an issue during the final check.",
            sentenceId: "s3"
          },
          {
            id: "push-back",
            phrase: "push back the date",
            translation: "把日期往后推",
            example: "We need to push back the date by one week.",
            sentenceId: "s4"
          },
          {
            id: "keep-posted",
            phrase: "keep you posted",
            translation: "随时同步进展",
            example: "I will keep you posted after the next test.",
            sentenceId: "s7"
          },
          {
            id: "workable-plan",
            phrase: "a workable plan",
            translation: "一个可执行的方案",
            example: "This gives us a workable plan for the week.",
            sentenceId: "s8"
          },
          {
            id: "check-in",
            phrase: "check in on Friday",
            translation: "周五再同步一次",
            example: "Can we check in on Friday afternoon?",
            sentenceId: "s9"
          }
        ],
        sentences: [
          {
            id: "s1",
            speaker: "Mia",
            text: "Hi Alex, do you have a minute to talk about the release date?",
            translation: "嗨，Alex，你现在方便聊一下发布时间吗？"
          },
          {
            id: "s2",
            speaker: "Alex",
            text: "Sure. Is everything on track?",
            translation: "当然。一切都按计划进行吗？"
          },
          {
            id: "s3",
            speaker: "Mia",
            text: "Mostly, but we ran into an issue during the final check.",
            translation: "大部分都正常，不过我们在最终检查时遇到了一个问题。"
          },
          {
            id: "s4",
            speaker: "Mia",
            text: "We need to push back the date by one week to fix it properly.",
            translation: "我们需要把日期往后推一周，才能把它彻底解决。"
          },
          {
            id: "s5",
            speaker: "Alex",
            text: "What does that change for the customer demo?",
            translation: "这会给客户演示带来什么变化？"
          },
          {
            id: "s6",
            speaker: "Mia",
            text:
              "The demo can still happen. We will use the stable version and explain the update.",
            translation: "演示仍然可以进行。我们会使用稳定版本，并说明这次更新。"
          },
          {
            id: "s7",
            speaker: "Mia",
            text: "I will keep you posted after the next test tomorrow.",
            translation: "明天下一轮测试后，我会第一时间同步你。"
          },
          {
            id: "s8",
            speaker: "Alex",
            text: "That sounds like a workable plan.",
            translation: "听起来这是一个可执行的方案。"
          },
          {
            id: "s9",
            speaker: "Alex",
            text: "Can we check in on Friday afternoon?",
            translation: "我们可以在周五下午再同步一次吗？"
          },
          {
            id: "s10",
            speaker: "Mia",
            text: "Yes, I will send an invite and bring the test results.",
            translation: "可以，我会发会议邀请，并带上测试结果。"
          }
        ],
        practice: [
          {
            prompt: "用自己的项目替换 issue 和 date，练习用两句话说明延期原因和新的时间。",
            referenceAnswer:
              "We ran into an issue during the final check, so we need to push back the date by one week."
          },
          {
            prompt: "如果对方问 What does that change?，用英文说明一个仍可按时完成的部分。",
            referenceAnswer:
              "The customer demo can still happen with the stable version, and I will keep you posted after the next test.",
            explanation: "先说明仍可完成的部分，再给出下一次同步点。"
          }
        ]
      }
    ]
  }
};
