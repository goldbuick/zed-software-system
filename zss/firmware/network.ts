import { network_fetch, synth_tts } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { isarray } from 'zss/mapping/types'
import { isstrcategory } from 'zss/words/category'
import { isstrcollision } from 'zss/words/collision'
import { isstrcolor } from 'zss/words/color'
import { isstrdir } from 'zss/words/dir'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { NAME, WORD } from 'zss/words/types'

function fetchcommand(
  arg: any,
  label: string,
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
    } else {
      values.push(value)
    }
    iii = iiii
  }
  switch (NAME(method)) {
    case 'get':
    case 'post:json':
      network_fetch(
        SOFTWARE,
        arg,
        label,
        url,
        method,
        values,
        READ_CONTEXT.elementfocus,
      )
      break
  }
  return 0
}

export const NETWORK_FIRMWARE = createfirmware()
  .command('tts', (_, words) => {
    const [phrase, voice] = readargs(words, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_STRING,
    ])
    synth_tts(SOFTWARE, voice ?? '', phrase)
    // https://github.com/lobehub/lobe-tts/blob/master/src/core/data/voiceList.ts
    return 0
  })
  .command('fetch', (_, words) => {
    const [label, url, maybemethod = 'get', ii] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.NAME,
      ARG_TYPE.MAYBE_STRING,
    ])

    // return 1 while waiting on data
    fetchcommand(undefined, label, url, maybemethod, words, ii)
    return 0
  })
  .command('fetchwith', (_, words) => {
    const [arg, label, url, maybemethod = 'get', ii] = readargs(words, 0, [
      ARG_TYPE.ANY,
      ARG_TYPE.NAME,
      ARG_TYPE.NAME,
      ARG_TYPE.MAYBE_STRING,
    ])

    // return 1 while waiting on data
    fetchcommand(arg, label, url, maybemethod, words, ii)
    return 1
  })
