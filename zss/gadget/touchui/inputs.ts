import { createdevice } from 'zss/device'
import { userinput_down, userinput_up } from 'zss/device/api'

import { INPUT } from '../data/types'

const touchui = createdevice('touchuiinput')

export function handlestickdir(snapdir: number, player: string) {
  switch (snapdir) {
    case 0:
      // left
      userinput_down(touchui, INPUT.MOVE_LEFT, player)
      userinput_up(touchui, INPUT.MOVE_RIGHT, player)
      userinput_up(touchui, INPUT.MOVE_UP, player)
      userinput_up(touchui, INPUT.MOVE_DOWN, player)
      break
    case 45:
      // left up
      userinput_down(touchui, INPUT.MOVE_UP, player)
      userinput_down(touchui, INPUT.MOVE_LEFT, player)
      userinput_up(touchui, INPUT.MOVE_RIGHT, player)
      userinput_up(touchui, INPUT.MOVE_DOWN, player)
      break
    case 90:
      // up
      userinput_down(touchui, INPUT.MOVE_UP, player)
      userinput_up(touchui, INPUT.MOVE_DOWN, player)
      userinput_up(touchui, INPUT.MOVE_LEFT, player)
      userinput_up(touchui, INPUT.MOVE_RIGHT, player)
      break
    case 135:
      // up right
      userinput_down(touchui, INPUT.MOVE_UP, player)
      userinput_down(touchui, INPUT.MOVE_RIGHT, player)
      userinput_up(touchui, INPUT.MOVE_LEFT, player)
      userinput_up(touchui, INPUT.MOVE_DOWN, player)
      break
    case 180:
      // right
      userinput_down(touchui, INPUT.MOVE_RIGHT, player)
      userinput_up(touchui, INPUT.MOVE_LEFT, player)
      userinput_up(touchui, INPUT.MOVE_UP, player)
      userinput_up(touchui, INPUT.MOVE_DOWN, player)
      break
    case 225:
      // right down
      userinput_down(touchui, INPUT.MOVE_DOWN, player)
      userinput_down(touchui, INPUT.MOVE_RIGHT, player)
      userinput_up(touchui, INPUT.MOVE_LEFT, player)
      userinput_up(touchui, INPUT.MOVE_DOWN, player)
      break
    case 270:
      // down
      userinput_down(touchui, INPUT.MOVE_DOWN, player)
      userinput_up(touchui, INPUT.MOVE_UP, player)
      userinput_up(touchui, INPUT.MOVE_LEFT, player)
      userinput_up(touchui, INPUT.MOVE_RIGHT, player)
      break
    case 315:
      // down left
      userinput_down(touchui, INPUT.MOVE_DOWN, player)
      userinput_down(touchui, INPUT.MOVE_LEFT, player)
      userinput_up(touchui, INPUT.MOVE_RIGHT, player)
      userinput_up(touchui, INPUT.MOVE_UP, player)
      break
    case 360:
      // left
      userinput_down(touchui, INPUT.MOVE_LEFT, player)
      userinput_up(touchui, INPUT.MOVE_RIGHT, player)
      userinput_up(touchui, INPUT.MOVE_UP, player)
      userinput_up(touchui, INPUT.MOVE_DOWN, player)
      break
  }
}
