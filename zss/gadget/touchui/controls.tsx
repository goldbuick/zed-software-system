import { degToRad, radToDeg } from 'maath/misc'
import { Vector2 } from 'three'
import { snap } from 'zss/mapping/number'
import {
  tokenizeandwritetextformat,
  WRITE_TEXT_CONTEXT,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { resetTiles } from '../hooks'

type ControlsProps = {
  context: WRITE_TEXT_CONTEXT
  width: number
  height: number
  islandscape: boolean
  drawstick: {
    startx: number
    starty: number
    tipx: number
    tipy: number
  }
}

const motion = new Vector2()

const decochars = [2, 1, 176, 5, 153, 177, 254]

export function Controls({
  context,
  width,
  height,
  islandscape,
  drawstick,
}: ControlsProps) {
  resetTiles(context, 0, COLOR.WHITE, COLOR.ONCLEAR)
  // islandscape ? COLOR.ONCLEAR : COLOR.PURPLE,
  if (!islandscape) {
    const size = width * height
    for (let i = 4 * width; i < size; ++i) {
      context.char[i] = decochars[i % decochars.length]
      context.color[i] = COLOR.DKPURPLE
    }
  }

  // draw action button targets
  context.y = 3
  for (let i = 0; i < 3; ++i) {
    context.x = context.active.leftedge = 1
    tokenizeandwritetextformat(`$YELLOW$176$176$176$176$176`, context, false)
    context.x = context.active.leftedge = width - 7
    tokenizeandwritetextformat(`$WHITE$176$176$176$176$176\n`, context, false)
  }
  context.y = height - 5
  for (let i = 0; i < 3; ++i) {
    context.x = context.active.leftedge = 1
    tokenizeandwritetextformat(`$GREEN$176$176$176$176$176`, context, false)
    context.x = context.active.leftedge = width - 7
    tokenizeandwritetextformat(`$RED$176$176$176$176$176\n`, context, false)
  }

  // draw active stick
  if (drawstick.startx !== -1) {
    context.active.leftedge = 0
    context.x = context.active.leftedge = drawstick.startx - 4
    context.y = drawstick.starty - 3
    // 8 x 5
    for (let i = 0; i < 5; ++i) {
      tokenizeandwritetextformat(
        `$BLUE$176$176$176$176$176$176$176$176\n`,
        context,
        false,
      )
    }
    // draw active thumb
    // calc angle
    motion.set(
      drawstick.tipx - drawstick.startx,
      drawstick.tipy - drawstick.starty,
    )
    const snapdir = degToRad(snap(radToDeg(motion.angle()), 45))
    context.x = context.active.leftedge =
      Math.round(drawstick.startx + Math.cos(snapdir) * 4) - 2
    context.y = Math.round(drawstick.starty + Math.sin(snapdir) * 3) - 2
    // 3 x 3
    for (let i = 0; i < 3; ++i) {
      tokenizeandwritetextformat(`$BLUE$177$177$177$177\n`, context, false)
    }
  }

  // draw labels in portrait
  if (!islandscape) {
    context.active.leftedge = 1
    context.y = 4
    context.x = 2
    tokenizeandwritetextformat(`$YELLOW?`, context, false)
    context.x = width - 7
    tokenizeandwritetextformat(`$WHITEMENU`, context, false)
    context.y = height - 4
    context.x = 2
    tokenizeandwritetextformat(`$GREENOKAY`, context, false)
    context.x = width - 9
    tokenizeandwritetextformat(`$REDCANCEL`, context, false)
  }

  return null
}
