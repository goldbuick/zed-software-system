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

describe('centipede plank stub layout', () => {
  it('compiles as bombed stubs without head-driven drag scripting', () => {
    const headbuild = compilescript('head', HEAD_CODE)
    expect(headbuild.errors ?? []).toEqual([])
    const segbuild = compilescript('segment', SEGMENT_CODE)
    expect(segbuild.errors ?? []).toEqual([])

    expect(HEAD_CODE).toMatch(/:bombed/)
    expect(HEAD_CODE).toMatch(/#give score 1/)
    expect(HEAD_CODE).not.toMatch(/#pset idle/)
    expect(HEAD_CODE).not.toMatch(/#repeat 32 do/)
    expect(HEAD_CODE).not.toMatch(/:preparefollow/)
    expect(HEAD_CODE).not.toMatch(/:dofollow/)
    expect(HEAD_CODE).not.toMatch(/:think/)

    expect(SEGMENT_CODE).toMatch(/:bombed/)
    expect(SEGMENT_CODE).toMatch(/#give score 3/)
    expect(SEGMENT_CODE).not.toMatch(/:preparefollow/)
    expect(SEGMENT_CODE).not.toMatch(/:dofollow/)
    expect(SEGMENT_CODE).not.toMatch(/:trylink/)
    expect(SEGMENT_CODE).not.toMatch(/:think/)
  })
})
