import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import { handlecli, handleclirepeatlast } from 'zss/device/vm/handlers/cli'
import { ackboardrunners, boardrunners } from 'zss/device/vm/state'
import * as playermanagement from 'zss/memory/playermanagement'
import * as runtime from 'zss/memory/runtime'

function clearboardrunnerstate() {
  for (const k of Object.keys(boardrunners)) {
    delete boardrunners[k]
  }
  for (const k of Object.keys(ackboardrunners)) {
    delete ackboardrunners[k]
  }
}

describe('handlecli', () => {
  const vm = {} as DEVICE
  let cli: jest.SpyInstance
  let emitcli: jest.SpyInstance
  let emitrepeat: jest.SpyInstance
  let repeat: jest.SpyInstance
  let readboard: jest.SpyInstance

  beforeEach(() => {
    clearboardrunnerstate()
    cli = jest.spyOn(runtime, 'memoryruncli').mockImplementation(() => {})
    repeat = jest
      .spyOn(runtime, 'memoryrepeatclilast')
      .mockImplementation(() => {})
    emitcli = jest.spyOn(api, 'boardrunnercli').mockImplementation(() => {})
    emitrepeat = jest
      .spyOn(api, 'boardrunnerclirepeatlast')
      .mockImplementation(() => {})
    readboard = jest
      .spyOn(playermanagement, 'memoryreadplayerboard')
      .mockImplementation(() => ({ id: 'board-a' }) as any)
  })

  afterEach(() => {
    clearboardrunnerstate()
    jest.restoreAllMocks()
  })

  it('forwards cli to acked runner with payload { player, input }', () => {
    ackboardrunners['board-a'] = 'runner-p'
    const message = {
      player: 'player-1',
      data: '#pages',
    } as MESSAGE

    handlecli(vm, message)

    expect(emitcli).toHaveBeenCalledWith(vm, 'runner-p', {
      player: 'player-1',
      input: '#pages',
    })
    expect(cli).not.toHaveBeenCalled()
  })

  it('falls back to in-sim memoryruncli when no runner is acked yet', () => {
    const message = {
      player: 'player-1',
      data: '#pages',
    } as MESSAGE

    handlecli(vm, message)

    expect(emitcli).not.toHaveBeenCalled()
    expect(cli).toHaveBeenCalledWith('player-1', '#pages')
  })

  it('falls back when player has no current board', () => {
    readboard.mockImplementation(() => undefined)
    const message = {
      player: 'player-1',
      data: '#save',
    } as MESSAGE

    handlecli(vm, message)

    expect(emitcli).not.toHaveBeenCalled()
    expect(cli).toHaveBeenCalledWith('player-1', '#save')
  })

  it('ignores empty player or input', () => {
    handlecli(vm, { player: '', data: '#pages' } as MESSAGE)
    handlecli(vm, { player: 'player-1', data: '' } as MESSAGE)
    handlecli(vm, { player: 'player-1', data: 42 } as unknown as MESSAGE)

    expect(emitcli).not.toHaveBeenCalled()
    expect(cli).not.toHaveBeenCalled()
  })

  it('forwards clirepeatlast to acked runner with payload { player }', () => {
    ackboardrunners['board-a'] = 'runner-p'
    const message = {
      player: 'player-1',
      data: undefined,
    } as MESSAGE

    handleclirepeatlast(vm, message)

    expect(emitrepeat).toHaveBeenCalledWith(vm, 'runner-p', {
      player: 'player-1',
    })
    expect(repeat).not.toHaveBeenCalled()
  })

  it('falls back to in-sim memoryrepeatclilast when no runner is acked', () => {
    const message = {
      player: 'player-1',
      data: undefined,
    } as MESSAGE

    handleclirepeatlast(vm, message)

    expect(emitrepeat).not.toHaveBeenCalled()
    expect(repeat).toHaveBeenCalledWith('player-1')
  })
})
