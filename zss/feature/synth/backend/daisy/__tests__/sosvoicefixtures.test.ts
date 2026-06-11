import { readFileSync } from 'node:fs'
import path from 'node:path'

import { SOS_VOICE_PATCHES } from 'zss/feature/synth/backend/daisy/sosvoicepatches'

type FIXTURE_FILE = {
  patches: Record<string, unknown>
}

const FIXTURE_PATH = path.join(
  __dirname,
  '../__fixtures__/sos-voice-fixtures.json',
)

function loadfixtures(): FIXTURE_FILE {
  const raw = readFileSync(FIXTURE_PATH, 'utf8')
  return JSON.parse(raw) as FIXTURE_FILE
}

describe('sosvoicefixtures manifest', () => {
  it('includes every SOS voice patch id', () => {
    const fixtures = loadfixtures()
    for (const patch of SOS_VOICE_PATCHES) {
      expect(fixtures.patches[patch.id]).toBeDefined()
    }
  })
})

const CAN_RENDER =
  typeof OfflineAudioContext !== 'undefined' &&
  typeof document !== 'undefined' &&
  process.env.ZSS_SOS_VOICE_RENDER === '1'

;(CAN_RENDER ? describe : describe.skip)(
  'sosvoicefixtures offline renders',
  () => {
    jest.setTimeout(120_000)

    it('matches committed SOS voice metrics within tolerance', async () => {
      const { rendersosvoicepatch } = await import('../sosvoicerender')
      const { evalsosvoicegate } = await import('../sosvoicegate')
      const fixtures = loadfixtures()
      const failures: string[] = []

      for (const patch of SOS_VOICE_PATCHES) {
        const expected = fixtures.patches[patch.id] as Parameters<
          typeof evalsosvoicegate
        >[2]
        const actual = await rendersosvoicepatch(patch)
        const gate = evalsosvoicegate(patch.id, actual, expected)
        if (!gate.pass) {
          failures.push(gate.reason)
        }
      }

      if (failures.length > 0) {
        throw new Error(failures.join('\n'))
      }
    })
  },
)
