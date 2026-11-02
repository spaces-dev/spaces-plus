import type { FeatureContext } from '@/core/feature'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copySource } from './index'

const commentHtml = `
  <article itemprop="comment">
    <div itemprop="text"><span style="color:#F50">x</span></div>
    <div class="popper-dropdown js-comm_menu" id="comm-menu-1">
      <a class="list-link js-action_link" data-action="comment_link" href="#">
        <span class="js-text">Скопировать ссылку</span>
      </a>
      <a class="list-link list-link_last" href="#">
        <span class="js-text">Изменить</span>
      </a>
    </div>
    <a class="js-popper_open" data-popper-id="comm-menu-1" href="#"></a>
  </article>
`

const postHtml = `
  <div class="topic">
    <div class="topic__subject"><div id="previewText">черновик</div></div>
    <div class="topic__actions">
      <div class="js-action_bar"><table><tr><td></td></tr></table></div>
    </div>
  </div>
`

const mailHtml = `
  <div class="js-message" data-id="1">
    <div class="mail__dialog_text js-message_text">
      <div class="js-message_preview">черновик <b>письма</b></div>
    </div>
    <div class="popper-dropdown" id="mail_message_menu_1">
      <div class="links-group">
        <a class="list-link js-action_link" data-action="mail_reply" href="#">
          <span class="js-text">Ответить</span>
        </a>
        <a class="list-link" href="#">
          <span class="js-text">Переслать</span>
        </a>
        <a class="list-link list-link-red js-action_link" data-action="mail_message_delete" href="#">
          <span class="js-text">Удалить</span>
        </a>
      </div>
    </div>
  </div>
`

const giftHtml = `
  <div class="js-message" data-id="2">
    <div class="js-message_text">
      <div class="js-message_preview">Лови жука</div>
    </div>
    <div class="popper-dropdown" id="mail_message_menu_2">
      <a class="list-link js-action_link" data-action="mail_reply" href="#">
        <span class="js-text">Ответить</span>
      </a>
      <a class="list-link js-action_link" data-action="mail_message_fav" href="#">
        <span class="js-text">В избранное</span>
      </a>
    </div>
  </div>
`

const longMailHtml = `
  <div class="js-message" data-id="3">
    <div class="js-message_text">
      <div class="js-message_preview">коротко</div>
      <div class="js-message_full hide">полный <span style="color:#F50">текст</span></div>
    </div>
    <a class="list-link js-action_link" data-action="mail_reply" href="#">
      <span class="js-text">Ответить</span>
    </a>
  </div>
`

const emptyMailHtml = `
  <div class="js-message" data-id="4">
    <div class="js-message_text"><div class="js-message_preview">   </div></div>
    <a class="list-link js-action_link" data-action="mail_reply" href="#">
      <span class="js-text">Ответить</span>
    </a>
  </div>
`

