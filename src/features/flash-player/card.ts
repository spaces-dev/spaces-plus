import { siteUrl } from '@/core/site'

const downloadPath = '/files/download/'
const extSelector = '.js-vc_fileext'
const downloadSelector = 'a.__adv_download, a[href*="/files/download/"]'
const previewSelector = '.file-card__preview'
const swfSignatures = new Set(['FWS', 'CWS', 'ZWS'])
const solSignature = 'TCSO'
const solSignatureAt = 6
const solStorageLength = 16
const fallbackName = 'movie.swf'

export interface SwfCard {
  id: string
  href: string
  name: string
  preview: HTMLElement
}

function absoluteUrl(href: string) {
  const raw = href.trim()
  if (!raw || raw === '#' || raw.toLowerCase().startsWith('javascript:')) return
  const url = siteUrl(raw, location.href)
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) return
  return url
}

export const fileViewId = (pathname: string) => /^\/files\/view\/(\d+)/.exec(pathname)?.[1] ?? ''

export const isSwfExtension = (value: string) => value.trim().toLowerCase() === 'swf'

export function swfDownloadHref(href: string) {
  const url = absoluteUrl(href)
  if (!url?.pathname.includes(downloadPath)) return ''
  return url.href
}

export function swfFileName(href: string) {
  const url = absoluteUrl(href)
  if (!url) return ''
  try {
    const name = decodeURIComponent(url.pathname.split('/').pop() ?? '')
    return name.toLowerCase().endsWith('.swf') ? name : ''
  } catch {
    return ''
  }
}

export function swfBase(href: string) {
  const url = absoluteUrl(href)
  if (!url) return ''
  const segments = url.pathname.split('/')
  segments.pop()
  url.pathname = `${segments.join('/')}/`
  url.search = ''
  url.hash = ''
  return url.href
}

export function isSwfMagic(bytes: Uint8Array) {
  if (bytes.length < 3) return false
  const signature = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0)
  return swfSignatures.has(signature)
}

export function isSolStorage(value: string) {
  if (value.length < solStorageLength) return false
  let bytes = ''
  try {
    bytes = atob(value)
  } catch {
    return false
  }
  const signatureEnd = solSignatureAt + solSignature.length
  if (bytes.length < signatureEnd) return false
  if (bytes.charCodeAt(0) !== 0x00 || bytes.charCodeAt(1) !== 0xBF) return false
  return bytes.slice(solSignatureAt, signatureEnd) === solSignature
}

export function readSwfCard(root: ParentNode, pathname: string): SwfCard | null {
  const id = fileViewId(pathname)
  if (!id) return null
  const ext = root.querySelector(extSelector)
  if (!ext || !isSwfExtension(ext.textContent ?? '')) return null
  const link = root.querySelector(downloadSelector)
  if (!(link instanceof HTMLAnchorElement)) return null
  const href = swfDownloadHref(link.getAttribute('href') ?? '')
  if (!href) return null
  const preview = root.querySelector(previewSelector)
  if (!(preview instanceof HTMLElement)) return null
  return {
    id,
    href,
    name: swfFileName(href) || fallbackName,
    preview,
  }
}
