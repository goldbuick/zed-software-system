import type { DEVICELIKE } from 'zss/device/api'
import { apitoast, vmcli } from 'zss/device/api'
import {
  ZSS_BOOKMARKS_KEY,
  normalizebookmarks,
  removebookmarkbyid,
  runterminalbookmarkclibyid,
  updateeditorbookmarkbyid,
  updateurlbookmarkbyid,
} from 'zss/feature/bookmarks'
import { storagereadvars, storagewritevar } from 'zss/feature/storage'
import { terminalbookmarkpindisplaylabel } from 'zss/feature/terminalbookmarkline'
import { useTape } from 'zss/gadget/data/zustandstores'

jest.mock('zss/device/api', () => ({
  apitoast: jest.fn(),
  vmcli: jest.fn(),
}))

jest.mock('zss/gadget/data/zustandstores', () => ({
  useTape: {
    getState: jest.fn(),
  },
}))

jest.mock('zss/feature/storage', () => ({
  storagereadvars: jest.fn(),
  storagewritevar: jest.fn(),
}))

describe('normalizebookmarks', () => {
  it('sorts url newest-first and editor by type then title', () => {
    const blob = normalizebookmarks({
      version: 1,
      url: [
        {
          kind: 'url',
          id: 'old',
          name: 'old',
          href: 'https://old/',
          createdat: 10,
        },
        {
          kind: 'url',
          id: 'new',
          name: 'new',
          href: 'https://new/',
          createdat: 30,
        },
        {
          kind: 'url',
          id: 'mid',
          name: 'mid',
          href: 'https://mid/',
          createdat: 20,
        },
      ],
      terminal: [
        { kind: 'terminal', id: 't1', text: '#one', createdat: 1 },
        { kind: 'terminal', id: 't2', text: '#two', createdat: 2 },
      ],
      editor: [
        {
          kind: 'editor',
          id: 'e1',
          type: 'object',
          title: 'zeta',
          codepage: {},
          createdat: 1,
        },
        {
          kind: 'editor',
          id: 'e2',
          type: 'board',
          title: 'zoo',
          codepage: {},
          createdat: 2,
        },
        {
          kind: 'editor',
          id: 'e3',
          type: 'board',
          title: 'alpha',
          codepage: {},
          createdat: 3,
        },
      ],
    })
    expect(blob.url.map((b) => b.id)).toEqual(['new', 'mid', 'old'])
    expect(blob.editor.map((b) => b.id)).toEqual(['e3', 'e2', 'e1'])
    expect(blob.terminal.map((b) => b.id)).toEqual(['t1', 't2'])
  })
})

describe('terminalbookmarkpindisplaylabel', () => {
  it('shows right-hand label after semicolon for bang lines', () => {
    expect(
      terminalbookmarkpindisplaylabel('!hyperlink chip x;$GREENmy title'),
    ).toBe('$GREENmy title')
  })
})

describe('updateurlbookmarkbyid', () => {
  const blob = {
    version: 1,
    url: [
      {
        kind: 'url' as const,
        id: 'u1',
        name: 'my room',
        href: 'https://old.example/',
        createdat: 10,
      },
      {
        kind: 'url' as const,
        id: 'u2',
        name: 'newer room',
        href: 'https://newer.example/',
        createdat: 20,
      },
    ],
    terminal: [],
    editor: [],
  }

  beforeEach(() => {
    jest.mocked(storagereadvars).mockResolvedValue({
      [ZSS_BOOKMARKS_KEY]: structuredClone(blob),
    })
    jest.mocked(storagewritevar).mockClear()
  })

  it('replaces href and keeps name and id', async () => {
    const entry = await updateurlbookmarkbyid('u1', 'https://new.example/')
    expect(entry).toEqual(
      expect.objectContaining({
        id: 'u1',
        name: 'my room',
        href: 'https://new.example/',
      }),
    )
    expect(entry?.createdat).toBeGreaterThan(10)
    expect(storagewritevar).toHaveBeenCalledWith(
      ZSS_BOOKMARKS_KEY,
      expect.objectContaining({
        url: [
          expect.objectContaining({
            id: 'u1',
            name: 'my room',
            href: 'https://new.example/',
          }),
          expect.objectContaining({ id: 'u2' }),
        ],
      }),
    )
  })

  it('bumps overwritten bookmark to first', async () => {
    await updateurlbookmarkbyid('u1', 'https://new.example/')
    const written = jest.mocked(storagewritevar).mock.calls[0]?.[1] as {
      url: { id: string }[]
    }
    expect(written.url.map((b) => b.id)).toEqual(['u1', 'u2'])
  })

  it('returns undefined when id missing', async () => {
    const entry = await updateurlbookmarkbyid('missing', 'https://x/')
    expect(entry).toBeUndefined()
  })
})

