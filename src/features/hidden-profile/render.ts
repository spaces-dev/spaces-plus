import type { ProfileGifts, ProfileLink, ProfileModel } from './links'
import { el } from '@zero-dependency/dom'

export const profileRootId = 'SP_HIDDEN_PROFILE'

function mark(node: HTMLElement) {
  node.dataset.spProfile = '1'
  return node
}

const hasCard = (model: ProfileModel) => Boolean(model.avatar || model.nick || model.seen || model.rating || model.lines.length)

function renderAvatar(model: ProfileModel) {
  const avatar = model.avatar
  const box = el('div', { className: 'user__ava user__ava_big' })
  if (avatar) {
    const image = el('img', {
      src: avatar.src,
      alt: avatar.alt,
      width: 80,
      height: 80,
      className: 'preview',
      ...(avatar.srcset ? { srcset: avatar.srcset } : {}),
    })
    box.append(avatar.href ? el('a', { href: avatar.href }, image) : image)
  }
  if (model.seen) {
    const tone = model.online ? 'bordered green' : 'bordered grey'
    const wrap = model.online ? 'pd_t5' : 'pd_t5 font_small'
    box.append(el('div', { className: 'pd_t5 js-online_status' }, el('div', { className: wrap }, el('div', { className: tone }, el('span', { className: 't js-text', textContent: model.seen })))))
  }
  if (!box.childElementCount) return null
  return box
}

function renderNick(model: ProfileModel) {
  const nick = model.nick
  if (!nick) return null
  const name = el('span', { className: 'mysite-nick', textContent: nick.text })
  const title = nick.href
    ? el('a', { href: nick.href, className: 'mysite-link', rel: 'nofollow' }, el('b', { className: 'mysite-nick' }, name))
    : name
  const heading = el('h1', { className: 'user__nick m span' })
  if (model.statusIcon) {
    const icon = el('img', {
      className: 'p14 online_status_ico',
      src: model.statusIcon.src,
      alt: model.statusIcon.alt,
    })
    const anketa = model.tabs.find(tab => tab.href.includes('/anketa/'))
    heading.append(anketa?.href ? el('a', { href: anketa.href, rel: 'nofollow' }, icon) : icon, ' ')
  }
  heading.append(title)
  if (model.medal) heading.append(' ', el('span', { className: model.medal }))
  heading.append(' ')
  return heading
}

function renderRating(model: ProfileModel) {
  const rating = model.rating
  if (!rating) return null
  if (!rating.href) return el('span', { className: 'rating__circle rating__circle-inline', textContent: rating.text })
  return el('a', { href: rating.href, className: 'rating__circle rating__circle-inline', textContent: rating.text })
}

function renderCard(model: ProfileModel) {
  const info = el('div', { className: 'user__info' })
  const nick = renderNick(model)
  const rating = renderRating(model)
  if (nick) info.append(nick)
  if (rating) info.append(nick ? ' ' : '', rating)
  if (model.lines.length) {
    const descr = el('div', { className: 'user__descr' })
    for (const line of model.lines) {
      const detail = el('div', { className: 'user__details' })
      if (line.href) detail.append(el('a', { href: line.href, className: 'link-stnd', textContent: line.text }))
      else detail.textContent = line.text
      descr.append(detail)
    }
    info.append(descr)
  }

  const item = el('div', { className: 'content-item3' })
  const avatar = renderAvatar(model)
  if (avatar) item.append(avatar)
  item.append(info, el('div', { className: 'cl' }))
  return mark(el('div', { className: 'widgets-group widgets-group_top wbg' }, item))
}

function renderTabs(tabs: ProfileLink[]) {
  const row = el('tr')
  for (const tab of tabs) {
    const label = tab.href
      ? el('a', { href: tab.href, className: 'tabs__link', textContent: tab.label })
      : el('span', { className: 'tabs__link', textContent: tab.label })
    const cell = el('td', {
      className: tab.current ? 'table__cell tabs__item clicked' : 'table__cell tabs__item',
    }, label)
    if (tabs.length === 2) cell.width = '50%'
    row.append(cell)
  }
  return el('div', { className: 'tabs' }, el('table', { className: 'table__wrap' }, el('tbody', row)))
}

function renderSection(section: ProfileLink) {
  const link = el('a', {
    href: section.href,
    className: 'list-link stnd-link_arr list-link-darkblue c-darkblue',
  })
  if (section.icon) link.append(el('span', { className: section.icon }))
  link.append(el('span', { className: 't js-text', textContent: section.label }))
  for (const extra of section.extras) {
    link.append(extra.count
      ? el('span', { className: 'cnt js-cnt', textContent: extra.text })
      : el('span', { className: 't', textContent: extra.text }))
  }
  return link
}

function renderSections(sections: ProfileLink[]) {
  const group = el('div', { className: 'widgets-group links-group bb0' })
  for (const section of sections) group.append(renderSection(section))
  return group
}

function renderGifts(gifts: ProfileGifts) {
  const title = el('a', { href: gifts.href, className: 'b-title__link' }, el('h6', { className: 'span', textContent: 'Подарки' }))
  if (gifts.count) title.append(el('span', { className: 'cnt cnt_title', textContent: gifts.count }))
  const row = el('div', { className: 'content-item3 wbg' })
  for (const gift of gifts.items) {
    row.append(el('span', { className: 'present' }, el('a', { href: gift.href, className: 'arrow_link' }, el('img', {
      alt: gift.alt,
      className: 'm',
      height: 40,
      width: 40,
      src: gift.src,
    }))))
  }
  return el('div', { className: 'widgets-group' }, [
    el('div', { className: 'b-title b-title_center b-title_first' }, title),
    row,
  ])
}

export interface ProfileView {
  card: HTMLElement | null
  body: HTMLElement
}

export interface ProfilePresent {
  tabs: boolean
  sections: boolean
}

export function profilePresent(root: ParentNode): ProfilePresent {
  return {
    tabs: Boolean(root.querySelector('.tabs')),
    sections: Boolean(root.querySelector('.widgets-group.links-group:not(.dropdown-menu)')),
  }
}

export function renderProfile(model: ProfileModel, present: ProfilePresent = { tabs: false, sections: false }): ProfileView {
  const body = mark(el('div', { id: profileRootId }))
  if (model.tabs.length && !present.tabs) body.append(renderTabs(model.tabs))
  if (model.sections.length && !present.sections) body.append(renderSections(model.sections))
  if (model.gifts) body.append(renderGifts(model.gifts))
  return {
    card: hasCard(model) ? renderCard(model) : null,
    body,
  }
}

export function mountProfile(pending: Element, view: ProfileView) {
  const tools = pending.querySelector('.user__tools')
  const icon = pending.querySelector('.ico_xlarge_noaccess, .ico_noaccess_xlarge')
  const host = icon?.closest('.widgets-group')

  if (view.card && host) host.replaceWith(view.card)
  else if (view.card && tools) tools.before(view.card)
  else if (view.card) pending.prepend(view.card)

  if (view.card && tools) view.card.append(tools)

  if (view.card) view.card.after(view.body)
  else if (host) host.after(view.body)
  else if (tools) tools.after(view.body)
  else pending.append(view.body)
}
