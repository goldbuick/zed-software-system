import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { applyplayermovetoboard } from 'zss/device/vm/handlers/playermovetoboard'
import { isnumber, ispresent } from 'zss/mapping/types'
import { memoryinitboard, memoryreadboardbyaddress } from 'zss/memory/boards'
import { memorylistboardelementsbykind } from 'zss/memory/spatialqueries'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import type { STR_COLOR } from 'zss/words/color'
import type { PT } from 'zss/words/types'

export type PLAYERGOTO_MATCH = {
  name: string
  color: STR_COLOR
}

export function resolveplayergotodestpt(
  address: string,
  maybex: number | undefined,
  maybey: number | undefined,
  match: PLAYERGOTO_MATCH | undefined,
): { boardid: string; destpt: PT } | undefined {
  const targetboard = memoryreadboardbyaddress(address)
  if (!ispresent(targetboard)) {
    return undefined
  }

  memoryinitboard(targetboard)

  const destpt: PT = {
    x: maybex ?? targetboard.startx ?? Math.round(BOARD_WIDTH * 0.5),
    y: maybey ?? targetboard.starty ?? Math.round(BOARD_HEIGHT * 0.5),
  }

  // explicit x,y wins; otherwise try passage kind+color match
  if (ispresent(match) && !isnumber(maybex) && !isnumber(maybey)) {
    const gotoelements = memorylistboardelementsbykind(targetboard, [
      match.name,
      match.color,
    ])

    const [gotoelement] = gotoelements.sort((a, b) => {
      const ay = a.y ?? 10000
      const by = b.y ?? 10000
      const ydelta = ay - by
      if (ydelta !== 0) {
        return ydelta
      }
      const ax = a.x ?? 10000
      const bx = b.x ?? 10000
      return ax - bx
    })

    if (
      ispresent(gotoelement) &&
      isnumber(gotoelement.x) &&
      isnumber(gotoelement.y)
    ) {
      destpt.x = gotoelement.x
      destpt.y = gotoelement.y
    }
  }

  return { boardid: targetboard.id, destpt }
}

export function handleplayergotoboard(vm: DEVICE, message: MESSAGE): void {
  const [targetplayer, address, maybex, maybey, match] = message.data as [
    string,
    string,
    number | undefined,
    number | undefined,
    PLAYERGOTO_MATCH | undefined,
  ]

  const resolved = resolveplayergotodestpt(address, maybex, maybey, match)
  if (!ispresent(resolved)) {
    return
  }

  applyplayermovetoboard(
    vm,
    message.player,
    targetplayer,
    resolved.boardid,
    resolved.destpt,
  )
}
