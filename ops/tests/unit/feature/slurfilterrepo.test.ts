import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  SLUR_FILTER_TABLE,
  textmatchesdigests,
} from 'zss/feature/slurfilter'

const ROOT = path.resolve(__dirname, '../../../..')

function trackedfiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  })
    .split('\0')
    .filter((file) => file && !file.startsWith('submodules/'))
}

describe('slurfilter repo scan', () => {
  it('finds no listed word in any tracked text file', () => {
    const hits: string[] = []
    const files = trackedfiles()
    for (let i = 0; i < files.length; ++i) {
      let bytes: Buffer
      try {
        bytes = readFileSync(path.join(ROOT, files[i]))
      } catch {
        // tracked but deleted in the working tree
        continue
      }
      if (bytes.includes(0)) {
        continue
      }
      const lines = bytes.toString('utf8').split('\n')
      for (let l = 0; l < lines.length; ++l) {
        if (textmatchesdigests(lines[l], SLUR_FILTER_TABLE)) {
          hits.push(`${files[i]}:${l + 1}`)
        }
      }
    }
    expect(hits).toEqual([])
  })
})
