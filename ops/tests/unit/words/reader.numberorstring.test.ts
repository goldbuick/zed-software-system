jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadoperator: jest.fn(() => 'test-player'),
}))

import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

describe('readargs NUMBER_OR_STRING coercion', () => {
  it.each([
    ['409', 409],
    ['0', 0],
    [
      '536d3a5e000945adb7038665781a4aca',
      '536d3a5e000945adb7038665781a4aca',
    ],
    [
      '802e3bc2b27e49c2995d23ef70e6ac89',
      '802e3bc2b27e49c2995d23ef70e6ac89',
    ],
    ['12.5', '12.5'],
    ['123abc', '123abc'],
  ])('NUMBER_OR_STRING token %s → %p', (token, expected) => {
    READ_CONTEXT.words = [token]
    const [value] = readargs(READ_CONTEXT.words, 0, [
      ARG_TYPE.NUMBER_OR_STRING,
    ])
    expect(value).toEqual(expected)
    expect(typeof value).toBe(typeof expected)
  })

  it.each([
    ['409', 409],
    ['536d3a5e000945adb7038665781a4aca', '536d3a5e000945adb7038665781a4aca'],
    ['123abc', '123abc'],
  ])('MAYBE_NUMBER_OR_STRING token %s → %p', (token, expected) => {
    READ_CONTEXT.words = [token]
    const [value] = readargs(READ_CONTEXT.words, 0, [
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    expect(value).toEqual(expected)
  })

  it('parses #tts voice + phrase like audio firmware handler', () => {
    READ_CONTEXT.words = ['409', 'Hello']
    let [voice, phrase] = readargs(READ_CONTEXT.words, 0, [
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_STRING,
    ])
    expect(voice).toBe(409)
    expect(phrase).toBe('Hello')

    READ_CONTEXT.words = [
      '536d3a5e000945adb7038665781a4aca',
      'Hello',
    ]
    ;[voice, phrase] = readargs(READ_CONTEXT.words, 0, [
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_STRING,
    ])
    expect(voice).toBe('536d3a5e000945adb7038665781a4aca')
    expect(phrase).toBe('Hello')
  })
})
