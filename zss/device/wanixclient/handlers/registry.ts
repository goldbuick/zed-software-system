import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'

import { handleattach } from './attach'
import { handlebinddrop } from './binddrop'
import { handlewanixcells } from './cells'
import { handledetach } from './detach'
import { handledrop } from './drop'
import { handleexportstate } from './exportstate'
import { handleimportresult } from './importresult'
import { handlerequestzedcafestate } from './requestzedcafestate'
import { handlewanixsession } from './session'
import { handleshow } from './show'
import { handlestop } from './stop'
import { handletermdump } from './termdump'
import { handletermstatus } from './termstatus'
import { handlevmstart } from './vmstart'
import { handlevmstop } from './vmstop'

export type WANIXCLIENT_HANDLER = (device: DEVICE, message: MESSAGE) => void

export const wanixclienthandlers: Record<string, WANIXCLIENT_HANDLER> = {
  show: handleshow,
  attach: handleattach,
  detach: handledetach,
  drop: handledrop,
  binddrop: handlebinddrop,
  termdump: handletermdump,
  termstatus: handletermstatus,
  requestzedcafestate: handlerequestzedcafestate,
  exportstate: handleexportstate,
  importresult: handleimportresult,
  stop: handlestop,
  vmstart: handlevmstart,
  vmstop: handlevmstop,
  cells: handlewanixcells,
  session: handlewanixsession,
}
