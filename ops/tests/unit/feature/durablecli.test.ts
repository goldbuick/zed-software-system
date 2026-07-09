jest.mock('zss/feature/durable', () => ({
  durableentries: jest.fn(),
  durablesetmany: jest.fn(),
}))

jest.mock('zss/feature/detect', () => ({
  isclimode: jest.fn(() => true),
}))

import { durableentries, durablesetmany } from 'zss/feature/durable'
import {
  durableflushtodisk,
  durablehydratefromdisk,
  isdurableshorturlkey,
} from 'zss/feature/durablecli'

describe('durablecli', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(durableentries).mockResolvedValue([
      ['storage', { user: 'alice' }],
      ['config_crt', 'on'],
      ['https://example.com/#abc', 'short-id'],
      ['short-id', 'https://example.com/#abc'],
    ])
  })

  it('isdurableshorturlkey excludes known keys', () => {
    expect(isdurableshorturlkey('storage')).toBe(false)
    expect(isdurableshorturlkey('config_crt')).toBe(false)
  })

  it('isdurableshorturlkey excludes url-like keys', () => {
    expect(isdurableshorturlkey('https://example.com')).toBe(true)
  })

  it('durableflushtodisk writes filtered snapshot', async () => {
    const write = jest.fn()
    ;(globalThis as any).__nodeDurableWriteSnapshot = write
    await durableflushtodisk()
    expect(write).toHaveBeenCalledWith({
      storage: { user: 'alice' },
      config_crt: 'on',
    })
  })

  it('durablehydratefromdisk prefers system.json snapshot', async () => {
    ;(globalThis as any).__nodeDurableReadSnapshot = jest
      .fn()
      .mockResolvedValue({ storage: { user: 'bob' } })
    await durablehydratefromdisk()
    expect(durablesetmany).toHaveBeenCalledWith([
      ['storage', { user: 'bob' }],
    ])
  })

  it('durablehydratefromdisk scrubs config keys from legacy vars', async () => {
    ;(globalThis as any).__nodeDurableReadSnapshot = jest
      .fn()
      .mockResolvedValue({})
    ;(globalThis as any).__nodeStorageReadConfigAll = jest
      .fn()
      .mockResolvedValue([])
    ;(globalThis as any).__nodeStorageReadVars = jest.fn().mockResolvedValue({
      user: 'alice',
      crt: 'on',
      rolebytoken: { t: 'admin' },
    })
    ;(globalThis as any).__nodeStorageReadHistoryBuffer = jest
      .fn()
      .mockResolvedValue(['#help'])
    await durablehydratefromdisk()
    expect(durablesetmany).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['config_crt', 'on'],
        ['storage', { user: 'alice', rolebytoken: { t: 'admin' } }],
        ['HISTORYBUFFER', ['#help']],
      ]),
    )
  })
})
