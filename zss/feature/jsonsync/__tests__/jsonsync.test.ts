import {
  JSONSYNC_PATCH,
  jsonsyncclientapplyanti,
  jsonsyncclientapplyserverpatch,
  jsonsyncclientapplysnapshot,
  jsonsyncclientlocalupdate,
  jsonsynccreateclientstream,
  jsonsynccreateserverstream,
  jsonsyncserveraccept,
  jsonsyncserveradmit,
  jsonsyncserverbuildpatches,
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
})
