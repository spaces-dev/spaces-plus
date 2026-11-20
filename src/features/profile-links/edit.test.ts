import { describe, expect, it } from 'vitest'
import { closeSectionEditor, openSectionEditor, sectionRow } from './edit'
import { readSections } from './list'

function block() {
  const host = document.createElement('div')
  host.innerHTML = `
    <div>
      <a class="list-link" href="/guestbook/index/anomaiy/">
        <span class="js-ico ico_colored ico_colored_gb"></span>
        <span class="t js-text">Гостевая</span>
        <span class="cnt js-cnt">6</span>
      </a>
    </div>
  `
  const group = host.firstElementChild
  if (!(group instanceof HTMLElement)) throw new TypeError('group')
  const section = readSections(group)[0]
  if (!section) throw new TypeError('section')
  return section
}

describe('profile section editor row', () => {
  it('shows a checkbox, the title and a drag handle', () => {
    const section = block()
    const row = sectionRow(section, true)
    expect(row.dataset.spKey).toBe('guestbook')
    expect(row.querySelector('.js-text')?.textContent).toBe('Гостевая')
    expect(row.querySelector('.js-ico')?.className).toContain('ico_colored_gb')
    expect(row.querySelector('.js-drag_button .ico_short')).not.toBeNull()
    expect(row.querySelector('input')?.checked).toBe(true)
    expect(row.querySelector('.form-checkbox')?.classList.contains('form-checkbox__drag')).toBe(true)
    expect(row.textContent).not.toContain('6')
    expect(section.node.textContent).toContain('6')
  })

  it('toggles every box and writes the list only from save', () => {
    const host = document.createElement('div')
    host.innerHTML = `
      <div>
        <a class="list-link" href="/guestbook/index/anomaiy/"><span class="t js-text">Гостевая</span></a>
        <a class="list-link" href="/pictures/user/anomaiy/list/-/"><span class="t js-text">Фотографии</span></a>
      </div>
    `
    const group = host.firstElementChild
    if (!(group instanceof HTMLElement)) throw new TypeError('group')
    document.body.append(group)
    const blocks = readSections(group)
    const saved: Array<{ order: string[], hidden: string[] }> = []
    let cancelled = 0
    const click = (node: Element | null) => node?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    try {
      openSectionEditor({
        group,
        blocks,
        hiddenKeys: [],
        onSave: (order, hidden) => saved.push({ order, hidden }),
        onCancel: () => {
          cancelled += 1
        },
      })
      const toggle = group.querySelector('[data-sp-checkall]')
      expect(toggle?.textContent).toBe('Снять все')
      click(toggle)
      expect(toggle?.textContent).toBe('Отметить все')
      expect([...group.querySelectorAll('input')].every(input => input instanceof HTMLInputElement && !input.checked)).toBe(true)
      click(toggle)
      expect(toggle?.textContent).toBe('Снять все')
      click(group.querySelector('.js-checkbox .js-text'))
      expect(toggle?.textContent).toBe('Отметить все')
      expect(saved).toEqual([])
      expect(cancelled).toBe(0)
      click(group.querySelector('button'))
      expect(saved).toEqual([{ order: ['guestbook', 'pictures'], hidden: ['guestbook'] }])
      expect(group.querySelector('[data-sp-checkall]')).toBeNull()

      openSectionEditor({
        group,
        blocks,
        hiddenKeys: ['guestbook'],
        onSave: (order, hidden) => saved.push({ order, hidden }),
        onCancel: () => {
          cancelled += 1
        },
      })
      expect(group.querySelector('[data-sp-checkall]')?.textContent).toBe('Отметить все')
      click(group.querySelector('[data-sp-checkall]'))
      expect(group.querySelector('[data-sp-checkall]')?.textContent).toBe('Снять все')
      click(group.querySelector('a.stnd-link'))
      expect(saved).toEqual([{ order: ['guestbook', 'pictures'], hidden: ['guestbook'] }])
      expect(cancelled).toBe(1)
      expect(group.querySelector('button')).toBeNull()
    } finally {
      closeSectionEditor()
      group.remove()
    }
  })
})
