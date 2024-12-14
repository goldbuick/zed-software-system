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
  ISWALK,
  ISSOLID,
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
  LOADER, // @board title - this is a type + name stat
  BOARD,
  OBJECT,
  TERRAIN,
  CHARSET,
  PALETTE,
  CONST, //  @char 2 - @cycle 1 - the first @ is name,
  //         all subsequent @ are key -> value paris
  RANGE, //  @range gooble R HUH; help text for stat
  SELECT, // @sl foup A B C
  NUMBER, // @number foup 0 100
  TEXT, //   @text gumple
  LINK, //   @link north - use this for passages between boards
  HOTKEY, // @hotkey gorp g - we can associate hotkeys with objects
  SCROLL, // @scroll, affords the user to write local code
  COPYIT, // only useful in hyperlinks, used to copy into the clipboard
}

export type STAT = {
  type: STAT_TYPE
  values: string[]
}

export type PT = { x: number; y: number }
export type WORD = string | number | undefined | WORD[]
export type WORD_RESULT = 0 | 1
