import { createdevice } from 'zss/device'
import { applylayercacheupdate, useGadgetClient } from 'zss/gadget/data/state'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import { isjoin } from 'zss/feature/url'
import { ispresent, isstring } from 'zss/mapping/types'
import { MEMORY_STREAM_ID } from 'zss/memory/memorydirty'
import { memoryreadoperator } from 'zss/memory/session'

import type { JSONSYNC_CHANGED } from './api'
import { parsegadgetdocumentjson } from './gadgetdocument'
import { registerreadplayer } from './register'

/** Per-player rendered gadget on main book flags (see boardrunnergadget). */
const GADGET_RENDER_FLAG = 'gadgetrender'

let rafid = 0
let pendinggadget: GADGET_STATE | null = null

function flushgadgetfrommemory() {
  rafid = 0
  if (pendinggadget === null) {
    return
  }
  const gadget = pendinggadget
  pendinggadget = null
  useGadgetClient.setState((state) => ({
    gadget,
    layercachemap: applylayercacheupdate(
      state.layercachemap,
      gadget?.board ?? '',
      gadget?.layers ?? [],
    ),
  }))
}

function queuegadgetapply(gadget: GADGET_STATE) {
  pendinggadget = gadget
  if (rafid) {
    return
  }
  rafid = requestAnimationFrame(flushgadgetfrommemory)
}

function gadgetpreferredplayer(localplayer: string): string {
  if (!isjoin()) {
    return localplayer
  }
  const op = memoryreadoperator()
  if (isstring(op) && op.length > 0) {
    return op
  }
  return localplayer
}

function readgadgetrenderfrommemorydocument(
  document: unknown,
  player: string,
): GADGET_STATE | undefined {
  if (!ispresent(document) || typeof document !== 'object') {
    return undefined
  }
  const root = document as Record<string, unknown>
  const sw = root.software as Record<string, unknown> | undefined
  const mainid = sw?.main
  if (typeof mainid !== 'string' || mainid.length === 0) {
    return undefined
  }
  const books = root.books as Record<string, unknown> | undefined
  if (!books || typeof books !== 'object') {
    return undefined
  }
  const book = books[mainid] as Record<string, unknown> | undefined
  if (!book || typeof book !== 'object') {
    return undefined
  }
  const flags = book.flags as Record<string, unknown> | undefined
  if (!flags || typeof flags !== 'object') {
    return undefined
  }
  const playerflags = flags[player] as Record<string, unknown> | undefined
  if (!playerflags || typeof playerflags !== 'object') {
    return undefined
  }
  const raw = playerflags[GADGET_RENDER_FLAG]
  if (!ispresent(raw)) {
    return undefined
  }
  if (typeof raw === 'string') {
    return parsegadgetdocumentjson(raw) ?? undefined
  }
  if (typeof raw === 'object') {
    return raw as GADGET_STATE
  }
  return undefined
}

/** Main thread: `memory:changed` → Zustand from `gadgetrender` flag on main book. */
export const gadgetclientdevice = createdevice(
  'gadgetclient',
  ['memory'],
  (message) => {
    if (!gadgetclientdevice.session(message)) {
      return
    }
    if (message.target !== 'memory:changed') {
      return
    }
    const localplayer = registerreadplayer()
    if (!localplayer) {
      return
    }
    const payload = message.data as JSONSYNC_CHANGED | undefined
    if (!payload || payload.streamid !== MEMORY_STREAM_ID) {
      return
    }
    const preferred = gadgetpreferredplayer(localplayer)
    const gadget = readgadgetrenderfrommemorydocument(
      payload.document,
      preferred,
    )
    if (!ispresent(gadget)) {
      return
    }
    queuegadgetapply(gadget)
  },
)
