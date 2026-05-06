import { MAYBE, isstring } from 'zss/mapping/types'

import {
  memoryboundaryalloc,
  memoryboundarydelete,
  memoryboundaryget,
} from './boundaries'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_ELEMENT_RUNTIME,
  BOARD_RUNTIME,
} from './types'

function createboardruntime(): BOARD_RUNTIME {
  return {}
}

function createboardelementruntime(): BOARD_ELEMENT_RUNTIME {
  return {}
}

export function memoryensureboardruntime(board: BOARD): BOARD_RUNTIME {
  board.runtime ??= memoryboundaryalloc(createboardruntime())
  const runtime = memoryboundaryget<BOARD_RUNTIME>(board.runtime)
  if (runtime) {
    return runtime
  }
  const nextruntime = createboardruntime()
  board.runtime = memoryboundaryalloc(nextruntime, board.runtime)
  return nextruntime
}

export function memoryreadboardruntime(
  board: MAYBE<BOARD>,
): MAYBE<BOARD_RUNTIME> {
  if (!board?.runtime) {
    return undefined
  }
  return memoryboundaryget<BOARD_RUNTIME>(board.runtime)
}

export function memorywriteboardruntime(
  board: BOARD,
  runtime: BOARD_RUNTIME,
): BOARD_RUNTIME {
  board.runtime = memoryboundaryalloc(runtime, board.runtime)
  return runtime
}

export function memorydeleteboardruntime(board: MAYBE<BOARD>): void {
  if (!isstring(board?.runtime)) {
    return
  }
  memoryboundarydelete(board.runtime)
}

export function memoryensureboardelementruntime(
  element: BOARD_ELEMENT,
): BOARD_ELEMENT_RUNTIME {
  element.runtime ??= memoryboundaryalloc(createboardelementruntime())
  const runtime = memoryboundaryget<BOARD_ELEMENT_RUNTIME>(element.runtime)
  if (runtime) {
    return runtime
  }
  const nextruntime = createboardelementruntime()
  element.runtime = memoryboundaryalloc(nextruntime, element.runtime)
  return nextruntime
}

export function memoryreadboardelementruntime(
  element: MAYBE<BOARD_ELEMENT>,
): MAYBE<BOARD_ELEMENT_RUNTIME> {
  if (!element?.runtime) {
    return undefined
  }
  return memoryboundaryget<BOARD_ELEMENT_RUNTIME>(element.runtime)
}

export function memorywriteboardelementruntime(
  element: BOARD_ELEMENT,
  runtime: BOARD_ELEMENT_RUNTIME,
): BOARD_ELEMENT_RUNTIME {
  element.runtime = memoryboundaryalloc(runtime, element.runtime)
  return runtime
}

export function memorydeleteboardelementruntime(
  element: MAYBE<BOARD_ELEMENT>,
): void {
  if (!element?.runtime) {
    return
  }
  memoryboundarydelete(element.runtime)
}
