import { sitePathname } from '@/core/site'

export function mentionText(element: HTMLElement) {
  if (element.tagName.toLowerCase() !== 'a') return ''
  const href = element.getAttribute('href') ?? ''
  const text = element.textContent?.trim() ?? ''
  if (!href || !text) return ''
  const path = sitePathname(href)
  if (/^\/mysite\/index\/[^/]+\/?$/i.test(path) && text.startsWith('@')) return text
  const community = /^\/soo\/([^/]+)\/?$/i.exec(path)
  const address = community?.[1] ?? ''
  if (address && text.toLowerCase() === address.toLowerCase()) return `$${text}$`
  return ''
}
