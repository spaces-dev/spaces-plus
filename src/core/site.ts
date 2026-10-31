import { pkgBasePath, pkgVersion } from './pkg-info'
import { packVersion } from './version'

export interface DeviceInfo {
  id: number
  os: string
  pc: boolean
  type: string
  browser: string
  v: number
  old: boolean
}

interface SiteRequireList extends Array<unknown> {
  push: (argv: unknown[]) => number
}

type SiteRequire = ((names: string[], onLoad?: () => void, onError?: () => void) => void) & {
  push?: (argv: unknown[]) => void
}

declare global {
  interface Window {
    __require?: SiteRequire | SiteRequireList
    Device: DeviceInfo
  }
}

export function readPage<T>(read: (win: Window) => T | null | undefined): T | undefined {
  const fromWindow = read(window)
  if (fromWindow != null) return fromWindow
  try {
    return read(unsafeWindow) ?? undefined
  } catch {
    return undefined
  }
}

export interface SiteParams {
  name?: string
  CK?: string
  sid?: string | number
  nid?: number | string
}

export interface SiteApiResult {
  code?: number | string
  error?: string
  notification?: {
    text?: string
  }
}

interface SiteSpaces {
  params?: SiteParams
  api?: (method: string, params: Record<string, unknown>, callback: (data: SiteApiResult | null) => void) => void
  apiError?: (data: SiteApiResult) => string
  tabId?: () => string | number
}

export const siteSpaces = () => readPage(win => (win as Window & { Spaces?: SiteSpaces }).Spaces)

export const siteTabId = () => siteSpaces()?.tabId?.() ?? ''

const apiWaitMs = 10000

function apiResult(code: number, error: string) {
  const result: SiteApiResult = { code }
  if (error) result.error = error
  return result
}

export function siteApiError(result: SiteApiResult | null | undefined) {
  if (result?.error) return result.error
  const describe = siteSpaces()?.apiError
  if (result && describe) return describe(result)
  return 'Spaces API is not ready'
}

export function siteApi(method: string, params: Record<string, unknown> = {}) {
  const spaces = siteSpaces()
  const call = spaces?.api
  if (!call) return Promise.reject(new Error('Spaces API is not ready'))

  return new Promise<SiteApiResult>((resolve, reject) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error('Spaces API timed out'))
    }, apiWaitMs)

    const finish = (result: SiteApiResult | Error) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      if (result instanceof Error) reject(result)
      else resolve(result)
    }

    try {
      // asyncApi резолвит промис страницы целым ответом вместе с widget.
      // В песочнице скрипта такой промис может не завершиться, хотя комментарий уже удалён.
      call(method, params, (data) => {
        if (!data) {
          finish(new Error('Spaces API request was cancelled'))
          return
        }
        const code = Number(data.code)
        let error = ''
        if (code !== 0) {
          try {
            error = spaces.apiError?.(data) || data.error || ''
          } catch {
            error = data.error || ''
          }
        }
        finish(apiResult(code, error))
      })
    } catch (error) {
      finish(error instanceof Error ? error : new Error('Spaces API is not ready'))
    }
  })
}

export function loadSiteModules(names: string[], onLoad: () => void, onError?: () => void) {
  const require = readPage(win => win.__require)
  if (typeof require === 'function') {
    require(names, onLoad, onError)
    return true
  }
  if (Array.isArray(require)) {
    require.push([names, onLoad, onError])
    return true
  }
  return false
}

export const revision = Date.now()

export const assetOrigin = pkgBasePath.replace(/\/$/, '')

export const cacheBust = (file: string) => `${assetOrigin}/${file}?r=${revision}`

export const host = location.hostname

export const baseUrl = `${location.protocol}//${host}`

export const versionNumber = packVersion(pkgVersion)

const unsupportedDeviceIds = new Set([1, 2])
const touchDeviceId = 3
const desktopDeviceId = 4

const fallbackDevice: DeviceInfo = {
  id: desktopDeviceId,
  os: '',
  pc: true,
  type: 'pc',
  browser: '',
  v: 0,
  old: false,
}

const readDevice = (): DeviceInfo => readPage(win => win.Device) ?? fallbackDevice

export const device: DeviceInfo = readDevice()

export const isLegacySite = () => unsupportedDeviceIds.has(device.id)

export const isTouch = () => device.id === touchDeviceId

export const isCurrentSite = () => device.id === touchDeviceId || device.id === desktopDeviceId

export const sessionCode = {
  unauthorized: '01001',
} as const

export const session = {
  ck: '',
  sid: '',
  username: '',
  onlineNick: null as string | null,
  playerTrack: 0,
  version: versionNumber,
}

export function readSession() {
  const params = siteSpaces()?.params
  if (!params?.name || !params.CK) return false
  session.username = params.name
  session.ck = params.CK
  session.sid = params.sid == null ? '' : String(params.sid)
  return true
}

export const pathIndex = {
  section: 1,
  page: 2,
  slug: 3,
} as const

export function pathAt(index?: number) {
  const path = location.pathname
  if (!index) return path
  return path.replace(/\/\s*$/, '').split('/')[index]
}

export function searchParam(url: string, key: string) {
  try {
    return new URL(url, location.origin).searchParams.get(key) ?? ''
  } catch {
    return ''
  }
}

export function queryFlag(name: string) {
  const params = new URLSearchParams(location.search)
  return params.get(name)
}

export const settingsPath = '/settings/'
export const plusSettingsFlag = 'sp_plus_settings'
export const backupFlag = 'sp_backup'
export const changelogFlag = 'sp_changelog'
export const communityPath = '/soo/extension/'

export const siteSettingsUrl = () => `${baseUrl}${settingsPath}`

export const notificationSettingsUrl = () => `${siteSettingsUrl()}notification/`

export function plusSettingsUrl(flag?: string) {
  const query = flag ? `${plusSettingsFlag}=1&${flag}=1` : `${plusSettingsFlag}=1`
  return `${baseUrl}${settingsPath}?${query}`
}

export const communityUrl = () => `${baseUrl}${communityPath}`

export const anchoredHref = (path: string) => `a[href^="${baseUrl}${path}"]`
