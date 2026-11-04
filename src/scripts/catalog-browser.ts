// 导入数据检索、筛选、分页与外部链接安全处理函数
import {
  companySources, defaultQuery, exportCsv, filterCompanies, isRanking,
  PAGE_SIZE, paginate, queryParams, readQuery, safeExternalUrl, validQuery,
  type Catalog, type Company, type QueryState
} from '../lib/catalog'

// 辅助函数：安全创建带有文本与类名的 DOM 节点
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
  // 创建指定 HTML 标签节点
  const node = document.createElement(tag)
  // 注入文本内容（原生 textContent 具备天然防 XSS 能力）
  node.textContent = text
  // 注入 CSS 类名
  if (className) node.className = className
  // 返回构建完成的节点
  return node
}

// 辅助函数：HTML 属性与动态内容转义，防止模板拼接时的 XSS 隐患
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 渲染单个企业表格行（保持与 CompanyRow.astro 静态输出严格一致）
function companyRow(c: Company, data: Catalog) {
  // 判断是否为独角兽排名榜单
  const ranking = isRanking(data)
  // 创建表格行
  const row = element('tr')
  // 注入企业唯一 ID 方便反查
  row.dataset.companyId = c.id

  // 1. 企业名称列
  const name = element('th', '', 'company-name')
  name.scope = 'row'
  // 注入企业中文名称
  name.append(element('span', c.name))
  // 存在有效英文名且与中文不重复时补充展示
  if (c.nameEn && c.nameEn !== c.name) {
    name.append(element('span', c.nameEn, 'company-name-en'))
  }

  // 2. 地区位置列
  const region = ranking ? c.country : c.province
  const locality = ranking ? c.city : c.reportingRegion && c.reportingRegion !== c.province ? `申报地区：${c.reportingRegion}` : ''
  const location = element('td')
  location.append(element('span', region || '待补充'))
  if (locality) {
    location.append(element('span', locality, 'company-locality'))
  }

  // 装配前三列（名称、排名/序号、地区）
  row.append(
    name,
    element('td', String((ranking ? c.rank : c.sequence) ?? ''), 'company-order'),
    location
  )

  // 3. 业务介绍列（全新轻量化设计，两行平滑截断 + 档案抽屉触发器）
  const business = element('td', '', 'company-business-cell')
  // 独角兽数据单独展示行业标签
  if (ranking) {
    business.append(element('span', c.industry || '行业待补充', 'company-industry'))
  }
  // 核心业务两行截断摘要（商业化表述：暂无业务简介）
  business.append(
    element('span', c.profile?.description || '暂无业务简介', `company-description${c.profile?.description ? '' : ' hub-muted'}`)
  )
  // 档案弹窗触发按钮
  const trigger = element('button', '查看档案 ↗', 'company-profile-trigger')
  trigger.type = 'button'
  trigger.dataset.openDetail = c.id
  trigger.setAttribute('aria-label', `查看 ${c.name} 企业主营业务档案`)
  business.append(trigger)
  row.append(business)

  // 4. 估值列（仅排名榜单展示）
  if (ranking) {
    row.append(element('td', c.valuation?.toLocaleString('zh-CN') ?? '待补充', 'company-value'))
  }

  // 5. 官网外链列（商业化表述：访问官网）
  const websiteCell = element('td')
  const website = safeExternalUrl(c.profile?.website)
  if (website) {
    const link = element('a', '访问官网 ↗', 'company-website')
    link.href = website
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    websiteCell.append(link)
  } else {
    websiteCell.append(element('span', '未收录', 'hub-muted'))
  }
  row.append(websiteCell)

  // 返回最终组装完成的表格行节点
  return row
}

