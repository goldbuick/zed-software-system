import {
  gadgetsyncawaitpersistqueue,
  gadgetsynccollection,
  gadgetsyncensure,
  gadgetsyncflushdbfortests,
  gadgetsyncingest,
} from '../gadgetsyncdb'

describe('gadgetsyncdb', () => {
  beforeEach(async () => {
    await gadgetsyncflushdbfortests()
    await gadgetsyncawaitpersistqueue()
  })

  afterEach(async () => {
    await gadgetsyncawaitpersistqueue()
  })

  it('ingest ignores stale rev', async () => {
    await gadgetsyncensure()
    gadgetsyncingest('p1', JSON.stringify({ board: 'b2' }), 2)
    await gadgetsyncawaitpersistqueue()
    gadgetsyncingest('p1', JSON.stringify({ board: 'b1' }), 1)
    await gadgetsyncawaitpersistqueue()
    const coll = gadgetsynccollection()
    expect(coll).not.toBeNull()
    const doc = await coll!.findOne('p1').exec()
    expect(doc).not.toBeNull()
    expect(JSON.parse(doc!.documentjson)).toEqual({ board: 'b2' })
    expect(doc!.rev).toBe(2)
  })
})
