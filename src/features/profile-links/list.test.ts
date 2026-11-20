import { describe, expect, it } from 'vitest'
import {
  captureNodes,
  layoutSections,
  matchesOwnProfile,
  orderKeys,
  readSections,
  restoreNodes,
  sectionKey,
} from './list'

const profileHtml = `
  <div class="widgets-group links-group bb0">
    <a class="list-link" href="https://spaces.im/guestbook/index/anomaiy/?Link_id=1">
      <span class="js-ico ico_colored ico_colored_gb"></span>
      <span class="t js-text">Гостевая</span>
      <span class="cnt js-cnt">6</span>
    </a>
    <table class="table_no_borders sublink">
      <tr>
        <td>
          <a class="list-link" href="/diary/view/user/anomaiy/">
            <span class="js-ico ico_colored ico_colored_blog"></span>
            <span class="t js-text">Личный блог</span>
            <span class="cnt js-cnt">760</span>
          </a>
        </td>
        <td>
          <a class="list-link" href="/diary/new/?Link_id=1">
            <span class="t js-text">Написать</span>
          </a>
        </td>
      </tr>
    </table>
    <div class="sep-item"></div>
    <a class="list-link" href="/pictures/user/anomaiy/list/-/?Link_id=1">
      <span class="js-text">Фотографии</span>
    </a>
    <a id="keep" data-sp-ui="1" href="#">Настроить</a>
  </div>
`

function mount() {
  const host = document.createElement('div')
  host.innerHTML = profileHtml
  const group = host.firstElementChild
  if (!(group instanceof HTMLElement)) throw new TypeError('group')
  document.body.append(group)
  return group
}

function labels(group: HTMLElement) {
  return readSections(group).map(block => block.link.querySelector('.js-text')?.textContent?.trim())
}

describe('profile section list', () => {
  it('reads a stable key without the nick or the write action', () => {
    expect(sectionKey('https://spaces.im/guestbook/index/anomaiy/?Link_id=1')).toBe('guestbook')
    expect(sectionKey('/pictures/user/anomaiy/list/-/?Link_id=1')).toBe('pictures')
    expect(sectionKey('/diary/view/user/anomaiy/')).toBe('diary')
    expect(sectionKey('/diary/new/?Link_id=1')).toBeNull()
    expect(sectionKey('https://spaces.im/app/?Link_id=1&name=AnomaIy')).toBe('games')
    expect(sectionKey('/lenta/readers/?user=AnomaIy')).toBe('readers')
    expect(sectionKey('/forums/search_user/?query=AnomaIy')).toBe('forums')
    expect(orderKeys(['guestbook', 'diary', 'pictures'], ['pictures', 'guestbook', 'missing'])).toEqual([
      'pictures',
      'guestbook',
      'diary',
    ])
  })

  it('treats the blog table as one item and drops separators', () => {
    const group = mount()
    const separator = group.querySelector('.sep-item')
    const saved = captureNodes(group)
    expect(readSections(group).map(block => block.key)).toEqual(['guestbook', 'diary', 'pictures'])
    expect(readSections(group).some(block => block.link.getAttribute('href')?.includes('/diary/new/'))).toBe(false)

    layoutSections(group, ['pictures', 'guestbook'], ['guestbook'])

    expect(group.querySelector('.sep-item')).toBeNull()
    expect(labels(group)).toEqual(['Фотографии', 'Гостевая', 'Личный блог'])
    expect(readSections(group)[1]?.node.classList.contains('hide')).toBe(true)
    expect(readSections(group)[0]?.node.classList.contains('hide')).toBe(false)
    expect(readSections(group)[2]?.node.textContent).toContain('Написать')
    expect(group.querySelector('#keep')).toBe(group.firstElementChild)

    restoreNodes(group, saved)
    expect(group.querySelector('.sep-item')).toBe(separator)
    expect(labels(group)).toEqual(['Гостевая', 'Личный блог', 'Фотографии'])
    expect(group.querySelector('.hide')).toBeNull()
    group.remove()
  })

  it('recognises the owner profile slug', () => {
    expect(matchesOwnProfile({ section: 'mysite', page: 'index', slug: 'anomaiy' }, 'AnomaIy')).toBe(true)
    expect(matchesOwnProfile({ section: 'mysite', page: 'index', slug: 'bce-3akpbit0' }, 'bce_3akpbit0')).toBe(true)
    expect(matchesOwnProfile({ section: 'mysite', page: 'index', slug: 'other' }, 'AnomaIy')).toBe(false)
    expect(matchesOwnProfile({ section: 'mysite', page: 'view', slug: 'anomaiy' }, 'AnomaIy')).toBe(false)
    expect(matchesOwnProfile({ section: 'anketa', page: 'index', slug: 'anomaiy' }, 'AnomaIy')).toBe(false)
  })
})
