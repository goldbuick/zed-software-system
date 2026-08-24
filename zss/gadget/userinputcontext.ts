import mitt from 'mitt'
import { createContext } from 'react'

type FocusEmitter = ReturnType<typeof mitt>

type FocusLayer = {
  root: FocusEmitter
  ignorehotkeys: boolean
}

const baseroot = mitt()
const focusstack: FocusLayer[] = []

export const user = {
  root: baseroot,
  ignorehotkeys: false,
}

function synctop(): void {
  const top = focusstack[focusstack.length - 1]
  if (top) {
    user.root = top.root
    user.ignorehotkeys = top.ignorehotkeys
  } else {
    user.root = baseroot
    user.ignorehotkeys = false
  }
}

/**
 * Push or update a UserFocus layer. Overlapping (non-nested) layers unmount by
 * identity so a closing scroll cannot restore board focus over a live editor.
 */
export function userfocuspush(
  layer: FocusEmitter,
  ignorehotkeys: boolean,
): void {
  const existing = focusstack.find((frame) => frame.root === layer)
  if (existing) {
    existing.ignorehotkeys = ignorehotkeys
  } else {
    focusstack.push({ root: layer, ignorehotkeys })
  }
  synctop()
}

/** Remove one layer by identity; active focus becomes the new stack top. */
export function userfocuspop(layer: FocusEmitter): void {
  const idx = focusstack.findIndex((frame) => frame.root === layer)
  if (idx < 0) {
    return
  }
  focusstack.splice(idx, 1)
  synctop()
}

/** Test helper: clear stacked focus back to the base emitter. */
export function userfocusreset(): void {
  focusstack.length = 0
  synctop()
}

export const UserInputContext = createContext(user.root)
