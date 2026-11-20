import type { Feature } from '@/core/feature'
import { el } from '@zero-dependency/dom'
import { defineToggle } from '@/core/feature'
import { getSettings, setSetting, settingKey } from '@/core/settings-store'
import { pathAt, pathIndex, session } from '@/core/site'
import { toggleId } from '@/types/toggles'
import {
  closeSectionEditor,
  editorOpen,
  openSectionEditor,
  releaseSectionEditor,
} from './edit'
import {
  captureNodes,
  layoutSections,
  matchesOwnProfile,
  readSections,
  restoreNodes,
} from './list'

const editButtonId = 'SP_SECTIONS_EDIT'

interface Snapshot {
  group: HTMLElement
  nodes: ChildNode[]
}

let snapshot: Snapshot | null = null

function ownProfile() {
  return matchesOwnProfile({
    section: pathAt(pathIndex.section),
    page: pathAt(pathIndex.page),
    slug: pathAt(pathIndex.slug),
  }, session.username)
}

function sectionGroup() {
  for (const node of document.querySelectorAll('.widgets-group.links-group.bb0')) {
    if (!(node instanceof HTMLElement) || node.classList.contains('dropdown-menu')) continue
    if (readSections(node).length) return node
  }
  return null
}

function sameList(left: string[], right: string[]) {
  return left.length === right.length && left.every((key, index) => key === right[index])
}

function appliedSignature() {
  const { order, hidden } = getSettings().profileLinksSet
  return `${order.join(',')}|${hidden.join(',')}`
}

function savedOrder() {
  const { order, hidden } = getSettings().profileLinksSet
  return { order, hidden }
}

function remember(order: string[], hidden: string[]) {
  const current = getSettings().profileLinksSet
  if (!sameList(current.order, order)) setSetting(settingKey.profileLinksOrder, order)
  if (!sameList(current.hidden, hidden)) setSetting(settingKey.profileLinksHidden, hidden)
}

function dropSnapshot() {
  releaseSectionEditor()
  const current = snapshot
  snapshot = null
  document.getElementById(editButtonId)?.remove()
  if (!current?.group.isConnected) return
  restoreNodes(current.group, current.nodes)
  delete current.group.dataset.spSections
}

function showLinks(group: HTMLElement) {
  const saved = savedOrder()
  layoutSections(group, saved.order, saved.hidden)
  group.dataset.spSections = appliedSignature()
  ensureButton(group)
}

function finishEdit(group: HTMLElement) {
  closeSectionEditor()
  showLinks(group)
}

function openEditor(group: HTMLElement) {
  if (editorOpen()) return
  const blocks = readSections(group)
  if (!blocks.length) return
  document.getElementById(editButtonId)?.remove()
  openSectionEditor({
    group,
    blocks,
    hiddenKeys: savedOrder().hidden,
    onSave: (order, hidden) => {
      remember(order, hidden)
      finishEdit(group)
    },
    onCancel: () => finishEdit(group),
  })
}

function ensureButton(group: HTMLElement) {
  const existing = document.getElementById(editButtonId)
  if (existing) {
    if (existing.parentElement !== group || group.lastElementChild !== existing) group.append(existing)
    return
  }
  const button = el('a', {
    id: editButtonId,
    href: '#',
    className: 'list-link list-link-grey t_center',
    textContent: 'Настроить список',
  })
  button.dataset.spUi = '1'
  button.addEventListener('click', (event) => {
    event.preventDefault()
    openEditor(group)
  })
  group.append(button)
}

function hasSeparator(group: HTMLElement) {
  return [...group.children].some(node => node.classList.contains('sep-item'))
}

function apply() {
  if (!ownProfile()) {
    if (snapshot || editorOpen()) dropSnapshot()
    return
  }
  if (editorOpen()) {
    if (snapshot?.group.isConnected) return
    dropSnapshot()
  }
  const group = sectionGroup()
  if (!group) return
  if (snapshot && snapshot.group !== group) dropSnapshot()
  if (!snapshot) snapshot = { group, nodes: captureNodes(group) }
  if (group.dataset.spSections === appliedSignature() && !hasSeparator(group)) {
    ensureButton(group)
    return
  }
  showLinks(group)
}

export const profileLinks: Feature = defineToggle({
  id: toggleId.profileLinks,
  title: 'Разделы профиля',
  description: 'В своем профиле появляется кнопка «Настроить список», которая позволяет менять порядок ссылок на разделы и скрывать их.',
  start: (ctx) => {
    const stop = ctx.onDom(apply)
    return () => {
      stop()
      dropSnapshot()
    }
  },
})
