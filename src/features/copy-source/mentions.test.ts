import { describe, expect, it } from 'vitest'
import { toSource } from './to-source'

function sourceOf(html: string) {
  const root = document.createElement('div')
  root.innerHTML = html
  return toSource(root)
}

describe('mentions', () => {
  it('keeps a user mention as the @ nick', () => {
    const html = '<a href="https://spaces.im/mysite/index/anomaiy/?Link_id=756619&amp;sid=" class="lh_160">@AnomaIy</a>'
    expect(sourceOf(html)).toBe('@AnomaIy')
  })

  it('wraps a community address in dollars', () => {
    const html = '<a href="https://spaces.im/soo/spaces_dev/?Link_id=756619&amp;sid=" class="lh_160">spaces_dev</a>'
    expect(sourceOf(html)).toBe('$spaces_dev$')
  })

  it('keeps an ordinary link to a profile or a community', () => {
    expect(sourceOf('<a href="https://spaces.im/mysite/index/anomaiy/" class="lh_160">профиль</a>')).toBe('[url=https://spaces.im/mysite/index/anomaiy/]профиль[/url]')
    expect(sourceOf('<a href="https://spaces.im/soo/spaces_dev/" class="lh_160">ссылка</a>')).toBe('[url=https://spaces.im/soo/spaces_dev/]ссылка[/url]')
  })
})
