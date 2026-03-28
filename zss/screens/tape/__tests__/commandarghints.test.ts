import { romread } from 'zss/rom'

import {
  clearcommandromhintcache,
  commandromhint,
} from '../commandarghints'

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
})
