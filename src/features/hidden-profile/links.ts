export interface ProfileText {
  text: string
  href: string
}

export interface ProfileAvatar {
  src: string
  srcset: string
  alt: string
  href: string
}

export interface ProfileExtra {
  text: string
  count: boolean
}

export interface ProfileLink {
  href: string
  label: string
  icon: string
  current: boolean
  extras: ProfileExtra[]
}

export interface ProfileGift {
  href: string
  src: string
  alt: string
}

export interface ProfileGifts {
  href: string
  count: string
  items: ProfileGift[]
}

export interface ProfileStatusIcon {
  src: string
  alt: string
}

export interface ProfileModel {
  avatar: ProfileAvatar | null
  seen: string
  online: boolean
  statusIcon: ProfileStatusIcon | null
  medal: string
  nick: ProfileText | null
  rating: ProfileText | null
  lines: ProfileText[]
  tabs: ProfileLink[]
  sections: ProfileLink[]
  gifts: ProfileGifts | null
}

interface SectionSpec {
  label: string
  icon: string
  href: (nick: string) => string
}

const sectionPattern = /\/(?:guestbook\/|diary\/|forums\/search_user|pictures\/user\/|music\/user\/|video\/user\/|files\/user\/|comm\/list\/user\/|friends\/|lenta\/readers|gifts\/user_list|anketa\/)/
const giftLimit = 8

const sectionSpecs: SectionSpec[] = [
  { label: 'Гостевая', icon: 'js-ico ico_colored ico_colored_gb', href: nick => `/guestbook/index/${encodeURIComponent(nick)}/` },
  { label: 'Личный блог', icon: 'js-ico ico_colored ico_colored_blog', href: nick => `/diary/view/user/${encodeURIComponent(nick)}/` },
  { label: 'Темы и комментарии', icon: 'js-ico ico_colored ico_colored_forum', href: nick => `/forums/search_user/?query=${encodeURIComponent(nick)}` },
  { label: 'Фотографии', icon: 'js-ico ico_colored ico_colored_photo', href: nick => `/pictures/user/${encodeURIComponent(nick)}/list/-/` },
  { label: 'Музыка', icon: 'js-ico ico_colored ico_colored_music', href: nick => `/music/user/${encodeURIComponent(nick)}/list/-/` },
  { label: 'Видео', icon: 'js-ico ico_colored ico_colored_video', href: nick => `/video/user/${encodeURIComponent(nick)}/list/-/` },
  { label: 'Файлы', icon: 'js-ico ico_colored ico_colored_file', href: nick => `/files/user/${encodeURIComponent(nick)}/list/-/` },
  { label: 'Сообщества', icon: 'js-ico ico_colored ico_colored_comm', href: nick => `/comm/list/user/${encodeURIComponent(nick)}/` },
  { label: 'Друзья', icon: 'js-ico ico_colored ico_colored_friends', href: nick => `/friends/?name=${encodeURIComponent(nick)}` },
  { label: 'Читатели', icon: 'js-ico ico ico_readers', href: nick => `/lenta/readers/?user=${encodeURIComponent(nick)}` },
  { label: 'Подарки', icon: 'js-ico ico ico_gifts', href: nick => `/gifts/user_list/${encodeURIComponent(nick)}/` },
  { label: 'Анкета', icon: '', href: nick => `/anketa/index/${encodeURIComponent(nick)}/` },
]

const clean = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

function linkOf(label: string, href = '', icon = ''): ProfileLink {
  return {
    href,
    label,
    icon,
    current: false,
    extras: [],
  }
}

const profileScope = (root: ParentNode) => root.querySelector('.js-pending-item') ?? root

export function isClosedAccount(root: ParentNode) {
  const text = profileScope(root).textContent ?? ''
  return /аккаунт удал[её]н/i.test(text) || /был заблокирован/i.test(text)
}

export function isHiddenProfile(root: ParentNode) {
  const scope = profileScope(root)
  if (scope.querySelector('.ico_xlarge_noaccess, .ico_noaccess_xlarge')) return true
  if (isClosedAccount(root)) return true
  return [...scope.querySelectorAll('a')].some(link => (link.getAttribute('href') ?? '').includes('/blacklist/'))
}

export function hiddenProfilePage(section: string | undefined, page: string | undefined, root: ParentNode) {
  if (page !== 'index') return false
  if (section === 'mysite') return isHiddenProfile(root)
  if (section === 'anketa') return isClosedAccount(root)
  return false
}

export function profileNick(slug: string | undefined, bar: string) {
  const name = bar.trim()
  if (slug && /^\d+$/.test(slug)) return name
  return slug?.trim() || name
}

export function contentHtml(raw: string) {
  const text = raw.trim()
  if (!text || text.includes('Загрузка страницы')) return null
  try {
    const data = JSON.parse(text) as { content?: unknown }
    if (typeof data.content !== 'string' || data.content.includes('Загрузка страницы')) return null
    return data.content
  } catch {
    return null
  }
}

function readExtras(link: HTMLElement) {
  const extras: ProfileExtra[] = []
  for (const node of link.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = clean(node.textContent)
      if (text) extras.push({ text, count: false })
      continue
    }
    if (!(node instanceof HTMLElement)) continue
    if (node.classList.contains('js-ico') || node.classList.contains('js-text')) continue
    const text = clean(node.textContent)
    if (!text) continue
    extras.push({ text, count: node.classList.contains('cnt') })
  }
  return extras
}

