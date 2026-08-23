import {
  MQ_MAX_DURATION_SEC,
  MQ_SHORT_FORM_ALLOW_DUP_SEC,
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
  mqqueuedurationforallow,
  mqqueuereaddisk,
  mqqueueshortformallowsduplicate,
} from 'ops/media-queue/src/shared/queue'
import {
  mqismusicyoutubeurl,
  mqparseplaylistflatstdout,
  mqparseprobebatchstdout,
  mqplaylistentryurl,
  mqqueuenormalizeurl,
  mqurlisplaylistcontainer,
  mqurlwantscookies,
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
    expect(mqqueuesetlimit(queue, 99)).toBe(50)
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

describe('mqurlisplaylistcontainer', () => {
  it('expands youtube playlist pages and list-only urls', () => {
    expect(
      mqurlisplaylistcontainer(
        'https://www.youtube.com/playlist?list=PLabc123',
      ),
    ).toBe(true)
    expect(
      mqurlisplaylistcontainer('https://www.youtube.com/watch?list=PLabc123'),
    ).toBe(true)
  })

  it('keeps watch and watch+list as single items', () => {
    expect(
      mqurlisplaylistcontainer('https://www.youtube.com/watch?v=abc123'),
    ).toBe(false)
    expect(
      mqurlisplaylistcontainer(
        'https://www.youtube.com/watch?v=abc123&list=PLabc123',
      ),
    ).toBe(false)
    expect(
      mqurlisplaylistcontainer('https://youtu.be/abc123?list=PLabc123'),
    ).toBe(false)
    expect(
      mqurlisplaylistcontainer('https://www.youtube.com/shorts/abc123xyz'),
    ).toBe(false)
  })

  it('expands soundcloud sets but not tracks', () => {
    expect(
      mqurlisplaylistcontainer('https://soundcloud.com/artist/sets/my-set'),
    ).toBe(true)
    expect(
      mqurlisplaylistcontainer('https://soundcloud.com/artist/cool-track'),
    ).toBe(false)
  })
})

describe('mqparseplaylistflatstdout', () => {
  const playlist = 'https://www.youtube.com/playlist?list=PLabc123'

  it('parses multi-entry flat lines and builds watch urls from ids', () => {
    const stdout = [
      'NA\tNA\tidAAA111\tFirst\t120',
      'https://www.youtube.com/watch?v=idBBB222\tidBBB222\tidBBB222\tSecond\tNA',
    ].join('\n')
    const entries = mqparseplaylistflatstdout(stdout, playlist)
    expect(entries).toEqual([
      {
        id: 'idAAA111',
        url: 'https://www.youtube.com/watch?v=idAAA111',
        title: 'First',
        durationsec: 120,
      },
      {
        id: 'idBBB222',
        url: 'https://www.youtube.com/watch?v=idBBB222',
        title: 'Second',
        durationsec: 0,
      },
    ])
  })

  it('skips rows with no resolvable url', () => {
    expect(
      mqparseplaylistflatstdout('NA\tNA\tNA\tNope\t1\n', playlist),
    ).toEqual([])
    expect(mqplaylistentryurl('NA', 'NA', '', playlist)).toBe('')
  })

  it('returns one entry for a single line', () => {
    const entries = mqparseplaylistflatstdout(
      'https://www.youtube.com/watch?v=only1\tonly1\tonly1\tSolo\t30\n',
      playlist,
    )
    expect(entries).toHaveLength(1)
    expect(entries[0].url).toContain('only1')
  })
})

describe('mqurlwantscookies', () => {
  it('is true for youtube hosts', () => {
    expect(mqurlwantscookies('https://youtu.be/abc')).toBe(true)
    expect(mqurlwantscookies('https://www.youtube.com/watch?v=abc')).toBe(true)
    expect(mqurlwantscookies('https://music.youtube.com/watch?v=abc')).toBe(true)
  })

  it('is false for soundcloud and junk', () => {
    expect(mqurlwantscookies('https://soundcloud.com/kimpetras/demons')).toBe(
      false,
    )
    expect(mqurlwantscookies('not a url')).toBe(false)
    expect(mqurlwantscookies('')).toBe(false)
  })
})

describe('mqparseprobebatchstdout', () => {
  it('parses id, canonical url, title, duration and video shape', () => {
    // Audio-only hosts print NA for the video fields.
    const stdout = [
      '686180068\thttps://soundcloud.com/kimpetras/everybody-dies\tEverybody Dies\t30.0\tNA\tNA\t0',
      'LC_BUIpYIso\thttps://www.youtube.com/watch?v=LC_BUIpYIso\tPurgatory\t165.0\t1080\t1080\t48.822',
    ].join('\n')
    expect(mqparseprobebatchstdout(stdout)).toEqual([
      {
        id: '686180068',
        url: 'https://soundcloud.com/kimpetras/everybody-dies',
        title: 'Everybody Dies',
        durationsec: 30,
        width: 0,
        height: 0,
        vbrkbps: 0,
      },
      {
        id: 'LC_BUIpYIso',
        url: 'https://www.youtube.com/watch?v=LC_BUIpYIso',
        title: 'Purgatory',
        durationsec: 165,
        width: 1080,
        height: 1080,
        vbrkbps: 48.822,
      },
    ])
  })

  it('parses a single line on its own', () => {
    // The scan reports progress per line as yt-dlp prints it, so each line has
    // to stand alone rather than needing the whole stdout buffer.
    expect(
      mqparseprobebatchstdout(
        'LC_BUIpYIso\thttps://www.youtube.com/watch?v=LC_BUIpYIso\tPurgatory\t165.0\t1080\t1080\t48.822',
      ),
    ).toHaveLength(1)
  })

  it('joins a flat api url entry back by id', () => {
    // SoundCloud flat listings report api-v2 urls for some entries while the
    // metadata pass reports the permalink, so only the id lines them up.
    const flat = mqparseplaylistflatstdout(
      'https://api-v2.soundcloud.com/tracks/911128207\thttps://api-v2.soundcloud.com/tracks/911128207\t911128207\tNA\tNA\n',
      'https://soundcloud.com/kimpetras/sets/turn-off-the-light-9',
    )
    const batch = mqparseprobebatchstdout(
      '911128207\thttps://soundcloud.com/kimpetras/party-till-i-die\tParty Till I Die\t30.0\n',
    )
    expect(flat[0].id).toBe('911128207')
    expect(mqqueuenormalizeurl(flat[0].url)).not.toBe(
      mqqueuenormalizeurl(batch[0].url),
    )
    expect(batch[0].id).toBe(flat[0].id)
  })

  it('treats NA fields as empty and skips rows with no id or url', () => {
    expect(mqparseprobebatchstdout('NA\tNA\tNA\tNA\n')).toEqual([])
    expect(mqparseprobebatchstdout('\n \n')).toEqual([])
  })
})


describe('mqqueueshortformallowsduplicate', () => {
  it('allows known durations of 30s or less', () => {
    expect(mqqueueshortformallowsduplicate(10)).toBe(true)
    expect(mqqueueshortformallowsduplicate(12)).toBe(true)
    expect(mqqueueshortformallowsduplicate(30)).toBe(true)
  })

  it('rejects longer or unknown durations', () => {
    expect(mqqueueshortformallowsduplicate(30.1)).toBe(false)
    expect(mqqueueshortformallowsduplicate(90)).toBe(false)
    expect(mqqueueshortformallowsduplicate(0)).toBe(false)
    expect(mqqueueshortformallowsduplicate(-1)).toBe(false)
    expect(mqqueueshortformallowsduplicate(Number.NaN)).toBe(false)
  })

  it('matches the shared allow-dup seconds constant', () => {
    expect(MQ_SHORT_FORM_ALLOW_DUP_SEC).toBe(30)
  })
})

describe('mqqueueadd short-form duplicates', () => {
  it('allows the same short url twice', () => {
    const queue = mqqueuecreate()
    expect(
      mqqueueadd(queue, 'p1', 'goldbuick', 'https://short.example/a', {
        durationsec: 10,
      }).ok,
    ).toBe(true)
    expect(
      mqqueueadd(queue, 'p1', 'goldbuick', 'https://short.example/a', {
        durationsec: 10,
      }).ok,
    ).toBe(true)
    expect(mqqueuereadsnapshot(queue).urls).toEqual([
      'https://short.example/a',
      'https://short.example/a',
    ])
  })

  it('allows a 30s clip to be re-added', () => {
    const queue = mqqueuecreate()
    expect(
      mqqueueadd(queue, 'p1', 'goldbuick', 'https://short.example/b', {
        durationsec: 30,
      }).ok,
    ).toBe(true)
    expect(
      mqqueueadd(queue, 'p2', 'guest', 'https://short.example/b', {
        durationsec: 30,
      }).ok,
    ).toBe(true)
  })


  it('allows re-add when probe omits duration but queued entry is short', () => {
    const queue = mqqueuecreate()
    expect(
      mqqueueadd(queue, 'p1', 'goldbuick', 'https://short.example/reuse', {
        durationsec: 12,
      }).ok,
    ).toBe(true)
    expect(
      mqqueueadd(queue, 'p1', 'goldbuick', 'https://short.example/reuse', {
        durationsec: 0,
      }).ok,
    ).toBe(true)
    expect(mqqueuereadsnapshot(queue).urls.length).toBe(2)
  })

  it('keeps video shape when re-probe marks the duplicate audio-only', () => {
    const queue = mqqueuecreate()
    expect(
      mqqueueadd(queue, 'p1', 'goldbuick', 'https://short.example/video', {
        durationsec: 15,
        audioonly: false,
      }).ok,
    ).toBe(true)
    expect(
      mqqueueadd(queue, 'p1', 'goldbuick', 'https://short.example/video', {
        durationsec: 15,
        audioonly: true,
      }).ok,
    ).toBe(true)
    expect(mqqueuereaddisk(queue).audioonlys).toEqual([false, false])
    expect(mqqueueallowlongforurl(queue, 'https://short.example/video')).toBe(
      false,
    )
  })

  it('still rejects long duplicates', () => {
    const queue = mqqueuecreate()
    expect(
      mqqueueadd(queue, 'p1', 'goldbuick', 'https://long.example/c', {
        durationsec: 60,
      }).ok,
    ).toBe(true)
    expect(
      mqqueueadd(queue, 'p1', 'goldbuick', 'https://long.example/c', {
        durationsec: 60,
      }),
    ).toEqual({ ok: false, reason: 'duplicate' })
  })
})
