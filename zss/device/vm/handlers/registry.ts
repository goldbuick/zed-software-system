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
import { handleboardrunnerack } from './boardrunnerack'
import { handleboardrunnerdesync } from './boardrunnerdesync'
import { handleboardrunnerpatch } from './boardrunnerpatch'
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
import { handlelastinputtouch } from './lastinputtouch'
import { handleloader } from './loader'
import { handleoperator } from './operator'
import { handlepage } from './page'
import { handlepilotclear, handlepilotstart, handlepilotstop } from './pilot'
import { handleplayermovetoboard } from './playermovetoboard'
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
  operator: handleoperator,
  topic: handletopic,
  admin: handleadmin,
  zsswords: handlezsswords,
  books: handlebooks,
  page: handlepage,
  search: handlesearch,
  logout: handlelogout,
  login: handlelogin,
  playertoken: handleplayertoken,
  local: handlelocal,
  doot: handledoot,
  input: handleinput,
  lastinputtouch: handlelastinputtouch,
  query: handlequery,
  pullvarresult: handlepullvarresult,
  pilotclear: handlepilotclear,
  pilotstart: handlepilotstart,
  pilotstop: handlepilotstop,
  codewatch: handlecodewatch,
  coderelease: handlecoderelease,
  clearscroll: handleclearscroll,
  halt: handlehalt,
  ticktock: handleticktock,
  boardrunnerack: handleboardrunnerack,
  boardrunnerpatch: handleboardrunnerpatch,
  playermovetoboard: handleplayermovetoboard,
  desync: handleboardrunnerdesync,
  second: handlesecond,
  makeitscroll: handlemakeitscroll,
  refscroll: handlerefscroll,
  gadgetscroll: handlegadgetscroll,
  readzipfilelist: handlereadzipfilelist,
  fork: handlefork,
  zztsearch: handlezztsearch,
  zztrandom: handlezztrandom,
  publish: handlepublish,
  flush: handleflush,
  bookmarkscroll: handlebookmarkscroll,
  editorbookmarkscroll: handleeditorbookmarkscroll,
  cli: handlecli,
  clirepeatlast: handleclirepeatlast,
  restart: handlerestart,
  inspect: handleinspect,
  findany: handlefindany,
  loader: handleloader,
}