function readSection(link: HTMLAnchorElement): ProfileLink | null {
  const href = link.getAttribute('href') ?? ''
  if (!sectionPattern.test(href)) return null
  const label = clean(link.querySelector('.js-text')?.textContent)
  if (!label) return null
  const icon = clean(link.querySelector('.js-ico')?.className)
  return { href, label, icon, current: false, extras: readExtras(link) }
}

function readSections(doc: Document) {
  const groups = doc.querySelectorAll('.widgets-group.links-group:not(.dropdown-menu)')
  const sections: ProfileLink[] = []
  for (const group of groups) {
    for (const link of group.querySelectorAll('a')) {
      const section = readSection(link)
      if (section) sections.push(section)
    }
  }
  return sections
}

function readAvatar(doc: Document): ProfileAvatar | null {
  const image = doc.querySelector('.user__ava img:not(.online_status_ico)')
  if (!(image instanceof HTMLImageElement)) return null
  const low = image.getAttribute('data-s') || ''
  const high = image.getAttribute('data-s2') || ''
  const src = low || image.getAttribute('src') || ''
  if (!src) return null
  const srcset = low && high ? `${low}, ${high} 1.5x` : image.getAttribute('srcset') || ''
  return {
    src,
    srcset,
    alt: image.alt,
    href: image.closest('a')?.getAttribute('href') ?? '',
  }
}

function readTextLink(link: Element | null): ProfileText | null {
  if (!link) return null
  const text = clean(link.textContent)
  if (!text) return null
  return { text, href: link.getAttribute('href') ?? '' }
}

function readLines(doc: Document) {
  return [...doc.querySelectorAll('.user__details')].flatMap((detail) => {
    const link = detail.querySelector('a')
    const text = clean(link?.textContent || detail.textContent)
    if (!text) return []
    return [{ text, href: link?.getAttribute('href') ?? '' }]
  })
}

const activityTab = (label: string, href: string) => label === 'Активность' || href.includes('/activity')

function readStatusIcon(doc: Document): ProfileStatusIcon | null {
  const image = doc.querySelector('img.online_status_ico')
  if (!(image instanceof HTMLImageElement)) return null
  const src = image.getAttribute('src') || ''
  if (!src) return null
  return { src, alt: image.alt }
}

function readSeen(doc: Document) {
  const block = doc.querySelector('.js-online_status:not(.hide)')
  return {
    seen: clean(block?.querySelector('.js-text')?.textContent),
    online: block?.getAttribute('data-toggle') === 'online',
  }
}

function readTabs(doc: Document) {
  return [...doc.querySelectorAll('.tabs .tabs__item')].flatMap((item) => {
    const label = clean(item.querySelector('.tabs__link')?.textContent)
    if (!label) return []
    const link = item.querySelector('a.tabs__link')
    const href = link?.getAttribute('href') ?? ''
    if (activityTab(label, href)) return []
    const tab = linkOf(label, href)
    tab.current = item.classList.contains('clicked')
    return [tab]
  })
}

function readGifts(doc: Document): ProfileGifts | null {
  const title = [...doc.querySelectorAll('a.b-title__link')].find(link => clean(link.querySelector('h6')?.textContent) === 'Подарки')
  if (!title) return null
  const group = title.closest('.widgets-group')
  const items = [...(group?.querySelectorAll('.present') ?? [])].slice(0, giftLimit).flatMap((present) => {
    const image = present.querySelector('img')
    const href = present.querySelector('a')?.getAttribute('href') ?? title.getAttribute('href') ?? ''
    const src = image?.getAttribute('src') ?? ''
    if (!src) return []
    return [{ href, src, alt: image?.alt ?? '' }]
  })
  return {
    href: title.getAttribute('href') ?? '',
    count: clean(title.querySelector('.cnt')?.textContent),
    items,
  }
}

export function parseProfile(html: string): ProfileModel | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const sections = readSections(doc)
  if (!sections.length) return null
  const nickLink = doc.querySelector('.mysite-link')
  const nickText = clean(nickLink?.querySelector('.mysite-nick')?.textContent || nickLink?.textContent)
  const presence = readSeen(doc)
  return {
    avatar: readAvatar(doc),
    seen: presence.seen,
    online: presence.online,
    statusIcon: readStatusIcon(doc),
    medal: clean(doc.querySelector('.user__nick .ico_colored')?.className),
    nick: nickLink && nickText ? { text: nickText, href: nickLink.getAttribute('href') ?? '' } : null,
    rating: readTextLink(doc.querySelector('.rating__circle')),
    lines: readLines(doc),
    tabs: readTabs(doc),
    sections,
    gifts: readGifts(doc),
  }
}

export function fallbackSections(nick: string, closed = false) {
  const specs = closed ? sectionSpecs.filter(spec => spec.label !== 'Анкета') : sectionSpecs
  return specs.map(spec => linkOf(spec.label, spec.href(nick), spec.icon))
}

export function fallbackProfile(nick: string, closed = false): ProfileModel {
  const profileTab = linkOf('Профиль')
  profileTab.current = true
  return {
    avatar: null,
    seen: '',
    online: false,
    statusIcon: null,
    medal: '',
    nick: null,
    rating: null,
    lines: [],
    tabs: closed ? [] : [profileTab, linkOf('Анкета', `/anketa/index/${encodeURIComponent(nick)}/`)],
    sections: fallbackSections(nick, closed),
    gifts: null,
  }
}
