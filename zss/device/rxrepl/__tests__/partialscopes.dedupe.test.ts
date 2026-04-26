import {
  streamreplpartialscopesOnGadgetFlagsPeersChange,
  streamreplpartialscopesOnOwnedBoardsChange,
} from '../partialscopes'
import * as scoped from '../streamreplscopedreplication'

describe('streamreplpartialscopesOnGadgetFlagsPeersChange', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('dedupes identical peer sets so scoped flags sync is not re-run every call', () => {
    const flags = jest
      .spyOn(scoped, 'streamreplscopedsyncflagsplayers')
      .mockResolvedValue(undefined)

    const peers = new Set(['p1', 'p2'])
    streamreplpartialscopesOnGadgetFlagsPeersChange(peers)
    streamreplpartialscopesOnGadgetFlagsPeersChange(new Set(['p2', 'p1']))
    streamreplpartialscopesOnGadgetFlagsPeersChange(peers)

    expect(flags).toHaveBeenCalledTimes(1)
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
