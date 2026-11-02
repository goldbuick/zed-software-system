const storagewritecontent = jest.fn()
const registerloginready = jest.fn()

jest.mock('zss/feature/url', () => ({
  isjoin: jest.fn(() => false),
  shorturl: jest.fn(),
  znsset: jest.fn(),
}))

jest.mock('zss/feature/storage', () => ({
  contenttohashfragment: jest.fn(),
  storagenukecontent: jest.fn(),
  storagewritecontent: (...args: unknown[]) => storagewritecontent(...args),
}))

jest.mock('zss/feature/writeui', () => ({
  write: jest.fn(),
}))

jest.mock('zss/feature/zsstextui', () => ({
  zssheaderlines: () => [],
  zssoptionline: (a: string, b: string) => `${a}${b}`,
  zsstextline: (text: string) => text,
}))

jest.mock('zss/feature/itchiopublish', () => ({
  itchiopublish: jest.fn(),
}))

jest.mock('zss/device/api', () => ({
  workstatus: jest.fn(),
  apierror: jest.fn(),
  registerloginready: (...args: unknown[]) => registerloginready(...args),
}))

import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { handlesavemem } from 'zss/device/register/handlers/memory'

function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

function samplebook() {
  return {
    id: 'book',
    name: 'main',
    pages: [{ id: 'page', code: '' }],
    activelist: [] as string[],
    flags: {},
  }
}

describe('handlesavemem login', () => {
  const device = { emit: jest.fn() } as unknown as DEVICE

  beforeEach(() => {
    storagewritecontent.mockReset()
    registerloginready.mockReset()
  })

  it('emits login when the flag is set and the url write returns true', async () => {
    storagewritecontent.mockResolvedValue(true)
    handlesavemem(device, {
      player: 'operator',
      data: ['label', 'content', true],
    } as MESSAGE)
    await settle()
    expect(registerloginready).toHaveBeenCalledTimes(1)
    expect(registerloginready).toHaveBeenCalledWith(device, 'operator')
  })

  it('skips login when the url write returns false', async () => {
    storagewritecontent.mockResolvedValue(false)
    handlesavemem(device, {
      player: 'operator',
      data: ['label', 'content', true],
    } as MESSAGE)
    await settle()
    expect(registerloginready).not.toHaveBeenCalled()
  })

  it('skips login when the save has no flag', async () => {
    storagewritecontent.mockResolvedValue(true)
    handlesavemem(device, {
      player: 'operator',
      data: ['label', 'content'],
    } as MESSAGE)
    await settle()
    expect(registerloginready).not.toHaveBeenCalled()
  })

  it('reads the login flag after a books payload', async () => {
    storagewritecontent.mockResolvedValue(true)
    const books = [samplebook()]
    handlesavemem(device, {
      player: 'operator',
      data: ['label', 'content', books, true],
    } as MESSAGE)
    await settle()
    expect(storagewritecontent).toHaveBeenCalledWith(
      'operator',
      'label',
      'content',
      'content',
      books,
    )
    expect(registerloginready).toHaveBeenCalledWith(device, 'operator')
  })
})
