import type { TEXT_READER } from 'zss/device/api'
import { loadertext } from 'zss/firmware/loader/text'
import { memoryloadercontent } from 'zss/memory/loader'

jest.mock('zss/memory/loader', () => ({
  memoryloadercontent: jest.fn(),
}))

const mockcontent = memoryloadercontent as jest.Mock

const CHAT_HEADER = '(.*?)\\|(.*?):(.*)'
const CHAT_URL = '(.*?)\\|(.*?):(https?://\\S+)$'

function makechip(values: Record<string, unknown> = {}) {
  return {
    id: () => 'loader1',
    set: (name: string, value: unknown) => {
      values[name] = value
    },
    get: (name: string) => values[name],
  }
}

describe('loadertext readline', () => {
  it('regex match does not advance cursor', () => {
    const reader: TEXT_READER = {
      filename: 'chat:message:x',
      cursor: 0,
      lines: ['alice|F1:https://youtu.be/abc'],
    }
    mockcontent.mockReturnValue(reader)
    const values: Record<string, unknown> = {}
    const chip = makechip(values)
    loadertext(chip as never, [
      CHAT_HEADER,
      'chatuser',
      'chatvoice',
      'chattext',
    ])
    expect(values).toEqual({
      chatuser: 'alice',
      chatvoice: 'F1',
      chattext: 'https://youtu.be/abc',
    })
    expect(reader.cursor).toBe(0)
  })

  it('sets empty string captures on EOF', () => {
    const reader: TEXT_READER = {
      filename: 'chat:message:x',
      cursor: 1,
      lines: ['alice|:hi'],
    }
    mockcontent.mockReturnValue(reader)
    const values: Record<string, unknown> = {}
    const chip = makechip(values)
    loadertext(chip as never, ['^(.*)$', 'line'])
    expect(values).toEqual({ line: '' })
    expect(reader.cursor).toBe(1)
  })

  it('seek and next clamp to EOF inclusive', () => {
    const reader: TEXT_READER = {
      filename: 'f',
      cursor: 0,
      lines: ['a', 'b'],
    }
    mockcontent.mockReturnValue(reader)
    const chip = makechip()
    loadertext(chip as never, ['seek', 99])
    expect(reader.cursor).toBe(2)
    reader.cursor = 0
    loadertext(chip as never, ['next'])
    expect(reader.cursor).toBe(1)
    loadertext(chip as never, ['next'])
    expect(reader.cursor).toBe(2)
    loadertext(chip as never, ['next'])
    expect(reader.cursor).toBe(2)
  })

  it('failed match on a real line sets 0 and does not advance', () => {
    const reader: TEXT_READER = {
      filename: 'f',
      cursor: 0,
      lines: ['nope'],
    }
    mockcontent.mockReturnValue(reader)
    const values: Record<string, unknown> = {}
    const chip = makechip(values)
    loadertext(chip as never, ['^https?://', 'url'])
    expect(values).toEqual({ url: 0 })
    expect(reader.cursor).toBe(0)
  })

  it('allows rematch then next', () => {
    const reader: TEXT_READER = {
      filename: 'f',
      cursor: 0,
      lines: ['alice|:https://youtu.be/abc'],
    }
    mockcontent.mockReturnValue(reader)
    const values: Record<string, unknown> = {}
    const chip = makechip(values)
    loadertext(chip as never, [
      CHAT_HEADER,
      'chatuser',
      'chatvoice',
      'chattext',
    ])
    expect(values.chatuser).toBe('alice')
    expect(values.chatvoice).toBe('')
    expect(values.chattext).toBe('https://youtu.be/abc')
    loadertext(chip as never, [CHAT_URL, 'chatuser', 'chatvoice', 'url'])
    expect(values.url).toBe('https://youtu.be/abc')
    expect(reader.cursor).toBe(0)
    loadertext(chip as never, ['next'])
    expect(reader.cursor).toBe(1)
  })
})
