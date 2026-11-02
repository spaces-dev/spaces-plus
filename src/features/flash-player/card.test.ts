import { describe, expect, it } from 'vitest'
import { fileViewId, isSwfExtension, isSwfMagic, readSwfCard, swfBase, swfDownloadHref, swfFileName } from './card'

const viewPath = '/files/view/100553151/'
const downloadHref = '/files/download/htz-cs15/file/f/token/100553151/0/hash/Swami_Shaggy-spaces.im.swf'

const cardHtml = `
  <div class="file-card">
    <h1>Swami Shaggy.<span class="js-vc_fileext">swf</span></h1>
    <div class="file-card__preview">
      <a href="https://fp.spac.me/preview.jpg"><img alt="Swami Shaggy" height="360"></a>
    </div>
    <a class="__adv_download" href="${downloadHref}">Скачать</a>
  </div>
`

describe('flash card', () => {
  it('reads a swf file page', () => {
    document.body.innerHTML = cardHtml
    const card = readSwfCard(document, `${viewPath}?Li=1`)
    expect(card?.id).toBe('100553151')
    expect(card?.name).toBe('Swami_Shaggy-spaces.im.swf')
    expect(card?.href).toBe(`https://spaces.im${downloadHref}`)
    expect(card?.preview.classList.contains('file-card__preview')).toBe(true)
  })

  it('ignores a page that is not a swf file', () => {
    document.body.innerHTML = cardHtml.replace('swf', 'jpg')
    expect(readSwfCard(document, viewPath)).toBeNull()
    expect(readSwfCard(document, '/sz/flxw/')).toBeNull()
  })

  it('rejects a download link that is not a file', () => {
    expect(swfDownloadHref('javascript:alert(1)')).toBe('')
    expect(swfDownloadHref('#')).toBe('')
    expect(swfDownloadHref('/files/view/1/')).toBe('')
    expect(fileViewId('/files/view/42/?Sn=1')).toBe('42')
    expect(fileViewId('/sz/flxw/')).toBe('')
    expect(isSwfExtension(' SWF ')).toBe(true)
    expect(isSwfExtension('jpg')).toBe(false)
  })

  it('keeps the swf name and the directory used as the movie base', () => {
    const href = `https://spaces.im${downloadHref}`
    expect(swfFileName(href)).toBe('Swami_Shaggy-spaces.im.swf')
    expect(swfBase(href)).toBe('https://spaces.im/files/download/htz-cs15/file/f/token/100553151/0/hash/')
    expect(swfFileName('/files/download/plain.bin')).toBe('')
  })

  it('recognises flash signatures', () => {
    expect(isSwfMagic(Uint8Array.from([0x46, 0x57, 0x53, 0x08]))).toBe(true)
    expect(isSwfMagic(Uint8Array.from([0x43, 0x57, 0x53]))).toBe(true)
    expect(isSwfMagic(Uint8Array.from([0x5A, 0x57, 0x53]))).toBe(true)
    expect(isSwfMagic(Uint8Array.from([0x3C, 0x68, 0x74]))).toBe(false)
    expect(isSwfMagic(Uint8Array.from([0x46, 0x57]))).toBe(false)
  })
})
