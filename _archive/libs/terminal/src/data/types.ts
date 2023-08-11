export enum COLLISION {
  SOLID = 0,
  WALK = 1,
  SWIM = 2,
  BULLET = 3,
  GHOST = 4,
}

export type ElementStats = {
  collision?: COLLISION
  pushable?: boolean
}

export type ElementChar = {
  char?: number
  color?: number
  bg?: number
}

export type GameTerrain = {
  ref?: string
  type?: string
  name?: string
} & ElementStats &
  ElementChar
