import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { gadgetstate } from 'zss/gadget/data/api'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'

export function handleLook(vm: DEVICE, message: MESSAGE): void {
  const board = memoryreadplayerboard(message.player)
  const gadget = gadgetstate(message.player)
  vm.reply(message, 'acklook', {
    board,
    tickers: gadget.tickers ?? [],
    scrollname: gadget.scrollname ?? '',
    scroll: gadget.scroll ?? [],
    sidebar: gadget.sidebar ?? [],
  })
}
