import type { DEVICELIKE } from 'zss/device/api'
import { apitoast, vmcli } from 'zss/device/api'
import {
  ZSS_BOOKMARKS_KEY,
  runterminalbookmarkclibyid,
} from 'zss/feature/bookmarks'
import { storagereadvars } from 'zss/feature/storage'
import { terminalbookmarkpindisplaylabel } from 'zss/feature/terminalbookmarkline'
import { useTape } from 'zss/gadget/data/state'

jest.mock('zss/device/api', () => ({
  apitoast: jest.fn(),
  vmcli: jest.fn(),
}))

jest.mock('zss/gadget/data/state', () => ({
  useTape: {
    getState: jest.fn(),
  },
}))

jest.mock('zss/feature/storage', () => ({
  storagereadvars: jest.fn(),
  storagewritevar: jest.fn(),
}))

describe('terminalbookmarkpindisplaylabel', () => {
  it('shows right-hand label after semicolon for bang lines', () => {
    expect(
      terminalbookmarkpindisplaylabel('!hyperlink chip x;$GREENmy title'),
    ).toBe('$GREENmy title')
  })
})

describe('runterminalbookmarkclibyid', () => {
  const device = { emit: jest.fn() } as unknown as DEVICELIKE
  const player = 'p1'
  const pinid = 'pin-a'

  const blob = {
    version: 1,
    url: [],
    terminal: [
      {
        kind: 'terminal' as const,
        id: pinid,
        text: '#hello world',
        createdat: 1,
      },
    ],
    editor: [],
  }

  beforeEach(() => {
    jest.mocked(storagereadvars).mockResolvedValue({
      [ZSS_BOOKMARKS_KEY]: blob,
    })
    jest.mocked(apitoast).mockClear()
    jest.mocked(vmcli).mockClear()
  })

  function mocktapevisible(visible: boolean) {
    jest.mocked(useTape.getState).mockReturnValue({
      layout: 0,
      inspector: false,
      quickterminal: visible,
      autocompleteindex: 0,
      toast: '',
      terminal: {
        open: false,
        logs: [],
        pinlines: [],
        pinids: [],
      },
      editor: {
        open: false,
        book: '',
        path: [],
        type: '',
        title: '',
      },
      reset: jest.fn(),
    })
  }

  it('toasts bookmark run when tape is visible (quickterminal)', async () => {
    mocktapevisible(true)
    await runterminalbookmarkclibyid(device, player, pinid)
    expect(apitoast).toHaveBeenCalledWith(
      device,
      player,
      expect.stringContaining('bookmark run'),
    )
    expect(vmcli).toHaveBeenCalled()
  })

  it('does not toast bookmark run when tape is hidden', async () => {
    mocktapevisible(false)
    await runterminalbookmarkclibyid(device, player, pinid)
    expect(apitoast).not.toHaveBeenCalled()
    expect(vmcli).toHaveBeenCalled()
  })
})
