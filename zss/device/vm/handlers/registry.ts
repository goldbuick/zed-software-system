import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'

import { handleadmin } from './admin'
import {
  handlelocal,
  handlelogin,
  handlelogout,
  handleplayertoken,
  handlesearch,
} from './auth'
import { handlebookmarkscroll } from './bookmarkscroll'
import { handlebooks } from './books'
import { handlecli, handleclirepeatlast } from './cli'
import { handlecodepagesnapshot } from './codepagesnapshot'
import { handlecoderelease, handlecodewatch } from './codewatch'
import { handledefault } from './default'
import { handledoot } from './doot'
import { handleflush } from './flush'
import { handlefork } from './fork'
import { handlehalt } from './halt'
import { handleinput } from './input'
import { handlefindany, handleinspect } from './inspect'
import { handlelastinputtouch } from './lastinputtouch'
import { handleloader } from './loader'
import { handlelook } from './look'
import { handlequery } from './query'
import { handleoperator } from './operator'
import { handlepilotclear, handlepilotstart, handlepilotstop } from './pilot'
import { handlepublish } from './publish'
import { handlerestart } from './restart'
import {
  handleclearscroll,
  handlemakeitscroll,
  handlerefscroll,
} from './scroll'
import { handlesecond } from './second'
import { handletick } from './tick'
import { handletopic } from './topic'
import { handlereadzipfilelist } from './zipfile'
import { handlezsswords } from './zsswords'
import { handlezztrandom, handlezztsearch } from './zzt'

export type VM_HANDLER = (vm: DEVICE, message: MESSAGE) => void

export const vmhandlers: Record<string, VM_HANDLER> = {
  operator: handleoperator,
  topic: handletopic,
  admin: handleadmin,
  zsswords: handlezsswords,
  books: handlebooks,
  search: handlesearch,
  logout: handlelogout,
  login: handlelogin,
  playertoken: handleplayertoken,
  local: handlelocal,
  doot: handledoot,
  input: handleinput,
  lastinputtouch: handlelastinputtouch,
  look: handlelook,
  query: handlequery,
  pilotclear: handlepilotclear,
  pilotstart: handlepilotstart,
  pilotstop: handlepilotstop,
  codewatch: handlecodewatch,
  coderelease: handlecoderelease,
  clearscroll: handleclearscroll,
  halt: handlehalt,
  tick: handletick,
  second: handlesecond,
  makeitscroll: handlemakeitscroll,
  refscroll: handlerefscroll,
  readzipfilelist: handlereadzipfilelist,
  fork: handlefork,
  zztsearch: handlezztsearch,
  zztrandom: handlezztrandom,
  publish: handlepublish,
  flush: handleflush,
  bookmarkscroll: handlebookmarkscroll,
  codepagesnapshot: handlecodepagesnapshot,
  cli: handlecli,
  clirepeatlast: handleclirepeatlast,
  restart: handlerestart,
  inspect: handleinspect,
  findany: handlefindany,
  loader: handleloader,
}

export { handledefault as vmdefaulthandler }
