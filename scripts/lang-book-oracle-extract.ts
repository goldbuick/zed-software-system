import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

type BookPage = {
  code?: string
}

type BookData = {
  data?: {
    pages?: BookPage[]
  }
}

function fixtureid(code: string, index: number) {
  const head = code.split('\n')[0] ?? ''
  const statmatch = /^@\w+\s+(\w+)/.exec(head) ?? /^@(\w+)/.exec(head)
  const raw = statmatch?.[1] ?? `page${index}`
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || `page${index}`
  )
}

function collectcodes(book: BookData) {
  const entries: { id: string; code: string }[] = []
  const seen = new Set<string>()
  const usedids = new Set<string>()
  const pages = book.data?.pages ?? []
  for (let i = 0; i < pages.length; ++i) {
    const code = pages[i]?.code?.trim()
    if (!code || seen.has(code)) {
      continue
    }
    seen.add(code)
    let id = fixtureid(code, i)
    let suffix = 1
    while (usedids.has(id)) {
      id = `${fixtureid(code, i)}_${suffix++}`
    }
    usedids.add(id)
    entries.push({ id, code })
  }
  return entries
}

function main() {
  const bookpath = process.argv[2]
  const outdir = process.argv[3]
  if (!bookpath || !outdir) {
    console.error(
      'usage: npx tsx scripts/lang-book-oracle-extract.ts <book.json> <outdir>',
    )
    process.exit(1)
  }

  const book = JSON.parse(readFileSync(bookpath, 'utf8')) as BookData
  const entries = collectcodes(book)
  mkdirSync(outdir, { recursive: true })

  const manifest: string[] = []
  for (const entry of entries) {
    writeFileSync(
      path.join(outdir, `${entry.id}.zss`),
      `${entry.code}\n`,
      'utf8',
    )
    manifest.push(entry.id)
  }
  manifest.sort()
  writeFileSync(
    path.join(outdir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  console.log(`wrote ${manifest.length} fixtures to ${outdir}`)
}

main()
