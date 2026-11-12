import { radToDeg } from 'maath/misc'
import { Vector2 } from 'three'
import { INPUT } from 'zss/gadget/data/types'
import { useDeviceData } from 'zss/gadget/device'
import { inputdown, inputup } from 'zss/gadget/userinput'
import { modpositive, snap } from 'zss/mapping/number'
import { inspectorselectionparked } from 'zss/screens/inspector/inspectselection'

const mergevec = new Vector2()
const mergeu1 = new Vector2()
const mergeu2 = new Vector2()

/** Last merged snap applied to inputstate; undefined = never applied this session. */
let lastappliedmerged: number | null | undefined
/** Per-stick snaps while inspector selection is parked. */
let lastappliedleft: number | null | undefined
let lastappliedright: number | null | undefined

function angleunitfromsnap(snapdir: number, out: Vector2) {
  const rad = (snapdir * Math.PI) / 180
  return out.set(Math.cos(rad), Math.sin(rad))
}

export function mergedsnapdir(
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
  angleunitfromsnap(left, mergeu1)
  angleunitfromsnap(right, mergeu2)
  mergevec.copy(mergeu1).add(mergeu2)
  if (mergevec.lengthSq() < 1e-6) {
    return null
  }
  let deg = radToDeg(mergevec.angle())
  deg = modpositive(snap(deg, 45), 360)
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

function applyshootdirection(snapdir: number) {
  switch (snapdir) {
    case 0:
      inputdown(0, INPUT.SHOOT_LEFT)
      break
    case 45:
      inputdown(0, INPUT.SHOOT_UP)
      inputdown(0, INPUT.SHOOT_LEFT)
      break
    case 90:
      inputdown(0, INPUT.SHOOT_UP)
      break
    case 135:
      inputdown(0, INPUT.SHOOT_UP)
      inputdown(0, INPUT.SHOOT_RIGHT)
      break
    case 180:
      inputdown(0, INPUT.SHOOT_RIGHT)
      break
    case 225:
      inputdown(0, INPUT.SHOOT_DOWN)
      inputdown(0, INPUT.SHOOT_RIGHT)
      break
    case 270:
      inputdown(0, INPUT.SHOOT_DOWN)
      break
    case 315:
      inputdown(0, INPUT.SHOOT_DOWN)
      inputdown(0, INPUT.SHOOT_LEFT)
      break
    case 360:
      inputdown(0, INPUT.SHOOT_LEFT)
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

function handlestickclearshoot() {
  inputup(0, INPUT.SHOOT_UP)
  inputup(0, INPUT.SHOOT_DOWN)
  inputup(0, INPUT.SHOOT_LEFT)
  inputup(0, INPUT.SHOOT_RIGHT)
}

/** Reset merge edge tracking (overlay mount/unmount). */
export function handlestickmergesreset() {
  lastappliedmerged = undefined
  lastappliedleft = undefined
  lastappliedright = undefined
}

function applystickmods() {
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
  return keyboardshift
}

/**
 * Unmerged sticks while an inspector rect is parked: left → MOVE (AABB start),
 * right → SHOOT (AABB end). Framed UserInput nudges corners; do not merge/SHIFT.
 */
function handlestickinspectcorners(
  leftsnap: number | null,
  rightsnap: number | null,
) {
  // Leave merge/shoot-SHIFT mode; corner nudges do not use SHIFT.
  const keyboardshift = applystickmods()
  if (keyboardshift) {
    inputdown(0, INPUT.SHIFT)
  } else {
    inputup(0, INPUT.SHIFT)
  }

  if (lastappliedmerged !== undefined) {
    handlestickclear()
    lastappliedmerged = undefined
  }

  if (leftsnap === null) {
    handlestickclear()
    lastappliedleft = null
  } else if (leftsnap !== lastappliedleft) {
    handlestickclear()
    applymovedirection(leftsnap)
    lastappliedleft = leftsnap
  }

  if (rightsnap === null) {
    handlestickclearshoot()
    lastappliedright = null
  } else if (rightsnap !== lastappliedright) {
    handlestickclearshoot()
    applyshootdirection(rightsnap)
    lastappliedright = rightsnap
  }
}

/**
 * Merged dual-thumbstick input. Right snap forces SHIFT while non-null; left is move-only.
 * Pass null when that stick is idle or inside its dead zone.
 * When `anypointerdown` is true and merged direction is null (all touches in dead zone), move keys are left unchanged — same as the legacy single-stick behavior.
 *
 * Only re-edges move keys when the merged snap changes so pollinput owns hold-repeat
 * (same cadence as keyboard). Re-clear+down every frame would spam userinputinvoke.
 *
 * When an inspector selection is parked on touch, sticks are unmerged and drive
 * selection corners instead (see handlestickinspectcorners).
 */
export function handlestickdirsmerged(
  leftsnap: number | null,
  rightsnap: number | null,
  anypointerdown: boolean,
) {
  if (inspectorselectionparked()) {
    handlestickinspectcorners(leftsnap, rightsnap)
    return
  }

  // Leaving park mode: drop SHOOT_* edges sticks may have held.
  if (lastappliedleft !== undefined || lastappliedright !== undefined) {
    handlestickclearshoot()
    lastappliedleft = undefined
    lastappliedright = undefined
  }

  const keyboardshift = applystickmods()

  // Right stick contributes SHIFT (shoot); matches MOVE-left / SHOOT-right chrome.
  const rightcontributing = rightsnap !== null
  if (rightcontributing) {
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
      lastappliedmerged = null
      return
    }
    const bothsnapnull = leftsnap === null && rightsnap === null
    if (bothsnapnull) {
      // All active touches in dead zone — preserve move keys (legacy single-stick behavior).
      return
    }
    // Opposing directions cancel — clear moves.
    handlestickclear()
    lastappliedmerged = null
    return
  }

  if (merged === lastappliedmerged) {
    return
  }
  handlestickclear()
  applymovedirection(merged)
  lastappliedmerged = merged
}
