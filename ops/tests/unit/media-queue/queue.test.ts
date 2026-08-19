import {
  MQ_MAX_DURATION_SEC,
  mqqueueadd,
  mqqueueallowlongforurl,
  mqqueueapplydisk,
  mqqueueapprove,
  mqqueueclear,
  mqqueuecountplayer,
  mqqueuecreate,
  mqqueuecurrenturl,
  mqqueueneedspending,
  mqqueueparsedisk,
  mqqueuepend,
  mqqueuereadsnapshot,
  mqqueuereject,
  mqqueuesetlimit,
  mqqueueshift,
  mqqueueskip,
} from 'ops/media-queue/src/shared/queue'
import {
  mqismusicyoutubeurl,
  mqqueuenormalizeurl,
} from 'ops/media-queue/src/shared/urlnormalize'

describe('helper queue owner', () => {
  it('adds urls for a player and plays fifo front', () => {
    const queue = mqqueuecreate()
    mqqueuesetlimit(queue, 3)
    expect(mqqueueadd(queue, 'p1', 'goldbuick', 'https://a.example').ok).toBe(
      true,
    )
    expect(mqqueueadd(queue, 'p2', 'guest', 'https://b.example').ok).toBe(true)
    expect(mqqueuereadsnapshot(queue)).toEqual({
      urls: ['https://a.example', 'https://b.example'],
      names: ['goldbuick', 'guest'],
      titles: ['', ''],
      submittedats: expect.any(Array),
      index: 0,
      limit: 3,
      pendingurls: [],
      pendingnames: [],
      pendingtitles: [],
      pendingdurations: [],
      playedurls: [],
      playednames: [],
      playedtitles: [],
      playedsubmittedats: [],
    })
    expect(mqqueuecurrenturl(queue)).toBe('https://a.example')
    mqqueueskip(queue)
    expect(mqqueuecurrenturl(queue)).toBe('https://b.example')
    expect(mqqueuereadsnapshot(queue).urls).toEqual(['https://b.example'])
    expect(mqqueuereadsnapshot(queue).playedurls).toEqual(['https://a.example'])
  })

  it('rejects duplicate normalized urls', () => {
    const queue = mqqueuecreate()
    expect(
      mqqueueadd(queue, 'p1', 'goldbuick', 'https://youtu.be/abc123').ok,
    ).toBe(true)
    expect(
      mqqueueadd(
        queue,
        'p2',
        'guest',
        'https://www.youtube.com/watch?v=abc123',
      ).ok,
    ).toBe(false)
  })

  it('enforces per-player limit', () => {
    const queue = mqqueuecreate()
    mqqueuesetlimit(queue, 3)
    expect(mqqueueadd(queue, 'p1', 'goldbuick', 'https://a.example').ok).toBe(
      true,
    )
    expect(mqqueueadd(queue, 'p1', 'goldbuick', 'https://b.example').ok).toBe(
      true,
    )
    expect(mqqueueadd(queue, 'p1', 'goldbuick', 'https://c.example').ok).toBe(
      true,
    )
    expect(mqqueueadd(queue, 'p1', 'goldbuick', 'https://d.example').ok).toBe(
      false,
    )
    expect(mqqueuecountplayer(queue, 'p1')).toBe(3)
  })

  it('clamps limit setter', () => {
    const queue = mqqueuecreate()
    expect(mqqueuesetlimit(queue, 99)).toBe(20)
    expect(mqqueuesetlimit(queue, 0)).toBe(1)
  })

  it('shift removes front entry', () => {
    const queue = mqqueuecreate()
    mqqueueadd(queue, 'p1', 'goldbuick', 'https://a.example')
    mqqueueadd(queue, 'p1', 'goldbuick', 'https://b.example')
    const removed = mqqueueshift(queue)
    expect(removed?.url).toBe('https://a.example')
    expect(removed?.name).toBe('goldbuick')
    expect(mqqueuecurrenturl(queue)).toBe('https://b.example')
  })

  it('parses disk snapshot and drops played index prefix', () => {
    const queue = mqqueuecreate()
    mqqueueapplydisk(
      queue,
      mqqueueparsedisk({
        urls: ['https://a.example', 'https://b.example'],
        names: ['a', 'b'],
        players: ['p1', 'p2'],
        index: 1,
        limit: 8,
      }),
    )
    expect(mqqueuecurrenturl(queue)).toBe('https://b.example')
    expect(mqqueuereadsnapshot(queue).limit).toBe(8)
  })

  it('parsedisk rejects non-objects', () => {
    expect(() => mqqueueparsedisk('nope')).toThrow(/object/)
  })

  it('clear empties fifo and pending but keeps played', () => {
    const queue = mqqueuecreate()
    mqqueueadd(queue, 'p1', 'goldbuick', 'https://a.example')
    mqqueueshift(queue)
    mqqueuepend(queue, 'p1', 'goldbuick', 'https://long.example', {
      durationsec: 900,
    })
    mqqueueclear(queue)
    expect(mqqueuereadsnapshot(queue).urls).toEqual([])
    expect(mqqueuereadsnapshot(queue).pendingurls).toEqual([])
    expect(mqqueuereadsnapshot(queue).playedurls).toEqual(['https://a.example'])
  })

  it('pends long urls and approve moves them onto fifo with allowlong', () => {
    const queue = mqqueuecreate()
    expect(mqqueueneedspending(MQ_MAX_DURATION_SEC + 1)).toBe(true)
    expect(
      mqqueuepend(queue, 'p1', 'goldbuick', 'https://long.example', {
        title: 'Long Mix',
        durationsec: 900,
      }).ok,
    ).toBe(true)
    expect(mqqueueadd(queue, 'p1', 'goldbuick', 'https://long.example').ok).toBe(
      false,
    )
    expect(mqqueuereadsnapshot(queue).pendingurls).toEqual([
      'https://long.example',
    ])
    expect(mqqueueapprove(queue, 0)?.url).toBe('https://long.example')
    expect(mqqueuecurrenturl(queue)).toBe('https://long.example')
    expect(mqqueueallowlongforurl(queue, 'https://long.example')).toBe(true)
    expect(mqqueuereadsnapshot(queue).pendingurls).toEqual([])
  })

  it('reject drops pending without adding to fifo', () => {
    const queue = mqqueuecreate()
    mqqueuepend(queue, 'p1', 'goldbuick', 'https://long.example')
    expect(mqqueuereject(queue, 0)?.url).toBe('https://long.example')
    expect(mqqueuecurrenturl(queue)).toBeUndefined()
    expect(mqqueuereadsnapshot(queue).pendingurls).toEqual([])
  })

  it('counts pending toward per-player limit', () => {
    const queue = mqqueuecreate()
    mqqueuesetlimit(queue, 1)
    expect(
      mqqueuepend(queue, 'p1', 'goldbuick', 'https://long.example').ok,
    ).toBe(true)
    expect(mqqueueadd(queue, 'p1', 'goldbuick', 'https://a.example').ok).toBe(
      false,
    )
    expect(mqqueuecountplayer(queue, 'p1')).toBe(1)
  })
})

describe('helper url normalize', () => {
  it('collapses youtube watch and youtu.be to the same key', () => {
    const a = mqqueuenormalizeurl(
      'https://www.youtube.com/watch?v=abc123&utm_source=x',
    )
    const b = mqqueuenormalizeurl('https://youtu.be/abc123')
    expect(a).toBe('youtube:abc123')
    expect(b).toBe('youtube:abc123')
  })

  it('detects music.youtube.com hosts', () => {
    expect(
      mqismusicyoutubeurl('https://music.youtube.com/watch?v=abc123'),
    ).toBe(true)
    expect(mqismusicyoutubeurl('https://www.youtube.com/watch?v=abc123')).toBe(
      false,
    )
  })
})
