// 定义微信公众号公开展示信息的数据结构接口
export interface WechatOfficialAccount {
  // 公众号对外公开名称
  name: string
  // 公众号微信号 ID（便于手机读者搜索复制）
  accountId: string
  // 卡片短标语（用于紧凑区域展示）
  tagline: string
  // 公众号内容定位说明（来自公众号后台真实简介）
  description: string
  // 个人微信号（用于高意向合作联系）
  personalWechat: string
}

// 导出全站统一复用的公众号与微信联系配置，避免多页面硬编码不一致
export const wechatOfficialAccount: WechatOfficialAccount = {
  // 公众号准确名称
  name: '良逍Ai出海笔记',
  // 公众号唯一搜索微信号
  accountId: 'LiangXiaoAi2025',
  // 提炼后的核心内容标签
  tagline: 'AI 开发实战 · 独立产品出海 · 效率工具折腾记录',
  // 面向读者的订阅价值说明
  description:
    '持续记录 AI Agent 开发实战、独立产品出海探索与效率工具折腾过程——内容杂但真实，都是自己下场干过的。',
  // 个人合作微信号
  personalWechat: 'liangxiao-20'
}
