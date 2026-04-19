import {
  clientstreamrowtostream,
  jsonsyncawaitclientpersistqueue,
  jsonsyncclientstreammap,
  jsonsyncflushclientdbfortests,
} from 'zss/device/jsonsyncdb'

describe('jsonsyncdb client persistence', () => {
  beforeEach(async () => {
    jsonsyncclientstreammap.clear()
    await jsonsyncawaitclientpersistqueue()
    await jsonsyncflushclientdbfortests()
  })

  afterEach(async () => {
    jsonsyncclientstreammap.clear()
    await jsonsyncawaitclientpersistqueue()
    await jsonsyncflushclientdbfortests()
  })

  it('round-trips a row through JSON fields', () => {
    const row = {
      streamid: 's',
      documentjson: '{"a":1}',
      shadowjson: '{"a":1}',
      cv: 0,
      sv: 0,
      arrayidentitykeysjson: '',
    }
    const st = clientstreamrowtostream(row)
    expect(st.document).toEqual({ a: 1 })
    expect(st.shadow).toEqual({ a: 1 })
  })

  it('flush + await persist queue completes without throwing', async () => {
    await jsonsyncawaitclientpersistqueue()
    await jsonsyncflushclientdbfortests()
  })
})
