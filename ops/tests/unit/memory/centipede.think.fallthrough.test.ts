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

describe('centipede plank stub compile', () => {
  it('compiles head stub without :think chain logic', () => {
    const build = compilescript('head', HEAD_CODE)
    expect(build.errors ?? []).toEqual([])
    expect(HEAD_CODE).not.toMatch(/:think/)
    expect(HEAD_CODE).not.toMatch(/:thud/)
    expect(HEAD_CODE).toMatch(/:bombed/)
  })

  it('compiles segment stub without :think chain logic', () => {
    const build = compilescript('segment', SEGMENT_CODE)
    expect(build.errors ?? []).toEqual([])
    expect(SEGMENT_CODE).not.toMatch(/:think/)
    expect(SEGMENT_CODE).not.toMatch(/:thud/)
    expect(SEGMENT_CODE).toMatch(/:bombed/)
  })
})
