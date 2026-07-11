import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'

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
import { handlebookmarkdelete } from './bookmark/delete'
import { handleeditorbookmarkscroll } from './bookmark/editorscroll'
import { handlebookmarkscroll } from './bookmark/scroll'
import { handlebookmarkurlnavigate } from './bookmark/urlnavigate'
import { handlebookmarkurlsave } from './bookmark/urlsave'
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
import { handletoken } from './storage'
import { handlechat, handlelog, handletoast, handleworkstatus } from './tape'
import { handleterminalclose } from './terminal/close'
import { handleterminalfull } from './terminal/full'
import { handleterminalinclayout } from './terminal/inclayout'
import { handleterminalopen } from './terminal/open'
import { handleterminalquickopen } from './terminal/quickopen'
import { handleterminaltoggle } from './terminal/toggle'
import { handleattach as handlewanixattach } from './wanix/attach'
import { handlewanixcells } from './wanix/cells'
import { handledetach as handlewanixdetach } from './wanix/detach'
import { handleexportstate as handlewanixexportstate } from './wanix/exportstate'
import { handleimportresult as handlewaniximportresult } from './wanix/importresult'
import { handlerequestzedcafestate } from './wanix/requestzedcafestate'
import { handlewanixsession } from './wanix/session'
import { handleshow as handlewanixshow } from './wanix/show'
import { handlestop as handlewanixstop } from './wanix/stop'
import { handletermdump as handlewanixtermdump } from './wanix/termdump'
import { handletermstatus as handlewanixtermstatus } from './wanix/termstatus'
import { handlevmstart as handlewanixvmstart } from './wanix/vmstart'
import { handlevmstop as handlewanixvmstop } from './wanix/vmstop'

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
  'wanix:show': handlewanixshow,
  'wanix:attach': handlewanixattach,
  'wanix:detach': handlewanixdetach,
  'wanix:term-dump': handlewanixtermdump,
  'wanix:term-status': handlewanixtermstatus,
  'wanix:requestzedcafestate': handlerequestzedcafestate,
  'wanix:export-state': handlewanixexportstate,
  'wanix:import-result': handlewaniximportresult,
  'wanix:stop': handlewanixstop,
  'wanix:vm-start': handlewanixvmstart,
  'wanix:vm-stop': handlewanixvmstop,
  'wanix:cells': handlewanixcells,
  'wanix:session': handlewanixsession,
}
