import { search } from '@metrichor/jmespath'
import { JSON_READER } from 'zss/device/api'
import { FIRMWARE_COMMAND } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { memoryloadercontent } from 'zss/memory/loader'
import { ARG_TYPE, readargs } from 'zss/words/reader'

export const jsonloader: FIRMWARE_COMMAND = (chip, words) => {
  const jsonreader: JSON_READER = memoryloadercontent(chip.id())
  if (!ispresent(jsonreader)) {
    return 0
  }

  const [filter, name] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.NAME])
  // https://jmespath.org/
  const result = search(jsonreader.json, filter)
  chip.set(name, result)

  return 0
}
