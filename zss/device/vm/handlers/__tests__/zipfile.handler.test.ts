import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { handlereadzipfilelist } from 'zss/device/vm/handlers/zipfile'
import { readzipfilelist } from 'zss/feature/parse/file'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'

jest.mock('zss/gadget/data/api', () => ({
  registerhyperlinksharedbridge: jest.fn(),
}))

jest.mock('zss/feature/parse/file', () => ({
  readzipfilelist: jest.fn(),
  readzipfilelistitem: jest.fn(),
  markzipfilelistitem: jest.fn(),
}))

jest.mock('zss/gadget/data/scrollwritelines', () => ({
  scrollwritelines: jest.fn(),
  scrolllinkescapefrag: (s: string) => s.replaceAll(';', '$59'),
}))

describe('handlereadzipfilelist', () => {
  const vm = {} as DEVICE
  const message: MESSAGE = {
    session: '',
    player: 'p1',
    id: 'id',
    sender: '',
    target: 'readzipfilelist',
    data: undefined,
  }

  beforeEach(() => {
    jest.mocked(scrollwritelines).mockClear()
    jest.mocked(readzipfilelist).mockReset()
  })

  it('calls scrollwritelines with import row and quoted select for filenames with spaces', () => {
    jest.mocked(readzipfilelist).mockReturnValue([['txt', 'My Doc.txt']])
    handlereadzipfilelist(vm, message)
    const content = jest.mocked(scrollwritelines).mock.calls[0][2]
    expect(content).toContain('!"my doc.txt" select NO 0 YES 1')
    expect(content).toContain('!importfiles;')
    expect(content).toContain('My Doc.txt')
    expect(jest.mocked(scrollwritelines)).toHaveBeenCalledWith(
      'p1',
      'zipfilelist',
      content,
      'zipfilelist',
    )
  })

  it('quotes simple ascii filenames', () => {
    jest.mocked(readzipfilelist).mockReturnValue([['json', 'a.json']])
    handlereadzipfilelist(vm, message)
    const content = jest.mocked(scrollwritelines).mock.calls[0][2]
    expect(content).toContain('!"a.json" select NO 0 YES 1')
  })

  it('skips entries with empty type', () => {
    jest.mocked(readzipfilelist).mockReturnValue([
      ['', 'skip.txt'],
      ['txt', 'keep.txt'],
    ])
    handlereadzipfilelist(vm, message)
    const content = jest.mocked(scrollwritelines).mock.calls[0][2]
    expect(content).not.toContain('skip.txt')
    expect(content).toContain('keep.txt')
    expect(content).toContain('!"keep.txt" select NO 0 YES 1')
  })
})
