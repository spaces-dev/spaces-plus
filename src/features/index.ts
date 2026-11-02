import { baseStyles } from './base-styles'
import { bodyStyle } from './bodystyle'
import { checkUpdates } from './check-updates'
import { coins } from './coins'
import { copySource } from './copy-source'
import { deleteComments } from './delete-comments'
import { deleteReaders } from './delete-readers'
import { disableRedirect } from './disable-redirect'
import { favoriteUser } from './favorite-user'
import { firstLaunch } from './first-launch'
import { flashPlayer } from './flash-player'
import { friendsOnline } from './friends-online'
import { galleryRotate } from './gallery-rotate'
import { halloween } from './halloween/halloween'
import { hiddenProfile } from './hidden-profile'
import { hiddenRightbar } from './hidden-rightbar'
import { karma } from './karma'
import { newYear } from './new-year'
import { oldHeader } from './old-header'
import { playerDownload } from './player-download'
import { recentSmiles } from './recent-smiles'
import { scrollMove } from './scroll-move'
import { createSettingsPage } from './settings/page'
import { sidebarButton } from './sidebar-button'
import { videoSpeed } from './video-speed'
import { weatherWidget } from './weather'

const configurable = [
  deleteReaders,
  deleteComments,
  copySource,
  oldHeader,
  playerDownload,
  disableRedirect,
  coins,
  scrollMove,
  hiddenRightbar,
  favoriteUser,
  hiddenProfile,
  galleryRotate,
  karma,
  videoSpeed,
  flashPlayer,
  recentSmiles,
  friendsOnline,
  bodyStyle,
  weatherWidget,
]

export const features = [
  baseStyles,
  ...configurable,
  checkUpdates,
  sidebarButton,
  firstLaunch,
  halloween,
  newYear,
  createSettingsPage(configurable),
]
