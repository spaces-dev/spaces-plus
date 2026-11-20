import type { SectionBlock } from './list'
import { el } from '@zero-dependency/dom'
import { onSiteChange, setChecked, siteCheckbox } from '@/core/checkbox'

const sortRootId = 'SP_SECTIONS_SORT'
const sortEvent = 'sp-sorted'
const sortReady = 'sp-sort-ready'
const bridgeTimeout = 8000

interface SortBridge {
  start: (node: HTMLElement) => void
  stop: (node: HTMLElement) => void
}

interface SortPage extends Window {
  __spProfileSort?: SortBridge
}

interface EditorState {
  group: HTMLElement
  blocks: SectionBlock[]
  sort: HTMLElement
  onSave: (order: string[], hidden: string[]) => void
  onCancel: () => void
}

// __require и jQuery вызывают обработчик через apply.
// Функция из песочницы в Firefox на этом падает, поэтому мост выполняется как код страницы.
const bridgeSource = `
if (typeof __require === 'function') __require(['sortable'], function (sortable) {
  window.__spProfileSort = {
    start: function (node) {
      if (node.getAttribute('data-sp-sort') === '1') return
      node.setAttribute('data-sp-sort', '1')
      sortable.startSortable(node, {
        placeholderClass: 'content-bl__sep',
        moveClass: 'sortable-shadow',
        dragButtonSelector: '.js-drag_button',
        limitMoving: true
      })
      if (window.$) {
        window.$(node).on('sortableEnd.sp', function () {
          node.dispatchEvent(new CustomEvent('${sortEvent}'))
        })
      }
    },
    stop: function (node) {
      if (node.getAttribute('data-sp-sort') !== '1') return
      node.removeAttribute('data-sp-sort')
      if (window.$) window.$(node).off('sortableEnd.sp')
      sortable.stopSortable(node)
    }
  }
  document.dispatchEvent(new Event('${sortReady}'))
})
`

let bridgeInstalled = false
let bridgeReady: Promise<SortBridge | null> | null = null
let state: EditorState | null = null

function pageWindow(): SortPage {
  try {
    if (typeof unsafeWindow !== 'undefined' && unsafeWindow) return unsafeWindow as SortPage
  } catch {
    // Userscript-менеджер отдаёт unsafeWindow только при наличии grant.
  }
  return window
}

function installBridge() {
  if (bridgeInstalled) return
  bridgeInstalled = true
  const script = document.createElement('script')
  script.textContent = bridgeSource
  document.documentElement.append(script)
  script.remove()
}

function whenSortable() {
  const page = pageWindow()
  if (page.__spProfileSort) return Promise.resolve(page.__spProfileSort)
  installBridge()
  if (page.__spProfileSort) return Promise.resolve(page.__spProfileSort)
  if (!bridgeReady) {
    bridgeReady = new Promise((resolve) => {
      let timer = 0
      function finish(api: SortBridge | null) {
        window.clearTimeout(timer)
        document.removeEventListener(sortReady, onReady)
        resolve(api)
      }
      function onReady() {
        finish(pageWindow().__spProfileSort ?? null)
      }
      timer = window.setTimeout(finish, bridgeTimeout, null)
      document.addEventListener(sortReady, onReady)
    })
  }
  return bridgeReady
}

function stopSort(sort: HTMLElement) {
  pageWindow().__spProfileSort?.stop(sort)
}

async function armSortable(sort: HTMLElement) {
  const api = await whenSortable()
  if (!api || state?.sort !== sort) return
  api.start(sort)
}

const markAllLabel = 'Отметить все'
const clearAllLabel = 'Снять все'
const checkAllFlag = 'spCheckall'

function readSort(sort: HTMLElement) {
  const order: string[] = []
  const hidden: string[] = []
  for (const child of sort.children) {
    if (!(child instanceof HTMLElement)) continue
    const key = child.dataset.spKey
    if (!key) continue
    order.push(key)
    const input = child.querySelector('input')
    if (input instanceof HTMLInputElement && !input.checked) hidden.push(key)
  }
  return { order, hidden }
}

function boxes(sort: HTMLElement) {
  return [...sort.querySelectorAll('input')].filter((node): node is HTMLInputElement => node instanceof HTMLInputElement)
}

function everyBoxChecked(sort: HTMLElement) {
  const inputs = boxes(sort)
  return inputs.length > 0 && inputs.every(input => input.checked)
}

