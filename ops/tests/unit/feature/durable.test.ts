jest.mock('idb-keyval', () => ({
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  del: jest.fn(),
  getMany: jest.fn(),
  entries: jest.fn(),
  setMany: jest.fn(),
}))

import {
  del,
  entries,
  get,
  getMany,
  set,
  setMany,
  update,
} from 'idb-keyval'
import {
  durabledel,
  durableentries,
  durableget,
  durablegetmany,
  durableset,
  durablesetmany,
  durableupdate,
} from 'zss/feature/durable'

describe('durable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('durableget delegates to idb-keyval get', async () => {
    jest.mocked(get).mockResolvedValue('value')
    await expect(durableget<string>('key')).resolves.toBe('value')
    expect(get).toHaveBeenCalledWith('key')
  })

  it('durableset delegates to idb-keyval set', async () => {
    await durableset('key', { a: 1 })
    expect(set).toHaveBeenCalledWith('key', { a: 1 })
  })

  it('durableupdate delegates to idb-keyval update', async () => {
    const updater = (old: number | undefined) => (old ?? 0) + 1
    await durableupdate('n', updater)
    expect(update).toHaveBeenCalledWith('n', updater)
  })

  it('durabledel delegates to idb-keyval del', async () => {
    await durabledel('key')
    expect(del).toHaveBeenCalledWith('key')
  })

  it('durablegetmany delegates to idb-keyval getMany', async () => {
    jest.mocked(getMany).mockResolvedValue(['a', 'b'])
    await expect(durablegetmany<string>(['k1', 'k2'])).resolves.toEqual([
      'a',
      'b',
    ])
    expect(getMany).toHaveBeenCalledWith(['k1', 'k2'])
  })

  it('durableentries stringifies keys', async () => {
    jest.mocked(entries).mockResolvedValue([
      ['config_crt', 'on'],
      [1 as unknown as string, 'num'],
    ])
    await expect(durableentries()).resolves.toEqual([
      ['config_crt', 'on'],
      ['1', 'num'],
    ])
  })

  it('durablesetmany skips empty list', async () => {
    await durablesetmany([])
    expect(setMany).not.toHaveBeenCalled()
  })

  it('durablesetmany delegates to idb-keyval setMany', async () => {
    const rows: [string, unknown][] = [['storage', { user: 'x' }]]
    await durablesetmany(rows)
    expect(setMany).toHaveBeenCalledWith(rows)
  })
})
