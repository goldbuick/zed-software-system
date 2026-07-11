import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'

import { handleattach } from './attach'
import { handlewanixcells } from './cells'
import { handledetach } from './detach'
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
  'term-dump': handletermdump,
  'term-status': handletermstatus,
  requestzedcafestate: handlerequestzedcafestate,
  'export-state': handleexportstate,
  'import-result': handleimportresult,
  stop: handlestop,
  'vm-start': handlevmstart,
  'vm-stop': handlevmstop,
  cells: handlewanixcells,
  session: handlewanixsession,
}
