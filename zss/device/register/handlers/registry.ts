import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'

import {
  handleacklogin,
  handleackoperator,
  handleackzsswords,
  handleloginready,
  handlesessionreset,
} from './auth'
import {
  handlebookmarkclirun,
  handlebookmarkclisave,
  handlebookmarkcodepagecopytogame,
  handlebookmarkcodepagesave,
  handlebookmarkdelete,
  handlebookmarkscroll,
  handlebookmarkurlnavigate,
  handlebookmarkurlsave,
  handleeditorbookmarkscroll,
} from './bookmarks'
import { handleeditorclose, handleeditoropen } from './editor'
import {
  handlecopy,
  handledownloadbinaryfile,
  handledownloadjsonfile,
  handlescreenshot,
  handleshare,
} from './files'
import { handleinput } from './input'
import { handlefindany, handleinspector, handleperfmonitor } from './inspector'
import {
  handleforkmem,
  handlenuke,
  handlepublishmem,
  handlesavemem,
} from './memory'
import { handleready } from './ready'
import { handlesecond } from './second'
import { handlepullvar, handlestore, handletoken } from './storage'
import { handlechat, handlelog, handletoast, handleworkstatus } from './tape'
import {
  handleterminalclose,
  handleterminalfull,
  handleterminalinclayout,
  handleterminalopen,
  handleterminalquickopen,
  handleterminaltoggle,
} from './terminal'

export type REGISTER_HANDLER = (device: DEVICE, message: MESSAGE) => void

export const registerhandlers: Record<string, REGISTER_HANDLER> = {
  ready: handleready,
  sessionreset: handlesessionreset,
  ackoperator: handleackoperator,
  loginready: handleloginready,
  acklogin: handleacklogin,
  ackzsswords: handleackzsswords,
  bookmarkscroll: handlebookmarkscroll,
  editorbookmarkscroll: handleeditorbookmarkscroll,
  'bookmark:clisave': handlebookmarkclisave,
  'bookmark:clirun': handlebookmarkclirun,
  'bookmark:codepagesave': handlebookmarkcodepagesave,
  'bookmark:codepagecopytogame': handlebookmarkcodepagecopytogame,
  'bookmark:urlsave': handlebookmarkurlsave,
  'bookmark:urlnavigate': handlebookmarkurlnavigate,
  'bookmark:delete': handlebookmarkdelete,
  input: handleinput,
  store: handlestore,
  pullvar: handlepullvar,
  token: handletoken,
  copy: handlecopy,
  downloadjsonfile: handledownloadjsonfile,
  downloadbinaryfile: handledownloadbinaryfile,
  share: handleshare,
  screenshot: handlescreenshot,
  nuke: handlenuke,
  savemem: handlesavemem,
  forkmem: handleforkmem,
  publishmem: handlepublishmem,
  second: handlesecond,
  inspector: handleinspector,
  perfmonitor: handleperfmonitor,
  findany: handlefindany,
  log: handlelog,
  chat: handlechat,
  toast: handletoast,
  workstatus: handleworkstatus,
  'terminal:full': handleterminalfull,
  'terminal:open': handleterminalopen,
  'terminal:quickopen': handleterminalquickopen,
  'terminal:close': handleterminalclose,
  'terminal:toggle': handleterminaltoggle,
  'terminal:inclayout': handleterminalinclayout,
  'editor:open': handleeditoropen,
  'editor:close': handleeditorclose,
}
