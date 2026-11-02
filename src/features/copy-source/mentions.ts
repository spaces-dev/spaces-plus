function pathOf(href: string) {
  try {
    return new URL(href, location.origin).pathname
  } catch {
    return ''
  }
}

export function mentionText(element: HTMLElement) {
  if (element.tagName.toLowerCase() !== 'a') return ''
  const href = element.getAttribute('href') ?? ''
  const text = element.textContent?.trim() ?? ''
  if (!href || !text) return ''
  const path = pathOf(href)
  if (/^\/mysite\/index\/[^/]+\/?$/i.test(path) && text.startsWith('@')) return text
  const community = /^\/soo\/([^/]+)\/?$/i.exec(path)
  const address = community?.[1] ?? ''
  if (address && text.toLowerCase() === address.toLowerCase()) return `$${text}$`
  return ''
}
