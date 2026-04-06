import { radToDeg } from 'maath/misc'
import { Vector2 } from 'three'
import { INPUT } from 'zss/gadget/data/types'
import { useDeviceData } from 'zss/gadget/device'
import { inputdown, inputup } from 'zss/gadget/userinput'
import { snap } from 'zss/mapping/number'

const mergevec = new Vector2()
const angleunit = new Vector2()

function angleunitfromsnap(snapdir: number) {
  const rad = (snapdir * Math.PI) / 180
  return angleunit.set(Math.cos(rad), Math.sin(rad))
}

function mergedsnapdir(
  left: number | null,
  right: number | null,
): number | null {
  if (left === null && right === null) {
    return null
  }
  if (left === null) {
    return right
  }
  if (right === null) {
    return left
  }
  const u1 = angleunitfromsnap(left)
  const u2 = angleunitfromsnap(right)
  mergevec.copy(u1).add(u2)
  if (mergevec.lengthSq() < 1e-6) {
    return null
  }
  let deg = radToDeg(mergevec.angle())
  deg = snap(deg, 45)
  deg = ((deg % 360) + 360) % 360
  return deg
}

function applymovedirection(snapdir: number) {
  switch (snapdir) {
    case 0:
      inputdown(0, INPUT.MOVE_LEFT)
      break
    case 45:
      inputdown(0, INPUT.MOVE_UP)
      inputdown(0, INPUT.MOVE_LEFT)
      break
    case 90:
      inputdown(0, INPUT.MOVE_UP)
      break
    case 135:
      inputdown(0, INPUT.MOVE_UP)
      inputdown(0, INPUT.MOVE_RIGHT)
      break
    case 180:
      inputdown(0, INPUT.MOVE_RIGHT)
      break
    case 225:
      inputdown(0, INPUT.MOVE_DOWN)
      inputdown(0, INPUT.MOVE_RIGHT)
      break
    case 270:
      inputdown(0, INPUT.MOVE_DOWN)
      break
    case 315:
      inputdown(0, INPUT.MOVE_DOWN)
      inputdown(0, INPUT.MOVE_LEFT)
      break
    case 360:
      inputdown(0, INPUT.MOVE_LEFT)
      break
    default:
      break
  }
}

export function handlestickclear() {
  inputup(0, INPUT.MOVE_UP)
  inputup(0, INPUT.MOVE_DOWN)
  inputup(0, INPUT.MOVE_LEFT)
  inputup(0, INPUT.MOVE_RIGHT)
}

/**
 * Merged dual-thumbstick input. Left snap forces SHIFT while non-null; right uses keyboard shift only.
 * Pass null when that stick is idle or inside its dead zone.
 * When `anypointerdown` is true and merged direction is null (all touches in dead zone), move keys are left unchanged — same as the legacy single-stick behavior.
 */
export function handlestickdirsmerged(
  leftsnap: number | null,
  rightsnap: number | null,
  anypointerdown: boolean,
) {
  const { keyboardshift, keyboardctrl, keyboardalt } = useDeviceData.getState()

  if (keyboardalt) {
    inputdown(0, INPUT.ALT)
  } else {
    inputup(0, INPUT.ALT)
  }
  if (keyboardctrl) {
    inputdown(0, INPUT.CTRL)
  } else {
    inputup(0, INPUT.CTRL)
  }

  const leftcontributing = leftsnap !== null
  if (leftcontributing) {
    inputdown(0, INPUT.SHIFT)
  } else if (keyboardshift) {
    inputdown(0, INPUT.SHIFT)
  } else {
    inputup(0, INPUT.SHIFT)
  }

  const merged = mergedsnapdir(leftsnap, rightsnap)
  if (merged === null) {
    if (!anypointerdown) {
      handlestickclear()
      return
    }
    const bothsnapnull = leftsnap === null && rightsnap === null
    if (bothsnapnull) {
      // All active touches in dead zone — preserve move keys (legacy single-stick behavior).
      return
    }
    // Opposing directions cancel — clear moves.
    handlestickclear()
    return
  }

  handlestickclear()
  applymovedirection(merged)
}

/** Single zone (keyboard-shift only); used when direction is known active. */
export function handlestickdir(snapdir: number) {
  handlestickdirsmerged(null, snapdir, true)
}