// 渲染抽屉/弹窗内容（移植自 unicorn-atlas 的高层级企业档案架构）
function renderCompanyDialog(c: Company, data: Catalog, container: HTMLElement) {
  // 判断数据集性质
  const ranking = isRanking(data)
  // 校验官网地址
  const website = safeExternalUrl(c.profile?.website)
  // 整合并校验所有来源依据
  const sources = companySources(c, data)
  // 构造顶栏元信息（年份 + 榜单/名单类型）
  const eyebrow = ranking
    ? `${esc(c.industry || '行业未注明')} · ${data.metadata.year} 独角兽企业画像`
    : `${esc(c.province)} · 2025 第七批专精特新小巨人公示名录`

  // 动态组装弹窗内部结构
  container.innerHTML = `
    <!-- 弹窗顶栏：档案标识与关闭按钮 -->
    <div class="company-dialog-top">
      <span class="company-dialog-kicker">企业档案 · COMPANY PROFILE</span>
      <button type="button" class="company-dialog-close" data-close-dialog aria-label="关闭企业详情">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- 弹窗主体滚动区域 -->
    <div class="company-dialog-body">
      <!-- 类别角标 -->
      <div class="company-dialog-eyebrow">${eyebrow}</div>
      <!-- 企业标题与外文名称 -->
      <h2 class="company-dialog-title" id="company-dialog-title">${esc(c.name)}</h2>
      ${c.nameEn && c.nameEn !== c.name ? `<p class="company-dialog-en">${esc(c.nameEn)}</p>` : ''}

      <!-- 核心重点模块：“主营业务与核心产品” -->
      <section class="company-dialog-profile" aria-labelledby="company-profile-heading">
        <h3 id="company-profile-heading">主营业务与核心产品</h3>
        <p class="company-dialog-desc ${!c.profile?.description ? 'hub-muted' : ''}">
          ${esc(c.profile?.description || '暂未收录该企业结构化业务描述，以下展示公开登记基础信息。')}
        </p>

        <!-- 业务/产品关键词标签组（来自 unicorn-atlas 的标签化设计） -->
        ${c.profile?.products?.length ? `
          <div class="company-product-tags" aria-label="核心产品与业务领域">
            ${c.profile.products.map(p => `<span>${esc(p)}</span>`).join('')}
          </div>
        ` : ''}

        <!-- 官网直达与核对日期条 -->
        <div class="company-website-row">
          ${website ? `
            <a href="${website}" target="_blank" rel="noopener noreferrer" class="company-website-btn">
              访问企业官网 ↗
            </a>
          ` : '<span class="company-website-pending">官网暂未收录</span>'}
          ${c.profile?.checkedAt ? `
            <span class="company-checked-date">信息核验 · ${esc(c.profile.checkedAt)}</span>
          ` : ''}
        </div>

        <!-- 可折叠的证据来源列表 -->
        ${sources.length ? `
          <details class="company-dialog-sources">
            <summary>公开依据与核验来源 · ${sources.length} 条</summary>
            <div class="company-sources-list">
              ${sources.map(s => `
                <a href="${s.url}" target="_blank" rel="noopener noreferrer">
                  ${esc(s.label)} ↗
                </a>
              `).join('')}
            </div>
          </details>
        ` : '<p class="company-provenance-note">该企业业务描述整理自公开披露信息，暂未附外部依据链接。</p>'}
      </section>

      <!-- 核心数字指标看板 -->
      ${ranking ? `
        <div class="company-dialog-stats">
          <div class="company-stat-item">
            <span class="company-stat-label">最新公布估值</span>
            <span class="company-stat-value">${c.valuation?.toLocaleString('zh-CN') ?? '—'}<small>亿元</small></span>
          </div>
          <div class="company-stat-item">
            <span class="company-stat-label">全球榜单排名</span>
            <span class="company-stat-value">${c.rank ?? '—'}<small>名</small></span>
          </div>
        </div>
      ` : `
        <div class="company-dialog-stats">
          <div class="company-stat-item">
            <span class="company-stat-label">申报归属地区</span>
            <span class="company-stat-value company-stat-text">${esc(c.reportingRegion || c.province || '—')}</span>
          </div>
          <div class="company-stat-item">
            <span class="company-stat-label">官方公示编号</span>
            <span class="company-stat-value">${c.sequence ?? '—'}<small>号</small></span>
          </div>
        </div>
      `}

      <!-- 结构化字段两列网格清单 -->
      <dl class="company-dialog-fields">
        ${ranking ? `
          <div><dt>总部所在地</dt><dd>${esc([c.country, c.city].filter(Boolean).join(' · ') || '未提供')}</dd></div>
          <div><dt>所属赛道</dt><dd>${esc(c.industry || '未提供')}</dd></div>
          <div><dt>核心负责人</dt><dd>${esc(c.founders || '未提供')}</dd></div>
          <div><dt>估值基准日</dt><dd>${esc(data.metadata.valuationDate || '未提供')}</dd></div>
        ` : `
          <div><dt>所属省份</dt><dd>${esc(c.province || '未提供')}</dd></div>
          <div><dt>申报归属地区</dt><dd>${esc(c.reportingRegion || '未提供')}</dd></div>
          <div><dt>名单来源类型</dt><dd>${esc(c.sourceType || '未提供')}</dd></div>
          <div><dt>资质审核备注</dt><dd>${esc(c.verificationNote || '未提供')}</dd></div>
        `}
      </dl>

      <!-- 交互动作闭环：同类企业反查与企业信息一键复制 -->
      <div class="company-dialog-actions">
        ${ranking && c.industry ? `
          <button type="button" class="hub-button primary company-related-btn" data-filter-related="${esc(c.industry)}">
            查看同行业企业 (${esc(c.industry)}) ↗
          </button>
        ` : !ranking && c.reportingRegion ? `
          <button type="button" class="hub-button primary company-related-btn" data-filter-related="${esc(c.reportingRegion)}">
            查看同地区企业 (${esc(c.reportingRegion)}) ↗
          </button>
        ` : ''}
        <button type="button" class="hub-button company-copy-btn" data-copy-id="${c.id}">
          复制企业信息
        </button>
      </div>

      <!-- 底部来源出处与严谨免责说明 -->
      <div class="company-dialog-source">
        <p>榜单来源：${esc(data.metadata.sourceName)} · 数据快照 ${esc(data.metadata.snapshotDate)}</p>
        <p class="company-disclaimer-note">
          ${ranking
            ? `估值基准日为 ${esc(data.metadata.valuationDate)}，反映历史时点估值；负责人信息沿用原榜单公开披露。`
            : `名单整理自各地工信部门公开公示，最终资质以主管部门核准为准。`
          }
        </p>
      </div>
    </div>
  `
}

