import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'

import { handleapplyroom } from './applyroom'
import { handlebinddrop } from './binddrop'
import { handledrop } from './drop'
import { handlehalttask } from './halttask'
import { handlehaltzedcafe } from './haltzedcafe'
import { handleiszedcafeexportlive } from './iszedcafeexportlive'
import { handleiszedcafeguestbound } from './iszedcafeguestbound'
import { handlelistdir } from './listdir'
import { handlemenu } from './menu'
import { handleping } from './ping'
import { handlereadfile } from './readfile'
import { handlereadready } from './readready'
import { handlereadroomstatus } from './readroomstatus'
import { handlereadtext } from './readtext'
import { handlereadvmstatus } from './readvmstatus'
import { handlereadzedcafeexportfiles } from './readzedcafeexportfiles'
import { handlereadzedcafetaskrid } from './readzedcafetaskrid'
import { handlerequestzedcafestate } from './requestzedcafestate'
import { handlesetzedcafeready } from './setzedcafeready'
import { handlespawntask } from './spawntask'
import { handlestartvm } from './startvm'
import { handlestoproom } from './stoproom'
import { handlestopvm } from './stopvm'
import { handlesynczedcafeexport } from './synczedcafeexport'
import { handletermfit } from './termfit'
import { handletermwrite } from './termwrite'
import { handlewritefile } from './writefile'

export type WANIX_HANDLER = (wanix: DEVICE, message: MESSAGE) => void

export const wanixhandlers: Record<string, WANIX_HANDLER> = {
  ping: handleping,
  menu: handlemenu,
  readready: handlereadready,
  readroomstatus: handlereadroomstatus,
  readvmstatus: handlereadvmstatus,
  applyroom: handleapplyroom,
  spawntask: handlespawntask,
  halttask: handlehalttask,
  stoproom: handlestoproom,
  startvm: handlestartvm,
  stopvm: handlestopvm,
  listdir: handlelistdir,
  readtext: handlereadtext,
  readfile: handlereadfile,
  writefile: handlewritefile,
  binddrop: handlebinddrop,
  drop: handledrop,
  termwrite: handletermwrite,
  termfit: handletermfit,
  setzedcafeready: handlesetzedcafeready,
  haltzedcafe: handlehaltzedcafe,
  readzedcafetaskrid: handlereadzedcafetaskrid,
  readzedcafeexportfiles: handlereadzedcafeexportfiles,
  synczedcafeexport: handlesynczedcafeexport,
  iszedcafeexportlive: handleiszedcafeexportlive,
  iszedcafeguestbound: handleiszedcafeguestbound,
  requestzedcafestate: handlerequestzedcafestate,
}
