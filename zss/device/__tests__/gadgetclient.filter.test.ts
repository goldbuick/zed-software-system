import { playeridfromgadgetstream } from 'zss/memory/memorydirty'

/**
 * gadgetclient applies JSONSYNC rows only when playeridfromgadgetstream(streamid)
 * equals registerreadplayer(); mismatch silently drops joiner gadget updates.
 */
describe('gadget stream id vs local player (gadgetclient contract)', () => {
  it('parses pid from gadget:<pid> for acceptance check', () => {
    expect(playeridfromgadgetstream('gadget:pid_join_1')).toBe('pid_join_1')
  })

  it('differs when stream is for another player', () => {
    const local = 'pid_join_1'
    expect(playeridfromgadgetstream('gadget:pid_host') === local).toBe(false)
  })

  it('returns empty for non-gadget streams', () => {
    expect(playeridfromgadgetstream('memory')).toBe('')
    expect(playeridfromgadgetstream('flags:pid_join_1')).toBe('')
  })
})
