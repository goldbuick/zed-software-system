import {
  applyhyperlinksharedmodemsync,
  clearpanelsharedsync,
  resolvehyperlinksharedbridge,
} from 'zss/gadget/data/api'
import { gadgethyperlinkfromzedline } from 'zss/gadget/data/scrollwritelines'

jest.mock('zss/device/modem', () => {
  const observers = new Map<string, (value: unknown) => void>()
  return {
    modemobservevaluenumber: jest.fn(
      (key: string, callback: (value: unknown) => void) => {
        observers.set(key, callback)
        return () => observers.delete(key)
      },
    ),
    modemobservevaluestring: jest.fn(),
    modemwriteinitnumber: jest.fn((key: string, value: number) => {
      observers.get(key)?.(value)
    }),
    modemwriteinitstring: jest.fn(),
    modemwritevaluenumber: jest.fn((key: string, value: number) => {
      observers.get(key)?.(value)
    }),
    __modemobservers: observers,
  }
})

jest.mock('zss/device/api', () => {
  const actual = jest.requireActual('zss/device/api')
  return {
    ...actual,
    registerstore: jest.fn(),
    registerinspector: jest.fn(),
  }
})

jest.mock('zss/device/session', () => ({
  SOFTWARE: { emit: jest.fn() },
}))

jest.mock('zss/words/reader', () => ({
  READ_CONTEXT: {
    board: undefined,
    element: undefined,
    elementfocus: undefined,
  },
}))

// registers admin select bridge
import 'zss/memory/utilities'
import { registerstore } from 'zss/device/api'
import { memoryreadconfig, memorysetconfig } from 'zss/memory/utilities'

const PLAYER = 'pid_test_player'
const modem = jest.requireMock('zss/device/modem') as {
  __modemobservers: Map<string, (value: unknown) => void>
  modemwritevaluenumber: jest.Mock
}

describe('admin config persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    memorysetconfig([
      ['voice2text', 'off'],
      ['crt', 'on'],
      ['dev', 'off'],
      ['gadget', 'off'],
    ])
    modem.__modemobservers.clear()
  })

  it('parses admin scroll zed line target as player:key', () => {
    const line = `!@admin "${PLAYER}:voice2text" select off 0 on 1;voice2text`
    gadgethyperlinkfromzedline(PLAYER, line, 'refscroll')
    const bridge = resolvehyperlinksharedbridge('admin', 'select')
    expect(bridge?.get?.('select', `${PLAYER}:voice2text`)).toBe(0)
  })

  it('registers separate observers for each config row (not last row only)', () => {
    const bridge = resolvehyperlinksharedbridge('admin', 'select')!
    const cache = {
      board: undefined,
      element: undefined,
      elementfocus: undefined,
    }
    applyhyperlinksharedmodemsync(
      'admin',
      'select',
      `${PLAYER}:voice2text`,
      bridge.get,
      bridge.set,
      cache,
    )
    applyhyperlinksharedmodemsync(
      'admin',
      'select',
      `${PLAYER}:crt`,
      bridge.get,
      bridge.set,
      cache,
    )
    expect(modem.__modemobservers.has(`admin:${PLAYER}:voice2text`)).toBe(true)
    expect(modem.__modemobservers.has(`admin:${PLAYER}:crt`)).toBe(true)
  })

  it('main-thread modem toggle invokes admin set and queues idb store', () => {
    const bridge = resolvehyperlinksharedbridge('admin', 'select')!
    const cache = {
      board: undefined,
      element: undefined,
      elementfocus: undefined,
    }
    const target = `${PLAYER}:voice2text`
    applyhyperlinksharedmodemsync(
      'admin',
      'select',
      target,
      bridge.get,
      bridge.set,
      cache,
    )

    modem.modemwritevaluenumber(`admin:${target}`, 1)

    expect(memoryreadconfig('voice2text')).toBe('on')
    expect(registerstore).toHaveBeenCalledWith(
      expect.anything(),
      PLAYER,
      'config_voice2text',
      'on',
    )
  })

  it('clears observer on panel unmount hook cleanup', () => {
    const bridge = resolvehyperlinksharedbridge('admin', 'select')!
    const cache = {
      board: undefined,
      element: undefined,
      elementfocus: undefined,
    }
    const target = `${PLAYER}:voice2text`
    applyhyperlinksharedmodemsync(
      'admin',
      'select',
      target,
      bridge.get,
      bridge.set,
      cache,
    )
    expect(modem.__modemobservers.has(`admin:${target}`)).toBe(true)
    clearpanelsharedsync('admin', target)
    expect(modem.__modemobservers.has(`admin:${target}`)).toBe(false)
  })
})
