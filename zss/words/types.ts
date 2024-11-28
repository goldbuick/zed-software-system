// collection of enums and consts

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
  CLEAR,
  SHADOW,
  BORROW,
}

export enum COLLISION {
  ISSOLID,
  ISWALK,
  ISSWIM,
  ISBULLET,
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
}

export enum STAT_TYPE {
  // @banana - specifies name stat
  // @board title - specifics type of codepage data is currently set to
  // @char 2 - we have a pre-defined set of value names that work here
  VALUE,
  // -----
  LINK, // @link north - use this for passages between boards
  HOTKEY, // @hotkey gorp g - we can associate hotkeys with objects
  RANGE, // @range gooble R HUH; help text for stat
  SELECT, // @sl foup A B C
  NUMBER, // @number foup 0 100
  TEXT, // @text gumple
  CODE, // @code, affords the user to write local code
}

export type PT = { x: number; y: number }
export type WORD = string | number | undefined | WORD[]
export type WORD_RESULT = 0 | 1
