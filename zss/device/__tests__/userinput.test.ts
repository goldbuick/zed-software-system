/*
user:input routing split coverage (boardrunner authoritative-tick plan).

Server-side `handleuserinput` is a pure bookkeeping hook (vmlocal bootstrap
for fresh local-* players + lastinputtime). It must NOT push anything onto
flags.inputqueue anymore — that's the boardrunner worker's responsibility.

Worker-side `handleworkeruserinput` is the counterpart: it appends
`[input, mods]` to the local MEMORY's flags[player].inputqueue, which the
firmware consumes each tick.
*/
import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import { handleworkeruserinput } from 'zss/device/boardrunneruser'
import { handleuserinput } from 'zss/device/vm/handlers/input'
import { lastinputtime } from 'zss/device/vm/state'
import { INPUT } from 'zss/gadget/data/types'
import { memoryhasflags, memoryreadflags } from 'zss/memory/flags'
import { memoryresetbooks, memorywritesoftwarebook } from 'zss/memory/session'
import { BOOK, MEMORY_LABEL } from 'zss/memory/types'

function makemainbook(): BOOK {
  return {
    id: 'main-id',
    name: 'main',
    timestamp: 0,
    activelist: ['p1'],
    pages: [],
    flags: { p1: { board: 'boardA' } },
  }
}

const vm = {} as DEVICE

describe('user:input handlers', () => {
  beforeEach(() => {
    memoryresetbooks([makemainbook()])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    for (const k of Object.keys(lastinputtime)) {
      delete lastinputtime[k]
    }
  })

  afterEach(() => {
    memoryresetbooks([])
    jest.restoreAllMocks()
  })

  it('server handleuserinput does NOT push to flags.inputqueue', () => {
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'm1',
      sender: 'user',
      target: 'input',
      data: [INPUT.MOVE_UP, 0],
    }
    handleuserinput(vm, message)

    const flags = memoryreadflags('p1') as Record<string, unknown>
    expect(flags.inputqueue).toBeUndefined()
    expect(lastinputtime.p1).toBeDefined()
  })

  it('server handleuserinput triggers vmlocal for a fresh local-* player', () => {
    const localspy = jest
      .spyOn(api, 'vmlocal')
      .mockImplementation(() => undefined)

    const message: MESSAGE = {
      session: '',
      player: 'local-1',
      id: 'm1',
      sender: 'user',
      target: 'input',
      data: [INPUT.OK_BUTTON, 0],
    }
    handleuserinput(vm, message)

    expect(localspy).toHaveBeenCalledWith(vm, 'local-1')
    // first input for a local-* player goes through the bootstrap branch only;
    // no lastinputtime stamp yet (flags don't exist), and no inputqueue push.
    expect(memoryhasflags('local-1')).toBe(false)
  })

  it('worker handleworkeruserinput appends [input, mods] to flags.inputqueue', () => {
    const msg: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'w1',
      sender: 'user',
      target: 'input',
      data: [INPUT.MOVE_LEFT, 1],
    }
    handleworkeruserinput(vm, msg)

    const flags = memoryreadflags('p1') as Record<string, unknown> & {
      inputqueue?: [INPUT, number][]
    }
    expect(flags.inputqueue).toEqual([[INPUT.MOVE_LEFT, 1]])
  })

  it('worker handleworkeruserinput is a no-op on INPUT.NONE', () => {
    const msg: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'w2',
      sender: 'user',
      target: 'input',
      data: [INPUT.NONE, 0],
    }
    handleworkeruserinput(vm, msg)

    const flags = memoryreadflags('p1') as Record<string, unknown> & {
      inputqueue?: [INPUT, number][]
    }
    // either undefined or empty — never a queued INPUT.NONE entry.
    expect(flags.inputqueue ?? []).toEqual([])
  })

  it('worker handleworkeruserinput skips players without flags', () => {
    const msg: MESSAGE = {
      session: '',
      player: 'unknown',
      id: 'w3',
      sender: 'user',
      target: 'input',
      data: [INPUT.OK_BUTTON, 0],
    }
    expect(() => handleworkeruserinput(vm, msg)).not.toThrow()
  })
})