// 主交互控制器函数：绑定表单、搜索、分页、CSV导出以及弹窗交互
function setup(root: HTMLElement) {
  // 提取页面核心 DOM 控件
  const form = root.querySelector<HTMLFormElement>('[data-form]')!
  const controls = root.querySelector<HTMLFieldSetElement>('[data-controls]')!
  const status = root.querySelector<HTMLElement>('[data-status]')!
  const retry = root.querySelector<HTMLButtonElement>('[data-retry]')!
  const results = root.querySelector<HTMLElement>('[data-results]')!
  const count = root.querySelector<HTMLElement>('[data-count]')!
  const pageLabel = root.querySelector<HTMLElement>('[data-page]')!
  const prev = root.querySelector<HTMLButtonElement>('[data-prev]')!
  const next = root.querySelector<HTMLButtonElement>('[data-next]')!
  const share = root.querySelector<HTMLButtonElement>('[data-share]')!
  const download = root.querySelector<HTMLButtonElement>('[data-export]')!
  const dialog = root.querySelector<HTMLDialogElement>('#company-detail-dialog')
  const dialogContent = dialog?.querySelector<HTMLElement>('[data-dialog-content]')

  // 快速读取表单控件输入值的工具方法
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement

  // 数据集引用与内部查询状态
  let data: Catalog | undefined
  let state = defaultQuery()
  let filtered: Company[] = []

  // 同步当前状态到表单 UI 控件
  function syncForm() {
    input('q').value = state.q
    input('region').value = state.region
    input('category').value = state.secondary
    input('sort').value = state.sort
    input('business').checked = state.business
  }

  // 核心渲染循环函数
  function render(mode: 'push' | 'replace' = 'push', focus = false) {
    if (!data) return
    // 规整非法查询参数
    state = validQuery(data, state)
    // 根据当前状态筛选企业记录
    filtered = filterCompanies(data, state)
    // 计算分页分片
    const page = paginate(filtered, state.page)
    state.page = page.page
    syncForm()

    // 使用文档片段批量插入表格行，提升性能
    const fragment = document.createDocumentFragment()
    if (page.items.length) {
      for (const c of page.items) fragment.append(companyRow(c, data))
    } else {
      const row = element('tr')
      const empty = element('td', '', 'catalog-empty')
      empty.colSpan = isRanking(data) ? 6 : 5
      const message = element('div', '', 'catalog-empty-message')
      message.append(element('h3', '没有找到符合当前条件的企业'))
      message.append(element('p', '可以尝试精简检索关键词、放宽地区限制，或取消“仅看已收录业务简介”。未匹配到不代表企业没有相关业务。'))
      empty.append(message)
      row.append(empty)
      fragment.append(row)
    }
    // 替换现有结果
    results.replaceChildren(fragment)

    // 更新界面状态文本与统计数据
    count.textContent = `找到 ${filtered.length.toLocaleString('zh-CN')} 家企业`
    pageLabel.textContent = `第 ${page.page} / ${page.pages} 页`
    prev.disabled = page.page === 1
    next.disabled = page.page === page.pages
    download.disabled = !filtered.length
    share.disabled = false
    status.textContent = filtered.length
      ? `显示第 ${(page.page - 1) * PAGE_SIZE + 1}–${Math.min(page.page * PAGE_SIZE, filtered.length)} 条，共 ${filtered.length.toLocaleString('zh-CN')} 家企业。支持全量导出筛选结果 CSV。`
      : '未检索到匹配企业，请调整筛选条件。'

    // 同步网址 URL 参数
    const query = queryParams(state).toString()
    const url = `${location.pathname}${query ? `?${query}` : ''}`
    if (url !== `${location.pathname}${location.search}`) {
      history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url)
    }
    // 按需平滑聚焦到结果区域顶部
    if (focus) {
      const heading = root.querySelector<HTMLElement>('[data-result-heading]')!
      heading.focus({ preventScroll: true })
      heading.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
  }

  // 从当前表单收集最新检索条件
  function fromForm(): QueryState {
    return {
      ...state,
      q: input('q').value.slice(0, 120).trim(),
      region: input('region').value,
      secondary: input('category').value,
      sort: input('sort').value,
      business: input('business').checked,
      page: 1
    }
  }

  // 表单提交触发查询
  form.addEventListener('submit', event => {
    event.preventDefault()
    state = fromForm()
    render()
  })

  // 下拉筛选与复选框变更即时刷新（避免按键时频繁打断）
  form.addEventListener('change', event => {
    if ((event.target as HTMLElement).getAttribute('name') !== 'q') {
      state = fromForm()
      render()
    }
  })

  // 重置表单回到初始条件
  form.addEventListener('reset', event => {
    event.preventDefault()
    state = defaultQuery()
    render()
  })

  // 示例搜索词快捷点击
  form.querySelectorAll<HTMLButtonElement>('[data-example]').forEach(button => {
    button.addEventListener('click', () => {
      state = { ...defaultQuery(), q: button.dataset.example! }
      render()
    })
  })

  // 分页按钮交互
  prev.addEventListener('click', () => {
    state.page--
    render('push', true)
  })
  next.addEventListener('click', () => {
    state.page++
    render('push', true)
  })

  // 浏览器前进/后退历史状态同步
  window.addEventListener('popstate', () => {
    state = readQuery(new URLSearchParams(location.search))
    render('replace')
  })

  // 复制当前筛选链接
  share.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      status.textContent = '已复制筛选链接，可以发给需要这份结果的人。'
    } catch {
      status.textContent = '浏览器未允许复制，可直接复制地址栏中的网址。筛选条件已保存在网址中。'
    }
  })

  // 导出符合条件的 CSV 清单
  download.addEventListener('click', () => {
    if (!data || !filtered.length) return
    const url = URL.createObjectURL(
      new Blob([exportCsv(data, filtered)], { type: 'text/csv;charset=utf-8;' })
    )
    const link = element('a')
    link.href = url
    link.download = `${data.metadata.slug}-${data.metadata.snapshotDate}-${filtered.length}.csv`
    link.hidden = true
    root.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    status.textContent = `已生成 ${filtered.length.toLocaleString('zh-CN')} 条结果的 CSV，包含来源和快照日期。`
  })

  // =========================================================================
  // 全局企业档案抽屉弹窗交互逻辑（基于事件委托处理静态与动态生成的行）
  // =========================================================================

  // 打开企业档案弹窗
  root.addEventListener('click', event => {
    const target = event.target as HTMLElement
    // 监听“查看档案 ↗”按钮点击
    const trigger = target.closest<HTMLElement>('[data-open-detail]')
    if (trigger && data && dialog && dialogContent) {
      const companyId = trigger.dataset.openDetail
      const company = data.companies.find(item => item.id === companyId)
      if (company) {
        // 渲染弹窗内容
        renderCompanyDialog(company, data, dialogContent)
        // 原生唤起全屏/抽屉模态对话框
        dialog.showModal()
      }
      return
    }

    // 监听关闭按钮
    const closeBtn = target.closest<HTMLElement>('[data-close-dialog]')
    if (closeBtn && dialog) {
      dialog.close()
      return
    }

    // 监听“查看同行业/同地区企业”跳转按钮
    const relatedBtn = target.closest<HTMLElement>('[data-filter-related]')
    if (relatedBtn && dialog) {
      const relatedValue = relatedBtn.dataset.filterRelated || ''
      dialog.close()
      // 将次级条件设为对应行业或地区，并重置至第一页
      state = { ...state, secondary: relatedValue, page: 1 }
      render('push', true)
      return
    }

    // 监听“复制企业信息”按钮
    const copyBtn = target.closest<HTMLButtonElement>('[data-copy-id]')
    if (copyBtn && data) {
      const companyId = copyBtn.dataset.copyId
      const c = data.companies.find(item => item.id === companyId)
      if (c) {
        const ranking = isRanking(data)
        const summaryText = [
          `【企业名称】${c.name}${c.nameEn && c.nameEn !== c.name ? ` (${c.nameEn})` : ''}`,
          ranking
            ? `【行业估值】${c.industry || '未注明'} | 估值：${c.valuation ?? '—'} 亿元 (排名第 ${c.rank ?? '—'} 名)`
            : `【申报地区】${c.province} · ${c.reportingRegion}`,
          c.profile?.description ? `【业务简介】${c.profile.description}` : '',
          c.profile?.products?.length ? `【主营产品】${c.profile.products.join('、')}` : '',
          c.profile?.website ? `【官方网站】${c.profile.website}` : ''
        ].filter(Boolean).join('\n')

        void navigator.clipboard.writeText(summaryText).then(() => {
          const originalText = copyBtn.textContent
          copyBtn.textContent = '已复制企业信息 ✓'
          copyBtn.disabled = true
          setTimeout(() => {
            copyBtn.textContent = originalText
            copyBtn.disabled = false
          }, 1800)
        })
      }
    }
  })

  // 点击弹窗蒙层外部空白区域时自动关闭抽屉
  if (dialog) {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) {
        dialog.close()
      }
    })
  }

  // 异步加载全量数据集 JSON
  async function load() {
    retry.hidden = true
    status.textContent = '正在加载查询数据；下方可先阅读名单前 24 条。'
    try {
      const response = await fetch(root.dataset.source!, { signal: AbortSignal.timeout(25000) })
      if (!response.ok) throw new Error('Data request failed')
      const value: Catalog = await response.json()
      if (!Array.isArray(value.companies) || value.companies.length !== value.metadata?.count) {
        throw new Error('Incomplete data')
      }
      data = value
      state = readQuery(new URLSearchParams(location.search))
      controls.disabled = false
      render('replace')
    } catch {
      status.textContent = '完整查询数据暂时加载失败。当前仍可阅读下方记录和来源，请稍后重试。'
      retry.hidden = false
    }
  }

  retry.addEventListener('click', load)
  void load()
}

// 初始化页面内所有检索容器实例
document.querySelectorAll<HTMLElement>('[data-catalog-browser]').forEach(setup)
