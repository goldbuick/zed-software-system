import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { handledefault } from 'zss/device/vm/handlers/default'
import { parsezipfilelist } from 'zss/feature/parse/file'
import {
  applyzedscroll,
  parsemarkdownforscroll,
} from 'zss/feature/parse/markdownscroll'
import { memoryreadcodepagename } from 'zss/memory/codepageoperations'
import { memorylistcodepagewithtype } from 'zss/memory/codepages'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { memoryadminmenu } from 'zss/memory/utilities'
import { romread } from 'zss/rom'

jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 8,
    DRAW_CHAR_HEIGHT: () => 16,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  STATS_DEV: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
}))

jest.mock('zss/feature/parse/file', () => ({
  parsezipfilelist: jest.fn(() => Promise.resolve()),
}))

jest.mock('zss/feature/parse/markdownscroll', () => ({
  applyzedscroll: jest.fn(),
  parsemarkdownforscroll: jest.fn(),
}))

jest.mock('zss/feature/fetchwiki', () => ({
  fetchwiki: jest.fn(() => Promise.resolve('')),
}))

jest.mock('zss/gadget/data/api', () => ({
  gadgetstate: jest.fn(() => ({ scrollname: '', scroll: [] })),
  gadgethyperlink: jest.fn(),
  gadgetcheckqueue: jest.fn(() => []),
  registerhyperlinksharedbridge: jest.fn(),
}))

jest.mock('zss/device/api', () => ({
  registercopy: jest.fn(),
  apitoast: jest.fn(),
  vmcli: jest.fn(),
  vmloader: jest.fn(),
}))

jest.mock('zss/memory/utilities', () => ({
  memoryadminmenu: jest.fn(),
}))

jest.mock('zss/memory/codepages', () => ({
  memorylistcodepagewithtype: jest.fn(() => []),
}))

jest.mock('zss/memory/codepageoperations', () => ({
  memoryreadcodepagename: jest.fn(),
}))

jest.mock('zss/memory/boardoperations', () => ({
  memoryreadobject: jest.fn(),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memoryreadplayerboard: jest.fn(),
  memoryreadbookplayerboards: jest.fn(() => []),
  memorymoveplayertoboard: jest.fn(),
}))

jest.mock('zss/memory/gamesend', () => ({
  memorysendtoboards: jest.fn(),
}))

jest.mock('zss/memory/runtime', () => ({
  memorymessagechip: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbookbysoftware: jest.fn(),
  memoryreadoperator: jest.fn(() => ''),
}))

jest.mock('zss/memory/inspection', () => ({
  memoryinspectcommand: jest.fn(),
}))

jest.mock('zss/memory/inspectionbatch', () => ({
  memoryinspectbatchcommand: jest.fn(() => Promise.resolve()),
}))

jest.mock('zss/memory/inspectionfind', () => ({
  memoryfindany: jest.fn(() => Promise.resolve()),
}))

jest.mock('zss/memory/inspectionmakeit', () => ({
  memorymakeitcommand: jest.fn(),
}))

jest.mock('zss/memory/inspectionremix', () => ({
  memoryinspectremixcommand: jest.fn(() => Promise.resolve()),
}))

jest.mock('zss/rom', () => ({
  romread: jest.fn(() => undefined),
}))

jest.mock('zss/device/vm/handlers/bookmarkscroll', () => ({
  handlebookmarkscrollpanel: jest.fn(),
}))

jest.mock('zss/device/vm/handlers/editorbookmarkscroll', () => ({
  handleeditorbookmarkscrollpanel: jest.fn(),
}))

jest.mock('zss/device/vm/handlers/zzt', () => ({
  handlezztbridge: jest.fn(),
}))

jest.mock('zss/device/vm/state', () => ({
  lastinputtime: 0,
}))

describe('handledefault zipfilelist', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    jest.mocked(parsezipfilelist).mockClear()
  })

  it('invokes parsezipfilelist for zipfilelist:importfiles', async () => {
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: 'zipfilelist:importfiles',
      data: undefined,
    }
    handledefault(vm, message)
    await Promise.resolve()
    await Promise.resolve()
    expect(jest.mocked(parsezipfilelist)).toHaveBeenCalledWith('p1')
  })
})

