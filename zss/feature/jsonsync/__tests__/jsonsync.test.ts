import {
  JSONSYNC_PATCH,
  jsonsyncclientapplyanti,
  jsonsyncclientapplyserverpatch,
  jsonsyncclientapplysnapshot,
  jsonsyncclienthaspending,
  jsonsyncclientlocalupdate,
  jsonsynccreateclientstream,
  jsonsynccreateserverstream,
  jsonsyncserveraccept,
  jsonsyncserveradmit,
  jsonsyncserverbuildpatches,
  jsonsyncserverbuildpatchfor,
  jsonsyncserverlistpeers,
  jsonsyncserverupdatedoc,
} from '../index'

const STREAM = 'board:test'

function mksnapshot(
  snapshot: ReturnType<typeof jsonsyncserveradmit>['snapshot'],
) {
  return { ...snapshot, streamid: STREAM }
}

describe('jsonsync feature', () => {
  it('admit snapshot round-trips to client', () => {
    const server = jsonsynccreateserverstream({ count: 1, items: [] })
    const { stream, snapshot } = jsonsyncserveradmit(server, 'alice', true)
    expect(stream.clients.get('alice')?.cv).toBe(0)
    expect(stream.clients.get('alice')?.sv).toBe(0)
    expect(stream.clients.get('alice')?.writable).toBe(true)
    const client = jsonsyncclientapplysnapshot(
      jsonsynccreateclientstream(),
      mksnapshot(snapshot),
    )
    expect(client.document).toEqual({ count: 1, items: [] })
    expect(client.shadow).toEqual({ count: 1, items: [] })
    expect(client.cv).toBe(0)
    expect(client.sv).toBe(0)
  })

  it('client local edit produces patch; server accepts; bumps cv', () => {
    let server = jsonsynccreateserverstream({ value: 'a' })
    const admit = jsonsyncserveradmit(server, 'alice', true)
    server = admit.stream
    let client = jsonsyncclientapplysnapshot(
      jsonsynccreateclientstream(),
      mksnapshot(admit.snapshot),
    )
    const local = jsonsyncclientlocalupdate(client, { value: 'b' }, STREAM)
    client = local.stream
    expect(client.cv).toBe(1)
    expect(local.patch.changes.length).toBeGreaterThan(0)
    const accepted = jsonsyncserveraccept(server, 'alice', local.patch)
    expect(accepted.kind).toBe('ok')
    if (accepted.kind !== 'ok') {
      return
    }
    server = accepted.stream
    expect(server.document).toEqual({ value: 'b' })
    expect(server.clients.get('alice')?.cv).toBe(1)
  })

  it('broadcasts server patch to other clients', () => {
    let server = jsonsynccreateserverstream({ value: 'a' })
    const admita = jsonsyncserveradmit(server, 'alice', true)
    server = admita.stream
    const admitb = jsonsyncserveradmit(server, 'bob', true)
    server = admitb.stream
    let bob = jsonsyncclientapplysnapshot(
      jsonsynccreateclientstream(),
      mksnapshot(admitb.snapshot),
    )

    // alice edits and server accepts
    let alice = jsonsyncclientapplysnapshot(
      jsonsynccreateclientstream(),
      mksnapshot(admita.snapshot),
    )
    const local = jsonsyncclientlocalupdate(alice, { value: 'c' }, STREAM)
    alice = local.stream
    const accepted = jsonsyncserveraccept(server, 'alice', local.patch)
    if (accepted.kind !== 'ok') {
      throw new Error(`expected ok, got ${accepted.kind}`)
    }
    server = accepted.stream

    // build patches for all clients
    const built = jsonsyncserverbuildpatches(server, STREAM)
    server = built.stream
    const forbob = built.patches.find((entry) => entry.player === 'bob')
    expect(forbob).toBeDefined()
    if (!forbob) {
      return
    }
    const apply = jsonsyncclientapplyserverpatch(bob, forbob.patch)
    expect(apply.kind).toBe('ok')
    if (apply.kind !== 'ok') {
      return
    }
    bob = apply.stream
    expect(bob.document).toEqual({ value: 'c' })
    expect(bob.sv).toBe(1)
  })

  it('version mismatch -> versionmismatch result', () => {
    let server = jsonsynccreateserverstream({ value: 'a' })
    const admit = jsonsyncserveradmit(server, 'alice', true)
    server = admit.stream
    const client = jsonsyncclientapplysnapshot(
      jsonsynccreateclientstream(),
      mksnapshot(admit.snapshot),
    )
    const badpatch: JSONSYNC_PATCH = {
      streamid: STREAM,
      cv: 99,
      sv: 0,
      changes: jsonsyncclientlocalupdate(client, { value: 'b' }, STREAM).patch
        .changes,
    }
    const result = jsonsyncserveraccept(server, 'alice', badpatch)
    expect(result.kind).toBe('versionmismatch')
  })

  it('read-only player write returns anti-patch; server doc untouched', () => {
    let server = jsonsynccreateserverstream({ value: 'a' })
    const admit = jsonsyncserveradmit(server, 'alice', false)
    server = admit.stream
    const client = jsonsyncclientapplysnapshot(
      jsonsynccreateclientstream(),
      mksnapshot(admit.snapshot),
    )
    const local = jsonsyncclientlocalupdate(client, { value: 'b' }, STREAM)
    const result = jsonsyncserveraccept(server, 'alice', local.patch)
    expect(result.kind).toBe('readonlyanti')
    if (result.kind !== 'readonlyanti') {
      return
    }
    expect(result.stream.document).toEqual({ value: 'a' })
    expect(result.anti.changes.length).toBeGreaterThan(0)
    const reverted = jsonsyncclientapplyanti(local.stream, result.anti)
    expect(reverted.kind).toBe('ok')
    if (reverted.kind !== 'ok') {
      return
    }
    expect(reverted.stream.document).toEqual({ value: 'a' })
    expect(reverted.stream.cv).toBe(0)
  })

  it('keyed array reorder produces stable paths', () => {
    const keys = { items: 'id' }
    const initial = {
      items: [
        { id: 1, name: 'Widget' },
        { id: 2, name: 'Gadget' },
      ],
    }
    let server = jsonsynccreateserverstream(initial, {
      arrayidentitykeys: keys,
    })
    const admit = jsonsyncserveradmit(server, 'alice', true)
    server = admit.stream
    let client = jsonsyncclientapplysnapshot(
      jsonsynccreateclientstream(),
      mksnapshot(admit.snapshot),
    )

    // reorder + rename
    const next = {
      items: [
        { id: 2, name: 'Gadget' },
        { id: 1, name: 'WidgetPro' },
      ],
    }
    const local = jsonsyncclientlocalupdate(client, next, STREAM)
    client = local.stream
    const accepted = jsonsyncserveraccept(server, 'alice', local.patch)
    expect(accepted.kind).toBe('ok')
    if (accepted.kind !== 'ok') {
      return
    }
    server = accepted.stream
    const serveritems = (
      server.document as { items: { id: number; name: string }[] }
    ).items
    const widget = serveritems.find((entry) => entry.id === 1)
    expect(widget?.name).toBe('WidgetPro')
  })

  it('concurrent edits: both survive when they target different leaves', () => {
    const keys = { items: 'id' }
    const initial = {
      items: [
        { id: 1, name: 'Widget', price: 10 },
        { id: 2, name: 'Gadget', price: 20 },
      ],
    }
    let server = jsonsynccreateserverstream(initial, {
      arrayidentitykeys: keys,
    })
    const admita = jsonsyncserveradmit(server, 'alice', true)
    server = admita.stream
    const admitb = jsonsyncserveradmit(server, 'bob', true)
    server = admitb.stream

    let alice = jsonsyncclientapplysnapshot(
      jsonsynccreateclientstream(),
      mksnapshot(admita.snapshot),
    )
    let bob = jsonsyncclientapplysnapshot(
      jsonsynccreateclientstream(),
      mksnapshot(admitb.snapshot),
    )

    // alice renames item 1
    const alicenext = {
      items: [
        { id: 1, name: 'WidgetPro', price: 10 },
        { id: 2, name: 'Gadget', price: 20 },
      ],
    }
    const alocal = jsonsyncclientlocalupdate(alice, alicenext, STREAM)
    alice = alocal.stream
    const aaccept = jsonsyncserveraccept(server, 'alice', alocal.patch)
    if (aaccept.kind !== 'ok') {
      throw new Error(`alice accept failed: ${aaccept.kind}`)
    }
    server = aaccept.stream

    // bob (still on original) reprices item 2
    const bobnext = {
      items: [
        { id: 1, name: 'Widget', price: 10 },
        { id: 2, name: 'Gadget', price: 25 },
      ],
    }
    const blocal = jsonsyncclientlocalupdate(bob, bobnext, STREAM)
    bob = blocal.stream
    const baccept = jsonsyncserveraccept(server, 'bob', blocal.patch)
    if (baccept.kind !== 'ok') {
      throw new Error(`bob accept failed: ${baccept.kind}`)
    }
    server = baccept.stream

    const finalitems = (
      server.document as {
        items: { id: number; name: string; price: number }[]
      }
    ).items
    expect(finalitems.find((entry) => entry.id === 1)?.name).toBe('WidgetPro')
    expect(finalitems.find((entry) => entry.id === 2)?.price).toBe(25)
  })

  // --- v2 poke optimization ------------------------------------------------

  it('v2 poke: listpeers excludes the originator', () => {
    let server = jsonsynccreateserverstream({ value: 'a' })
    server = jsonsyncserveradmit(server, 'alice', true).stream
    server = jsonsyncserveradmit(server, 'bob', true).stream
    server = jsonsyncserveradmit(server, 'carol', false).stream
    const peers = jsonsyncserverlistpeers(server, 'alice').sort()
    expect(peers).toEqual(['bob', 'carol'])
    const all = jsonsyncserverlistpeers(server).sort()
    expect(all).toEqual(['alice', 'bob', 'carol'])
  })

  it('v2 poke: idle client replies with empty clientpatch and pulls catch-up', () => {
    let server = jsonsynccreateserverstream({ value: 'a' })
    const admita = jsonsyncserveradmit(server, 'alice', true)
    server = admita.stream
    const admitb = jsonsyncserveradmit(server, 'bob', true)
    server = admitb.stream

    let bob = jsonsyncclientapplysnapshot(jsonsynccreateclientstream(), {
      ...admitb.snapshot,
      streamid: STREAM,
    })

    // alice edits; server accepts; in v2 bob is only poked (not pushed to).
    let alice = jsonsyncclientapplysnapshot(jsonsynccreateclientstream(), {
      ...admita.snapshot,
      streamid: STREAM,
    })
    const alocal = jsonsyncclientlocalupdate(alice, { value: 'c' }, STREAM)
    alice = alocal.stream
    const aaccept = jsonsyncserveraccept(server, 'alice', alocal.patch)
    if (aaccept.kind !== 'ok') {
      throw new Error(`alice accept failed: ${aaccept.kind}`)
    }
    server = aaccept.stream

    // bob receives poke -> sends empty clientpatch as catch-up ping.
    expect(jsonsyncclienthaspending(bob)).toBe(false)
    const pokereply: JSONSYNC_PATCH = {
      streamid: STREAM,
      cv: bob.cv,
      sv: bob.sv,
      changes: [],
    }
    const pong = jsonsyncserveraccept(server, 'bob', pokereply)
    expect(pong.kind).toBe('ok')
    if (pong.kind !== 'ok') {
      return
    }
    server = pong.stream
    // empty patch: no cv bump, no doc mutation.
    expect(server.document).toEqual({ value: 'c' })
    expect(server.clients.get('bob')?.cv).toBe(0)

    // server computes the targeted catch-up for bob.
    const built = jsonsyncserverbuildpatchfor(server, STREAM, 'bob')
    server = built.stream
    expect(built.patch).toBeDefined()
    if (!built.patch) {
      return
    }
    const apply = jsonsyncclientapplyserverpatch(bob, built.patch)
    expect(apply.kind).toBe('ok')
    if (apply.kind !== 'ok') {
      return
    }
    bob = apply.stream
    expect(bob.document).toEqual({ value: 'c' })
    expect(bob.sv).toBe(1)
  })

  it('v2 poke: empty catch-up ok when client [cv,sv] lags server (stale sv)', () => {
    let server = jsonsynccreateserverstream({ value: 'a' })
    const admita = jsonsyncserveradmit(server, 'alice', true)
    server = admita.stream
    const admitb = jsonsyncserveradmit(server, 'bob', true)
    server = admitb.stream

    const bob = jsonsyncclientapplysnapshot(jsonsynccreateclientstream(), {
      ...admitb.snapshot,
      streamid: STREAM,
    })

    let alice = jsonsyncclientapplysnapshot(jsonsynccreateclientstream(), {
      ...admita.snapshot,
      streamid: STREAM,
    })
    const alocal = jsonsyncclientlocalupdate(alice, { value: 'c' }, STREAM)
    alice = alocal.stream
    const aaccept = jsonsyncserveraccept(server, 'alice', alocal.patch)
    if (aaccept.kind !== 'ok') {
      throw new Error(`alice accept failed: ${aaccept.kind}`)
    }
    server = aaccept.stream

    // server advances bob's sv while computing catch-up; client bob never got
    // the serverpatch, so still reports [0,0] on the wire.
    const built = jsonsyncserverbuildpatchfor(server, STREAM, 'bob')
    server = built.stream
    expect(built.patch).toBeDefined()
    expect(server.clients.get('bob')?.sv).toBe(1)
    expect(bob.sv).toBe(0)

    const pokereply: JSONSYNC_PATCH = {
      streamid: STREAM,
      cv: bob.cv,
      sv: bob.sv,
      changes: [],
    }
    const pong = jsonsyncserveraccept(server, 'bob', pokereply)
    expect(pong.kind).toBe('ok')
  })

  it('v2 poke: client with pending local edit does not send empty catch-up', () => {
    let server = jsonsynccreateserverstream({ value: 'a' })
    const admit = jsonsyncserveradmit(server, 'alice', true)
    server = admit.stream
    let alice = jsonsyncclientapplysnapshot(jsonsynccreateclientstream(), {
      ...admit.snapshot,
      streamid: STREAM,
    })
    // alice has a local unsubmitted edit (document != shadow). simulate the
    // pre-flush state by mutating document directly.
    alice = { ...alice, document: { value: 'draft' } }
    expect(jsonsyncclienthaspending(alice)).toBe(true)
    // contract: the jsonsyncclient device handler returns early in this case
    // and the normal edit flow sends a real patch instead.
  })

  it('v2 poke: read-only client still receives catch-up serverpatch', () => {
    let server = jsonsynccreateserverstream({ value: 'a' })
    const admita = jsonsyncserveradmit(server, 'alice', true)
    server = admita.stream
    const admitc = jsonsyncserveradmit(server, 'carol', false)
    server = admitc.stream

    let carol = jsonsyncclientapplysnapshot(jsonsynccreateclientstream(), {
      ...admitc.snapshot,
      streamid: STREAM,
    })

    // alice edits; server accepts.
    let alice = jsonsyncclientapplysnapshot(jsonsynccreateclientstream(), {
      ...admita.snapshot,
      streamid: STREAM,
    })
    const alocal = jsonsyncclientlocalupdate(alice, { value: 'new' }, STREAM)
    alice = alocal.stream
    const aaccept = jsonsyncserveraccept(server, 'alice', alocal.patch)
    if (aaccept.kind !== 'ok') {
      throw new Error(`alice accept failed: ${aaccept.kind}`)
    }
    server = aaccept.stream

    // carol (read-only) responds to the poke with an empty clientpatch.
    const pokereply: JSONSYNC_PATCH = {
      streamid: STREAM,
      cv: carol.cv,
      sv: carol.sv,
      changes: [],
    }
    const pong = jsonsyncserveraccept(server, 'carol', pokereply)
    // read-only gate must not kick in for empty changes; result is plain ok.
    expect(pong.kind).toBe('ok')
    if (pong.kind !== 'ok') {
      return
    }
    server = pong.stream

    const built = jsonsyncserverbuildpatchfor(server, STREAM, 'carol')
    server = built.stream
    expect(built.patch).toBeDefined()
    if (!built.patch) {
      return
    }
    const apply = jsonsyncclientapplyserverpatch(carol, built.patch)
    expect(apply.kind).toBe('ok')
    if (apply.kind !== 'ok') {
      return
    }
    carol = apply.stream
    expect(carol.document).toEqual({ value: 'new' })
  })

  it('v2 poke: buildpatchfor only advances sv for the targeted player', () => {
    let server = jsonsynccreateserverstream({ value: 'a' })
    server = jsonsyncserveradmit(server, 'alice', true).stream
    server = jsonsyncserveradmit(server, 'bob', true).stream
    server = jsonsyncserverupdatedoc(server, { value: 'z' })

    const built = jsonsyncserverbuildpatchfor(server, STREAM, 'alice')
    server = built.stream
    expect(built.patch?.changes.length).toBeGreaterThan(0)
    expect(server.clients.get('alice')?.sv).toBe(1)
    // bob untouched: no work was done for him.
    expect(server.clients.get('bob')?.sv).toBe(0)
  })

  it('server vm-driven update broadcasts patch to every client', () => {
    let server = jsonsynccreateserverstream({ value: 'a' })
    const admita = jsonsyncserveradmit(server, 'alice', true)
    server = admita.stream
    const admitb = jsonsyncserveradmit(server, 'bob', true)
    server = admitb.stream

    server = jsonsyncserverupdatedoc(server, { value: 'x' })
    const built = jsonsyncserverbuildpatches(server, STREAM)
    server = built.stream
    expect(built.patches.length).toBe(2)
    const players = built.patches.map((entry) => entry.player).sort()
    expect(players).toEqual(['alice', 'bob'])
    built.patches.forEach((entry) => {
      expect(entry.patch.changes.length).toBeGreaterThan(0)
    })
    expect(server.clients.get('alice')?.sv).toBe(1)
    expect(server.clients.get('bob')?.sv).toBe(1)
  })

  // --- topkeys allowlist ---------------------------------------------------

  it('topkeys on register: snapshot only carries allowed keys', () => {
    const server = jsonsynccreateserverstream(
      { a: 1, b: 2, c: 3 },
      { topkeys: ['a', 'b'] },
    )
    const { snapshot } = jsonsyncserveradmit(server, 'alice', true)
    expect(snapshot.document).toEqual({ a: 1, b: 2 })
  })

  it('topkeys on update: out-of-scope keys in nextdoc are dropped', () => {
    let server = jsonsynccreateserverstream(
      { a: 1, b: 2 },
      { topkeys: ['a', 'b'] },
    )
    const admit = jsonsyncserveradmit(server, 'bob', true)
    server = admit.stream
    // nextdoc carries an out-of-scope `c` key; projection must strip it before
    // the diff so no patch op ever references `c`.
    server = jsonsyncserverupdatedoc(server, { a: 10, b: 20, c: 999 })
    expect(server.document).toEqual({ a: 10, b: 20 })
    const built = jsonsyncserverbuildpatches(server, STREAM)
    server = built.stream
    const forbob = built.patches.find((entry) => entry.player === 'bob')
    expect(forbob).toBeDefined()
    if (!forbob) {
      return
    }
    const flatpath = JSON.stringify(forbob.patch.changes)
    expect(flatpath).not.toMatch(/"c"/)
    expect(flatpath).not.toMatch(/999/)
  })

  it('topkeys undefined: behavior unchanged', () => {
    const server = jsonsynccreateserverstream({ a: 1, b: 2, c: 3 })
    const { snapshot } = jsonsyncserveradmit(server, 'alice', true)
    expect(snapshot.document).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('topkeys empty array: behavior unchanged', () => {
    const server = jsonsynccreateserverstream(
      { a: 1, b: 2, c: 3 },
      { topkeys: [] },
    )
    const { snapshot } = jsonsyncserveradmit(server, 'alice', true)
    expect(snapshot.document).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('topkeys ignores keys not present on doc', () => {
    const server = jsonsynccreateserverstream(
      { a: 1 },
      { topkeys: ['a', 'b', 'c'] },
    )
    const { snapshot } = jsonsyncserveradmit(server, 'alice', true)
    expect(snapshot.document).toEqual({ a: 1 })
  })
})
