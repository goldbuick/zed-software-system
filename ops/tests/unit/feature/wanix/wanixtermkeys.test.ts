/** @jest-environment jsdom */
import {
  iswanixpasteevent,
  pastetexttolinebuffer,
  pastetexttovmserial,
} from 'zss/feature/wanix/wanixtermkeys'

describe('wanixtermkeys paste helpers', () => {
  it('pastetexttovmserial converts newlines to carriage returns', () => {
    expect(pastetexttovmserial('line1\nline2')).toBe('line1\rline2')
    expect(pastetexttovmserial('a\r\nb')).toBe('a\rb')
  })

  it('pastetexttolinebuffer collapses newlines to spaces', () => {
    expect(pastetexttolinebuffer('one\ntwo')).toBe('one two')
    expect(pastetexttolinebuffer('a\r\nb')).toBe('a b')
  })

  it('iswanixpasteevent matches ctrl+v', () => {
    expect(
      iswanixpasteevent(
        new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }),
      ),
    ).toBe(true)
    expect(
      iswanixpasteevent(new KeyboardEvent('keydown', { key: 'v' })),
    ).toBe(false)
  })
})
