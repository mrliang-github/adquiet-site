import {
  companySources, defaultQuery, exportCsv, filterCompanies, isRanking, locationText,
  PAGE_SIZE, paginate, queryParams, readQuery, safeExternalUrl, validQuery, valuationText,
  type Catalog, type Company, type QueryState
} from '../lib/catalog'

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
  const node = document.createElement(tag)
  node.textContent = text
  if (className) node.className = className
  return node
}

function companyCard(c: Company, data: Catalog) {
  const ranking = isRanking(data)
  const card = element('article', '', 'company-card')
  card.dataset.companyId = c.id
  const top = element('div', '', 'company-topline')
  top.append(element('span', ranking ? `榜单 #${c.rank}` : `名单序号 ${c.sequence}`))
  if (ranking) top.append(element('span', valuationText(c), 'company-value'))
  card.append(top, element('h3', c.name))
  if (c.nameEn && c.nameEn !== c.name) card.append(element('p', c.nameEn, 'company-name-en'))
  card.append(element('p', locationText(c, data), 'company-location'))
  card.append(element('p', c.profile?.description || '暂未收录业务资料，可先核对名单来源。', `company-description${c.profile?.description ? '' : ' hub-muted'}`))
  const details = element('details')
  details.append(element('summary', '查看来源与资料说明'))
  if (c.profile?.description) details.append(element('p', `${c.profile.descriptionKind === 'excerpt' ? '公开资料摘录' : '业务资料整理'} · 核对日期 ${c.profile.checkedAt}`))
  if (!ranking) details.append(element('p', `${c.sourceType}。${c.verificationNote}`))
  if (ranking) details.append(element('p', `估值基准 ${data.metadata.valuationDate} · 人民币亿元。${c.founders ? `榜单负责人：${c.founders}。` : ''}不代表当前估值或任职信息。`))
  if (c.profile?.products.length) details.append(element('p', `产品 / 关键词：${c.profile.products.join('、')}`))
  const links = element('div', '', 'company-sources')
  const website = safeExternalUrl(c.profile?.website)
  const sources = [...companySources(c, data), ...(website ? [{label: '收录网站', url: website}] : [])]
  for (const source of sources) {
    const link = element('a', `${source.label} ↗`)
    link.href = source.url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    links.append(link)
  }
  details.append(links)
  if (website) details.append(element('p', '网站为收录线索，未逐一核验当前运营主体与可用性。'))
  card.append(details)
  return card
}

function setup(root: HTMLElement) {
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
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement
  let data: Catalog | undefined
  let state = defaultQuery()
  let filtered: Company[] = []

  function syncForm() {
    input('q').value = state.q
    input('region').value = state.region
    input('category').value = state.secondary
    input('sort').value = state.sort
    input('business').checked = state.business
  }
  function render(mode: 'push' | 'replace' = 'push', focus = false) {
    if (!data) return
    state = validQuery(data, state)
    filtered = filterCompanies(data, state)
    const page = paginate(filtered, state.page)
    state.page = page.page
    syncForm()
    const fragment = document.createDocumentFragment()
    if (page.items.length) for (const c of page.items) fragment.append(companyCard(c, data))
    else {
      const empty = element('div', '', 'catalog-empty')
      empty.append(element('h3', '没有找到同时符合这些条件的企业'))
      empty.append(element('p', '可以缩短关键词、去掉一个地区条件，或取消“只看含业务资料”。未匹配到不代表企业没有相关业务。'))
      fragment.append(empty)
    }
    results.replaceChildren(fragment)
    count.textContent = `找到 ${filtered.length.toLocaleString('zh-CN')} 家企业`
    pageLabel.textContent = `第 ${page.page} / ${page.pages} 页`
    prev.disabled = page.page === 1
    next.disabled = page.page === page.pages
    download.disabled = !filtered.length
    share.disabled = false
    status.textContent = filtered.length ? `显示第 ${(page.page - 1) * PAGE_SIZE + 1}–${Math.min(page.page * PAGE_SIZE, filtered.length)} 条，共 ${filtered.length.toLocaleString('zh-CN')} 条。导出会包含全部筛选结果。` : '没有匹配结果，请调整查询条件。'
    const query = queryParams(state).toString()
    const url = `${location.pathname}${query ? `?${query}` : ''}`
    if (url !== `${location.pathname}${location.search}`) history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url)
    if (focus) {
      const heading = root.querySelector<HTMLElement>('[data-result-heading]')!
      heading.focus({preventScroll: true})
      heading.scrollIntoView({block: 'start', behavior: 'instant'})
    }
  }
  function fromForm(): QueryState {
    return {...state, q: input('q').value.slice(0, 120).trim(), region: input('region').value, secondary: input('category').value, sort: input('sort').value, business: input('business').checked, page: 1}
  }
  form.addEventListener('submit', event => {event.preventDefault(); state = fromForm(); render()})
  form.addEventListener('change', event => {
    if ((event.target as HTMLElement).getAttribute('name') !== 'q') {state = fromForm(); render()}
  })
  form.addEventListener('reset', event => {event.preventDefault(); state = defaultQuery(); render()})
  form.querySelectorAll<HTMLButtonElement>('[data-example]').forEach(button => button.addEventListener('click', () => {
    state = {...defaultQuery(), q: button.dataset.example!}; render()
  }))
  prev.addEventListener('click', () => {state.page--; render('push', true)})
  next.addEventListener('click', () => {state.page++; render('push', true)})
  window.addEventListener('popstate', () => {state = readQuery(new URLSearchParams(location.search)); render('replace')})
  share.addEventListener('click', async () => {
    try {await navigator.clipboard.writeText(location.href); status.textContent = '已复制筛选链接，可以发给需要这份结果的人。'}
    catch {status.textContent = '浏览器未允许复制，可直接复制地址栏中的网址。筛选条件已保存在网址中。'}
  })
  download.addEventListener('click', () => {
    if (!data || !filtered.length) return
    const url = URL.createObjectURL(new Blob([exportCsv(data, filtered)], {type: 'text/csv;charset=utf-8;'}))
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
  async function load() {
    retry.hidden = true
    status.textContent = '正在加载查询数据；下方可先阅读名单前 24 条。'
    try {
      const response = await fetch(root.dataset.source!, {signal: AbortSignal.timeout(25000)})
      if (!response.ok) throw new Error('Data request failed')
      const value: Catalog = await response.json()
      if (!Array.isArray(value.companies) || value.companies.length !== value.metadata?.count) throw new Error('Incomplete data')
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
document.querySelectorAll<HTMLElement>('[data-catalog-browser]').forEach(setup)
