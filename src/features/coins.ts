import type { Feature } from '@/core/feature'
import { defineToggle } from '@/core/feature'
import { log } from '@/core/log'
import { baseUrl, siteApi, siteApiError } from '@/core/site'
import { toggleId } from '@/types/toggles'
import { collectLinks } from './collect-links'

const coinsPrefix = `${baseUrl}/services/gift_get/`
const coinId = 'bonus_coin'
const giftMethod = 'services.getGiftCoins'

function isParams(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function claimWidget(coin: HTMLElement, claimed: WeakSet<HTMLElement>) {
  if (claimed.has(coin)) return
  const raw = coin.dataset.params
  if (!raw) return
  claimed.add(coin)

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isParams(parsed)) return
    const result = await siteApi(giftMethod, { ...parsed, CK: null })
    if (Number(result.code) !== 0) {
      log.error('coins', siteApiError(result))
      return
    }
    coin.remove()
    log.info('Собрали монетку', result)
  } catch (error) {
    log.error('coins', error)
  }
}

export const coins: Feature = defineToggle({
  id: toggleId.coins,
  title: 'Собирать бонусные монеты',
  description: 'Функция в автоматическом режиме ищет и собирает бонусные монеты.',
  start: (ctx) => {
    const claimed = new WeakSet<HTMLElement>()
    const stopLegacy = collectLinks(coinsPrefix, 'Собрали монетку', link => link.id === coinId)(ctx)
    const stopWidget = ctx.onDom(() => {
      const coin = document.getElementById(coinId)
      if (coin instanceof HTMLElement) void claimWidget(coin, claimed)
    })
    return () => {
      stopLegacy()
      stopWidget()
    }
  },
})
