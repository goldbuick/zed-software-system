import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  MOSTLY_ZZT_META,
  museumofzztdownload,
  museumofzztrandom,
  museumofzztsearch,
} from 'zss/feature/url'
import { doasync } from 'zss/mapping/func'
import { isarray } from 'zss/mapping/types'

import { writezztcontentlinks, writezztcontentwait } from '../helpers'

export function handlezztsearch(vm: DEVICE, message: MESSAGE): void {
  doasync(vm, message.player, async () => {
    if (!isarray(message.data)) {
      return
    }
    const [field, text] = message.data as [string, string]
    let offset = 0
    const result: MOSTLY_ZZT_META[] = []
    while (result.length < 256) {
      writezztcontentwait(message.player)
      const list = await museumofzztsearch(field, text, offset)
      offset += list.length
      result.push(...list)
      if (list.length < 25) {
        break
      }
    }
    writezztcontentlinks(result, message.player)
  })
}

export function handlezztrandom(vm: DEVICE, message: MESSAGE): void {
  doasync(vm, message.player, async () => {
    writezztcontentwait(message.player)
    const list = await museumofzztrandom()
    writezztcontentlinks(list, message.player)
  })
}

export function handlezztbridge(vm: DEVICE, message: MESSAGE): void {
  doasync(vm, message.player, async () => {
    if (isarray(message.data)) {
      const [filename] = message.data
      await museumofzztdownload(message.player, filename)
    }
  })
}
