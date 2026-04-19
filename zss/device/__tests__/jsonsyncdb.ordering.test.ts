import {
  clientstreamrowtostream,
  streamreplawaitclientpersistqueue,
  streamreplclientstreammap,
  streamreplflushclientdbfortests,
} from 'zss/device/jsonsyncdb'

describe('streamrepldb client persistence', () => {
  beforeEach(async () => {
    streamreplclientstreammap.clear()
    await streamreplawaitclientpersistqueue()
    await streamreplflushclientdbfortests()
  })

  afterEach(async () => {
    streamreplclientstreammap.clear()
    await streamreplawaitclientpersistqueue()
    await streamreplflushclientdbfortests()
  })

  it('round-trips a row through JSON fields', () => {
    const row = {
      streamid: 's',
      documentjson: '{"a":1}',
      rev: 3,
    }
    const st = clientstreamrowtostream(row)
    expect(st.document).toEqual({ a: 1 })
    expect(st.rev).toBe(3)
  })

  it('flush + await persist queue completes without throwing', async () => {
    await streamreplawaitclientpersistqueue()
    await streamreplflushclientdbfortests()
  })
})