function paintCheckAll(sort: HTMLElement) {
  const link = sort.parentElement?.querySelector('[data-sp-checkall]')
  if (link) link.textContent = everyBoxChecked(sort) ? clearAllLabel : markAllLabel
}

export function sectionRow(block: SectionBlock, checked: boolean) {
  const { input, label } = siteCheckbox(`sp-section-${block.key}`, checked, 'form-checkbox__drag oh')
  label.classList.remove('form-checkbox--inline')
  const icon = block.link.querySelector('.js-ico')
  if (icon instanceof HTMLElement && icon.className) label.append(el('span', { className: icon.className }))
  const name = block.link.querySelector('.js-text')?.textContent?.replace(/\s+/g, ' ').trim() ?? block.key
  label.append(el('span', { className: 't js-text', textContent: name }))
  const handle = el('a', {
    href: '#',
    className: 'inl_bl right js-off_hide js-drag_button form-checkbox__drag_btn',
  })
  handle.setAttribute('onclick', 'return false;')
  handle.addEventListener('click', (event) => {
    event.preventDefault()
  })
  handle.append(el('span', { className: 'js-ico ico ico_short ico_centered' }))
  label.append(handle)
  onSiteChange(input, () => {
    const sort = input.closest(`#${sortRootId}`)
    if (sort instanceof HTMLElement) paintCheckAll(sort)
  })
  const row = el('div', { className: 'js-checkbox_wrap wbg break-word' }, label)
  row.dataset.spKey = block.key
  return row
}

function toolLink(label: string, onClick: () => void) {
  const link = el('a', {
    href: '#',
    className: 'list-link list-link-grey t_center',
    textContent: label,
  })
  link.dataset.spUi = '1'
  link.addEventListener('click', (event) => {
    event.preventDefault()
    onClick()
  })
  return link
}

export function editorOpen() {
  return state !== null
}

function editorTools(onSave: () => void, onCancel: () => void) {
  const save = el('button', {
    type: 'button',
    className: 'user__tools-link list-link-blue',
  })
  save.append(
    el('span', { className: 'js-ico ico ico_ok_blue' }),
    el('span', { className: 'js-btn_val', textContent: 'Сохранить' }),
  )
  save.addEventListener('click', (event) => {
    event.preventDefault()
    onSave()
  })
  const cancel = el('a', {
    href: '#',
    className: 'stnd-link',
    textContent: 'Отменить',
  })
  cancel.addEventListener('click', (event) => {
    event.preventDefault()
    onCancel()
  })
  const saveCell = el('td', { className: 'table__cell' }, save)
  const cancelCell = el('td', { className: 'table__cell table__cell_last' }, cancel)
  saveCell.width = '50%'
  cancelCell.width = '50%'
  const tools = el('div', {
    className: 'user__tools user__tools_last bt0',
  }, el('table', { className: 'table__wrap' }, el('tbody', {}, el('tr', {}, [saveCell, cancelCell]))))
  tools.dataset.spUi = '1'
  return tools
}

interface SectionEditor {
  group: HTMLElement
  blocks: SectionBlock[]
  hiddenKeys: string[]
  onSave: (order: string[], hidden: string[]) => void
  onCancel: () => void
}

export function openSectionEditor({ group, blocks, hiddenKeys, onSave, onCancel }: SectionEditor) {
  if (state) return
  const hidden = new Set(hiddenKeys)
  const sort = el('div', { id: sortRootId, className: 'f-c_fll nl_wn' })
  for (const block of blocks) sort.append(sectionRow(block, !hidden.has(block.key)))
  const checkAll = toolLink(markAllLabel, () => {
    const next = !everyBoxChecked(sort)
    for (const input of boxes(sort)) setChecked(input, next)
    paintCheckAll(sort)
  })
  checkAll.dataset[checkAllFlag] = '1'
  const tools = editorTools(() => {
    const next = readSort(sort)
    const save = state?.onSave
    closeSectionEditor()
    save?.(next.order, next.hidden)
  }, () => {
    const cancel = state?.onCancel
    closeSectionEditor()
    cancel?.()
  })
  group.replaceChildren(checkAll, sort, tools)
  paintCheckAll(sort)
  state = { group, blocks, sort, onSave, onCancel }
  void armSortable(sort)
}

export function closeSectionEditor() {
  const current = state
  if (!current) return null
  state = null
  stopSort(current.sort)
  current.group.replaceChildren(...current.blocks.map(block => block.node))
  return current.group
}

export function releaseSectionEditor() {
  const current = state
  if (!current) return
  state = null
  stopSort(current.sort)
}
