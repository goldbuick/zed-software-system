import { compilescript } from 'zss/feature/lang/langcompileclient'
import fs from 'node:fs'
import path from 'node:path'

const HEAD_CODE = fs
  .readFileSync(
    path.join(__dirname, '../../../fixtures/lang/coolregionsbow/head.zss'),
    'utf8',
  )
  .replace(/\r\n/g, '\n')
  .replace(/\n$/, '')

const SEGMENT_CODE = fs
  .readFileSync(
    path.join(__dirname, '../../../fixtures/lang/coolregionsbow/segment.zss'),
    'utf8',
  )
  .replace(/\r\n/g, '\n')
  .replace(/\n$/, '')

describe('centipede kind compile', () => {
  it('compiles head think', () => {
    const build = compilescript('head', HEAD_CODE)
    expect(build.errors ?? []).toEqual([])
    expect(HEAD_CODE).toMatch(/:think/)
    expect(HEAD_CODE).toMatch(/:bombed/)
    expect(HEAD_CODE).toMatch(/#give score 1/)
  })

  it('compiles segment think', () => {
    const build = compilescript('segment', SEGMENT_CODE)
    expect(build.errors ?? []).toEqual([])
    expect(SEGMENT_CODE).toMatch(/:think/)
    expect(SEGMENT_CODE).toMatch(/:promote/)
    expect(SEGMENT_CODE).toMatch(/:bombed/)
    expect(SEGMENT_CODE).toMatch(/#give score 3/)
  })
})
