import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { handlewanixattach } from 'zss/device/vm/handlers/wanixattach'
import {
  memoryreadwanixattached,
  memorywritewanixattached,
} from 'zss/memory/session'

describe('handlewanixattach', () => {
  const vm = {} as DEVICE

  afterEach(() => {
    memorywritewanixattached(null)
  })

  function message(data: unknown): MESSAGE {
    return {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: 'wanix-attach',
      data,
    }
  }

  it('stores a session key string', () => {
    handlewanixattach(vm, message('task-a'))
    expect(memoryreadwanixattached()).toBe('task-a')
  })

  it('clears on null', () => {
    memorywritewanixattached('task-a')
    handlewanixattach(vm, message(null))
    expect(memoryreadwanixattached()).toBeNull()
  })

  it('ignores invalid payload', () => {
    memorywritewanixattached('task-a')
    handlewanixattach(vm, message(42))
    handlewanixattach(vm, message(undefined))
    handlewanixattach(vm, message({ key: 'task-b' }))
    expect(memoryreadwanixattached()).toBe('task-a')
  })
})
