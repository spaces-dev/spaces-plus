import type { Feature } from '@/core/feature'
import { el } from '@zero-dependency/dom'
import { defineToggle } from '@/core/feature'
import { log } from '@/core/log'
import { toggleId } from '@/types/toggles'
import { toSource } from './to-source'

const copyClass = 'js-sp-copy-source'
const panelClass = 'js-sp-copy-panel'
const sourceLabel = 'Исходный текст'
const copyLabel = 'Скопировать'
const copiedLabel = 'Скопировано'
const copiedMs = 1000
const copyTitle = 'Скопировать исходный текст'
const copiedFor = new WeakMap<HTMLElement, number>()

let panelSerial = 0

function nextPanelId() {
  panelSerial += 1
  return `sp-copy-${panelSerial}`
}

function showCopied(label: HTMLElement) {
  const pending = copiedFor.get(label)
  if (pending) window.clearTimeout(pending)
  label.textContent = copiedLabel
  const timer = window.setTimeout(() => {
    label.textContent = copyLabel
    copiedFor.delete(label)
  }, copiedMs)
  copiedFor.set(label, timer)
}

async function writeSource(label: HTMLElement, value: string) {
  try {
    await navigator.clipboard.writeText(value)
    showCopied(label)
    return true
  } catch (error) {
    log.error('copy-source', error)
    return false
  }
}

function closePanel(panel: HTMLElement) {
  const closer = el('a', {
    href: '#',
    className: 'js-popper_close',
  })
  closer.addEventListener('click', (event) => {
    event.preventDefault()
  })
  panel.append(closer)
  closer.click()
  closer.remove()
}

function previewPanel(read: () => string) {
  const id = nextPanelId()
  const area = el('textarea', {
    className: 'text-input',
    readOnly: true,
    rows: 8,
  })
  const label = el('span', { className: 'js-text', textContent: copyLabel })
  const copy = el('a', {
    href: '#',
    className: 'list-link list-link_last',
  }, label)
  const panel = el('div', {
    id,
    className: `popper-dropdown ${panelClass}`,
  }, [area, copy])
  copy.addEventListener('click', (event) => {
    event.preventDefault()
    const value = area.value
    if (!value.trim()) return
    void writeSource(label, value).then((copied) => {
      if (copied) closePanel(panel)
    })
  })
  panel.addEventListener('popper:beforeOpen', () => {
    area.value = read()
  })
  panel.addEventListener('popper:afterOpen', () => {
    area.focus({ preventScroll: true })
  })
  return { id, panel }
}

function postBody(scope: ParentNode) {
  const full = scope.querySelector<HTMLElement>('.js-expandadble_full_text')
  if (full) return full
  return scope.querySelector<HTMLElement>('.topic__subject #previewText')
}

function postScope(bar: Element): ParentNode {
  const topic = bar.closest('.topic')
  if (topic?.querySelector('.js-expandadble_full_text, .topic__subject #previewText')) return topic
  let node = bar.parentElement
  while (node) {
    if (node.querySelector('.js-expandadble_full_text, .topic__subject #previewText')) return node
    node = node.parentElement
  }
  return document
}

function placePosts() {
  for (const bar of document.querySelectorAll('.topic__actions .js-action_bar')) {
    const row = bar.querySelector('tr')
    if (!row || row.querySelector(`.${copyClass}`)) continue
    const scope = postScope(bar)
    const body = postBody(scope)
    if (!body || !toSource(body).trim()) continue
    const { id, panel } = previewPanel(() => {
      const current = postBody(scope)
      return current ? toSource(current) : ''
    })
    const link = el('a', {
      href: '#',
      className: `user__tools-link btn-light ${copyClass} js-popper_open`,
      title: copyTitle,
    }, el('span', { className: 'js-ico ico_mail ico_mail_quote ico-alone' }))
    link.dataset.popperId = id
    link.dataset.popperClickedClass = 'clicked'
    row.append(el('td', { className: 'table__cell' }, link))
    bar.append(panel)
  }
}

function owned(root: HTMLElement, selector: string) {
  for (const node of root.querySelectorAll<HTMLElement>(selector)) {
    if (node.closest('[itemprop="comment"]') === root) return node
  }
  return null
}

function sourceMenuItem(id: string) {
  const item = el('a', {
    href: '#',
    className: `list-link ${copyClass} js-popper_open`,
    title: copyTitle,
  }, [
    el('span', { className: 'js-ico ico_mail ico_mail_quote' }),
    el('span', { className: 't js-text', textContent: ` ${sourceLabel}` }),
  ])
  item.dataset.popperId = id
  return item
}

function placeComments() {
  for (const comment of document.querySelectorAll<HTMLElement>('[itemprop="comment"]')) {
    if (owned(comment, `.${copyClass}`)) continue
    const menu = owned(comment, 'a.js-action_link[data-action="comment_link"]')
    const text = owned(comment, '[itemprop="text"]')
    if (!menu || !text || !toSource(text).trim()) continue
    const { id, panel } = previewPanel(() => toSource(text))
    menu.after(sourceMenuItem(id))
    comment.append(panel)
  }
}

function inMessage(root: HTMLElement, selector: string) {
  for (const node of root.querySelectorAll<HTMLElement>(selector)) {
    if (node.closest('.js-message') === root) return node
  }
  return null
}

function mailBody(message: HTMLElement) {
  return inMessage(message, '.js-message_full')
    ?? inMessage(message, '.js-message_preview')
    ?? inMessage(message, '.js-message_text')
}

function placeMail() {
  for (const message of document.querySelectorAll<HTMLElement>('.js-message')) {
    if (inMessage(message, `.${copyClass}`)) continue
    const reply = inMessage(message, 'a.js-action_link[data-action="mail_reply"]')
    const body = mailBody(message)
    if (!reply || !body || !toSource(body).trim()) continue
    const { id, panel } = previewPanel(() => {
      const current = mailBody(message)
      return current ? toSource(current) : ''
    })
    reply.after(sourceMenuItem(id))
    message.append(panel)
  }
}

function dropDetached() {
  for (const panel of document.querySelectorAll<HTMLElement>(`.${panelClass}`)) {
    if (!panel.id || document.querySelector(`[data-popper-id="${panel.id}"]`)) continue
    panel.remove()
  }
}

export const copySource: Feature = defineToggle({
  id: toggleId.copySource,
  title: 'Скопировать исходный текст',
  description: 'На записи появляется кнопка, в меню комментария и в почте — пункт «Исходный текст».',
  start: ctx => ctx.onDom(() => {
    dropDetached()
    placePosts()
    placeComments()
    placeMail()
  }),
})