function apply() {
  const ctx: FeatureContext = {
    onDom: (run) => {
      run()
      return () => {}
    },
  }
  copySource.start(ctx)
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('copy source controls', () => {
  it('adds a menu row that matches the comment actions', () => {
    document.body.innerHTML = commentHtml
    apply()
    apply()
    const comment = document.querySelector('[itemprop="comment"]')
    const rows = comment?.querySelector('.js-comm_menu')?.querySelectorAll('a.list-link')
    const item = comment?.querySelector<HTMLAnchorElement>(`.js-sp-copy-source`)
    const edit = [...(rows ?? [])].find(row => row.textContent?.includes('Изменить'))
    expect(rows).toHaveLength(3)
    expect(item?.classList.contains('js-popper_open')).toBe(true)
    expect(item?.querySelector('.js-ico.ico_mail.ico_mail_quote')).toBeTruthy()
    expect(item?.querySelector('.js-ico.ico-alone')).toBeNull()
    expect(item?.querySelector('.t.js-text')?.textContent).toBe(' Исходный текст')
    expect(item?.classList.contains('list-link_last')).toBe(false)
    expect(edit?.classList.contains('list-link_last')).toBe(true)
    expect(item?.nextElementSibling).toBe(edit)
    const panel = document.getElementById(item?.dataset.popperId ?? '')
    expect(panel?.classList.contains('popper-dropdown')).toBe(true)
    expect(panel?.dataset.popperType ?? '').toBe('')
    expect(panel?.style.width ?? '').toBe('')
    panel?.dispatchEvent(new Event('popper:beforeOpen'))
    expect(panel?.querySelector('textarea')?.value).toBe('[color=#FF5500]x[/color]')
  })

  it('opens the post preview from the clipboard icon', () => {
    document.body.innerHTML = postHtml
    apply()
    const link = document.querySelector<HTMLAnchorElement>('.topic__actions .js-sp-copy-source')
    const bar = document.querySelector('.js-action_bar')
    expect(link?.textContent?.trim()).toBe('')
    expect(link?.classList.contains('user__tools-link')).toBe(true)
    expect(link?.classList.contains('btn-light')).toBe(true)
    expect(link?.dataset.popperClickedClass).toBe('clicked')
    expect(link?.querySelector('.js-ico.ico_mail.ico_mail_quote.ico-alone')).toBeTruthy()
    expect(link?.classList.contains('js-popper_open')).toBe(true)
    const panel = document.getElementById(link?.dataset.popperId ?? '')
    expect(link?.closest('td')?.contains(panel)).toBe(false)
    expect(bar?.contains(panel)).toBe(true)
    panel?.dispatchEvent(new Event('popper:beforeOpen'))
    expect(document.activeElement).not.toBe(panel?.querySelector('textarea'))
    panel?.dispatchEvent(new Event('popper:afterOpen'))
    expect(panel?.querySelector('textarea')?.value).toBe('черновик')
    expect(document.activeElement).toBe(panel?.querySelector('textarea'))
    expect(document.querySelectorAll('.js-sp-copy-panel')).toHaveLength(1)
  })

  it('copies the preview and marks the button', async () => {
    const writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    document.body.innerHTML = commentHtml
    apply()
    const panel = document.querySelector<HTMLElement>('.js-sp-copy-panel')
    const closed = vi.fn()
    panel?.addEventListener('click', (event) => {
      const target = event.target
      if (target instanceof HTMLElement && target.classList.contains('js-popper_close')) closed()
    })
    panel?.dispatchEvent(new Event('popper:beforeOpen'))
    panel?.querySelector('a')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => {
      expect(panel?.querySelector('.js-text')?.textContent).toBe('Скопировано')
    })
    expect(closed).toHaveBeenCalledOnce()
    expect(panel?.querySelector('.js-popper_close')).toBeNull()
    expect(panel?.querySelector('a .ico, a .ico_mail')).toBeNull()
    expect(writeText).toHaveBeenCalledWith('[color=#FF5500]x[/color]')
    vi.unstubAllGlobals()
  })

  it('keeps the popper open when copying fails', async () => {
    const writeText = vi.fn<(value: string) => Promise<void>>().mockRejectedValue(new Error('denied'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    document.body.innerHTML = commentHtml
    apply()
    const panel = document.querySelector<HTMLElement>('.js-sp-copy-panel')
    const closed = vi.fn()
    panel?.addEventListener('click', (event) => {
      const target = event.target
      if (target instanceof HTMLElement && target.classList.contains('js-popper_close')) closed()
    })
    panel?.dispatchEvent(new Event('popper:beforeOpen'))
    panel?.querySelector('a')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalled()
    })
    await Promise.resolve()
    expect(closed).not.toHaveBeenCalled()
    expect(panel?.querySelector('.js-text')?.textContent).toBe('Скопировать')
    vi.unstubAllGlobals()
  })

  it('adds a mail menu row after reply and reads the preview', () => {
    document.body.innerHTML = mailHtml
    apply()
    apply()
    const message = document.querySelector('.js-message')
    const rows = message?.querySelectorAll('#mail_message_menu_1 a.list-link')
    const item = message?.querySelector<HTMLAnchorElement>('.js-sp-copy-source')
    const reply = message?.querySelector('[data-action="mail_reply"]')
    expect(rows).toHaveLength(4)
    expect(item?.classList.contains('js-popper_open')).toBe(true)
    expect(item?.classList.contains('list-link_last')).toBe(false)
    expect(item?.querySelector('.js-ico.ico_mail.ico_mail_quote')).toBeTruthy()
    expect(item?.querySelector('.js-ico.ico-alone')).toBeNull()
    expect(item?.querySelector('.t.js-text')?.textContent).toBe(' Исходный текст')
    expect(reply?.nextElementSibling).toBe(item)
    const panel = document.getElementById(item?.dataset.popperId ?? '')
    expect(message?.contains(panel ?? null)).toBe(true)
    expect(message?.querySelector('#mail_message_menu_1')?.contains(panel ?? null)).toBe(false)
    panel?.dispatchEvent(new Event('popper:beforeOpen'))
    expect(panel?.querySelector('textarea')?.value).toBe('черновик [b]письма[/b]')
    expect(document.querySelectorAll('.js-sp-copy-source')).toHaveLength(1)
  })

  it('places the mail row after reply when forward is missing', () => {
    document.body.innerHTML = giftHtml
    apply()
    const item = document.querySelector('.js-sp-copy-source')
    const reply = document.querySelector('[data-action="mail_reply"]')
    const fav = document.querySelector('[data-action="mail_message_fav"]')
    expect(reply?.nextElementSibling).toBe(item)
    expect(item?.nextElementSibling).toBe(fav)
  })

  it('reads the hidden full mail text instead of the preview', () => {
    document.body.innerHTML = longMailHtml
    apply()
    const item = document.querySelector<HTMLAnchorElement>('.js-sp-copy-source')
    const panel = document.getElementById(item?.dataset.popperId ?? '')
    panel?.dispatchEvent(new Event('popper:beforeOpen'))
    expect(panel?.querySelector('textarea')?.value).toBe('полный [color=#FF5500]текст[/color]')
  })

  it('skips a mail message that has no text', () => {
    document.body.innerHTML = emptyMailHtml
    apply()
    expect(document.querySelector('.js-sp-copy-source')).toBeNull()
  })
})
