import fs from 'node:fs'
import path from 'node:path'

const HEAD_CODE = fs
  .readFileSync(
    path.join(__dirname, '../../../fixtures/lang/coolregionsbow/head.zss'),
    'utf8',
  )
  .replace(/\r\n/g, '\n')

const SEGMENT_CODE = fs
  .readFileSync(
    path.join(__dirname, '../../../fixtures/lang/coolregionsbow/segment.zss'),
    'utf8',
  )
  .replace(/\r\n/g, '\n')

describe('centipede head/segment p-slot scripts', () => {
  it('stores chain links on p3/p4 via pget/pset (not custom follower/leader flags)', () => {
    expect(HEAD_CODE).toMatch(/#pset "\$cur" p3/)
    expect(HEAD_CODE).toMatch(/#pset "\$nxt" p4/)
    expect(HEAD_CODE).not.toMatch(/#set follower/)
    expect(HEAD_CODE).not.toMatch(/\$follower/)

    expect(SEGMENT_CODE).toMatch(/#pget "\$p4" id live/)
    expect(SEGMENT_CODE).toMatch(/#set p5 1/)
    expect(SEGMENT_CODE).not.toMatch(/#set leader/)
    expect(SEGMENT_CODE).not.toMatch(/#set follower/)
    expect(SEGMENT_CODE).not.toMatch(/#set linkgrace/)
  })

  it('keeps ZZT head p1/p2 for intelligence and deviance', () => {
    expect(HEAD_CODE).toMatch(/@p1 range;Intelligence\?/)
    expect(HEAD_CODE).toMatch(/@p2 range;Deviance\?/)
  })
})
