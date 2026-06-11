import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import {
  type CorpusEntry,
  type CorpusManifest,
  augmenttemplates,
  buildcorpusmetrics,
  clitrainentries,
  compilefiltersnippet,
  entrytochatjsonl,
  formatscripttoolassistant,
  splithandlers,
} from 'zss/feature/heavy/training/corpus'
import {
  EVAL_SNIPPET_IDS,
  NEGATIVE_TRAIN_PAIRS,
  PARITY_USER_PROMPTS,
} from 'zss/feature/heavy/training/corpusprompts'

const ROOT = path.join(__dirname, '../../../../../')
const PARITYDIR = path.join(
  ROOT,
  'zss/feature/lang/backend/wasm/__fixtures__/parity',
)
const FIXTUREDIR = path.join(
  ROOT,
  'zss/feature/lang/backend/wasm/__tests__/fixtures',
)
const OUTDIR = path.join(__dirname, '../corpus')

function collectzssfiles(dir: string): string[] {
  const out: string[] = []
  function walk(current: string) {
    const entries = readdirSync(current, { withFileTypes: true })
    for (let i = 0; i < entries.length; ++i) {
      const entry = entries[i]
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.name.endsWith('.zss')) {
        out.push(full)
      }
    }
  }
  walk(dir)
  return out
}

function relsource(file: string): string {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

function parityentries(): CorpusEntry[] {
  const manifest = JSON.parse(
    readFileSync(path.join(PARITYDIR, 'manifest.json'), 'utf8'),
  ) as string[]
  const entries: CorpusEntry[] = []
  for (let i = 0; i < manifest.length; ++i) {
    const id = manifest[i]
    const sourcefile = relsource(path.join(PARITYDIR, `${id}.zss`))
    const snippet = readFileSync(path.join(PARITYDIR, `${id}.zss`), 'utf8')
    if (!compilefiltersnippet(id, snippet)) {
      continue
    }
    const user =
      PARITY_USER_PROMPTS[id] ??
      `Write ZSS script matching parity fixture ${id}`
    entries.push({
      id: `parity_${id}`,
      sourcefile,
      snippet,
      user,
      assistant: formatscripttoolassistant(id, snippet, 'replace_all'),
      split: EVAL_SNIPPET_IDS.has(id) ? 'eval' : 'train',
      kind: 'script',
    })
  }
  return entries
}

function fixtureentries(): CorpusEntry[] {
  const files = collectzssfiles(FIXTUREDIR)
  const entries: CorpusEntry[] = []
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    const base = path.basename(file, '.zss')
    const source = readFileSync(file, 'utf8')
    const handlers = splithandlers(source)
    if (handlers.length <= 1) {
      const id = `fixture_${base}`
      if (!compilefiltersnippet(id, source)) {
        continue
      }
      entries.push({
        id,
        sourcefile: relsource(file),
        snippet: source,
        user: `Write ZSS logic from ${base} object/terrain script`,
        assistant: formatscripttoolassistant(base, source, 'replace_all'),
        split: EVAL_SNIPPET_IDS.has(id) ? 'eval' : 'train',
        kind: 'script',
      })
      continue
    }
    for (let h = 0; h < handlers.length; ++h) {
      const handler = handlers[h]
      const id = `fixture_${base}_${handler.label}`
      if (!compilefiltersnippet(id, handler.body)) {
        continue
      }
      entries.push({
        id,
        sourcefile: relsource(file),
        snippet: handler.body,
        user: `Write the :${handler.label} handler from ${base}`,
        assistant: formatscripttoolassistant(
          base,
          handler.body,
          'replace_handler',
        ),
        split: EVAL_SNIPPET_IDS.has(id) ? 'eval' : 'train',
        kind: 'script',
      })
    }
  }
  return entries
}

function negativeentries(): CorpusEntry[] {
  return NEGATIVE_TRAIN_PAIRS.map((pair, i) => ({
    id: `negative_${i}`,
    sourcefile: 'corpus:negative',
    snippet: '',
    user: pair.user,
    assistant: pair.assistant,
    split: 'train' as const,
    kind: 'negative' as const,
  }))
}

function buildentries(): CorpusEntry[] {
  return [
    ...parityentries(),
    ...fixtureentries(),
    ...augmenttemplates(EVAL_SNIPPET_IDS).map((e) => ({
      ...e,
      split: EVAL_SNIPPET_IDS.has(e.id)
        ? ('eval' as const)
        : ('train' as const),
    })),
    ...clitrainentries().map((e) => ({ ...e, split: 'train' as const })),
    ...negativeentries(),
  ]
}

function writecorpus(entries: CorpusEntry[]) {
  mkdirSync(OUTDIR, { recursive: true })
  const trainlines: string[] = []
  const evallines: string[] = []
  for (let i = 0; i < entries.length; ++i) {
    const line = entrytochatjsonl(entries[i])
    if (entries[i].split === 'eval') {
      evallines.push(line)
    } else {
      trainlines.push(line)
    }
  }
  writeFileSync(path.join(OUTDIR, 'train.jsonl'), `${trainlines.join('\n')}\n`)
  writeFileSync(path.join(OUTDIR, 'eval.jsonl'), `${evallines.join('\n')}\n`)
  const metrics = buildcorpusmetrics(entries)
  const manifest: CorpusManifest = {
    generated: new Date().toISOString(),
    traincount: metrics.traincount,
    evalcount: metrics.evalcount,
    compilepassrate: metrics.compilepassrate,
    entries: entries.map((e) => ({
      id: e.id,
      split: e.split,
      kind: e.kind,
      sourcefile: e.sourcefile,
    })),
  }
  writeFileSync(
    path.join(OUTDIR, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  return metrics
}

describe('lang train corpus', () => {
  it('builds compile-valid jsonl with >=95% script pass rate', () => {
    const entries = buildentries()
    const metrics = writecorpus(entries)
    expect(metrics.compilepassrate).toBeGreaterThanOrEqual(0.95)
    expect(metrics.traincount).toBeGreaterThan(0)
    expect(metrics.evalcount).toBeGreaterThan(0)
  })
})
