import type { Feature } from '@/core/feature'
import { el } from '@zero-dependency/dom'
import { log } from '@/core/log'
import {
  alertContentSelector,
  closable,
  modalMessage,
  quietButtonClass,
} from '@/core/modals'
import { cookies, storageKey } from '@/core/settings-store'
import { communityUrl, plusSettingsUrl } from '@/core/site'

const officialSite = 'https://spaces-dev.github.io'
const warnColor = '#f86934'

export const firstLaunch: Feature = {
  id: 'first-launch',
  core: true,
  start: () => {
    try {
      if (cookies.get(storageKey.launch) !== null) return

      modalMessage(
        'Спасибо за установку Spaces Plus',
        `<b style="color: ${warnColor}">ВНИМАНИЕ!</b></br></br>Во избежание подделок, которые могут воровать пароли пользователей, скрипт скачивать только с официального <a href="${officialSite}" target="_blank">сайта</a></br></br>С вопросами по использованию скрипта пишите в сообщество <a href="${communityUrl()}" target="_blank">Spaces Plus</a></br></br>`,
        closable,
      )

      const href = plusSettingsUrl()
      const pad = el('div', { className: 'pad_t_a' })
      const button = el('a', {
        href,
        className: quietButtonClass,
        innerHTML: 'Перейти к настройкам',
      })
      button.addEventListener('click', (event) => {
        event.preventDefault()
        location.assign(href)
      })
      pad.append(button)
      document.querySelector(alertContentSelector)?.append(pad)
      cookies.set(storageKey.launch, '1')
    } catch (error) {
      log.error('first-launch', error)
    }
  },
}
