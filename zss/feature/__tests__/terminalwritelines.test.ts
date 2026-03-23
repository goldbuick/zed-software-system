import type { DEVICELIKE } from 'zss/device/api'
import { terminalwritelines } from 'zss/feature/terminalwritelines'

jest.mock('zss/device/modem', () => ({
  modemobservevaluenumber: jest.fn(),
  modemobservevaluestring: jest.fn(),
  modemwriteinitnumber: jest.fn(),
  modemwriteinitstring: jest.fn(),
  modemwritevaluenumber: jest.fn(),
  modemwritevaluestring: jest.fn(),
}))

jest.mock('zss/mapping/guid', () => ({
  createsid: jest.fn(() => 'sid_test123'),
}))

jest.mock('zss/words/textformat', () => ({
  hascenter: jest.fn(() => undefined),
}))

jest.mock('zss/words/reader', () => ({
  READ_CONTEXT: {
    board: undefined,
    element: undefined,
    elementfocus: undefined,
  },
}))

jest.mock('zss/mapping/value', () => ({
  maptostring: jest.fn((value: unknown) => String(value)),
}))

function createdevicelogrecorder() {
  const logemissions: { player: string; payload: unknown[] }[] = []
  const device: DEVICELIKE = {
    emit(player, target, data) {
      if (target === 'log') {
        logemissions.push({ player, payload: data as unknown[] })
      }
    },
  }
  return { device, logemissions }
}

describe('terminalwritelines', () => {
  it('applies plain lines and emits blank lines', () => {
    const { device, logemissions } = createdevicelogrecorder()
    terminalwritelines(device, 'p1', '$RED hi\n  \nworld')
    expect(logemissions.map((e) => e.payload)).toEqual([
      ['$RED hi'],
      [''],
      ['world'],
    ])
    expect(logemissions.every((e) => e.player === 'p1')).toBe(true)
  })

  it('applies hyperlink line', () => {
    const { device, logemissions } = createdevicelogrecorder()
    terminalwritelines(device, 'p1', '!mypath arg;$greenTap')
    expect(logemissions).toHaveLength(1)
    expect(logemissions[0].payload).toEqual(['!mypath arg;$greenTap'])
  })

  it('ignores custom chip for output (parity arg)', () => {
    const { device, logemissions } = createdevicelogrecorder()
    terminalwritelines(device, 'p1', '!x y;$lbl', 'mychip')
    expect(logemissions[0].payload).toEqual(['!x y;$lbl'])
  })

  it('treats ! without semicolon as plain text', () => {
    const { device, logemissions } = createdevicelogrecorder()
    terminalwritelines(device, 'p1', '!nosemi')
    expect(logemissions[0].payload).toEqual(['!nosemi'])
  })

  it('hk line becomes single bang string', () => {
    const { device, logemissions } = createdevicelogrecorder()
    terminalwritelines(device, 'p1', '!menu hk 1 1 next;$greenGo')
    expect(logemissions[0].payload).toEqual(['!menu hk 1 1 next;$greenGo'])
  })

  it('copyit with multi-word payload', () => {
    const { device, logemissions } = createdevicelogrecorder()
    terminalwritelines(device, 'p1', '!copyit one two;$greenLbl')
    expect(logemissions[0].payload).toEqual(['!copyit one two;$greenLbl'])
  })

  it('decodes $59 to semicolon inside copyit payload token', () => {
    const { device, logemissions } = createdevicelogrecorder()
    terminalwritelines(device, 'p1', '!copyit foo$59bar;$greenLbl')
    expect(logemissions[0].payload).toEqual(['!copyit foo;bar;$greenLbl'])
  })

  it('does not treat $590 as semicolon escape', () => {
    const { device, logemissions } = createdevicelogrecorder()
    terminalwritelines(device, 'p1', '!x $590;$y')
    expect(logemissions[0].payload).toEqual(['!x $590;$y'])
  })
})
