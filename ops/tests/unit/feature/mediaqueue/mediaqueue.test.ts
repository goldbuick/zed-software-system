import { boardtvshouldshow } from 'zss/feature/mediaqueue/boardtvvisible'
import {
  mediaqueuecallmetadata,
  ismediaqueuecallmetadata,
} from 'zss/feature/mediaqueue/callmetadata'
import {
  BOARD_TV_COLS,
  BOARD_TV_COMPOSITOR_HEIGHT,
  BOARD_TV_COMPOSITOR_WIDTH,
  BOARD_TV_ROWS,
  boardtvlayout,
  boardtvisupright,
  boardtvlayerz,
} from 'zss/feature/mediaqueue/constants'
import { boardtvscreenrows, boardtvvideofit } from 'zss/gadget/boardtvgrid'
import {
  mediaqueueclearlistenstate,
  mediaqueuesetboardhelper,
  mediaqueuesethelperconnected,
} from 'zss/feature/mediaqueue/listenstate'
import {
  MEDIAQUEUE_PROTOCOL,
  ismediaqueuemessage,
} from 'zss/feature/mediaqueue/protocol'
import {
  mediaqueueapplysnapshot,
  mediaqueuecurrenturl,
  mediaqueuereadperplayerlimit,
  mediaqueuereadstate,
} from 'zss/feature/mediaqueue/queue'
import { mediaqueueroompeerids } from 'zss/feature/mediaqueue/roompeers'
import {
  mediaqueuesetplayerlayerstate,
  mediaqueueclearplayerlayerstate,
} from 'zss/feature/mediaqueue/playerlayerstate'
import { mediaqueuenormalizeurl, mediaisqueueurl, mediaischatqueueurl } from 'zss/feature/mediaqueue/urlnormalize'

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

  it('chat shortcut allowlists whole-message media hosts only', () => {
    expect(mediaischatqueueurl('https://youtu.be/abc123')).toBe(true)
    expect(mediaischatqueueurl('  https://www.youtube.com/watch?v=abc  ')).toBe(
      true,
    )
    expect(mediaischatqueueurl('https://soundcloud.com/a/b')).toBe(true)
    expect(mediaischatqueueurl('https://m.soundcloud.com/a/b')).toBe(true)
    expect(mediaischatqueueurl('https://audiomack.com/a/song')).toBe(true)
    expect(mediaischatqueueurl('https://hearthis.at/a/b')).toBe(true)
    expect(mediaischatqueueurl('https://archive.org/details/foo')).toBe(true)
    expect(mediaischatqueueurl('https://example.com/x')).toBe(false)
    expect(mediaischatqueueurl('check this https://youtu.be/x')).toBe(false)
    expect(mediaischatqueueurl('https://youtu.be/x please')).toBe(false)
    expect(mediaischatqueueurl('')).toBe(false)
  })
})

