import type { Settings } from '@/types/settings'
import { toggleId } from '@/types/toggles'

const toggle = toggleId satisfies Record<string, keyof Settings>

export interface SettingsSection {
  title: string
  ids: readonly (keyof Settings)[]
}

export const settingsSections: SettingsSection[] = [
  {
    title: 'Контент',
    ids: [
      toggle.comments,
      toggle.readers,
      toggle.copySource,
      toggle.favorite,
      toggle.profileBypass,
    ],
  },
  {
    title: 'Интерфейс',
    ids: [
      toggle.oldHeader,
      toggle.redirect,
      toggle.scroll,
      toggle.rightbar,
    ],
  },
  {
    title: 'Медиа',
    ids: [
      toggle.player,
      toggle.gallery,
      toggle.playback,
      toggle.flashPlayer,
    ],
  },
  {
    title: 'Сбор',
    ids: [
      toggle.coins,
      toggle.karma,
    ],
  },
]

export const groupedOptionIds = [
  toggle.friends,
  toggle.background,
  toggle.weather,
  toggle.recents,
] as const

const grouped = new Set<string>(groupedOptionIds)

export const isGroupedOption = (id: string) => grouped.has(id)
