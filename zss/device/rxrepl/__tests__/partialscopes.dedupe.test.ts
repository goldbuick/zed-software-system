import {
  streamreplpartialscopesOnGadgetFlagsPeersChange,
  streamreplpartialscopesOnOwnedBoardsChange,
} from '../partialscopes'
import * as scoped from '../streamreplscopedreplication'

describe('streamreplpartialscopesOnGadgetFlagsPeersChange', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('dedupes identical peer sets so scoped flags/gadget sync is not re-run every call', () => {
    const flags = jest
      .spyOn(scoped, 'streamreplscopedsyncflagsplayers')
      .mockResolvedValue(undefined)
    const gadget = jest
      .spyOn(scoped, 'streamreplscopedsyncgadgetplayers')
      .mockResolvedValue(undefined)

    const peers = new Set(['p1', 'p2'])
    streamreplpartialscopesOnGadgetFlagsPeersChange(peers)
    streamreplpartialscopesOnGadgetFlagsPeersChange(new Set(['p2', 'p1']))
    streamreplpartialscopesOnGadgetFlagsPeersChange(peers)

    expect(flags).toHaveBeenCalledTimes(1)
    expect(gadget).toHaveBeenCalledTimes(1)
  })

  it('re-runs flags sync when flags set grows but gadget set is unchanged', () => {
    const flags = jest
      .spyOn(scoped, 'streamreplscopedsyncflagsplayers')
      .mockResolvedValue(undefined)
    const gadget = jest
      .spyOn(scoped, 'streamreplscopedsyncgadgetplayers')
      .mockResolvedValue(undefined)

    const g = new Set(['p1'])
    const f1 = new Set(['p1', 'b1_tracking'])
    streamreplpartialscopesOnGadgetFlagsPeersChange(g, f1)
    const f2 = new Set(['p1', 'b1_tracking', 'el1_chip'])
    streamreplpartialscopesOnGadgetFlagsPeersChange(g, f2)

    expect(flags).toHaveBeenCalledTimes(2)
    expect(gadget).toHaveBeenCalledTimes(1)
  })
})

describe('streamreplpartialscopesOnOwnedBoardsChange', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('still dedupes owned board id sets', () => {
    const boards = jest
      .spyOn(scoped, 'streamreplscopedsyncboards')
      .mockResolvedValue(undefined)
    const ids = new Set(['b1'])
    streamreplpartialscopesOnOwnedBoardsChange(ids)
    streamreplpartialscopesOnOwnedBoardsChange(new Set(['b1']))
    expect(boards).toHaveBeenCalledTimes(1)
  })
})
