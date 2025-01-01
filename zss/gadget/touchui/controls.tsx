import {
  tokenizeandwritetextformat,
  WRITE_TEXT_CONTEXT,
} from 'zss/words/textformat'

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

export function Controls({
  context,
  width,
  height,
  islandscape,
  drawstick,
}: ControlsProps) {
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
    console.info(drawstick)
    context.active.leftedge = 0
    context.x = context.active.leftedge = 3 // drawstick.startx - 4
    context.y = 3 //drawstick.starty - 4
    for (let i = 0; i < 5; ++i) {
      tokenizeandwritetextformat(
        `$BLUE$176$176$176$176$176$176$176$176\n`,
        context,
        false,
      )
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
