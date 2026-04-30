/**
 * @jest-environment jsdom
 */
import type { GunsyncReplica } from 'zss/feature/gunsync/replica'
import {
  gunsyncapplyfromwire,
  gunsyncbumpversion,
  gunsynccapture,
  gunsyncpayloadfromreplica,
  gunsyncresetdedup,
} from 'zss/feature/gunsync/replica'
import {
  memoryreadfirstbook,
  memoryreadoperator,
  memoryresetbooks,
  memorywriteoperator,
} from 'zss/memory/session'

describe('gunsync', () => {
  beforeEach(() => {
    gunsyncresetdedup()
    memorywriteoperator('')
  })

  it('capture and apply replica round-trip', () => {
    memorywriteoperator('alice')
    const replica = gunsynccapture()
    const payload = gunsyncpayloadfromreplica(
      replica,
      gunsyncbumpversion(),
      'boardrunner',
    )
    memorywriteoperator('bob')
    expect(gunsyncapplyfromwire(payload)).toBe(true)
    expect(memoryreadoperator()).toBe('alice')
  })

  it('drops duplicate versions', () => {
    memorywriteoperator('x')
    const payload = gunsyncpayloadfromreplica(
      gunsynccapture(),
      gunsyncbumpversion(),
      'peer',
    )
    expect(gunsyncapplyfromwire(payload)).toBe(true)
    expect(gunsyncapplyfromwire(payload)).toBe(false)
  })

  it('rejects empty boardrunner wipe while local books are loaded', () => {
    const book = {
      id: 'bid1',
      name: 'main',
      timestamp: 0,
      activelist: [] as string[],
      pages: [],
      flags: {},
    }
    memoryresetbooks([book])
    gunsyncresetdedup()
    memorywriteoperator('alice')

    const emptyreplica: GunsyncReplica = {
      software: { main: '', temp: '' },
      operator: '',
      topic: '',
      session: '',
      halt: false,
      simfreeze: false,
      books: {},
    }
    const payload = gunsyncpayloadfromreplica(
      emptyreplica,
      999,
      'boardrunner',
    )
    expect(gunsyncapplyfromwire(payload)).toBe(false)
    expect(memoryreadoperator()).toBe('alice')
    expect(memoryreadfirstbook()?.id).toBe('bid1')
  })

  it('rejects empty boardrunner wipe when operator is set but books not loaded yet', () => {
    gunsyncresetdedup()
    memorywriteoperator('alice')

    const emptyreplica: GunsyncReplica = {
      software: { main: '', temp: '' },
      operator: '',
      topic: '',
      session: '',
      halt: false,
      simfreeze: false,
      books: {},
    }
    const payload = gunsyncpayloadfromreplica(
      emptyreplica,
      42,
      'boardrunner',
    )
    expect(gunsyncapplyfromwire(payload)).toBe(false)
    expect(memoryreadoperator()).toBe('alice')
  })
})
