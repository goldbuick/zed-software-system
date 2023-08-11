import { DIR, DirValue, INPUT } from '/cc/game/types'

export type PlayerInput = {
  inputmove: DirValue | number
  inputshoot: DirValue | number
  input1: boolean
  input2: boolean
  input3: boolean
  input4: boolean
}

export default function playerInput(input: INPUT | undefined): PlayerInput {
  let inputmove = DIR.NONE
  let inputshoot = DIR.NONE
  let input1 = false
  let input2 = false
  let input3 = false
  let input4 = false

  switch (input) {
    case INPUT.MOVE_UP:
      inputmove = DIR.UP
      break
    case INPUT.MOVE_DOWN:
      inputmove = DIR.DOWN
      break
    case INPUT.MOVE_LEFT:
      inputmove = DIR.LEFT
      break
    case INPUT.MOVE_RIGHT:
      inputmove = DIR.RIGHT
      break
    case INPUT.SHOOT_UP:
      inputshoot = DIR.UP
      break
    case INPUT.SHOOT_DOWN:
      inputshoot = DIR.DOWN
      break
    case INPUT.SHOOT_LEFT:
      inputshoot = DIR.LEFT
      break
    case INPUT.SHOOT_RIGHT:
      inputshoot = DIR.RIGHT
      break
    case INPUT.ACTION_1:
      input1 = true
      break
    case INPUT.ACTION_2:
      input2 = true
      break
    case INPUT.ACTION_3:
      input3 = true
      break
    case INPUT.ACTION_4:
      input4 = true
      break
    default:
      break
  }

  return {
    inputmove: inputmove ? [{ dir: inputmove }] : 0,
    inputshoot: inputshoot ? [{ dir: inputshoot }] : 0,
    input1,
    input2,
    input3,
    input4,
  }
}
