import { formatchatmessagebody } from 'zss/device/vm/chatmessageformat'

describe('formatchatmessagebody', () => {
  it('keeps empty voice as name|:text', () => {
    expect(formatchatmessagebody('alice', undefined, 'hello world')).toBe(
      'alice|:hello world',
    )
    expect(formatchatmessagebody('alice', '', 'hello world')).toBe(
      'alice|:hello world',
    )
  })

  it('keeps numeric zero as a voice hint', () => {
    expect(formatchatmessagebody('alice', 0, 'hello')).toBe('alice|0:hello')
  })

  it('includes string and numeric voice hints', () => {
    expect(formatchatmessagebody('alice', 'F1', 'hello')).toBe('alice|F1:hello')
    expect(formatchatmessagebody('alice', 3, 'hello')).toBe('alice|3:hello')
    expect(formatchatmessagebody('alice', 'en-US-AriaNeural', 'hi')).toBe(
      'alice|en-US-AriaNeural:hi',
    )
  })

  it('strips colon pipe and newlines from user and voice, not text', () => {
    expect(formatchatmessagebody('al:ice', 'F1', 'see:this')).toBe(
      'alice|F1:see:this',
    )
    expect(formatchatmessagebody('alice', 'en-US:Aria', 'hi')).toBe(
      'alice|en-USAria:hi',
    )
    expect(formatchatmessagebody('a|b', 'F|1', 'keep:colon')).toBe(
      'ab|F1:keep:colon',
    )
    expect(formatchatmessagebody('a\nb', 'F\n1', 'keep:colon')).toBe(
      'ab|F1:keep:colon',
    )
  })

  it('defaults empty user to player', () => {
    expect(formatchatmessagebody('', undefined, 'hi')).toBe('player|:hi')
    expect(formatchatmessagebody(undefined, undefined, 'hi')).toBe('player|:hi')
  })
})
