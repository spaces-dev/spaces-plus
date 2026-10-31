import type { FeatureContext } from '@/core/feature'
import { log } from '@/core/log'

export function collectLinks(prefix: string, message: string, skip?: (link: HTMLElement) => boolean) {
  return (ctx: FeatureContext) => ctx.onDom(() => {
    document.querySelectorAll<HTMLElement>(`a[href^="${prefix}"]`).forEach((link) => {
      if (skip?.(link)) return
      link.click()
      link.parentElement?.remove()
      log.info(message, link)
    })
  })
}
