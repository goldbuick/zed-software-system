import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { handlecli, handleclirepeatlast } from 'zss/device/vm/handlers/cli'
import * as memorysync from 'zss/device/vm/memorysimsync'
import * as runtime from 'zss/memory/runtime'

describe('handlecli', () => {
  const vm = {} as DEVICE
  let cli: jest.SpyInstance
  let repeat: jest.SpyInstance
  let pushdirty: jest.SpyInstance

  beforeEach(() => {
    cli = jest.spyOn(runtime, 'memoryruncli').mockImplementation(() => {})
    repeat = jest
      .spyOn(runtime, 'memoryrepeatclilast')
      .mockImplementation(() => {})
    pushdirty = jest
      .spyOn(memorysync, 'memorypushsimsyncdirty')
      .mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('runs cli against the sim MEMORY with player + input', () => {
    const message = {
      player: 'player-1',
      data: '#pages',
    } as MESSAGE

    handlecli(vm, message)

    expect(cli).toHaveBeenCalledWith('player-1', '#pages')
    expect(pushdirty).toHaveBeenCalled()
  })

  it('only runs when both player and data are strings (non-string data is ignored)', () => {
    handlecli(vm, { player: 'player-1', data: 42 } as unknown as MESSAGE)

    expect(cli).not.toHaveBeenCalled()
    expect(pushdirty).not.toHaveBeenCalled()
  })

  it('passes through empty player and empty string data as strings', () => {
    handlecli(vm, { player: '', data: '#pages' } as MESSAGE)
    handlecli(vm, { player: 'player-1', data: '' } as MESSAGE)

    expect(cli).toHaveBeenCalledWith('', '#pages')
    expect(cli).toHaveBeenCalledWith('player-1', '')
  })

  it('repeats last cli for the given player', () => {
    const message = {
      player: 'player-1',
      data: undefined,
    } as MESSAGE

    handleclirepeatlast(vm, message)

    expect(repeat).toHaveBeenCalledWith('player-1')
  })

  it('repeats last cli for empty string player when present', () => {
    handleclirepeatlast(vm, { player: '', data: undefined } as MESSAGE)
    expect(repeat).toHaveBeenCalledWith('')
  })
})
