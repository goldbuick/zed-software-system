import type { DEVICE } from 'zss/device'
import { type MESSAGE, isacktickgadgetpayload } from 'zss/device/api'
import { TICK_FPS } from 'zss/mapping/tick'

import { boardrunneracks } from '../../state'
import { handleacktick } from '../acktick'

const mockgadgetstate = jest.fn()
jest.mock('zss/gadget/data/api', () => ({
  gadgetstate: (player: string) => mockgadgetstate(player),
}))

describe('handleacktick', () => {
  const vm = {} as DEVICE

  function basemessage(partial: Partial<MESSAGE> = {}): MESSAGE {
    return {
      session: '',
      player: 'runner1',
      id: 'id',
      sender: '',
      target: 'acktick',
      ...partial,
    }
  }

  beforeEach(() => {
    mockgadgetstate.mockReset()
    delete boardrunneracks.runner1
  })

  it('refreshes boardrunneracks when message has no gadget payload', () => {
    handleacktick(vm, basemessage())
    expect(boardrunneracks.runner1).toBe(Math.ceil(TICK_FPS))
    expect(mockgadgetstate).not.toHaveBeenCalled()
  })

  it('merges scroll and sidebar into gadgetstate for each entry', () => {
    const stub = {
      scrollname: '',
      scroll: [] as string[],
      sidebar: [] as string[],
    }
    mockgadgetstate.mockImplementation(() => stub)
    handleacktick(
      vm,
      basemessage({
        data: {
          boardid: 'brd',
          entries: [
            {
              player: 'p1',
              scrollname: 'Title',
              scroll: ['line'],
              sidebar: ['s'],
            },
          ],
        },
      }),
    )
    expect(boardrunneracks.runner1).toBe(Math.ceil(TICK_FPS))
    expect(mockgadgetstate).toHaveBeenCalledWith('p1')
    expect(stub.scrollname).toBe('Title')
    expect(stub.scroll).toEqual(['line'])
    expect(stub.sidebar).toEqual(['s'])
  })

  it('ignores invalid gadget payload shape', () => {
    handleacktick(
      vm,
      basemessage({ data: { boardid: 'x', entries: [{ bad: 1 }] } }),
    )
    expect(mockgadgetstate).not.toHaveBeenCalled()
  })
})

describe('isacktickgadgetpayload', () => {
  it('accepts well-formed payload', () => {
    expect(
      isacktickgadgetpayload({
        boardid: 'b',
        entries: [{ player: 'p1' }],
      }),
    ).toBe(true)
  })

  it('rejects non-objects and missing player on entries', () => {
    expect(isacktickgadgetpayload(null)).toBe(false)
    expect(isacktickgadgetpayload({ boardid: 'b', entries: [{}] })).toBe(false)
  })
})
