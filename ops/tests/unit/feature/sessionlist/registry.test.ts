import {
  SESSIONLIST_TTL_MS,
  createsessionlistregistry,
  sessionlistexpire,
  sessionlistremovebyconnection,
  sessionlistsnapshot,
  sessionlistupsert,
} from 'zss/feature/sessionlist/registry'

describe('sessionlist registry', () => {
  it('upserts and refreshes by connection', () => {
    const registry = createsessionlistregistry()
    sessionlistupsert(registry, 'c1', 'topica', 1, 100)
    sessionlistupsert(registry, 'c1', 'topica', 3, 200)
    expect(sessionlistsnapshot(registry)).toEqual([
      { topic: 'topica', players: 3, updated: 200 },
    ])
  })

  it('expires entries past the TTL only', () => {
    const registry = createsessionlistregistry()
    sessionlistupsert(registry, 'c1', 'topica', 1, 0)
    sessionlistupsert(registry, 'c2', 'topicb', 1, 50_000)
    expect(sessionlistexpire(registry, SESSIONLIST_TTL_MS)).toBe(false)
    expect(sessionlistexpire(registry, SESSIONLIST_TTL_MS + 1)).toBe(true)
    expect(sessionlistsnapshot(registry).map((e) => e.topic)).toEqual([
      'topicb',
    ])
  })

  it('removes entries when the connection closes', () => {
    const registry = createsessionlistregistry()
    sessionlistupsert(registry, 'c1', 'topica', 1, 0)
    expect(sessionlistremovebyconnection(registry, 'c1')).toBe(true)
    expect(sessionlistremovebyconnection(registry, 'c1')).toBe(false)
    expect(sessionlistsnapshot(registry)).toEqual([])
  })

  it('sorts by players then recency and dedupes topics', () => {
    const registry = createsessionlistregistry()
    sessionlistupsert(registry, 'c1', 'small', 1, 300)
    sessionlistupsert(registry, 'c2', 'bigold', 4, 100)
    sessionlistupsert(registry, 'c3', 'bignew', 4, 200)
    sessionlistupsert(registry, 'c4', 'small', 2, 400)
    expect(sessionlistsnapshot(registry)).toEqual([
      { topic: 'bignew', players: 4, updated: 200 },
      { topic: 'bigold', players: 4, updated: 100 },
      { topic: 'small', players: 2, updated: 400 },
    ])
  })
})
