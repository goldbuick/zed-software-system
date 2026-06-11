import { readFileSync } from 'node:fs'
import path from 'node:path'

import { compilefiltersnippet } from 'zss/feature/heavy/training/corpus'

const CORPUSDIR = path.join(__dirname, '../corpus')

describe('lang train corpus artifacts', () => {
  it('manifest matches jsonl counts and script compile rate >= 95%', () => {
    const manifest = JSON.parse(
      readFileSync(path.join(CORPUSDIR, 'manifest.json'), 'utf8'),
    ) as {
      compilepassrate: number
      traincount: number
      evalcount: number
    }
    const trainlines = readFileSync(path.join(CORPUSDIR, 'train.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
    const evallines = readFileSync(path.join(CORPUSDIR, 'eval.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)

    expect(trainlines.length).toBe(manifest.traincount)
    expect(evallines.length).toBe(manifest.evalcount)
    expect(manifest.compilepassrate).toBeGreaterThanOrEqual(0.95)

    let scriptfail = 0
    let scripttotal = 0
    for (let i = 0; i < trainlines.length; ++i) {
      const row = JSON.parse(trainlines[i]) as {
        metadata?: { id?: string; kind?: string }
        messages?: { role: string; content: string }[]
      }
      if (row.metadata?.kind !== 'script') {
        continue
      }
      scripttotal++
      const assistant = row.messages?.find(
        (m) => m.role === 'assistant',
      )?.content
      const snipmatch = /snippet:<\|"\|>([\s\S]*?)<\|"\|>/.exec(assistant ?? '')
      expect(snipmatch).toBeTruthy()
      if (
        !snipmatch ||
        !compilefiltersnippet(row.metadata?.id ?? 'row', snipmatch[1])
      ) {
        scriptfail++
      }
    }
    const rate = scripttotal > 0 ? (scripttotal - scriptfail) / scripttotal : 1
    expect(rate).toBeGreaterThanOrEqual(0.95)
  })
})
