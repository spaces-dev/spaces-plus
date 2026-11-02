import { describe, expect, it } from 'vitest'
import { contentHtml, fallbackProfile, fallbackSections, hiddenProfilePage, isClosedAccount, isHiddenProfile, parseProfile, profileNick } from './links'
import { mountProfile, renderProfile } from './render'

const guestHtml = `
  <div class="widgets-group widgets-group_top wbg">
    <div class="content-item3">
      <div class="user__ava user__ava_big">
        <a href="/pictures/view/1/"><img src="https://cdn.example/ava.jpg" srcset="https://cdn.example/ava.jpg, https://cdn.example/ava-hi.jpg 1.5x" alt="panda"></a>
        <div class="pd_t5 js-online_status hide" data-toggle="offline">
          <span class="t js-text">28 окт в 05:00</span>
        </div>
        <div class="pd_t5 js-online_status" data-toggle="online">
          <span class="t js-text">В сети</span>
        </div>
      </div>
      <div class="user__info">
        <h1 class="user__nick">
          <img class="p14 online_status_ico" src="/i/head/emo.png" alt="(ON)">
          <a class="mysite-link" href="/mysite/index/megajoker/"><span class="mysite-nick">MegaJokeR</span></a>
          <span class="ico_colored ico_colored_medal_gold ico_no-mrg"></span>
        </h1>
        <a class="rating__circle rating__circle-inline" href="/rate/">25</a>
        <div class="user__descr">
          <div class="user__details">Алексей</div>
          <div class="user__details">35 лет</div>
          <div class="user__details"><a class="link-stnd" href="/geo/city/9627/">Рыбинск, Россия</a></div>
        </div>
      </div>
    </div>
  </div>
  <div class="tabs">
    <table><tr>
      <td class="table__cell tabs__item clicked"><span class="tabs__link">Профиль</span></td>
      <td class="table__cell tabs__item"><a class="tabs__link" href="/anketa/index/megajoker/">Анкета</a></td>
      <td class="table__cell tabs__item"><a class="tabs__link" href="/activity/?user=MegaJokeR">Активность</a></td>
    </tr></table>
  </div>
  <div class="widgets-group links-group bb0">
    <a href="/guestbook/index/megajoker/" class="list-link">
      <span class="js-ico ico_colored ico_colored_gb"></span>
      <span class="t js-text">Гостевая</span>
      <span class="cnt js-cnt">1151</span>
    </a>
    <a href="/friends/?name=MegaJokeR" class="list-link">
      <span class="js-ico ico_colored ico_colored_friends"></span>
      <span class="t js-text">Друзья</span>
      <span class="cnt js-cnt">40</span>
      Общие
      <span class="cnt js-cnt">1</span>
    </a>
  </div>
  <div class="widgets-group links-group links-group_attention dropdown-menu">
    <a href="/friends/add/?friend=MegaJokeR" class="list-link"><span class="t js-text">Дружить</span></a>
  </div>
  <div class="widgets-group">
    <div class="b-title">
      <a class="b-title__link" href="/gifts/user_list/megajoker/">
        <h6 class="span">Подарки</h6>
        <span class="cnt cnt_title">57</span>
      </a>
    </div>
    <span class="present"><a href="/gifts/user_list/megajoker/#gift1"><img alt="hbbox" src="/i/gifts/40/hbbox.png"></a></span>
  </div>
`

