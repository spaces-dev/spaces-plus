import type { SwfCard } from './card'
import type { Feature } from '@/core/feature'
import { el } from '@zero-dependency/dom'
import { defineToggle } from '@/core/feature'
import { log } from '@/core/log'
import { withStyle } from '@/core/with-style'
import flashPlayerCss from '@/styles/features/flash-player.scss?inline'
import { toggleId } from '@/types/toggles'
import { isSwfMagic, readSwfCard, swfBase } from './card'

const flashPlayerStyleId = 'SP_STYLE_FLASH'
const ruffleVersion = '0.7.1'
const ruffleRoot = `https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle@${ruffleVersion}/`
const ruffleScriptUrl = `${ruffleRoot}ruffle.js`
const requestTimeout = 120000
const fallbackHeight = 360
const playLabel = 'Запустить'
const loadingLabel = 'Загрузка…'
const defaultVolume = 0.5

interface RuffleLoadOptions {
  data: Uint8Array
  swfFileName: string
  base?: string
  allowScriptAccess: false
  autoplay: 'on'
  letterbox: 'on'
  unmuteOverlay: 'hidden'
  splashScreen: false
  warnOnUnsupportedContent: false
}

interface RufflePlayback {
  load: (options: RuffleLoadOptions) => Promise<void>
  volume: number
}

interface RuffleElement extends HTMLElement {
  ruffle: () => RufflePlayback
}

interface RuffleSource {
  createPlayer: () => RuffleElement
}

interface RuffleHost {
  config?: {
    publicPath?: string
    public_path?: string
    polyfills?: boolean
  }
  newest?: () => RuffleSource | null
}

interface DownloadedSwf {
  bytes: Uint8Array
  finalUrl: string
}

let requestToken = 0
let abortRequest = () => {}
let mountedId = ''
let ruffleTask: Promise<RuffleSource> | null = null

function pageWindow() {
  try {
    return unsafeWindow
  } catch {
    return window
  }
}

function ruffleSource(host: RuffleHost | undefined) {
  const source = host?.newest?.()
  if (!source?.createPlayer) return
  return source
}

function ensureRuffle() {
  if (ruffleTask) return ruffleTask
  ruffleTask = new Promise((resolve, reject) => {
    const page = pageWindow() as Window & { RufflePlayer?: RuffleHost }
    const host: RuffleHost = page.RufflePlayer ?? {}
    host.config = {
      ...host.config,
      publicPath: ruffleRoot,
      public_path: ruffleRoot,
      polyfills: false,
    }
    page.RufflePlayer = host
    const ready = ruffleSource(host)
    if (ready) {
      resolve(ready)
      return
    }

    const script = document.createElement('script')
    script.src = ruffleScriptUrl
    script.async = true
    script.onload = () => {
      const source = ruffleSource(page.RufflePlayer)
      if (!source) {
        ruffleTask = null
        reject(new Error('ruffle'))
        return
      }
      resolve(source)
    }
    script.onerror = () => {
      ruffleTask = null
      reject(new Error('ruffle'))
    }
    document.documentElement.append(script)
  })
  return ruffleTask
}

function bytesOf(value: unknown) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (value instanceof Uint8Array) return value
  return new Uint8Array()
}

function downloadSwf(url: string) {
  return new Promise<DownloadedSwf>((resolve, reject) => {
    if (typeof GM_xmlhttpRequest !== 'function') {
      reject(new Error('gm'))
      return
    }

    let settled = false
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      reject(error)
    }
    const succeed = (file: DownloadedSwf) => {
      if (settled) return
      settled = true
      resolve(file)
    }

    const handle = GM_xmlhttpRequest({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
      timeout: requestTimeout,
      onload: (response) => {
        const status = response.status
        const okStatus = status === 0 || (status >= 200 && status < 300)
        if (!okStatus) {
          fail(new Error('network'))
          return
        }
        const bytes = bytesOf(response.response)
        if (!isSwfMagic(bytes)) {
          fail(new Error('swf'))
          return
        }
        succeed({ bytes, finalUrl: response.finalUrl || url })
      },
      onerror: () => fail(new Error('network')),
      ontimeout: () => fail(new Error('network')),
      onabort: () => fail(new Error('stale')),
    })
    abortRequest = () => handle.abort()
  })
}

function failureText(error: unknown) {
  const code = error instanceof Error ? error.message : ''
  if (code === 'gm') return 'Загрузка файла недоступна'
  if (code === 'swf') return 'Файл не соответствует формату SWF'
  if (code === 'ruffle') return 'Не удалось загрузить плеер'
  if (code === 'play') return 'Не удалось запустить ролик'
  return 'Не удалось скачать ролик'
}

