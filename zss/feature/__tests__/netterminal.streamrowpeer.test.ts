import type { MESSAGE } from 'zss/device/api'
import { streamrowreplicatespeergadgetorflags } from 'zss/feature/netterminalstreamrowpeer'

function rowmsg(player: string, streamid: string): MESSAGE {
  return {
    session: 's',
    player,
    id: 'id1',
    sender: 'sim',
    target: 'rxreplclient:stream_row',
    data: { streamid, document: {}, rev: 1 },
  }
}

describe('streamrowreplicatespeergadgetorflags', () => {
  it('matches join gadget/flags stream ids for the known peer pid', () => {
    const join = 'pid_join_abc'
    expect(
      streamrowreplicatespeergadgetorflags(
        rowmsg('host', `gadget:${join}`),
        join,
      ),
    ).toBe(true)
    expect(
      streamrowreplicatespeergadgetorflags(
        rowmsg('host', `flags:${join}`),
        join,
      ),
    ).toBe(true)
  })

  it('does not match other streams or empty peer', () => {
    const join = 'pid_join_abc'
    expect(
      streamrowreplicatespeergadgetorflags(
        rowmsg('host', 'gadget:pid_other'),
        join,
      ),
    ).toBe(false)
    expect(
      streamrowreplicatespeergadgetorflags(rowmsg('host', 'memory'), join),
    ).toBe(false)
    expect(
      streamrowreplicatespeergadgetorflags(
        rowmsg('host', `gadget:${join}`),
        '',
      ),
    ).toBe(false)
  })

  it('ignores non-stream_row targets', () => {
    const join = 'pid_join_abc'
    const m: MESSAGE = {
      session: 's',
      player: 'host',
      id: 'id1',
      sender: 'x',
      target: 'register:toast',
      data: { streamid: `gadget:${join}` },
    }
    expect(streamrowreplicatespeergadgetorflags(m, join)).toBe(false)
  })
})