function mount(html: string) {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

describe('hidden profile', () => {
  it('recognises a blacklist, a deleted account and a ban', () => {
    expect(isHiddenProfile(mount('<div class="js-pending-item"><div class="ico_xlarge ico_xlarge_noaccess"></div><a href="https://spaces.im/blacklist/details/?user=Alex69tm">Чёрный список</a></div>'))).toBe(true)
    expect(isHiddenProfile(mount('<div class="js-pending-item">Аккаунт удалён. Дата: 21 дек 2024</div>'))).toBe(true)
    expect(isHiddenProfile(mount('<div class="js-pending-item"><a href="https://spaces.im/info/rules/">правила</a> Пользователь был заблокирован</div>'))).toBe(true)
    expect(isHiddenProfile(mount(guestHtml))).toBe(false)
    expect(isClosedAccount(mount('<div class="js-pending-item">Аккаунт удалён. Дата: 21 дек 2024</div>'))).toBe(true)
    expect(isClosedAccount(mount('<div class="js-pending-item">Пользователь был заблокирован</div>'))).toBe(true)
    expect(isClosedAccount(mount('<div class="js-pending-item"><a href="https://spaces.im/blacklist/details/?user=Alex69tm">Чёрный список</a></div>'))).toBe(false)
    const ban = mount('<div class="js-pending-item">Пользователь был заблокирован</div>')
    const blacklist = mount('<div class="js-pending-item"><a href="https://spaces.im/blacklist/details/?user=Alex69tm">Чёрный список</a></div>')
    expect(hiddenProfilePage('anketa', 'index', ban)).toBe(true)
    expect(hiddenProfilePage('mysite', 'index', ban)).toBe(true)
    expect(hiddenProfilePage('anketa', 'index', blacklist)).toBe(false)
    expect(hiddenProfilePage('anketa', 'index', mount(guestHtml))).toBe(false)
    expect(hiddenProfilePage('anketa', 'edit', ban)).toBe(false)
  })

  it('keeps the slug and takes the location bar for a numeric id', () => {
    expect(profileNick('alex69tm', 'Alex69tm')).toBe('alex69tm')
    expect(profileNick('66', 'max')).toBe('max')
  })

  it('reads the guest profile ajax payload', () => {
    expect(contentHtml('{"content":"<div>профиль</div>"}')).toBe('<div>профиль</div>')
    expect(contentHtml('<html>Загрузка страницы</html>')).toBeNull()
    expect(contentHtml('нет')).toBeNull()
  })

  it('parses the card, sections and gifts', () => {
    const profile = parseProfile(guestHtml)
    expect(profile?.nick).toEqual({ text: 'MegaJokeR', href: '/mysite/index/megajoker/' })
    expect(profile?.seen).toBe('В сети')
    expect(profile?.online).toBe(true)
    expect(profile?.statusIcon).toEqual({ src: '/i/head/emo.png', alt: '(ON)' })
    expect(profile?.medal).toContain('ico_colored_medal_gold')
    expect(profile?.rating).toEqual({ text: '25', href: '/rate/' })
    expect(profile?.avatar?.src).toBe('https://cdn.example/ava.jpg')
    expect(profile?.avatar?.srcset).toBe('https://cdn.example/ava.jpg, https://cdn.example/ava-hi.jpg 1.5x')
    const lazy = parseProfile(`
      <div class="user__ava"><img data-s="https://cdn.example/low.jpg" data-s2="https://cdn.example/high.jpg" alt="panda"></div>
      <div class="widgets-group links-group"><a class="list-link" href="/guestbook/index/megajoker/"><span class="js-text">Гостевая</span></a></div>
    `)
    expect(lazy?.avatar).toMatchObject({
      src: 'https://cdn.example/low.jpg',
      srcset: 'https://cdn.example/low.jpg, https://cdn.example/high.jpg 1.5x',
    })
    expect(profile?.lines.map(line => line.text)).toEqual(['Алексей', '35 лет', 'Рыбинск, Россия'])
    expect(profile?.lines[2]?.href).toBe('/geo/city/9627/')
    expect(profile?.tabs.map(tab => tab.label)).toEqual(['Профиль', 'Анкета'])
    expect(profile?.tabs[0]?.current).toBe(true)
    expect(profile?.sections.map(section => section.label)).toEqual(['Гостевая', 'Друзья'])
    expect(profile?.sections[0]?.extras).toEqual([{ text: '1151', count: true }])
    expect(profile?.sections[1]?.extras).toEqual([
      { text: '40', count: true },
      { text: 'Общие', count: false },
      { text: '1', count: true },
    ])
    expect(profile?.gifts).toMatchObject({
      href: '/gifts/user_list/megajoker/',
      count: '57',
      items: [{ src: '/i/gifts/40/hbbox.png', alt: 'hbbox' }],
    })
  })

  it('returns nothing for a ban stub', () => {
    const html = '<div class="js-pending-item"><div class="ico_xlarge_noaccess"></div>Пользователь был заблокирован</div>'
    expect(parseProfile(html)).toBeNull()
  })

  it('builds direct section urls', () => {
    const hrefs = fallbackSections('ponikigogo').map(section => section.href)
    expect(hrefs).toContain('/pictures/user/ponikigogo/list/-/')
    expect(hrefs).toContain('/music/user/ponikigogo/list/-/')
    expect(hrefs).toContain('/anketa/index/ponikigogo/')
    expect(fallbackSections('ponikigogo', true).some(section => section.href.includes('/anketa/'))).toBe(false)
  })

  it('renders a guest profile with the site classes', () => {
    const profile = parseProfile(guestHtml)
    expect(profile).not.toBeNull()
    if (!profile) return
    const view = renderProfile(profile)
    expect(view.card?.querySelector('.user__nick')?.textContent).toContain('MegaJokeR')
    expect(view.card?.querySelector('.user__ava img')?.getAttribute('srcset')).toBe('https://cdn.example/ava.jpg, https://cdn.example/ava-hi.jpg 1.5x')
    expect(view.card?.querySelector('.user__ava .green')?.textContent).toContain('В сети')
    expect(view.card?.querySelector('a[href="/anketa/index/megajoker/"] .online_status_ico')?.getAttribute('src')).toBe('/i/head/emo.png')
    expect(view.card?.querySelector('.ico_colored_medal_gold')).toBeTruthy()
    const nickRow = view.card?.querySelector('.user__nick')
    const gaps = [...nickRow?.childNodes ?? []].flatMap(node => node.nodeType === Node.TEXT_NODE ? [node.textContent] : [])
    expect(gaps).toEqual([' ', ' ', ' '])
    expect(view.card?.querySelector('.user__details a')?.getAttribute('href')).toBe('/geo/city/9627/')
    expect(view.body.querySelector('.tabs__link')?.textContent).toBe('Профиль')
    expect(view.body.textContent).not.toContain('Активность')
    expect(view.body.querySelector('a[href="/guestbook/index/megajoker/"] .js-cnt')?.textContent).toBe('1151')
    expect(view.body.querySelector('a[href="/friends/?name=MegaJokeR"]')?.textContent).toContain('Общие')
    expect(view.body.querySelector('.present img')?.getAttribute('src')).toBe('/i/gifts/40/hbbox.png')
    expect(view.card?.textContent).not.toContain('совпадаете')
  })

  it('renders a closed account without anketa tabs', () => {
    const view = renderProfile(fallbackProfile('dizmo', true))
    expect(view.card).toBeNull()
    expect(view.body.querySelector('a[href="/files/user/dizmo/list/-/"]')?.textContent).toContain('Файлы')
    expect(view.body.querySelector('.tabs')).toBeNull()
    expect(view.body.textContent).not.toContain('Анкета')
    expect(view.body.textContent).not.toContain('Активность')
  })

  it('keeps the anketa tab when the profile is only hidden', () => {
    const view = renderProfile(fallbackProfile('alex69tm'))
    expect(view.body.querySelector('.tabs a[href="/anketa/index/alex69tm/"]')?.textContent).toBe('Анкета')
    expect(view.body.querySelector('a[href="/anketa/index/alex69tm/"]')).toBeTruthy()
    expect(view.body.querySelectorAll('.tabs__item')).toHaveLength(2)
    const tab = view.body.querySelector('.tabs__item')
    expect(tab).toBeInstanceOf(HTMLTableCellElement)
    if (tab instanceof HTMLTableCellElement) expect(tab.width).toBe('50%')
  })

  it('puts the action row inside the card', () => {
    const pending = mount(`
      <div class="js-pending-item">
        <div class="widgets-group">
          <div class="ico_xlarge_noaccess"></div>
          <div class="user__tools"><a class="stnd-link">Дружить</a><a class="stnd-link">Читать</a></div>
        </div>
      </div>
    `).querySelector('.js-pending-item')
    const profile = parseProfile(guestHtml)
    expect(pending).toBeTruthy()
    expect(profile).toBeTruthy()
    if (!pending || !profile) return
    const view = renderProfile(profile)
    mountProfile(pending, view)
    expect(view.card?.querySelector('.user__tools')?.textContent).toContain('Дружить')
    expect(view.card?.querySelector('.user__tools')?.textContent).toContain('Читать')
    expect(view.card?.nextElementSibling).toBe(view.body)
    expect(pending.querySelector('.ico_xlarge_noaccess')).toBeNull()
  })

  it('places a ban list after the stub, not inside it', () => {
    const pending = mount(`
      <div class="js-pending-item">
        <div class="widgets-group widgets-group_top">
          <div class="block-item"><div class="ico_xlarge_noaccess"></div>заблокирован</div>
          <div class="user__tools"><a class="stnd-link">Дружите</a></div>
        </div>
      </div>
    `).querySelector('.js-pending-item')
    expect(pending).toBeTruthy()
    if (!pending) return
    const view = renderProfile(fallbackProfile('dizmo', true))
    mountProfile(pending, view)
    const stub = pending.querySelector('.widgets-group_top')
    expect(stub?.contains(view.body)).toBe(false)
    expect(stub?.nextElementSibling).toBe(view.body)
    expect(stub?.querySelector('.user__tools')?.textContent).toContain('Дружите')
  })
})
