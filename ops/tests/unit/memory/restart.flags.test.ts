import { createsid } from 'zss/mapping/guid'
import { memorycreateboard } from 'zss/memory/boardlifecycle'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreatebook,
  memoryreadbookflags,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import {
  memorychipispresent,
  memoryrestartallchipsandflags,
  memorytickobject,
} from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'

describe('memoryrestartallchipsandflags', () => {
  afterEach(() => {
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('clears flag bags on every loaded book, not only main', () => {
    const booka = memorycreatebook([
      memorycreatecodepage('@board a\n', { board: memorycreateboard() }),
    ])
    booka.name = 'world-a'
    const bookb = memorycreatebook([
      memorycreatecodepage('@board b\n', { board: memorycreateboard() }),
    ])
    bookb.name = 'world-b'

    memoryresetbooks([booka, bookb])
    memorywritemainbook(booka.id)

    memorywritebookflag(booka, 'pid_owner_a', 'score', 1 as any)
    memorywritebookflag(bookb, 'pid_owner_b', 'score', 2 as any)
    expect(memoryreadbookflags(booka, 'pid_owner_a')).toEqual({ score: 1 })
    expect(memoryreadbookflags(bookb, 'pid_owner_b')).toEqual({ score: 2 })

    const npcid = createsid()
    const board = memorycreateboard()
    board.objects[npcid] = {
      id: npcid,
      kind: 'guard',
      x: 1,
      y: 1,
      code: '@guard\n#end\n',
      runtime: '',
    }
    memorytickobject(booka, board, board.objects[npcid], '#end\n')
    expect(memorychipispresent(npcid)).toBe(true)

    memoryrestartallchipsandflags()

    expect(memorychipispresent(npcid)).toBe(false)
    expect(Object.keys(booka.flags)).toEqual([])
    expect(Object.keys(bookb.flags)).toEqual([])
  })
})
