import { json } from 'jq-wasm'
import { CHIP } from 'zss/chip'
import { JSON_READER } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE_COMMAND } from 'zss/firmware'
import { doasync } from 'zss/mapping/func'
import { ispresent } from 'zss/mapping/types'
import { memoryloadercontent } from 'zss/memory/loader'
import { ARG_TYPE, readargs } from 'zss/words/reader'

const QUERIES: Record<string, boolean> = {}

function jsonquery(chip: CHIP, content: string, filter: string, name: string) {
  const idx = `${filter}:${name}`
  const result = QUERIES[idx]
  if (result) {
    delete QUERIES[idx]
    return true
  }

  if (result === undefined) {
    // invoke query here ...
    doasync(SOFTWARE, async () => {
      const result = await json(content, filter)
      chip.set(name, result)
      QUERIES[idx] = true
    })

    return false
  }

  return false
}

export const jsonloader: FIRMWARE_COMMAND = (chip, words) => {
  const jsonreader: JSON_READER = memoryloadercontent(chip.id())
  if (!ispresent(jsonreader)) {
    return 0
  }

  const [filter, name] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.NAME])
  const done = jsonquery(chip, jsonreader.json, filter, name)
  if (done) {
    // completed
    return 0
  }

  // wait
  chip.yield()
  return 1
}
