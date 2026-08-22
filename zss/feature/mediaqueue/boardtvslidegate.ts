/** Pure hold-while-closing gate for board TV slide (tape/PanelSlide lifecycle). */

export type BOARD_TV_SLIDE_GATE = {
  active: boolean
  shouldclose: boolean
}

export function boardtvslidegateinitial(): BOARD_TV_SLIDE_GATE {
  return { active: false, shouldclose: false }
}

export function boardtvslidegatestep(
  prev: BOARD_TV_SLIDE_GATE,
  wantshow: boolean,
): BOARD_TV_SLIDE_GATE {
  if (wantshow) {
    return { active: true, shouldclose: false }
  }
  if (prev.active) {
    return { active: true, shouldclose: true }
  }
  return { active: false, shouldclose: false }
}

export function boardtvslidegateonclosed(): BOARD_TV_SLIDE_GATE {
  return { active: false, shouldclose: false }
}
