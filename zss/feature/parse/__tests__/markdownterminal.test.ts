import { SOFTWARE } from 'zss/device/session'
import { terminalwritemarkdownlines } from 'zss/feature/parse/markdownterminal'
import { terminalwritelines } from 'zss/feature/terminalwritelines'

jest.mock('zss/feature/terminalwritelines', () => ({
  terminalwritelines: jest.fn(),
}))

const terminalwritelinesmock = terminalwritelines as jest.MockedFunction<
  typeof terminalwritelines
>

describe('terminalwritemarkdownlines', () => {
  beforeEach(() => {
    terminalwritelinesmock.mockClear()
  })

  it('calls terminalwritelines once with SOFTWARE, player, and parsed body', () => {
    terminalwritemarkdownlines('p1', '# Hello')
    expect(terminalwritelinesmock).toHaveBeenCalledTimes(1)
    expect(terminalwritelinesmock).toHaveBeenCalledWith(
      SOFTWARE,
      'p1',
      expect.stringMatching(/Hello/),
    )
  })

  it('emits a bang row so multi-word href becomes a single terminal line', () => {
    terminalwritemarkdownlines('p1', '[go](<topic sub>)')
    const [, , body] = terminalwritelinesmock.mock.calls[0]
    expect(body).toMatch(/^!topic sub;/)
    expect(body).toContain('go')
  })

  it('uses copyit in the command part for copyit links', () => {
    terminalwritemarkdownlines('p1', '[copy me](<copyit page-id>)')
    const [, , body] = terminalwritelinesmock.mock.calls[0]
    expect(body).toMatch(/^!copyit page-id;/)
  })

  it('encodes semicolon in label via scrolllinkescapefrag in the line', () => {
    terminalwritemarkdownlines('p1', '[a;b](foo)')
    const [, , body] = terminalwritelinesmock.mock.calls[0]
    expect(body).toContain(';')
    expect(body).toContain('$59')
  })

  it('emits newline-separated lines for CommonMark hard line breaks', () => {
    terminalwritemarkdownlines('p1', 'line one  \n$white line two')
    const [, , body] = terminalwritelinesmock.mock.calls[0]
    expect(body).toContain('\n')
    expect(body).toContain('line one')
    expect(body).toContain('$white line two')
  })

  it('passes through !openit URL lines so markdown does not autolink the URL', () => {
    const md =
      '!openit https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/type;filter types'
    terminalwritemarkdownlines('p1', md)
    const [, , body] = terminalwritelinesmock.mock.calls[0]
    expect(body).toContain('!openit')
    expect(body).toContain(
      'https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/type',
    )
    expect(body).toContain('filter types')
  })

  it('does not passthrough !cmd;label lines inside fenced code blocks', () => {
    terminalwritemarkdownlines('p1', '```\n!openit https://x;y\n```')
    const [, , body] = terminalwritelinesmock.mock.calls[0]
    expect(body).toContain('!openit https://x;y')
    expect(body).not.toMatch(/^!openit/m)
  })

  it('does not emit a blank line before a heading at the start of the document', () => {
    terminalwritemarkdownlines('p1', '# Hello')
    const [, , body] = terminalwritelinesmock.mock.calls[0]
    expect(body.length).toBeGreaterThan(0)
    expect(body.startsWith('\n')).toBe(false)
    terminalwritemarkdownlines('p1', '### Shallow')
    const [, , body2] = terminalwritelinesmock.mock.calls[1]
    expect(body2.length).toBeGreaterThan(0)
    expect(body2.startsWith('\n')).toBe(false)
  })
})
