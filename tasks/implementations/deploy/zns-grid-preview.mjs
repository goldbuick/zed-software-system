import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildznsgridpreviewhtml } from '../../../ops/infra/zns-grid-preview.js'
import { validatecp437webchars } from '../../../ops/infra/zns-cp437.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const fixturedir = join(root, 'ops/fixtures/zns')
const dest = join(root, 'ops/infra/generated/zns-grid-preview.html')

function readfixture(name) {
  return readFileSync(join(fixturedir, name), 'utf8').replace(/\r\n/g, '\n')
}

function assertok(condition, message) {
  if (!condition) {
    console.error(`assert failed: ${message}`)
    process.exit(1)
  }
}

const problems = validatecp437webchars()
assertok(problems.length === 0, `cp437 web chars invalid: ${JSON.stringify(problems.slice(0, 3))}`)

mkdirSync(dirname(dest), { recursive: true })
const html = buildznsgridpreviewhtml({
  calibrationtape: readfixture('grid-calibration.txt'),
  fidelitytape: readfixture('fidelity-sample.txt'),
})
writeFileSync(dest, html)
const fileurl = `file://${dest}`
console.log(`wrote ${dest}`)
console.log(`open: ${fileurl}`)
