import { romread } from 'zss/rom'
import {
  clearcommandromhintcache,
  commandromhint,
} from 'zss/screens/tape/commandarghints'

jest.mock('zss/rom', () => {
  const actual = jest.requireActual<typeof import('zss/rom')>('zss/rom')
  return {
    ...actual,
    romread: jest.fn(),
  }
})

const romreadmock = romread as jest.MockedFunction<typeof romread>

describe('commandromhint', () => {
  beforeEach(() => {
    clearcommandromhintcache()
    romreadmock.mockReset()
  })

  it('returns empty string for empty lookup', () => {
    expect(commandromhint('')).toBe('')
    expect(romreadmock).not.toHaveBeenCalled()
  })

  it('caches romread result per command key', () => {
    romreadmock.mockReturnValue(`---
hint: $DKGRAYfirst line
---
body`)
    expect(commandromhint('send')).toBe('$DKGRAYfirst line')
    expect(commandromhint('send')).toBe('$DKGRAYfirst line')
    expect(romreadmock).toHaveBeenCalledTimes(1)
    expect(romreadmock).toHaveBeenCalledWith('editor:commands:send')
  })

  it('normalizes cache key to lowercase', () => {
    romreadmock.mockReturnValue('desc;$DKGRAYx')
    expect(commandromhint('Stat')).toBe('$DKGRAYx')
    expect(commandromhint('stat')).toBe('$DKGRAYx')
    expect(romreadmock).toHaveBeenCalledTimes(1)
  })

  it('falls back to bare command ROM for channel variants 1-5', () => {
    romreadmock.mockImplementation((path: string) => {
      if (path === 'editor:commands:fmsquare1') {
        return undefined
      }
      if (path === 'editor:commands:fmsquare') {
        return `---
hint: "FM square config"
---`
      }
      return undefined
    })
    expect(commandromhint('fmsquare1')).toBe('FM square config')
    expect(romreadmock).toHaveBeenCalledWith('editor:commands:fmsquare1')
    expect(romreadmock).toHaveBeenCalledWith('editor:commands:fmsquare')
  })

  it('falls back for algo05 to algo0', () => {
    romreadmock.mockImplementation((path: string) => {
      if (path === 'editor:commands:algo05') {
        return undefined
      }
      if (path === 'editor:commands:algo0') {
        return `---
hint: "Algo0 config"
---`
      }
      return undefined
    })
    expect(commandromhint('algo05')).toBe('Algo0 config')
  })
})
