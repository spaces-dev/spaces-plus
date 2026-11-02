const hexColor = /^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i
const rgbColor = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i

const contrastFloor = 4.5
const earlyContrast = 4.43
const stableContrast = 5.15
const closeLightness = 0.16
const backgroundRed = 62
const backgroundGreen = 63
const backgroundBlue = 64

function namedToken(value: string) {
  const name = value.toLowerCase()
  if (name === 'green') return 'green'
  if (name === 'lightblue') return 'LightBlue'
  return ''
}

function hexToken(value: string) {
  const match = hexColor.exec(value)
  const raw = match?.[1]
  if (!raw) return ''
  let digits = raw
  if (digits.length === 3 || digits.length === 4) {
    digits = [...digits].map(digit => `${digit}${digit}`).join('')
  }
  if (digits.length === 8) digits = digits.slice(0, 6)
  if (digits.length !== 6) return ''
  return `#${digits.toUpperCase()}`
}

function rgbToken(value: string) {
  const match = rgbColor.exec(value)
  const red = match?.[1]
  const green = match?.[2]
  const blue = match?.[3]
  if (red === undefined || green === undefined || blue === undefined) return ''
  const channels = [red, green, blue].map(channel => Number(channel))
  if (channels.some(channel => channel > 255)) return ''
  const hex = channels.map(channel => channel.toString(16).padStart(2, '0')).join('')
  return `#${hex.toUpperCase()}`
}

export function colorToken(value: string | undefined) {
  if (!value) return ''
  return namedToken(value) || hexToken(value) || rgbToken(value)
}

function channelLuminance(value: number) {
  return (value / 255) ** 2.2
}

function luminance(red: number, green: number, blue: number) {
  return 0.2126 * channelLuminance(red)
    + 0.7152 * channelLuminance(green)
    + 0.0722 * channelLuminance(blue)
}

const backgroundLuminance = luminance(backgroundRed, backgroundGreen, backgroundBlue)

function contrast(red: number, green: number, blue: number) {
  const foreground = luminance(red, green, blue)
  const lighter = Math.max(foreground, backgroundLuminance)
  const darker = Math.min(foreground, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

function wrapUnit(value: number) {
  return ((value % 1) + 1) % 1
}

function rgbToHsl(red: number, green: number, blue: number) {
  const scaledRed = red / 255
  const scaledGreen = green / 255
  const scaledBlue = blue / 255
  const max = Math.max(scaledRed, scaledGreen, scaledBlue)
  const min = Math.min(scaledRed, scaledGreen, scaledBlue)
  const range = max - min
  const light = (max + min) / 2
  if (range === 0) return { hue: 0, light, saturation: 0 }
  const saturation = light <= 0.5 ? range / (max + min) : range / (2 - max - min)
  const redDistance = (max - scaledRed) / range
  const greenDistance = (max - scaledGreen) / range
  const blueDistance = (max - scaledBlue) / range
  let hue = 4 + greenDistance - redDistance
  if (scaledRed === max) hue = blueDistance - greenDistance
  if (scaledGreen === max) hue = 2 + redDistance - blueDistance
  return { hue: wrapUnit(hue / 6), light, saturation }
}

function hueChannel(start: number, end: number, hue: number) {
  const wrapped = wrapUnit(hue)
  if (wrapped < 1 / 6) return start + (end - start) * wrapped * 6
  if (wrapped < 0.5) return end
  if (wrapped < 2 / 3) return start + (end - start) * (2 / 3 - wrapped) * 6
  return start
}

function hslToRgb(hue: number, light: number, saturation: number) {
  if (saturation === 0) {
    const value = light * 255
    return [value, value, value] as const
  }
  const second = light <= 0.5 ? light * (1 + saturation) : light + saturation - light * saturation
  const first = 2 * light - second
  return [
    hueChannel(first, second, hue + 1 / 3) * 255,
    hueChannel(first, second, hue) * 255,
    hueChannel(first, second, hue - 1 / 3) * 255,
  ] as const
}

function hexOf(red: number, green: number, blue: number) {
  const channel = (value: number) => Math.min(255, Math.max(0, Math.round(value))).toString(16).padStart(2, '0')
  return `#${channel(red)}${channel(green)}${channel(blue)}`.toUpperCase()
}

function parseChannel(hex: string, offset: number) {
  return Number.parseInt(hex.slice(offset, offset + 2), 16)
}

export function themeColor(hex: string) {
  const red = parseChannel(hex, 1)
  const green = parseChannel(hex, 3)
  const blue = parseChannel(hex, 5)
  if (contrast(red, green, blue) >= contrastFloor) return hex.toUpperCase()
  const { hue, light, saturation } = rgbToHsl(red, green, blue)
  const base = Math.trunc(light * 20)
  for (let step = 1; step <= 20; step += 1) {
    const next = (base + step) / 20
    if (next > 1) return '#FFFFFF'
    const [liftedRed, liftedGreen, liftedBlue] = hslToRgb(hue, next, saturation)
    const roundedRed = Math.min(255, Math.max(0, Math.round(liftedRed)))
    const roundedGreen = Math.min(255, Math.max(0, Math.round(liftedGreen)))
    const roundedBlue = Math.min(255, Math.max(0, Math.round(liftedBlue)))
    if (contrast(roundedRed, roundedGreen, roundedBlue) >= contrastFloor) {
      return hexOf(roundedRed, roundedGreen, roundedBlue)
    }
  }
  return '#FFFFFF'
}

function nearHalf(value: number) {
  return Math.abs(value - Math.floor(value) - 0.5) < 1e-6
}

function liftBoundary(hex: string) {
  const red = parseChannel(hex, 1)
  const green = parseChannel(hex, 3)
  const blue = parseChannel(hex, 5)
  if (contrast(red, green, blue) >= contrastFloor) return false
  const { hue, light, saturation } = rgbToHsl(red, green, blue)
  const base = Math.trunc(light * 20)
  let previous = 0
  for (let step = 1; step <= 20; step += 1) {
    const next = (base + step) / 20
    if (next > 1) return false
    const [liftedRed, liftedGreen, liftedBlue] = hslToRgb(hue, next, saturation)
    const roundedRed = Math.min(255, Math.max(0, Math.round(liftedRed)))
    const roundedGreen = Math.min(255, Math.max(0, Math.round(liftedGreen)))
    const roundedBlue = Math.min(255, Math.max(0, Math.round(liftedBlue)))
    const reached = contrast(roundedRed, roundedGreen, roundedBlue)
    if (reached < contrastFloor) {
      previous = reached
      continue
    }
    const half = [liftedRed, liftedGreen, liftedBlue].some(nearHalf)
    return half || (previous >= earlyContrast && previous < contrastFloor)
  }
  return false
}

function lightness(hex: string) {
  return rgbToHsl(parseChannel(hex, 1), parseChannel(hex, 3), parseChannel(hex, 5)).light
}

export function colorChoice(day: string, night: string) {
  const lifted = themeColor(day)
  const stable = contrast(
    parseChannel(night, 1),
    parseChannel(night, 3),
    parseChannel(night, 5),
  ) >= stableContrast
  const close = lightness(night) - lightness(day) <= closeLightness
  if (lifted === night && stable && liftBoundary(day) && close) return night
  if (lifted === night) return day
  return night
}
