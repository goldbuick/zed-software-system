import {
  bridge_streamstart,
  bridge_streamstop,
  bridge_chatstart,
  bridge_chatstop,
  bridge_fetch,
} from 'zss/device/api'
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
      bridge_fetch(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        arg,
        label,
        url,
        method,
        values,
      )
      break
  }
  return 0
}

export const NETWORK_FIRMWARE = createfirmware()
  .command('fetch', (_, words) => {
    const [label, url, maybemethod = 'get', ii] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.NAME,
      ARG_TYPE.MAYBE_STRING,
    ])
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
    fetchcommand(arg, label, url, maybemethod, words, ii)
    return 0
  })
  .command('chat', (_, words) => {
    const [maybechannel] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    const channel = NAME(maybechannel)
    if (channel) {
      bridge_chatstart(SOFTWARE, READ_CONTEXT.elementfocus, channel)
    } else {
      bridge_chatstop(SOFTWARE, READ_CONTEXT.elementfocus)
    }
    return 0
  })
  .command('broadcast', (_, words) => {
    const [maybestreamkey] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    const streamkey = NAME(maybestreamkey)
    if (streamkey) {
      bridge_streamstart(SOFTWARE, READ_CONTEXT.elementfocus, streamkey)
    } else {
      bridge_streamstop(SOFTWARE, READ_CONTEXT.elementfocus)
    }
    return 0
  })
