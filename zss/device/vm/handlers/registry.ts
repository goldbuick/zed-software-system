import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { handlegadgetdesync } from 'zss/device/vm/gadgetsynctick'

import { handleadmin } from './admin'
import { handleairshare } from './airshare'
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
import { handlereadimageimport } from './imageimport'
import { handleinput } from './input'
import { handlefindany, handleinspect } from './inspect'
import { handlelastinputtouch } from './lastinputtouch'
import { handleloader } from './loader'
import {
  handlememoryfsapply,
  handlememoryfsattached,
  handlememoryfsdetached,
} from './memoryfs'
import { handleoperator } from './operator'
import { handlepage } from './page'
import { handleplayergotoboard } from './playergotoboard'
import { handleplayermovetoboard } from './playermovetoboard'
import { handlepublish } from './publish'
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
  codewatch: handlecodewatch,
  coderelease: handlecoderelease,
  clearscroll: handleclearscroll,
  gadgetdesync: handlegadgetdesync,
  halt: handlehalt,
  ticktock: handleticktock,
  playermovetoboard: handleplayermovetoboard,
  playergotoboard: handleplayergotoboard,
  second: handlesecond,
  makeitscroll: handlemakeitscroll,
  refscroll: handlerefscroll,
  gadgetscroll: handlegadgetscroll,
  readzipfilelist: handlereadzipfilelist,
  readimageimport: handlereadimageimport,
  fork: handlefork,
  zztsearch: handlezztsearch,
  zztrandom: handlezztrandom,
  publish: handlepublish,
  flush: handleflush,
  airshare: handleairshare,
  bookmarkscroll: handlebookmarkscroll,
  editorbookmarkscroll: handleeditorbookmarkscroll,
  cli: handlecli,
  clirepeatlast: handleclirepeatlast,
  restart: handlerestart,
  inspect: handleinspect,
  findany: handlefindany,
  loader: handleloader,
  memoryfsattached: handlememoryfsattached,
  memoryfsdetached: handlememoryfsdetached,
  memoryfsapply: handlememoryfsapply,
}
