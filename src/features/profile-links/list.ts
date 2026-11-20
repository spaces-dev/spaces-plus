import { sitePathname } from '@/core/site'

export interface SectionBlock {
  key: string
  node: HTMLElement
  link: HTMLAnchorElement
}

const sectionRules: Array<{ prefix: string, key: string | null }> = [
  { prefix: '/diary/new', key: null },
  { prefix: '/guestbook', key: 'guestbook' },
  { prefix: '/diary/view/user', key: 'diary' },
  { prefix: '/bookmarks', key: 'bookmarks' },
  { prefix: '/app', key: 'games' },
  { prefix: '/pictures', key: 'pictures' },
  { prefix: '/music', key: 'music' },
  { prefix: '/video', key: 'video' },
  { prefix: '/files', key: 'files' },
  { prefix: '/comm', key: 'comm' },
  { prefix: '/friends', key: 'friends' },
  { prefix: '/lenta/readers', key: 'readers' },
  { prefix: '/users/search', key: 'people' },
  { prefix: '/forums/search_user', key: 'forums' },
  { prefix: '/gifts', key: 'gifts' },
  { prefix: '/anketa', key: 'anketa' },
]

const separatorClass = 'sep-item'

function matchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function sectionKey(href: string) {
  const path = sitePathname(href)
  if (!path) return null
  for (const rule of sectionRules) {
    if (matchesPrefix(path, rule.prefix)) return rule.key
  }
  return path.split('/').filter(Boolean)[0] ?? null
}

export function orderKeys(present: string[], saved: string[]) {
  const have = new Set(present)
  const seen = new Set<string>()
  const next: string[] = []
  for (const key of saved) {
    if (!have.has(key) || seen.has(key)) continue
    seen.add(key)
    next.push(key)
  }
  for (const key of present) {
    if (seen.has(key)) continue
    seen.add(key)
    next.push(key)
  }
  return next
}

export function matchesOwnProfile(path: { section?: string, page?: string, slug?: string }, username: string) {
  if (path.section !== 'mysite' || path.page !== 'index') return false
  const pathSlug = path.slug?.trim().toLowerCase() ?? ''
  const name = username.trim().toLowerCase().replace(/_/g, '-')
  return Boolean(pathSlug && pathSlug === name)
}

function primaryLink(node: HTMLElement) {
  const links = node.matches('a.list-link')
    ? [node as HTMLAnchorElement, ...node.querySelectorAll<HTMLAnchorElement>('a.list-link')]
    : [...node.querySelectorAll<HTMLAnchorElement>('a.list-link')]
  for (const link of links) {
    if (sectionKey(link.getAttribute('href') ?? '')) return link
  }
  return null
}

export function readSections(group: ParentNode) {
  const blocks: SectionBlock[] = []
  for (const child of group.children) {
    if (!(child instanceof HTMLElement)) continue
    if (child.dataset.spUi === '1' || child.classList.contains(separatorClass)) continue
    const link = primaryLink(child)
    const key = link ? sectionKey(link.getAttribute('href') ?? '') : null
    if (!link || !key) continue
    blocks.push({ key, node: child, link })
  }
  return blocks
}

export function arrangeSections(blocks: SectionBlock[], saved: string[]) {
  const pending = [...blocks]
  const unique: string[] = []
  const seen = new Set<string>()
  for (const block of blocks) {
    if (seen.has(block.key)) continue
    seen.add(block.key)
    unique.push(block.key)
  }
  const next: SectionBlock[] = []
  for (const key of orderKeys(unique, saved)) {
    const index = pending.findIndex(block => block.key === key)
    if (index < 0) continue
    const block = pending.splice(index, 1)[0]
    if (block) next.push(block)
  }
  next.push(...pending)
  return next
}

export function layoutSections(group: HTMLElement, savedOrder: string[], hidden: string[]) {
  for (const child of [...group.children]) {
    if (child.classList.contains(separatorClass)) child.remove()
  }
  const hiddenSet = new Set(hidden)
  for (const block of arrangeSections(readSections(group), savedOrder)) {
    block.node.classList.toggle('hide', hiddenSet.has(block.key))
    group.append(block.node)
  }
}

export function captureNodes(group: HTMLElement) {
  return [...group.childNodes]
}

export function restoreNodes(group: HTMLElement, nodes: ChildNode[]) {
  for (const node of nodes) {
    if (node instanceof HTMLElement) node.classList.remove('hide')
  }
  group.replaceChildren(...nodes)
}