describe('mediaqueue queue projection', () => {
  const helper = 'helper-peer-1'

  beforeEach(() => {
    mediaqueueapplysnapshot(
      {
        urls: [],
        names: [],
        index: 0,
        limit: 5,
      },
      helper,
    )
  })

  it('applies helper snapshot for #media table', () => {
    mediaqueueapplysnapshot(
      {
        urls: ['https://a.example', 'https://b.example'],
        names: ['goldbuick', 'guest'],
        index: 0,
        limit: 3,
      },
      helper,
    )
    expect(mediaqueuereadstate(helper)).toEqual({
      urls: ['https://a.example', 'https://b.example'],
      names: ['goldbuick', 'guest'],
      titles: ['', ''],
      submittedats: [0, 0],
      index: 0,
      perplayerlimit: 3,
      pendingurls: [],
      pendingnames: [],
      pendingtitles: [],
      pendingdurations: [],
      playedurls: [],
      playednames: [],
      playedtitles: [],
      playedsubmittedats: [],
    })
    expect(mediaqueuecurrenturl(helper)).toBe('https://a.example')
    mediaqueueapplysnapshot(
      {
        urls: ['https://b.example'],
        names: ['guest'],
        index: 0,
        limit: 3,
      },
      helper,
    )
    expect(mediaqueuecurrenturl(helper)).toBe('https://b.example')
    expect(mediaqueuereadstate(helper).urls).toEqual(['https://b.example'])
  })

  it('clamps snapshot limit and index', () => {
    mediaqueueapplysnapshot(
      {
        urls: ['https://a.example', 'https://b.example'],
        names: ['a', 'b'],
        index: 99,
        limit: 99,
      },
      helper,
    )
    expect(mediaqueuereadperplayerlimit(helper)).toBe(50)
    expect(mediaqueuereadstate(helper).index).toBe(1)
    mediaqueueapplysnapshot(
      {
        urls: ['https://a.example'],
        names: ['a'],
        index: -1,
        limit: 0,
      },
      helper,
    )
    expect(mediaqueuereadperplayerlimit(helper)).toBe(1)
    expect(mediaqueuereadstate(helper).index).toBe(0)
  })

  it('clearlistenstate does not empty the projection', () => {
    mediaqueueapplysnapshot(
      {
        urls: ['https://a.example', 'https://b.example'],
        names: ['goldbuick', 'guest'],
        index: 0,
        limit: 5,
      },
      helper,
    )
    mediaqueueclearlistenstate()
    expect(mediaqueuereadstate(helper).urls).toEqual([
      'https://a.example',
      'https://b.example',
    ])
  })

  it('keeps separate projections per helper peer', () => {
    mediaqueueapplysnapshot(
      {
        urls: ['https://a.example'],
        names: ['a'],
        index: 0,
        limit: 5,
      },
      'helper-a',
    )
    mediaqueueapplysnapshot(
      {
        urls: ['https://b.example'],
        names: ['b'],
        index: 0,
        limit: 5,
      },
      'helper-b',
    )
    expect(mediaqueuecurrenturl('helper-a')).toBe('https://a.example')
    expect(mediaqueuecurrenturl('helper-b')).toBe('https://b.example')
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
    expect(
      ismediaqueuemessage({
        type: 'mediaqueue:add',
        url: 'https://a.example',
        player: 'p1',
        name: 'goldbuick',
      }),
    ).toBe(true)
    expect(
      ismediaqueuemessage({
        type: 'mediaqueue:queuesnapshot',
        urls: ['https://a.example'],
        names: ['goldbuick'],
        index: 0,
        limit: 5,
      }),
    ).toBe(true)
    expect(ismediaqueuemessage({ type: 'mediaqueue:skip' })).toBe(true)
    expect(ismediaqueuemessage({ type: 'mediaqueue:clear' })).toBe(true)
    expect(ismediaqueuemessage({ type: 'mediaqueue:setlimit', limit: 8 })).toBe(
      true,
    )
    expect(ismediaqueuemessage({ type: 'mediaqueue:approve', index: 0 })).toBe(
      true,
    )
    expect(ismediaqueuemessage({ type: 'mediaqueue:reject', index: 1 })).toBe(
      true,
    )
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
    mediaqueueclearplayerlayerstate()
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

  it('boardtvlayout flips video and sets backface per mode', () => {
    for (const mode of ['flat', 'mode7', 'iso', 'fpv'] as const) {
      const layout = boardtvlayout(mode, 28)
      expect(layout.videoflipvertical).toBe(true)
    }
  })

  it('boardtvlayout widens video z separation outside flat', () => {
    expect(boardtvlayout('flat', 28).videoz).toBeCloseTo(0.001)
    expect(boardtvlayout('mode7', 28).videoz).toBeCloseTo(1.4)
    expect(boardtvlayout('iso', 28).videoz).toBeCloseTo(1.4)
    expect(boardtvlayout('fpv', 28).videoz).toBeCloseTo(1.4)
  })

  it('boardtvlayout gives only fpv a turned-around second face', () => {
    expect(boardtvlayout('fpv', 28).backface).toBe(true)
    expect(boardtvlayout('iso', 28).backface).toBe(false)
    expect(boardtvlayout('flat', 28).backface).toBe(false)
    expect(boardtvlayout('mode7', 28).backface).toBe(false)
  })

  it('boardtvvideofit letterboxes inside the screen rect', () => {
    const rect = { width: 400, height: 100, centerx: 0, centery: -5 }
    const wide = boardtvvideofit(800, 100, rect)
    expect(wide.width).toBeCloseTo(400)
    expect(wide.height).toBeCloseTo(50)
    const tall = boardtvvideofit(100, 400, rect)
    expect(tall.width).toBeCloseTo(25)
    expect(tall.height).toBeCloseTo(100)
    expect(tall.centery).toBe(-5)
  })

  it('boardtvvideofit falls back to compositor size before metadata lands', () => {
    const fit = boardtvvideofit(0, 0, {
      width: BOARD_TV_COMPOSITOR_WIDTH,
      height: BOARD_TV_COMPOSITOR_HEIGHT,
      centerx: 0,
      centery: 0,
    })
    expect(fit.width).toBeCloseTo(BOARD_TV_COMPOSITOR_WIDTH)
    expect(fit.height).toBeCloseTo(BOARD_TV_COMPOSITOR_HEIGHT)
  })

  it('boardtvscreenrows uses the full tv footprint', () => {
    expect(boardtvscreenrows()).toEqual({ start: 0, count: BOARD_TV_ROWS })
  })

  it('boardtvshouldshow matches bound board when listening', () => {
    mediaqueuesetboardhelper('board-a', 'helper-1')
    mediaqueuesethelperconnected('helper-1', true)
    expect(boardtvshouldshow('board-a', true)).toBe(true)
    expect(boardtvshouldshow('board-b', true)).toBe(false)
    expect(boardtvshouldshow('board-a', false)).toBe(true)
    mediaqueuesethelperconnected('helper-1', false)
    expect(boardtvshouldshow('board-a', false)).toBe(false)
    expect(boardtvshouldshow('board-a', true)).toBe(true)
    mediaqueueclearlistenstate()
  })

  it('boardtvshouldshow is true for each board sharing a helper', () => {
    mediaqueuesetboardhelper('board-a', 'helper-1')
    mediaqueuesetboardhelper('board-b', 'helper-1')
    mediaqueuesethelperconnected('helper-1', true)
    expect(boardtvshouldshow('board-a', false)).toBe(true)
    expect(boardtvshouldshow('board-b', false)).toBe(true)
    mediaqueueclearlistenstate()
  })

  it('boardtvshouldshow tracks different helpers per board', () => {
    mediaqueuesetboardhelper('board-a', 'helper-1')
    mediaqueuesetboardhelper('board-b', 'helper-2')
    mediaqueuesethelperconnected('helper-1', true)
    mediaqueuesethelperconnected('helper-2', false)
    expect(boardtvshouldshow('board-a', false)).toBe(true)
    expect(boardtvshouldshow('board-b', false)).toBe(false)
    expect(boardtvshouldshow('board-b', true)).toBe(true)
    mediaqueueclearlistenstate()
  })

  it('boardtvshouldshow shows mount when synced helper layer is on board', () => {
    mediaqueueclearlistenstate()
    mediaqueuesetplayerlayerstate('helper-1', 'board-a', false)
    expect(boardtvshouldshow('board-a', false)).toBe(true)
    expect(boardtvshouldshow('board-b', false)).toBe(false)
    mediaqueueclearplayerlayerstate()
  })

  it('boardtvshouldshow does not follow join players off the connected board', () => {
    mediaqueueclearlistenstate()
    expect(boardtvshouldshow('any-board', true)).toBe(false)
    expect(boardtvshouldshow('any-board', false)).toBe(false)
    mediaqueuesetplayerlayerstate('helper-1', 'board-a', false)
    expect(boardtvshouldshow('board-a', true)).toBe(true)
    expect(boardtvshouldshow('board-b', true)).toBe(false)
  })

  it('uses landscape tv size constants', () => {
    expect(BOARD_TV_COLS).toBe(40)
    expect(BOARD_TV_ROWS).toBe(15)
    expect(BOARD_TV_COLS).toBeGreaterThan(BOARD_TV_ROWS)
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
