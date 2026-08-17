import { formatchatmessagebody } from 'zss/device/vm/chatmessageformat'

describe('formatchatmessagebody', () => {
  it('uses empty voice when unset', () => {
    expect(formatchatmessagebody('alice', undefined, 'hello world')).toBe(
      'alice::hello world',
    )
    expect(formatchatmessagebody('alice', '', 'hello world')).toBe(
      'alice::hello world',
    )
  })

  it('keeps numeric zero as a voice hint', () => {
    expect(formatchatmessagebody('alice', 0, 'hello')).toBe('alice:0:hello')
  })

  it('includes string and numeric voice hints', () => {
    expect(formatchatmessagebody('alice', 'F1', 'hello')).toBe('alice:F1:hello')
    expect(formatchatmessagebody('alice', 3, 'hello')).toBe('alice:3:hello')
  })

  it('strips colon and newlines from user and voice, not text', () => {
    expect(formatchatmessagebody('al:ice', 'F1', 'see:this')).toBe(
      'alice:F1:see:this',
    )
    expect(formatchatmessagebody('alice', 'en-US:Aria', 'hi')).toBe(
      'alice:en-USAria:hi',
    )
    expect(formatchatmessagebody('a\nb', 'F\n1', 'keep:colon')).toBe(
      'ab:F1:keep:colon',
    )
  })

  it('defaults empty user to player', () => {
    expect(formatchatmessagebody('', undefined, 'hi')).toBe('player::hi')
    expect(formatchatmessagebody(undefined, undefined, 'hi')).toBe('player::hi')
  })
})
