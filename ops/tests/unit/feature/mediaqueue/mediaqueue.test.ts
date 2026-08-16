import { boardtvshouldshow } from 'zss/feature/mediaqueue/boardtvvisible'
import {
  mediaqueuecallmetadata,
  ismediaqueuecallmetadata,
} from 'zss/feature/mediaqueue/callmetadata'
import {
  BOARD_TV_COLS,
  BOARD_TV_ROWS,
  boardtvlayout,
  boardtvisupright,
  boardtvlayerz,
} from 'zss/feature/mediaqueue/constants'
import { boardtvscreenrows } from 'zss/gadget/boardtvgrid'
import {
  mediaqueueclearlistenstate,
  mediaqueuesethelperconnected,
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
  mediaqueuecountforplayer,
  mediaqueuecurrenturl,
  mediaqueuereadperplayerlimit,
  mediaqueuereadstate,
  mediaqueuesetperplayerlimit,
  mediaqueueshiftcurrent,
  mediaqueueskip,
} from 'zss/feature/mediaqueue/queue'
import { mediaqueueroompeerids } from 'zss/feature/mediaqueue/roompeers'
import {
  mediaqueuesetplayerlayerstate,
  mediaqueueclearplayerlayerstate,
} from 'zss/feature/mediaqueue/playerlayerstate'
import { mediaqueuenormalizeurl, mediaisqueueurl } from 'zss/feature/mediaqueue/urlnormalize'
import { mediaqueuestatusworklabel } from 'zss/feature/mediaqueue/workstatuslabel'

describe('mediaqueue url normalize', () => {
  it('detects queue URLs vs peer ids', () => {
    expect(mediaisqueueurl('https://www.youtube.com/watch?v=abc')).toBe(true)
    expect(mediaisqueueurl('http://a.example/x')).toBe(true)
    expect(mediaisqueueurl('aa88624b-b68c-449f-bdfd-1bb319e48108')).toBe(false)
    expect(mediaisqueueurl('add')).toBe(false)
  })

  it('collapses youtube watch and youtu.be to the same key', () => {
    const a = mediaqueuenormalizeurl(
      'https://www.youtube.com/watch?v=abc123&utm_source=x',
    )
    const b = mediaqueuenormalizeurl('https://youtu.be/abc123')
    expect(a).toBe('youtube:abc123')
    expect(b).toBe('youtube:abc123')
  })
})

