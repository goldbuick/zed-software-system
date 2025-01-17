import { createfirmware } from 'zss/firmware'
import { isarray } from 'zss/mapping/types'
import { isstrcategory } from 'zss/words/category'
import { isstrcollision } from 'zss/words/collision'
import { isstrcolor } from 'zss/words/color'
import { isstrdir } from 'zss/words/dir'
import { ARG_TYPE, readargs } from 'zss/words/reader'
import { NAME, WORD } from 'zss/words/types'

function fetchcommand(
  maybearg: any,
  url: string,
  method: string,
  words: WORD[],
  ii: number,
): 0 | 1 {
  // gather remaining args
  const values: any[] = []
  for (let iii = ii; iii < words.length; ) {
    const [value, iiii] = readargs(words, iii, [ARG_TYPE.ANY])
    // if we're given array, we use values from it
    if (
      isarray(value) &&
      !isstrdir(value) &&
      !isstrcategory(value) &&
      !isstrcollision(value) &&
      !isstrcolor(value)
    ) {
      values.push(...value)
    }
    iii = iiii
  }
  switch (NAME(method)) {
    case 'get':
      break
    case 'post':
      break
  }
  return 0
}

export const NETWORK_FIRMWARE = createfirmware()
  .command('fetch', (_, words) => {
    const [url, maybemethod = 'get', ii] = readargs(words, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_STRING,
    ])
    return fetchcommand(undefined, url, maybemethod, words, ii)
  })
  .command('fetchwith', (_, words) => {
    const [arg, url, maybemethod = 'get', ii] = readargs(words, 0, [
      ARG_TYPE.ANY,
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_STRING,
    ])
    return fetchcommand(arg, url, maybemethod, words, ii)
  })