function noteOf(preview: HTMLElement) {
  const next = preview.nextElementSibling
  if (next instanceof HTMLElement && next.classList.contains('sp-flash-note')) return next
}

function showNote(preview: HTMLElement, text: string) {
  const existing = noteOf(preview)
  const note = existing ?? el('div', { className: 'sp-flash-note' })
  note.textContent = text
  if (!existing) preview.after(note)
}

function stageHeight(preview: HTMLElement) {
  const image = preview.querySelector('img')
  if (!(image instanceof HTMLImageElement)) return fallbackHeight
  if (image.clientHeight > 0) return image.clientHeight
  if (image.height > 0) return image.height
  return fallbackHeight
}

function cancelRequest() {
  requestToken += 1
  abortRequest()
  abortRequest = () => {}
}

function clearPreview(preview: HTMLElement) {
  preview.querySelector('.sp-flash-player')?.remove()
  preview.querySelector('.sp-flash-play')?.remove()
  noteOf(preview)?.remove()
  preview.style.height = ''
  delete preview.dataset.spFlash
}

function resetMounted() {
  cancelRequest()
  const preview = document.querySelector<HTMLElement>('.file-card__preview[data-sp-flash]')
  if (preview) clearPreview(preview)
  mountedId = ''
}

function syncVolumeMenu(player: RuffleElement) {
  // меню Ruffle читает свой volumeSettings (при создании всегда 100) и не слушает player.volume.
  const slider = player.shadowRoot?.querySelector('#volume-slider')
  if (!(slider instanceof HTMLInputElement)) return
  slider.value = String(defaultVolume * 100)
  slider.dispatchEvent(new Event('input'))
}

function setCovered(preview: HTMLElement, player: HTMLElement, covered: boolean) {
  for (const child of preview.children) {
    if (child === player || !(child instanceof HTMLElement)) continue
    child.inert = covered
  }
}

async function mountPlayer(card: SwfCard, file: DownloadedSwf, source: RuffleSource) {
  const player = source.createPlayer()
  player.classList.add('sp-flash-player')
  card.preview.style.height = `${stageHeight(card.preview)}px`
  card.preview.append(player)
  setCovered(card.preview, player, true)
  syncVolumeMenu(player)
  const base = swfBase(file.finalUrl)
  try {
    const playback = player.ruffle()
    await playback.load({
      data: file.bytes,
      swfFileName: card.name,
      base: base || undefined,
      allowScriptAccess: false,
      autoplay: 'on',
      letterbox: 'on',
      unmuteOverlay: 'hidden',
      splashScreen: false,
      warnOnUnsupportedContent: false,
    })
    playback.volume = defaultVolume
  } catch (error) {
    player.remove()
    card.preview.style.height = ''
    setCovered(card.preview, player, false)
    throw new Error('play', { cause: error })
  }
}

async function startPlayback(card: SwfCard, button: HTMLButtonElement) {
  if (button.disabled) return
  const token = requestToken
  button.disabled = true
  button.textContent = loadingLabel
  try {
    const source = await ensureRuffle()
    if (token !== requestToken) return
    const file = await downloadSwf(card.href)
    if (token !== requestToken) return
    await mountPlayer(card, file, source)
    if (token !== requestToken) return
    button.remove()
    noteOf(card.preview)?.remove()
  } catch (error) {
    if (token !== requestToken) return
    if (error instanceof Error && error.message === 'stale') return
    button.disabled = false
    button.textContent = playLabel
    showNote(card.preview, failureText(error))
    log.error('flash', error)
  }
}

function placeButton(card: SwfCard) {
  if (card.preview.querySelector('.sp-flash-play')) return
  const button = el('button', {
    type: 'button',
    className: 'sp-flash-play',
  }, playLabel)
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    void startPlayback(card, button)
  })
  card.preview.append(button)
}

function sync() {
  const card = readSwfCard(document, location.pathname)
  if (!card) {
    if (mountedId) resetMounted()
    return
  }
  if (mountedId && mountedId !== card.id) resetMounted()
  if (card.preview.dataset.spFlash === card.id) return
  mountedId = card.id
  card.preview.dataset.spFlash = card.id
  placeButton(card)
}

export const flashPlayer: Feature = defineToggle({
  id: toggleId.flashPlayer,
  title: 'Запуск Flash файлов',
  description: 'На странице SWF-файла кнопка «Запустить» открывает плеер',
  start: withStyle(flashPlayerStyleId, flashPlayerCss, (ctx) => {
    const stop = ctx.onDom(sync)
    return () => {
      stop()
      resetMounted()
    }
  }),
})