describe('mediaqueue queue', () => {
  beforeEach(() => {
    mediaqueueclear()
    mediaqueuesetperplayerlimit(3)
  })

  it('adds urls for a player and plays fifo front', () => {
    expect(mediaqueueadd('p1', 'https://a.example').ok).toBe(true)
    expect(mediaqueueadd('p2', 'https://b.example').ok).toBe(true)
    expect(mediaqueuereadstate()).toEqual({
      urls: ['https://a.example', 'https://b.example'],
      players: ['p1', 'p2'],
      index: 0,
      perplayerlimit: 3,
    })
    expect(mediaqueuecurrenturl()).toBe('https://a.example')
    mediaqueueskip()
    expect(mediaqueuecurrenturl()).toBe('https://b.example')
    expect(mediaqueuereadstate().urls).toEqual(['https://b.example'])
  })

  it('rejects duplicate normalized urls', () => {
    expect(mediaqueueadd('p1', 'https://youtu.be/abc123').ok).toBe(true)
    expect(mediaqueueadd('p2', 'https://www.youtube.com/watch?v=abc123').ok).toBe(
      false,
    )
  })

  it('enforces per-player limit', () => {
    expect(mediaqueueadd('p1', 'https://a.example').ok).toBe(true)
    expect(mediaqueueadd('p1', 'https://b.example').ok).toBe(true)
    expect(mediaqueueadd('p1', 'https://c.example').ok).toBe(true)
    expect(mediaqueueadd('p1', 'https://d.example').ok).toBe(false)
    expect(mediaqueuecountforplayer('p1')).toBe(3)
  })

  it('clamps limit setter', () => {
    mediaqueuesetperplayerlimit(99)
    expect(mediaqueuereadperplayerlimit()).toBe(20)
    mediaqueuesetperplayerlimit(0)
    expect(mediaqueuereadperplayerlimit()).toBe(1)
  })

  it('shift removes front entry', () => {
    mediaqueueadd('p1', 'https://a.example')
    mediaqueueadd('p1', 'https://b.example')
    const removed = mediaqueueshiftcurrent()
    expect(removed?.url).toBe('https://a.example')
    expect(mediaqueuecurrenturl()).toBe('https://b.example')
  })

  it('clearlistenstate does not empty the queue', () => {
    mediaqueueadd('p1', 'https://a.example')
    mediaqueueadd('p2', 'https://b.example')
    mediaqueueclearlistenstate()
    expect(mediaqueuereadstate().urls).toEqual([
      'https://a.example',
      'https://b.example',
    ])
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
})

describe('mediaqueue board tv', () => {
  beforeEach(() => {
    mediaqueueclearlistenstate()
  })

  it('boardtvisupright is true for fpv and iso', () => {
    expect(boardtvisupright('fpv')).toBe(true)
    expect(boardtvisupright('iso')).toBe(true)
    expect(boardtvisupright('flat')).toBe(false)
    expect(boardtvisupright('mode7')).toBe(false)
  })

  it('boardtvlayerz sits above floor and below sprites', () => {
    expect(boardtvlayerz('flat', 28)).toBe(2)
    expect(boardtvlayerz('iso', 28)).toBe(0.25)
    expect(boardtvlayerz('fpv', 28)).toBe(0.25)
    expect(boardtvlayerz('mode7', 28)).toBeCloseTo(3.36)
  })

  it('boardtvlayout places the marquee identically in every mode', () => {
    for (const mode of ['flat', 'mode7', 'iso', 'fpv'] as const) {
      const layout = boardtvlayout(mode, 28)
      expect(layout.marqueerow).toBe(BOARD_TV_ROWS - 1)
      expect(layout.scrollstep).toBe(1)
      expect(layout.videoflipvertical).toBe(true)
    }
  })

  it('boardtvlayout widens video z separation outside flat', () => {
    expect(boardtvlayout('flat', 28).videoz).toBeCloseTo(0.001)
    expect(boardtvlayout('mode7', 28).videoz).toBeCloseTo(1.4)
    expect(boardtvlayout('iso', 28).videoz).toBeCloseTo(1.4)
    expect(boardtvlayout('fpv', 28).videoz).toBeCloseTo(1.4)
  })

  it('boardtvscreenrows keeps video off the marquee row', () => {
    expect(boardtvscreenrows(BOARD_TV_ROWS - 1)).toEqual({ start: 1, count: 13 })
    expect(boardtvscreenrows(0)).toEqual({ start: 1, count: 13 })
  })

  it('boardtvshouldshow matches bound board when listening', () => {
    mediaqueuesetlistening(true)
    mediaqueuesetlistenboardid('board-a')
    mediaqueuesethelperconnected(true)
    expect(boardtvshouldshow('board-a', true)).toBe(true)
    expect(boardtvshouldshow('board-b', true)).toBe(false)
    expect(boardtvshouldshow('board-a', false)).toBe(true)
    mediaqueuesethelperconnected(false)
    expect(boardtvshouldshow('board-a', false)).toBe(false)
    expect(boardtvshouldshow('board-a', true)).toBe(true)
  })

  it('boardtvshouldshow shows mount when synced helper layer is on board', () => {
    mediaqueueclearlistenstate()
    mediaqueuesetplayerlayerstate('helper-1', 'board-a', false)
    expect(boardtvshouldshow('board-a', false)).toBe(true)
    expect(boardtvshouldshow('board-b', false)).toBe(false)
    mediaqueueclearplayerlayerstate()
  })

  it('boardtvshouldshow shows video when player has direct helper stream', () => {
    mediaqueueclearlistenstate()
    expect(boardtvshouldshow('any-board', true)).toBe(true)
    expect(boardtvshouldshow('any-board', false)).toBe(false)
  })

  it('uses landscape tv size constants', () => {
    expect(BOARD_TV_COLS).toBe(40)
    expect(BOARD_TV_ROWS).toBe(15)
    expect(BOARD_TV_COLS).toBeGreaterThan(BOARD_TV_ROWS)
  })
})

describe('mediaqueue workstatus labels', () => {
  it('maps helper status to badge text', () => {
    expect(mediaqueuestatusworklabel('downloading')).toBe('media fetch')
    expect(mediaqueuestatusworklabel('extracting')).toBe('media extract')
    expect(mediaqueuestatusworklabel('download-progress', '42|1:23')).toBe(
      'media 42%',
    )
    expect(mediaqueuestatusworklabel('download-progress', '99|')).toBe(
      'media process',
    )
    expect(mediaqueuestatusworklabel('transcoding')).toBe('media process')
    expect(mediaqueuestatusworklabel('buffering')).toBe('media buffer')
    expect(mediaqueuestatusworklabel('playing')).toBe('')
  })
})

describe('mediaqueue call metadata', () => {
  it('tags helper, room, and player calls', () => {
    expect(mediaqueuecallmetadata('helper')).toEqual({
      kind: 'mediaqueue',
      source: 'helper',
    })
    expect(mediaqueuecallmetadata('player')).toEqual({
      kind: 'mediaqueue',
      source: 'player',
    })
    expect(ismediaqueuecallmetadata(mediaqueuecallmetadata('room'))).toBe(true)
    expect(ismediaqueuecallmetadata(mediaqueuecallmetadata('player'))).toBe(true)
    expect(ismediaqueuecallmetadata({ kind: 'other' })).toBe(false)
  })
})
