import { boardtvshouldshow } from 'zss/feature/mediaqueue/boardtvvisible'
import {
  mediaqueuecallmetadata,
  ismediaqueuecallmetadata,
} from 'zss/feature/mediaqueue/callmetadata'
import {
  BOARD_TV_COLS,
  BOARD_TV_ROWS,
  boardtvisupright,
} from 'zss/feature/mediaqueue/constants'
import {
  mediaqueueclearlistenstate,
  mediaqueuesetlistenboardid,
  mediaqueuesetlistening,
} from 'zss/feature/mediaqueue/listenstate'
import {
  MEDIAQUEUE_PROTOCOL,
  ismediaqueuemessage,
} from 'zss/feature/mediaqueue/protocol'
import {
  mediaqueueadd,
  mediaqueueclear,
  mediaqueuecurrenturl,
  mediaqueuenext,
  mediaqueuereadstate,
  mediaqueuesetindex,
} from 'zss/feature/mediaqueue/queue'
import { mediaqueueroompeerids } from 'zss/feature/mediaqueue/roompeers'

describe('mediaqueue queue', () => {
  beforeEach(() => {
    mediaqueueclear()
  })

  it('adds urls and advances with next', () => {
    mediaqueueadd('https://a.example')
    mediaqueueadd('https://b.example')
    expect(mediaqueuereadstate()).toEqual({
      urls: ['https://a.example', 'https://b.example'],
      index: 0,
    })
    expect(mediaqueuecurrenturl()).toBe('https://a.example')
    mediaqueuenext()
    expect(mediaqueuecurrenturl()).toBe('https://b.example')
    mediaqueuenext()
    expect(mediaqueuecurrenturl()).toBe('https://a.example')
  })

  it('goto clamps index', () => {
    mediaqueueadd('https://a.example')
    mediaqueuesetindex(99)
    expect(mediaqueuereadstate().index).toBe(0)
  })
})

describe('mediaqueue protocol', () => {
  it('accepts known message types', () => {
    expect(
      ismediaqueuemessage({
        type: 'mediaqueue:hello',
        protocol: MEDIAQUEUE_PROTOCOL,
        role: 'helper',
        peerid: 'x',
      }),
    ).toBe(true)
    expect(ismediaqueuemessage({ type: 'nope' })).toBe(false)
    expect(ismediaqueuemessage(null)).toBe(false)
  })
})

describe('mediaqueue room peers', () => {
  it('selects board mate peer ids and skips self', () => {
    const ids = mediaqueueroompeerids(
      ['p1', 'p2', 'p3'],
      [
        { player: 'p1', peerid: 'peer-a' },
        { player: 'p2', peerid: 'peer-b' },
        { player: 'p3', peerid: 'peer-c' },
      ],
      'peer-a',
    )
    expect(ids).toEqual(['peer-b', 'peer-c'])
  })

  it('skips players missing from roster', () => {
    expect(
      mediaqueueroompeerids(
        ['p1', 'ghost'],
        [{ player: 'p1', peerid: 'peer-a' }],
        undefined,
      ),
    ).toEqual(['peer-a'])
  })
})

describe('mediaqueue call metadata', () => {
  it('accepts helper and room sources', () => {
    expect(ismediaqueuecallmetadata(mediaqueuecallmetadata('helper'))).toBe(
      true,
    )
    expect(ismediaqueuecallmetadata(mediaqueuecallmetadata('room'))).toBe(true)
    expect(ismediaqueuecallmetadata({ kind: 'nope' })).toBe(false)
  })
})

describe('board TV sink sizing', () => {
  it('uses landscape 40x15 in all graphics modes', () => {
    expect(BOARD_TV_COLS).toBe(40)
    expect(BOARD_TV_ROWS).toBe(15)
    expect(BOARD_TV_COLS).toBeGreaterThan(BOARD_TV_ROWS)
  })

  it('stands the TV only in fpv; iso and mode7 lie on the board', () => {
    expect(boardtvisupright('fpv')).toBe(true)
    expect(boardtvisupright('flat')).toBe(false)
    expect(boardtvisupright('iso')).toBe(false)
    expect(boardtvisupright('mode7')).toBe(false)
  })

  it('shows the TV when video is up, and only on the bound board while listening', () => {
    mediaqueueclearlistenstate()
    expect(boardtvshouldshow('board-a', false)).toBe(false)
    expect(boardtvshouldshow('board-a', true)).toBe(true)

    mediaqueuesetlistening(true)
    mediaqueuesetlistenboardid('board-a')
    expect(boardtvshouldshow('board-a', true)).toBe(true)
    expect(boardtvshouldshow('board-b', true)).toBe(false)
    mediaqueueclearlistenstate()
  })
})
