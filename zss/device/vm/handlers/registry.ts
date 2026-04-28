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
import { handlecoderelease, handlecodewatch } from './codewatch'
import { handledoot } from './doot'
import { handleeditorbookmarkscroll } from './editorbookmarkscroll'
import { handleflush } from './flush'
import { handlefork } from './fork'
import { handlehalt } from './halt'
import { handleinput } from './input'
import { handlefindany, handleinspect } from './inspect'
import { handlejsondiffsync } from './jsondiffsync'
import { handlelastinputtouch } from './lastinputtouch'
import { handleloader } from './loader'
import { handleoperator } from './operator'
import { handlepage } from './page'
import { handlepilotclear, handlepilotstart, handlepilotstop } from './pilot'
import { handlepublish } from './publish'
import { handlepullvarresult } from './pullvarresult'
import { handlequery } from './query'
import { handlerestart } from './restart'
import {
  handleclearscroll,
  handlegadgetscroll,
  handlemakeitscroll,
  handlerefscroll,
} from './scroll'
import { handlesecond } from './second'
import { handleticktock } from './ticktock'
import { handletopic } from './topic'
import { handlereadzipfilelist } from './zipfile'
import { handlezsswords } from './zsswords'
import { handlezztrandom, handlezztsearch } from './zzt'

export type VM_HANDLER = (vm: DEVICE, message: MESSAGE) => void

export const vmhandlers: Record<string, VM_HANDLER> = {
  admin: handleadmin,
  bookmarkscroll: handlebookmarkscroll,
  books: handlebooks,
  clearscroll: handleclearscroll,
  cli: handlecli,
  clirepeatlast: handleclirepeatlast,
  coderelease: handlecoderelease,
  codewatch: handlecodewatch,
  doot: handledoot,
  editorbookmarkscroll: handleeditorbookmarkscroll,
  findany: handlefindany,
  flush: handleflush,
  fork: handlefork,
  gadgetscroll: handlegadgetscroll,
  halt: handlehalt,
  input: handleinput,
  inspect: handleinspect,
  jsondiffsync: handlejsondiffsync,
  lastinputtouch: handlelastinputtouch,
  loader: handleloader,
  local: handlelocal,
  login: handlelogin,
  logout: handlelogout,
  makeitscroll: handlemakeitscroll,
  operator: handleoperator,
  page: handlepage,
  pilotclear: handlepilotclear,
  pilotstart: handlepilotstart,
  pilotstop: handlepilotstop,
  playertoken: handleplayertoken,
  publish: handlepublish,
  pullvarresult: handlepullvarresult,
  query: handlequery,
  readzipfilelist: handlereadzipfilelist,
  refscroll: handlerefscroll,
  restart: handlerestart,
  search: handlesearch,
  second: handlesecond,
  ticktock: handleticktock,
  topic: handletopic,
  zztrandom: handlezztrandom,
  zztsearch: handlezztsearch,
  zsswords: handlezsswords,
}
