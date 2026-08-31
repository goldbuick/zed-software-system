import {
  cleantextfortts,
  stripurlsfromtext,
} from 'zss/feature/tts/textcleaner'

describe('textcleaner', () => {
  it('stripurlsfromtext removes http(s) and ftp urls', () => {
    const out = stripurlsfromtext('check https://youtu.be/abc hi')
    expect(out).not.toContain('https://')
    expect(out).toContain('check')
    expect(out).toContain('hi')
    expect(stripurlsfromtext('see HTTP://Example.COM/x')).toMatch(/see\s*$/)
  })

  it('cleantextfortts strips urls and keeps surrounding words', () => {
    expect(cleantextfortts('check https://youtu.be/abc hi')).toBe('check hi')
  })

  it('cleantextfortts returns empty when only a url remains', () => {
    expect(cleantextfortts('https://youtu.be/abc')).toBe('')
  })

  it('cleantextfortts still removes emoji', () => {
    expect(cleantextfortts('hello 😀 world')).toBe('hello world')
  })
})
