import { describe, expect, it } from 'vitest'
import { toSource } from './to-source'

function sourceOf(html: string) {
  const root = document.createElement('div')
  root.innerHTML = html
  return toSource(root)
}

const photo = '<span class="attaches-fixer"><a class="gview_link" href="https://spaces.im/pictures/view/282827886/"><img alt="logo 128" src="https://example/logo.jpg"></a></span>'
const music = '<span class="attaches-fixer"><div class="player_item" data-artist="LXST CXNTURY" data-title="Odium"><span>2:47</span><a href="https://fp.spac.me/track.mp3">скачать</a></div></span>'
const file = '<span class="attaches-fixer"><div class="att_size">114 б</div><a href="https://spaces.im/files/view/83077619/">SpacesTracking.sh</a></span>'
const video = '<span class="attaches-fixer"><a class="gview_link" href="https://spaces.im/video/view/102981692/"><img alt="Lifeisstrange" src="https://example/teaser.jpg"></a></span>'

describe('inline attaches', () => {
  it('drops a picture, a track, a file and a video', () => {
    expect(sourceOf(photo)).toBe('')
    expect(sourceOf(music)).toBe('')
    expect(sourceOf(file)).toBe('')
    expect(sourceOf(video)).toBe('')
  })

  it('keeps the words on either side of an attach', () => {
    expect(sourceOf(`до ${photo} после`)).toBe('до  после')
    expect(sourceOf(`до<br>${music}${file}<br>${video}конец`)).toBe('до\n\nконец')
  })
})
