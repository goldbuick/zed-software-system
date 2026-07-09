import { createdevice } from 'zss/device'

import {
  type TICK_STATS_SNAPSHOT,
  mergeremotetickstats,
  snapshotlocalandreset,
} from './ticktimingstats'

const FLUSH_MS = 500

const ismainthread = typeof window !== 'undefined'

const perfreport = createdevice('perfreport', [], (message) => {
  if (!perfreport.session(message)) {
    return
  }
  switch (message.target) {
    case 'tickstats':
      if (ismainthread && message.data) {
        mergeremotetickstats(message.data as TICK_STATS_SNAPSHOT)
      }
      break
    default:
      break
  }
})

const PERF_DEV =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === true

if (PERF_DEV && !ismainthread) {
  setInterval(() => {
    const snap = snapshotlocalandreset()
    if (snap) {
      perfreport.emit('', 'perfreport:tickstats', snap)
    }
  }, FLUSH_MS)
}
