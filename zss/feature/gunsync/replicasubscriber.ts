/** Sim-side: coerce Gun `replica` subtree into MEMORY (debounced); hub ingress drives boardrunner via GunsyncPayload on the mesh. */
import type { DEVICE } from 'zss/device'
import type { GunsyncReplica } from 'zss/feature/gunsync/replica'
import {
  gunsyncapplyfromwire,
  gunsyncapplyreplica,
  gunsyncbumpversion,
  gunsynccapture,
  gunsyncpayloadfromreplica,
  gunsyncreplicaisempty,
  gunsyncroomkey,
  gunsynclocalhashubcontent,
  gunsyncwithapplyingfromgun,
} from 'zss/feature/gunsync/replica'
import { ispresent } from 'zss/mapping/types'
import { BOOK } from 'zss/memory/types'

import { gunsyncbookfromgraphvalue } from './graphvalue'
import { gunsmeshpushwireframetograph, gunsyncconsumewirenotifyaftersuccessfulapply } from './hubgunwire'
import { roomgun } from './roommirror'

/** `gunmesh:memory` allowed shapes: opaque string or multiplex wrapper. */
export function gunsyncparsesimmeshwire(raw: unknown): string | undefined {
  if (typeof raw === 'string') {
    return raw
  }
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const p = (raw as { payload?: unknown }).payload
    if (typeof p === 'string') {
      return p
    }
  }
  return undefined
}

function leaftostring(v: unknown): string {
  if (typeof v === 'string') {
    return v
  }
  if (v === null || v === undefined) {
    return ''
  }
  if (typeof v === 'number' || typeof v === 'boolean') {
    return String(v)
  }
  return ''
}

function leaftoboolean(v: unknown): boolean {
  if (typeof v === 'boolean') {
    return v
  }
  if (typeof v === 'number') {
    return v !== 0
  }
  if (typeof v === 'string') {
    return v === 'true' || v === '1'
  }
  return false
}

function snapshotstaging(): GunsyncReplica {
  return {
    operator: staging.operator,
    topic: staging.topic,
    session: staging.session,
    halt: staging.halt,
    simfreeze: staging.simfreeze,
    software: { ...staging.software },
    books: JSON.parse(JSON.stringify(staging.books)) as Record<string, BOOK>,
  }
}

const staging: GunsyncReplica = {
  operator: '',
  topic: '',
  session: '',
  halt: false,
  simfreeze: false,
  software: { main: '', temp: '' },
  books: {},
}

let subscribedroom = ''
let simdevice: DEVICE | undefined
let flushpending = false
let lastgunmeshplayer = ''

/** Unsubscribe handles (Gun chains `.off()`). */
const boundoff: Array<() => void> = []

function clearreplicabindings(): void {
  for (let i = 0; i < boundoff.length; ++i) {
    boundoff[i]!()
  }
  boundoff.length = 0
}

function bindsubscribertoreplica(roomkey: string): void {
  if (subscribedroom === roomkey && boundoff.length > 0) {
    return
  }
  clearreplicabindings()
  subscribedroom = roomkey
  const replicate = roomgun.get('zss').get(roomkey).get('replica')

  const op = replicate.get('operator')
  op.on((data: unknown) => {
    staging.operator = leaftostring(data)
    schedulememoryflushfromgraph()
  })
  boundoff.push(() => {
    op.off()
  })

  const tp = replicate.get('topic')
  tp.on((data: unknown) => {
    staging.topic = leaftostring(data)
    schedulememoryflushfromgraph()
  })
  boundoff.push(() => {
    tp.off()
  })

  const sess = replicate.get('session')
  sess.on((data: unknown) => {
    staging.session = leaftostring(data)
    schedulememoryflushfromgraph()
  })
  boundoff.push(() => {
    sess.off()
  })

  const haltnode = replicate.get('halt')
  haltnode.on((data: unknown) => {
    staging.halt = leaftoboolean(data)
    schedulememoryflushfromgraph()
  })
  boundoff.push(() => {
    haltnode.off()
  })

  const simfnode = replicate.get('simfreeze')
  simfnode.on((data: unknown) => {
    staging.simfreeze = leaftoboolean(data)
    schedulememoryflushfromgraph()
  })
  boundoff.push(() => {
    simfnode.off()
  })

  const smain = replicate.get('software').get('main')
  smain.on((data: unknown) => {
    staging.software.main = leaftostring(data)
    schedulememoryflushfromgraph()
  })
  boundoff.push(() => {
    smain.off()
  })

  const stemp = replicate.get('software').get('temp')
  stemp.on((data: unknown) => {
    staging.software.temp = leaftostring(data)
    schedulememoryflushfromgraph()
  })
  boundoff.push(() => {
    stemp.off()
  })

  const books = replicate.get('books')
  const mapped = books.map()
  mapped.on((data: unknown, key: string) => {
    const id = String(key)
    if (id.length === 0) {
      return
    }
    if (!ispresent(data)) {
      delete staging.books[id]
      schedulememoryflushfromgraph()
      return
    }
    const book = gunsyncbookfromgraphvalue(data, id)
    if (book !== undefined) {
      staging.books[id] = book
    }
    schedulememoryflushfromgraph()
  })
  boundoff.push(() => {
    mapped.off()
  })
}

function schedulememoryflushfromgraph(): void {
  if (flushpending) {
    return
  }
  flushpending = true
  setTimeout(() => {
    flushpending = false
    syncmemoryfromreplicastaging()
  }, 0)
}

function syncmemoryfromreplicastaging(): void {
  const device = simdevice
  if (device === undefined) {
    return
  }
  const roomkey = gunsyncroomkey()
  if (!roomkey) {
    return
  }
  bindsubscribertoreplica(roomkey)
  const replica = snapshotstaging()
  if (gunsyncreplicaisempty(replica) && gunsynclocalhashubcontent()) {
    return
  }
  gunsyncwithapplyingfromgun(() => {
    gunsyncapplyreplica(replica)
  })
  const fromhubmesh = gunsyncconsumewirenotifyaftersuccessfulapply()
  if (fromhubmesh && lastgunmeshplayer !== '') {
    const payload = gunsyncpayloadfromreplica(
      gunsynccapture(),
      gunsyncbumpversion(),
      'peer',
    )
    gunsyncapplyfromwire(payload)
  }
}

/** Start sim-side debounced Gun→MEMORY mirroring; call once when sim mesh device boots. */
export function gunsyncstarsimsubscriber(vmdevice: DEVICE): void {
  simdevice = vmdevice
  const roomkey = gunsyncroomkey()
  if (roomkey) {
    bindsubscribertoreplica(roomkey)
  }
}

export function gunsyncsimmeshhearwireframe(
  vmdevice: DEVICE,
  forplayerid: string,
  raw: string,
): void {
  simdevice = vmdevice
  lastgunmeshplayer = forplayerid
  gunsmeshpushwireframetograph(forplayerid, raw)
  schedulememoryflushfromgraph()
}
