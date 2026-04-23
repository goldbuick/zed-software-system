/**
 * Pull-await + `replicateRxCollection` (memory) under Jest.
 *
 * Does **not** import `rxreplclient` (avoids its module-level init). Setting
 * `STREAMREPL_RX_REPL=1` is therefore **not required** here; use that env when you
 * want `rxreplclient` itself to call `initStreamReplRxReplications` on load.
 */
import type { DEVICELIKE } from 'zss/device/api'
import {
  streamreplawaitclientpersistqueue,
  streamreplensureclientdb,
  streamreplflushclientdbfortests,
  streamreplmemorycollection,
} from 'zss/device/jsonsyncdb'
import { MEMORY_STREAM_ID } from 'zss/memory/memorydirty'

import { streamreplpushawaitnotify } from '../streamreplpushawait'
import {
  initStreamReplRxReplications,
  streamreplreplicationfeedpullresponse,
  streamreplreplicationmemory,
  streamreplreplicationteardownfortests,
} from '../streamreplreplicationinit'

describe('streamrepl replication + pull-await (Jest)', () => {
  beforeEach(async () => {
    await streamreplreplicationteardownfortests()
    await streamreplawaitclientpersistqueue()
    await streamreplflushclientdbfortests()
  })

  afterEach(async () => {
    await streamreplreplicationteardownfortests()
    await streamreplawaitclientpersistqueue()
    await streamreplflushclientdbfortests()
  })

  it('pull.handler awaits pull_response via mock device emit', async () => {
    const mockDevice: DEVICELIKE = {
      emit(_player, target, data) {
        if (target === 'rxreplserver:pull_request') {
          const req = data as { streamids?: string[] }
          const streamids = Array.isArray(req.streamids) ? req.streamids : []
          streamreplreplicationfeedpullresponse({
            checkpoint: { cursor: '' },
            documents: streamids.map((streamid) => ({
              streamid,
              document:
                streamid === MEMORY_STREAM_ID ? { __rxreplTest: true } : {},
              rev: streamid === MEMORY_STREAM_ID ? 7 : 0,
            })),
          })
        }
        if (target === 'rxreplserver:push_batch') {
          const rows = (data as { rows: { streamid: string }[] })?.rows ?? []
          streamreplpushawaitnotify({
            accepted: rows.map((r) => ({ streamid: r.streamid, rev: 99 })),
          })
        }
      },
    }

    await streamreplensureclientdb()
    await initStreamReplRxReplications({
      device: mockDevice,
      getOwnPlayer: () => 'pid_rxrepl_test',
    })

    const mem = streamreplreplicationmemory()
    expect(mem).not.toBeNull()
    await mem!.awaitInitialReplication()

    const coll = streamreplmemorycollection()
    expect(coll).not.toBeNull()
    const doc = await coll!.findOne(MEMORY_STREAM_ID).exec()
    expect(doc).not.toBeNull()
    const json = doc!.toMutableJSON()
    expect(json.rev).toBe(7)
    expect(JSON.parse(json.documentjson)).toEqual({ __rxreplTest: true })
  })
})
