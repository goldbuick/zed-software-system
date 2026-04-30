/**
 * @jest-environment jsdom
 */
import type { DEVICE } from 'zss/device'
import {
  gunsyncreplicatograph,
  gunsyncresetdedup,
  gunsyncstarsimsubscriber,
  gunsyncparsesimmeshwire,
} from 'zss/feature/gunsync'
import {
  gunsynccapture,
  gunsyncroomkey,
} from 'zss/feature/gunsync/replica'
import {
  memorywriteoperator,
  memoryreadoperator,
  memorywritehalt,
  memoryreadhalt,
  memorywritesimfreeze,
  memoryreadsimfreeze,
} from 'zss/memory/session'

describe('gunsync wire + graph', () => {
  beforeEach(() => {
    gunsyncresetdedup()
    memorywriteoperator('')
  })

  it('parses opaque string and payload wrapper for gunmesh', () => {
    expect(gunsyncparsesimmeshwire('{"#":"x"}')).toBe('{"#":"x"}')
    expect(gunsyncparsesimmeshwire({ payload: '{"#":"y"}' })).toBe(
      '{"#":"y"}',
    )
    expect(gunsyncparsesimmeshwire(undefined)).toBeUndefined()
    expect(gunsyncparsesimmeshwire({ v: 1 })).toBeUndefined()
  })

  it('subscriber converge MEMORY from local replica graph writes', async () => {
    const stubvm = {
      emit: jest.fn(),
    } as unknown as DEVICE

    gunsyncstarsimsubscriber(stubvm)
    memorywriteoperator('alice')

    gunsyncreplicatograph(gunsynccapture())
    expect(gunsyncroomkey()).toBeTruthy()

    memorywriteoperator('bob')

    await new Promise((r) => {
      setTimeout(r, 30)
    })

    expect(memoryreadoperator()).toBe('alice')
  })

  it('subscriber restores halt and simfreeze from replica graph', async () => {
    const stubvm = {
      emit: jest.fn(),
    } as unknown as DEVICE

    gunsyncstarsimsubscriber(stubvm)
    memorywriteoperator('alice')
    memorywritehalt(true)
    memorywritesimfreeze(true)

    gunsyncreplicatograph(gunsynccapture())
    expect(gunsyncroomkey()).toBeTruthy()

    memorywritehalt(false)
    memorywritesimfreeze(false)
    memorywriteoperator('bob')

    await new Promise((r) => {
      setTimeout(r, 30)
    })

    expect(memoryreadhalt()).toBe(true)
    expect(memoryreadsimfreeze()).toBe(true)
    expect(memoryreadoperator()).toBe('alice')
  })
})
