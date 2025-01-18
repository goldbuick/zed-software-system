import { json } from 'jq-wasm'
import { JSON_READER } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE_COMMAND } from 'zss/firmware'
import { doasync } from 'zss/mapping/func'
import { ispresent } from 'zss/mapping/types'
import { memoryloadercontent } from 'zss/memory/loader'
import { ARG_TYPE, readargs } from 'zss/words/reader'

export const jsonloader: FIRMWARE_COMMAND = (chip, words) => {
  const jsonreader: JSON_READER = memoryloadercontent(chip.id())
  if (!ispresent(jsonreader)) {
    return 0
  }

  const [filter, name] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.NAME])
  doasync(SOFTWARE, async () => {
    const result = await json(jsonreader.json, filter)
    chip.set(name, result)
  })

  return 0
}
