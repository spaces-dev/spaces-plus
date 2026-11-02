import type { Feature } from '@/core/feature'
import { defineToggle } from '@/core/feature'
import { baseUrl, pathAt, pathIndex } from '@/core/site'
import { toggleId } from '@/types/toggles'
import { contentHtml, fallbackProfile, hiddenProfilePage, isClosedAccount, parseProfile, profileNick } from './links'
import { mountProfile, renderProfile } from './render'

const guestCookie = 'js_passed=2'
const requestTimeout = 8000

let requestId = 0
let inflight = ''

function guestHtml(nick: string) {
  return new Promise<string | null>((resolve) => {
    if (typeof GM_xmlhttpRequest !== 'function') {
      resolve(null)
      return
    }

    let settled = false
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    GM_xmlhttpRequest({
      method: 'GET',
      url: `${baseUrl}/ajax/mysite/index/${encodeURIComponent(nick)}/`,
      anonymous: true,
      cookie: guestCookie,
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': guestCookie,
      },
      timeout: requestTimeout,
      onload: response => finish(contentHtml(response.responseText)),
      onerror: () => finish(null),
      ontimeout: () => finish(null),
    })
  })
}

function place(model: ReturnType<typeof fallbackProfile>) {
  const pending = document.querySelector('.js-pending-item') ?? document.querySelector('#main')
  if (!pending) return
  mountProfile(pending, renderProfile(model))
}

function clearProfile() {
  requestId += 1
  inflight = ''
  document.querySelectorAll('[data-sp-profile]').forEach(node => node.remove())
}

export const hiddenProfile: Feature = defineToggle({
  id: toggleId.profileBypass,
  title: 'Просмотр заблокированных и удаленных профилей',
  description: 'Если пользователь добавил вас в черный список, на его странице появляется карточка, разделы и подарки. У заблокированного или удаленного аккаунта остается список разделов, которые еще открываются, в том числе на странице анкеты.',
  start: (ctx) => {
    const stop = ctx.onDom(() => {
      if (!hiddenProfilePage(pathAt(pathIndex.section), pathAt(pathIndex.page), document)) return

      const nick = profileNick(pathAt(pathIndex.slug), document.querySelector('#location_bar_1_0')?.textContent ?? '')
      const key = location.pathname
      if (!nick || document.querySelector('[data-sp-profile]') || inflight === key) return

      inflight = key
      const ticket = ++requestId
      void guestHtml(nick).then((html) => {
        if (ticket !== requestId) return
        if (location.pathname !== key) {
          if (inflight === key) inflight = ''
          return
        }
        const parsed = html ? parseProfile(html) : null
        place(parsed ?? fallbackProfile(nick, isClosedAccount(document)))
        inflight = ''
      })
    })

    return () => {
      stop()
      clearProfile()
    }
  },
})
