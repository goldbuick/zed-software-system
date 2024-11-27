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
