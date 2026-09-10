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

/** Strip comments so command-shape asserts ignore prose. */
function stripcomments(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      const i = line.indexOf("'")
      return i >= 0 ? line.slice(0, i) : line
    })
    .join('\n')
}

/** Collect destinations of #set / #pget / #clear outside p1-p10. */
function nonpslotnames(code: string): string[] {
  const body = stripcomments(code)
  const names = new Set<string>()
  const re =
    /#(?:set|clear)\s+([a-z][a-z0-9]*)|#pget\s+[^\n]*?\s([a-z][a-z0-9]*)\s*$/gim
  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) {
    const name = (match[1] ?? match[2] ?? '').toLowerCase()
    if (!/^p([1-9]|10)$/.test(name)) {
      names.add(name)
    }
  }
  return [...names].sort()
}

describe('centipede head/segment p-slot scripts', () => {
  it('stores chain links on p3/p4 via pget/pset (not custom follower/leader flags)', () => {
    expect(HEAD_CODE).toMatch(/#pset "\$p9" p3/)
    expect(HEAD_CODE).toMatch(/#pset "\$p10" p4/)
    expect(HEAD_CODE).not.toMatch(/#set follower/)
    expect(HEAD_CODE).not.toMatch(/\$follower/)

    expect(SEGMENT_CODE).toMatch(/#pget "\$p4" id p6/)
    expect(SEGMENT_CODE).toMatch(/#if p5 above 16/)
    expect(SEGMENT_CODE).not.toMatch(/#set leader/)
    expect(SEGMENT_CODE).not.toMatch(/#set follower/)
    expect(SEGMENT_CODE).not.toMatch(/#set linkgrace/)
  })

  it('keeps ZZT head p1/p2 for intelligence and deviance', () => {
    expect(HEAD_CODE).toMatch(/@p1 range;Intelligence\?/)
    expect(HEAD_CODE).toMatch(/@p2 range;Deviance\?/)
  })

  it('does not use the walk command for head movement', () => {
    expect(stripcomments(HEAD_CODE)).not.toMatch(/#walk\b/)
    expect(HEAD_CODE).toMatch(/#pset "\$thisid" x/)
    expect(HEAD_CODE).toMatch(/#pset "\$thisid" y/)
  })

  it('only writes script state into p1-p10', () => {
    expect(nonpslotnames(HEAD_CODE)).toEqual([])
    expect(nonpslotnames(SEGMENT_CODE)).toEqual([])
  })
})
