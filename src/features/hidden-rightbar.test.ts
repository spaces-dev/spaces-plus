import { afterEach, describe, expect, it, vi } from 'vitest'
import { siteCheckbox } from '@/core/checkbox'
import { setSetting, settingEnabled } from '@/core/settings-store'
import { toggleId } from '@/types/toggles'
import { hiddenRightbar } from './hidden-rightbar'
import { weatherOptionsId } from './weather/constants'

vi.mock('@/core/modals', () => ({
  modalMessage: vi.fn(),
  notice: { close: true, timer: 5 },
}))

describe('hidden rightbar', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    setSetting(toggleId.weather, false)
    setSetting(toggleId.rightbar, false)
  })

  it('drops the checked class on the weather checkbox', () => {
    setSetting(toggleId.weather, true)
    const { input, label } = siteCheckbox(toggleId.weather, true)
    const options = document.createElement('div')
    options.id = weatherOptionsId
    document.body.append(label, options)

    hiddenRightbar.onToggle?.(true)

    expect(settingEnabled(toggleId.weather)).toBe(false)
    expect(input.checked).toBe(false)
    expect(label.classList.contains('form-checkbox_checked')).toBe(false)
    expect(document.getElementById(weatherOptionsId)).toBeNull()
  })
})
