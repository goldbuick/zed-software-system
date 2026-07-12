import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'

import { handleapplyroom } from './applyroom'
import { handlebinddrop } from './binddrop'
import { handlewanixcells } from './cells'
import { handledropdone } from './dropdone'
import { handleexportready } from './exportready'
import { handleexportstate } from './exportstate'
import { handleidle } from './idle'
import { handleimportresult } from './importresult'
import { handleiszedcafeexportlive } from './iszedcafeexportlive'
import { handleping } from './ping'
import { handlereadroomstatus } from './readroomstatus'
import { handlereadvmstatus } from './readvmstatus'
import { handleready } from './ready'
import { handlereadzedcafeexportfiles } from './readzedcafeexportfiles'
import { handlereadzedcafetaskrid } from './readzedcafetaskrid'
import { handlerequestzedcafestate } from './requestzedcafestate'
import { handlewanixsession } from './session'
import { handlespawntask } from './spawntask'
import { handlesynczedcafeexport } from './synczedcafeexport'

export type WANIXCLIENT_HANDLER = (device: DEVICE, message: MESSAGE) => void

export const wanixclienthandlers: Record<string, WANIXCLIENT_HANDLER> = {
  ready: handleready,
  idle: handleidle,
  exportready: handleexportready,
  ping: handleping,
  applyroom: handleapplyroom,
  spawntask: handlespawntask,
  binddrop: handlebinddrop,
  dropdone: handledropdone,
  readroomstatus: handlereadroomstatus,
  readvmstatus: handlereadvmstatus,
  synczedcafeexport: handlesynczedcafeexport,
  readzedcafeexportfiles: handlereadzedcafeexportfiles,
  readzedcafetaskrid: handlereadzedcafetaskrid,
  iszedcafeexportlive: handleiszedcafeexportlive,
  requestzedcafestate: handlerequestzedcafestate,
  exportstate: handleexportstate,
  importresult: handleimportresult,
  cells: handlewanixcells,
  session: handlewanixsession,
}
