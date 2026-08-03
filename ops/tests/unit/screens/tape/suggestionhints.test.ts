import { romread } from 'zss/rom'
import {
  hintfromrom,
  resolvesuggestionhint,
} from 'zss/screens/tape/suggestionhints'
import { ARG_TYPE } from 'zss/words/types'

jest.mock('zss/rom', () => {
  const actual = jest.requireActual<typeof import('zss/rom')>('zss/rom')
  return {
    ...actual,
    romread: jest.fn(),
  }
})

const romreadmock = romread as jest.MockedFunction<typeof romread>

const emptywords = {
  langcommands: {},
  clicommands: {},
  loadercommands: {},
  runtimecommands: {},
  flags: [],
  statsboard: [],
  statshelper: [],
  statssender: [],
  statsinteraction: [],
  statsboolean: [],
  statsconfig: [],
  objects: [],
  terrains: [],
  boards: [],
  palettes: [],
  charsets: [],
  loaders: [],
  categories: [],
  colors: [],
  dirs: [],
  dirmods: [],
  exprs: [],
  roles: [],
  permissionconfigs: [],
  players: [],
  labels: [],
  commandargmeta: {},
}

describe('hintfromrom commandargmeta', () => {
  beforeEach(() => {
    romreadmock.mockReset()
  })

  it('reads editor:commandargmeta:brass hint', () => {
    romreadmock.mockReturnValue(`---
hint: "Daisy wind brass voice"
---
`)
    expect(hintfromrom('commandargmeta', 'brass')).toBe(
      'Daisy wind brass voice',
    )
    expect(romreadmock).toHaveBeenCalledWith('editor:commandargmeta:brass')
  })

  it('reads editor:commandargmeta:bells hint', () => {
    romreadmock.mockReturnValue(`---
hint: "Bell resonator voice"
---
`)
    expect(hintfromrom('commandargmeta', 'bells')).toBe('Bell resonator voice')
  })
})

describe('resolvesuggestionhint', () => {
  beforeEach(() => {
    romreadmock.mockReset()
  })

  it('returns ROM hint for commandargmeta brass', () => {
    romreadmock.mockReturnValue(`---
hint: "Daisy wind brass voice"
---
`)
    expect(
      resolvesuggestionhint(
        { word: 'brass', category: 'commandargmeta' },
        emptywords,
      ),
    ).toBe('Daisy wind brass voice')
  })

  it('returns ROM hint for commandargmeta bells', () => {
    romreadmock.mockReturnValue(`---
hint: "Bell resonator voice"
---
`)
    expect(
      resolvesuggestionhint(
        { word: 'bells', category: 'commandargmeta' },
        emptywords,
      ),
    ).toBe('Bell resonator voice')
  })

  it('returns firmware signature for commands category', () => {
    expect(
      resolvesuggestionhint(
        { word: 'synth', category: 'commands' },
        {
          ...emptywords,
          langcommands: {
            synth: ['all 4 channels of #play synth voices'],
          },
        },
      ),
    ).toBe(' all 4 channels of #play synth voices')
  })

  it('returns codepage label for objects', () => {
    expect(
      resolvesuggestionhint({ word: 'slime', category: 'objects' }, emptywords),
    ).toBe('object codepage')
  })

  it('returns empty when commandargmeta ROM missing', () => {
    romreadmock.mockReturnValue(undefined)
    expect(
      resolvesuggestionhint(
        { word: 'missing', category: 'commandargmeta' },
        emptywords,
      ),
    ).toBe('')
  })
})

describe('resolvesuggestionhint commands with args', () => {
  it('includes arg placeholders before description', () => {
    expect(
      resolvesuggestionhint(
        { word: 'echo', category: 'commands' },
        {
          ...emptywords,
          langcommands: {
            echo: [
              ARG_TYPE.NUMBER_OR_STRING,
              ARG_TYPE.MAYBE_NUMBER_OR_STRING,
              'echo effect',
            ],
          },
        },
      ),
    ).toBe('<num|str> [num|str] echo effect')
  })
})
