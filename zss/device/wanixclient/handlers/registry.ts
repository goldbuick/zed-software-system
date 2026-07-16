import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'

import { handleagentexporttree } from './agentexporttree'
import { handleagentexportwrite } from './agentexportwrite'
import { handleapplyroom } from './applyroom'
import { handlebinddrop } from './binddrop'
import { handlewanixcells } from './cells'
import { handledropdone } from './dropdone'
import { handleexportready } from './exportready'
import { handleexportstate } from './exportstate'
import { handleidle } from './idle'
import { handleimportresult } from './importresult'
import { handleiszedcafeexportlive } from './iszedcafeexportlive'
import { handlemenu } from './menu'
import { handleping } from './ping'
import { handleready } from './ready'
import { handlereadfile } from './readfile'
import { handlereadzedcafeexportfiles } from './readzedcafeexportfiles'
import { handlereadzedcafetaskrid } from './readzedcafetaskrid'
import { handlerequestzedcafestate } from './requestzedcafestate'
import { handlewanixsession } from './session'
import { handlespawntask } from './spawntask'
import { handlesynczedcafeexport } from './synczedcafeexport'
import { handlezedcafefilechange } from './zedcafefilechange'

export type WANIXCLIENT_HANDLER = (device: DEVICE, message: MESSAGE) => void

export const wanixclienthandlers: Record<string, WANIXCLIENT_HANDLER> = {
  ready: handleready,
  idle: handleidle,
  exportready: handleexportready,
  ping: handleping,
  menu: handlemenu,
  applyroom: handleapplyroom,
  spawntask: handlespawntask,
  binddrop: handlebinddrop,
  dropdone: handledropdone,
  synczedcafeexport: handlesynczedcafeexport,
  readzedcafeexportfiles: handlereadzedcafeexportfiles,
  readzedcafetaskrid: handlereadzedcafetaskrid,
  iszedcafeexportlive: handleiszedcafeexportlive,
  requestzedcafestate: handlerequestzedcafestate,
  exportstate: handleexportstate,
  importresult: handleimportresult,
  readfile: handlereadfile,
  cells: handlewanixcells,
  session: handlewanixsession,
  zedcafefilechange: handlezedcafefilechange,
  agentexporttree: handleagentexporttree,
  agentexportwrite: handleagentexportwrite,
}
