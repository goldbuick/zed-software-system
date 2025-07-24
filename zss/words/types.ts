// collection of enums and consts

import { isstring } from 'zss/mapping/types'

export enum COLOR {
  BLACK,
  DKBLUE,
  DKGREEN,
  DKCYAN,
  DKRED,
  DKPURPLE,
  DKYELLOW,
  LTGRAY,
  DKGRAY,
  BLUE,
  GREEN,
  CYAN,
  RED,
  PURPLE,
  YELLOW,
  WHITE,
  ONBLACK,
  ONDKBLUE,
  ONDKGREEN,
  ONDKCYAN,
  ONDKRED,
  ONDKPURPLE,
  ONDKYELLOW,
  ONLTGRAY,
  ONDKGRAY,
  ONBLUE,
  ONGREEN,
  ONCYAN,
  ONRED,
  ONPURPLE,
  ONYELLOW,
  ONWHITE,
  // special bg colors
  ONCLEAR,
}

export enum COLLISION {
  ISWALK,
  ISSOLID,
  ISSWIM,
  ISBULLET,
  ISGHOST,
}

export enum CATEGORY {
  ISTERRAIN,
  ISOBJECT,
}

export enum DIR {
  IDLE,
  NORTH,
  SOUTH,
  WEST,
  EAST,
  BY,
  AT,
  FLOW,
  SEEK,
  RNDNS,
  RNDNE,
  RND,
  // modifiers
  CW,
  CCW,
  OPP,
  RNDP,
  // pathfinding
  AWAY,
  TOWARD,
  FIND,
  FLEE,
  // combinations
  TO,
  // layer specifiers
  MID,
  OVER,
  UNDER,
}

export enum STAT_TYPE {
  LOADER, // @board title - this is a type + name stat
  BOARD,
  OBJECT,
  TERRAIN,
  CHARSET,
  PALETTE,
  //            all subsequent @ are key -> value paris
  CONST, //     @char 2 - @cycle 1 - the first @ is name,
  RANGE, //     @gooble range R HUH; help text for stat
  SELECT, //    @foup sl A B C
  NUMBER, //    @foup number 0 100
  TEXT, //      @gumple text
  HOTKEY, //    @gorp hotkey g - we can associate hotkeys with objects
  COPYIT, //    only useful in hyperlinks, used to copy into the clipboard
  OPENIT, //    only useful in hyperlinks, used to open a url in a new tab
  //            used in inspector
  ZSSEDIT, //   @code zssedit, affords the user to write local code
  CHAREDIT, //  @char charedit, affords the user to pick char
  COLOREDIT, // @color coloredit, affords the user to pick a color
}

export type STAT = {
  type: STAT_TYPE
  values: string[]
}

export type PT = { x: number; y: number }
export type WORD = string | number | undefined | WORD[]
export type WORD_RESULT = 0 | 1

export function NAME(name: any) {
  return isstring(name) ? name.toLowerCase().trim() : ''
}