describe('updateeditorbookmarkbyid', () => {
  const blob = {
    version: 1,
    url: [],
    terminal: [],
    editor: [
      {
        kind: 'editor' as const,
        id: 'e1',
        type: 'board',
        title: 'old title',
        codepage: { id: 'cp-old', code: 'old' },
        createdat: 5,
      },
      {
        kind: 'editor' as const,
        id: 'e2',
        type: 'object',
        title: 'alpha',
        codepage: { id: 'cp-a', code: 'a' },
        createdat: 6,
      },
    ],
  }

  beforeEach(() => {
    jest.mocked(storagereadvars).mockResolvedValue({
      [ZSS_BOOKMARKS_KEY]: structuredClone(blob),
    })
    jest.mocked(storagewritevar).mockClear()
  })

  it('replaces snapshot and keeps id', async () => {
    const entry = await updateeditorbookmarkbyid('e1', {
      type: 'object',
      title: 'new title',
      codepage: { id: 'cp-new', code: 'new' },
    })
    expect(entry).toEqual(
      expect.objectContaining({
        id: 'e1',
        type: 'object',
        title: 'new title',
        codepage: { id: 'cp-new', code: 'new' },
      }),
    )
  })

  it('re-sorts by type then title after update', async () => {
    await updateeditorbookmarkbyid('e1', {
      type: 'object',
      title: 'zeta',
      codepage: { id: 'cp-new', code: 'new' },
    })
    const written = jest.mocked(storagewritevar).mock.calls[0]?.[1] as {
      editor: { id: string }[]
    }
    expect(written.editor.map((b) => b.id)).toEqual(['e2', 'e1'])
  })

  it('returns undefined when id missing', async () => {
    const entry = await updateeditorbookmarkbyid('missing', {
      type: 'board',
      title: 'x',
      codepage: {},
    })
    expect(entry).toBeUndefined()
  })
})

describe('removebookmarkbyid', () => {
  beforeEach(() => {
    jest.mocked(storagereadvars).mockResolvedValue({
      [ZSS_BOOKMARKS_KEY]: {
        version: 1,
        url: [
          {
            kind: 'url',
            id: 'u1',
            name: 'n',
            href: 'https://a/',
            createdat: 1,
          },
        ],
        terminal: [],
        editor: [],
      },
    })
    jest.mocked(storagewritevar).mockClear()
  })

  it('removes matching url bookmark', async () => {
    const ok = await removebookmarkbyid('u1')
    expect(ok).toBe(true)
    expect(storagewritevar).toHaveBeenCalledWith(
      ZSS_BOOKMARKS_KEY,
      expect.objectContaining({ url: [] }),
    )
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
      perfmonitor: false,
      terminalmode: visible ? 'quick' : 'cli',
      autocompleteindex: 0,
      toast: '',
      workstatus: '',
      terminal: {
        open: false,
        logs: [],
        pinlines: [],
        pinids: [],
      },
      editor: {
        open: false,
        closing: false,
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