describe('handledefault refscroll', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    jest.mocked(applyzedscroll).mockClear()
    jest.mocked(parsemarkdownforscroll).mockClear()
    jest.mocked(romread).mockReset()
    jest.mocked(romread).mockReturnValue(undefined)
    jest.mocked(memoryadminmenu).mockClear()
    jest.mocked(memorylistcodepagewithtype).mockReset()
    jest.mocked(memorylistcodepagewithtype).mockReturnValue([])
    jest.mocked(memoryreadcodepagename).mockReset()
  })

  const mainback = '\n!menu hk b " B " next;$ltgreyBack to main menu'
  it.each([
    [
      'refscroll:charscroll',
      `!char charedit;char${mainback}`,
      'chars',
      'refscroll',
    ],
    [
      'refscroll:colorscroll',
      `!color coloredit;color${mainback}`,
      'colors',
      'refscroll',
    ],
    ['refscroll:bgscroll', `!bg bgedit;bg${mainback}`, 'bgs', 'refscroll'],
  ] as const)('%s applies zed scroll', (target, body, title, chip) => {
    handledefault(vm, {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target,
      data: undefined,
    })
    expect(applyzedscroll).toHaveBeenCalledWith('p1', body, title, chip)
  })

  it('refscroll:adminscroll opens admin menu', () => {
    handledefault(vm, {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: 'refscroll:adminscroll',
      data: undefined,
    })
    expect(memoryadminmenu).toHaveBeenCalledWith('p1', 0)
  })

  it('refscroll:objectlistscroll with empty pages', () => {
    handledefault(vm, {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: 'refscroll:objectlistscroll',
      data: undefined,
    })
    expect(memorylistcodepagewithtype).toHaveBeenCalledWith(
      CODE_PAGE_TYPE.OBJECT,
    )
    expect(applyzedscroll).toHaveBeenCalledWith('p1', '', 'object list', 'list')
  })

  it('refscroll:terrainlistscroll with empty pages', () => {
    handledefault(vm, {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: 'refscroll:terrainlistscroll',
      data: undefined,
    })
    expect(memorylistcodepagewithtype).toHaveBeenCalledWith(
      CODE_PAGE_TYPE.TERRAIN,
    )
    expect(applyzedscroll).toHaveBeenCalledWith(
      'p1',
      '',
      'terrain list',
      'list',
    )
  })

  it('refscroll:objectlistscroll builds copyit row from code pages', () => {
    jest
      .mocked(memorylistcodepagewithtype)
      .mockReturnValue([{ code: 'a\nhint line' } as any])
    jest.mocked(memoryreadcodepagename).mockReturnValue('obj1')
    handledefault(vm, {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: 'refscroll:objectlistscroll',
      data: undefined,
    })
    const [, content] = jest.mocked(applyzedscroll).mock.calls[0]
    expect(content).toContain('!istargetless copyit obj1;')
    expect(content).toContain('@obj1$ltgrey hint line')
  })

  it('refscroll:notescalesscroll uses parsemarkdownforscroll when ROM exists', async () => {
    jest.mocked(romread).mockImplementation((addr: string) => {
      if (addr === 'refscroll:notescalesscroll') {
        return '$ltgrey intro\n\n[Major](<notescales_major>)\n'
      }
      return undefined
    })
    handledefault(vm, {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: 'refscroll:notescalesscroll',
      data: undefined,
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(applyzedscroll).not.toHaveBeenCalled()
    expect(parsemarkdownforscroll).toHaveBeenCalledWith(
      'p1',
      expect.stringContaining('notescales_major'),
      'notescalesscroll',
    )
  })

  it('refscroll:notescales_major uses parsemarkdownforscroll when ROM exists', async () => {
    jest.mocked(romread).mockImplementation((addr: string) => {
      if (addr === 'refscroll:notescales_major') {
        return '!notescalesscroll hk b " B " next;$ltgreyBack\n!istargetless copyit #play cdefgab+c;$greenC major'
      }
      return undefined
    })
    handledefault(vm, {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: 'refscroll:notescales_major',
      data: undefined,
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(parsemarkdownforscroll).toHaveBeenCalledWith(
      'p1',
      expect.stringContaining('!istargetless copyit'),
      'notescales_major',
    )
  })
})
