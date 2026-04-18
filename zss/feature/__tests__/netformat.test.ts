import { applyPatch, compare } from 'fast-json-patch'
import type { MESSAGE } from 'zss/device/api'
import { netformatdecode, netformatencode } from 'zss/feature/netformat'

/** Minimal FORMAT_OBJECT-style slim (numeric keys) as gadget paint payload */
function sampleslim(): unknown[] {
  return [0, 'board-1', 1, 'layer', 2, [], 3, 'name', 4, 'Test']
}

describe('netformat', () => {
  it('roundtrips MESSAGE through CBOR', () => {
    const original: MESSAGE = {
      session: 'sess_a',
      player: 'player_b',
      id: 'sid_roundtrip',
      sender: 'vm',
      target: 'gadgetclient:paint',
      data: sampleslim(),
    }
    const bytes = netformatencode(original)
    const decoded = netformatdecode(bytes)
    expect(decoded).toEqual(original)
  })

  it('gadgetclient paint + patch path after decode matches sender slim', () => {
    const slimprev = sampleslim()
    const slimnext = [...slimprev]
    slimnext[1] = 'board-2'
    const patch = compare(slimprev, slimnext)
    const paint: MESSAGE = {
      session: 's',
      player: 'p',
      id: 'sid_paint',
      sender: 'vm',
      target: 'gadgetclient:paint',
      data: slimprev,
    }
    const patchmsg: MESSAGE = {
      session: 's',
      player: 'p',
      id: 'sid_patch',
      sender: 'vm',
      target: 'gadgetclient:patch',
      data: patch,
    }
    const paintdec = netformatdecode(netformatencode(paint))
    const patchdec = netformatdecode(netformatencode(patchmsg))
    const applied = applyPatch(
      structuredClone(paintdec.data),
      patchdec.data,
      true,
      true,
    )
    expect(applied.newDocument).toEqual(slimnext)
  })

  it('netserializable flattens Set and Map for stable CBOR', () => {
    const msg: MESSAGE = {
      session: 's',
      player: 'p',
      id: 'sid_sm',
      sender: 'x',
      target: 't',
      data: {
        tags: new Set(['a', 'b']),
        byname: new Map<string, number>([['n', 1]]),
      },
    }
    const round = netformatdecode(netformatencode(msg))
    expect(round.data).toEqual({
      tags: ['a', 'b'],
      byname: { n: 1 },
    })
  })
})
