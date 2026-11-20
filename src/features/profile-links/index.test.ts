import { describe, expect, it } from 'vitest'
import { setSetting, settingKey } from '@/core/settings-store'
import { session } from '@/core/site'
import { profileLinks } from './index'
import { readSections } from './list'

const profileHtml = `
  <div class="widgets-group links-group bb0">
    <a class="list-link" href="/guestbook/index/anomaiy/"><span class="t js-text">Гостевая</span></a>
    <table>
      <tr>
        <td><a class="list-link" href="/diary/view/user/anomaiy/"><span class="t js-text">Личный блог</span></a></td>
        <td><a class="list-link" href="/diary/new/"><span class="t js-text">Написать</span></a></td>
      </tr>
    </table>
    <div class="sep-item"></div>
    <a class="list-link" href="/pictures/user/anomaiy/list/-/"><span class="t js-text">Фотографии</span></a>
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

describe('profile links on the page', () => {
  it('reorders the owner list and puts separators back when the feature stops', () => {
    session.username = 'AnomaIy'
    window.history.pushState({}, '', '/mysite/index/anomaiy/')
    const group = mount()
    setSetting(settingKey.profileLinksOrder, ['pictures', 'guestbook'])
    setSetting(settingKey.profileLinksHidden, ['guestbook'])
    const stop = profileLinks.start({
      onDom: (apply) => {
        apply()
        return () => {}
      },
    })

    try {
      expect(group.querySelector('.sep-item')).toBeNull()
      expect(labels(group)).toEqual(['Фотографии', 'Гостевая', 'Личный блог'])
      expect(readSections(group)[1]?.node.classList.contains('hide')).toBe(true)
      expect(readSections(group)[2]?.node.textContent).toContain('Написать')
      expect(document.getElementById('SP_SECTIONS_EDIT')?.textContent).toBe('Настроить список')
      expect(document.getElementById('SP_SECTIONS_EDIT')).toBe(group.lastElementChild)
      stop?.()
      expect(labels(group)).toEqual(['Гостевая', 'Личный блог', 'Фотографии'])
      expect(group.querySelector('.sep-item')).not.toBeNull()
      expect(group.querySelector('.hide')).toBeNull()
      expect(document.getElementById('SP_SECTIONS_EDIT')).toBeNull()
    } finally {
      stop?.()
      setSetting(settingKey.profileLinksOrder, [])
      setSetting(settingKey.profileLinksHidden, [])
      session.username = ''
      group.remove()
    }
  })
})
