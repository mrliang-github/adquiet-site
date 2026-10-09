import type { MarkdownHeading } from 'astro'

// 目录大纲节点接口定义（支持嵌套子标题）
export interface TocItem extends MarkdownHeading {
  subheadings: TocItem[]
}

// 将扁平的 headings 数组转化为层级树形结构的函数
export function generateToc(headings: readonly MarkdownHeading[]): TocItem[] {
  // 创建虚拟根节点作为层级栈的底部锚点
  const root: TocItem = { depth: 0, slug: 'root', text: 'Root', subheadings: [] }
  // 初始化节点深度栈
  const stack: TocItem[] = [root]

  // 遍历所有标题节点并按 depth 维持父子嵌套关系
  headings.forEach((h) => {
    // 实例化带空子节点数组的当前标题项
    const heading: TocItem = { ...h, subheadings: [] }
    // 如果栈顶节点深度大于等于当前节点，持续弹出直到找到上级父节点
    while (stack[stack.length - 1].depth >= heading.depth) {
      stack.pop()
    }
    // 将当前节点追加到父级节点的 subheadings 列表中
    stack[stack.length - 1].subheadings.push(heading)
    // 当前节点压入栈中，作为后续可能子节点的潜在父级
    stack.push(heading)
  })

  // 返回根节点收集到的第一级标题树
  return root.subheadings
}
