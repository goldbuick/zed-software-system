import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildznsgridpreviewhtml } from '../../../ops/infra/zns-grid-preview.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const fixturedir = join(root, 'ops/fixtures/zns')
const dest = join(root, 'ops/infra/generated/zns-grid-preview.html')

function readfixture(name) {
  return readFileSync(join(fixturedir, name), 'utf8').replace(/\r\n/g, '\n')
}

mkdirSync(dirname(dest), { recursive: true })
const html = buildznsgridpreviewhtml({
  calibrationtape: readfixture('grid-calibration.txt'),
  fidelitytape: readfixture('fidelity-sample.txt'),
})
writeFileSync(dest, html)
const fileurl = `file://${dest}`
console.log(`wrote ${dest}`)
console.log(`open: ${fileurl}`)
