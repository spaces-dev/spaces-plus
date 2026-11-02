import { afterEach, describe, expect, it } from 'vitest'
import { themeColor } from './color'
import { toSource } from './to-source'

describe('theme color', () => {
  it('keeps a color that already clears the dark background', () => {
    expect(themeColor('#90CAF9')).toBe('#90CAF9')
    expect(themeColor('#A5D6A7')).toBe('#A5D6A7')
    expect(themeColor('#FFCC80')).toBe('#FFCC80')
    expect(themeColor('#ECF0F1')).toBe('#ECF0F1')
  })

  it('lifts a dark color in steps of lightness', () => {
    expect(themeColor('#EF6C00')).toBe('#FF8F33')
    expect(themeColor('#3A474C')).toBe('#9AABB2')
    expect(themeColor('#FF0000')).toBe('#FF8080')
    expect(themeColor('#852BD9')).toBe('#C193EC')
    expect(themeColor('#149F90')).toBe('#1ACCB9')
  })
})

function ruled(html: string, rule: string) {
  const style = document.createElement('style')
  style.textContent = rule
  document.head.append(style)
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.append(root)
  return () => {
    style.remove()
    root.remove()
  }
}

function painted(html: string, rule: string) {
  document.documentElement.classList.add('root--theme-dark')
  const restore = ruled(html, rule)
  return () => {
    restore()
    document.documentElement.classList.remove('root--theme-dark')
  }
}

describe('copied color', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.classList.remove('root--theme-dark')
  })

  it('keeps the saved color when the theme lifts it to the same shade', () => {
    const restore = painted(
      '<span class="t-ff0000" style="color:#FF0000">x</span>',
      '.root--theme-dark .t-ff0000 { color: #FF8080 !important }',
    )
    try {
      expect(toSource(document.body)).toBe('[color=#FF0000]x[/color]')
    } finally {
      restore()
    }
  })

  it('keeps the night color the current lift would not rebuild', () => {
    const restore = painted(
      '<span class="t-149f90" style="color:#149F90">x</span>',
      '.root--theme-dark .t-149f90 { color: #96F2E8 !important }',
    )
    try {
      expect(toSource(document.body)).toBe('[color=#96F2E8]x[/color]')
    } finally {
      restore()
    }
  })

  it('keeps the night color when the lift stops a step early', () => {
    const restore = ruled(
      '<span class="t-c5a9ef" style="color:#9A68E3">x</span>',
      '.t-c5a9ef { color: #C5A9EF !important }',
    )
    try {
      expect(toSource(document.body)).toBe('[color=#C5A9EF]x[/color]')
    } finally {
      restore()
    }
  })

  it('keeps the night color when the last channel lands on a half', () => {
    const restore = ruled(
      '<span class="t-8bb2f3" style="color:#4683EC">x</span>',
      '.t-8bb2f3 { color: #8BB2F3 !important }',
    )
    try {
      expect(toSource(document.body)).toBe('[color=#8BB2F3]x[/color]')
    } finally {
      restore()
    }
  })

  it('keeps the day color of a lift that still matches', () => {
    const purple = ruled(
      '<span class="t-852bd9" style="color:#852BD9">x</span>',
      '.t-852bd9 { color: #C193EC !important }',
    )
    try {
      expect(toSource(document.body)).toBe('[color=#852BD9]x[/color]')
    } finally {
      purple()
    }
    const orange = ruled(
      '<span class="t-bc6f10" style="color:#BC6F10">x</span>',
      '.t-bc6f10 { color: #ED962C !important }',
    )
    try {
      expect(toSource(document.body)).toBe('[color=#BC6F10]x[/color]')
    } finally {
      orange()
    }
  })

  it('keeps the day color when the lift climbs more than three steps', () => {
    const restore = ruled(
      '<span class="t-caa6f2" style="color:#621AB2">x</span>',
      '.t-caa6f2 { color: #CAA6F2 !important }',
    )
    try {
      expect(toSource(document.body)).toBe('[color=#621AB2]x[/color]')
    } finally {
      restore()
    }
  })

  it('keeps the day color when a high lift is not on the boundary', () => {
    const restore = ruled(
      '<span class="t-923ef0" style="color:#923EF0">x</span>',
      '.t-923ef0 { color: #CAA0F8 !important }',
    )
    try {
      expect(toSource(document.body)).toBe('[color=#923EF0]x[/color]')
    } finally {
      restore()
    }
  })

  it('keeps a background the theme paints differently', () => {
    const restore = painted(
      '<span class="t-316895" style="background-color:#316895">1</span>',
      '.root--theme-dark .t-316895 { background-color: #79AAD3 !important }',
    )
    try {
      expect(toSource(document.body)).toBe('[fon=#316895]1[/fon]')
    } finally {
      restore()
    }
  })
})
