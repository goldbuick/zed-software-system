import {
  mqqueueadd,
  mqqueueapplydisk,
  mqqueueclear,
  mqqueuecountplayer,
  mqqueuecreate,
  mqqueuecurrenturl,
  mqqueueparsedisk,
  mqqueuereadsnapshot,
  mqqueuesetlimit,
  mqqueueshift,
  mqqueueskip,
} from 'ops/media-queue/src/shared/queue'
import { mqqueuenormalizeurl } from 'ops/media-queue/src/shared/urlnormalize'

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
      index: 0,
      limit: 3,
    })
    expect(mqqueuecurrenturl(queue)).toBe('https://a.example')
    mqqueueskip(queue)
    expect(mqqueuecurrenturl(queue)).toBe('https://b.example')
    expect(mqqueuereadsnapshot(queue).urls).toEqual(['https://b.example'])
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
    mqqueueapplydisk(queue, {
      urls: ['https://a.example', 'https://b.example'],
      names: ['a', 'b'],
      players: ['p1', 'p2'],
      index: 1,
      limit: 8,
    })
    expect(mqqueuecurrenturl(queue)).toBe('https://b.example')
    expect(mqqueuereadsnapshot(queue).limit).toBe(8)
  })

  it('parsedisk rejects non-objects', () => {
    expect(() => mqqueueparsedisk('nope')).toThrow(/object/)
  })

  it('clear empties remaining urls', () => {
    const queue = mqqueuecreate()
    mqqueueadd(queue, 'p1', 'goldbuick', 'https://a.example')
    mqqueueclear(queue)
    expect(mqqueuereadsnapshot(queue).urls).toEqual([])
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
})
