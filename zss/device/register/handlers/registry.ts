import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'

import {
  handleairsharepayload,
  handleairsharereceive,
  handleairsharesend,
  handleairsharestop,
  handleairsharestream,
} from './airshare'
import {
  handleacklogin,
  handleackoperator,
  handleackzsswords,
  handleloginready,
  handlesessionreset,
} from './auth'
import { handlebookmarkclirun } from './bookmark/clirun'
import { handlebookmarkclisave } from './bookmark/clisave'
import { handlebookmarkcodepagecopytogame } from './bookmark/codepagecopytogame'
import { handlebookmarkcodepagesave } from './bookmark/codepagesave'
import { handlebookmarkcodepagesaveover } from './bookmark/codepagesaveover'
import { handlebookmarkcontentsave } from './bookmark/contentsave'
import { handlebookmarkdelete } from './bookmark/delete'
import { handleeditorbookmarkscroll } from './bookmark/editorscroll'
import { handlebookmarkscroll } from './bookmark/scroll'
import { handlebookmarkurlnavigate } from './bookmark/urlnavigate'
import { handlebookmarkurlsave } from './bookmark/urlsave'
import { handlebookmarkurlsaveover } from './bookmark/urlsaveover'
import { handlecontentcrosslogin } from './contentcrosslogin'
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
import { handlejoincrosslogin } from './joincrosslogin'
import {
  handleforkmem,
  handlenuke,
  handlepublishmem,
  handlesavemem,
} from './memory'
import {
  handlememoryfsattach,
  handlememoryfsdetach,
  handlememoryfsstatus,
  handlememoryfswrite,
} from './memoryfs'
import { handleready } from './ready'
import { handlesecond } from './second'
import { handlestickyuser, handlestickyvoice, handletoken } from './storage'
import { handlechat, handlelog, handletoast, handleworkstatus } from './tape'
import { handleterminalclose } from './terminal/close'
import { handleterminalfull } from './terminal/full'
import { handleterminalinclayout } from './terminal/inclayout'
import { handleterminalopen } from './terminal/open'
import { handleterminalquickopen } from './terminal/quickopen'
import { handleterminaltoggle } from './terminal/toggle'

export type REGISTER_HANDLER = (device: DEVICE, message: MESSAGE) => void

export const registerhandlers: Record<string, REGISTER_HANDLER> = {
  ready: handleready,
  sessionreset: handlesessionreset,
  ackoperator: handleackoperator,
  loginready: handleloginready,
  joincrosslogin: handlejoincrosslogin,
  contentcrosslogin: handlecontentcrosslogin,
  acklogin: handleacklogin,
  ackzsswords: handleackzsswords,
  bookmarkscroll: handlebookmarkscroll,
  editorbookmarkscroll: handleeditorbookmarkscroll,
  'bookmark:clisave': handlebookmarkclisave,
  'bookmark:clirun': handlebookmarkclirun,
  'bookmark:codepagesave': handlebookmarkcodepagesave,
  'bookmark:codepagesaveover': handlebookmarkcodepagesaveover,
  'bookmark:codepagecopytogame': handlebookmarkcodepagecopytogame,
  'bookmark:urlsave': handlebookmarkurlsave,
  'bookmark:urlsaveover': handlebookmarkurlsaveover,
  'bookmark:contentsave': handlebookmarkcontentsave,
  'bookmark:urlnavigate': handlebookmarkurlnavigate,
  'bookmark:delete': handlebookmarkdelete,
  input: handleinput,
  token: handletoken,
  stickyuser: handlestickyuser,
  stickyvoice: handlestickyvoice,
  copy: handlecopy,
  downloadjsonfile: handledownloadjsonfile,
  downloadbinaryfile: handledownloadbinaryfile,
  share: handleshare,
  airsharesend: handleairsharesend,
  airsharereceive: handleairsharereceive,
  airsharestop: handleairsharestop,
  airsharestream: handleairsharestream,
  airsharepayload: handleairsharepayload,
  screenshot: handlescreenshot,
  nuke: handlenuke,
  savemem: handlesavemem,
  forkmem: handleforkmem,
  publishmem: handlepublishmem,
  memoryfsattach: handlememoryfsattach,
  memoryfsdetach: handlememoryfsdetach,
  memoryfswrite: handlememoryfswrite,
  memoryfsstatus: handlememoryfsstatus,
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
