import { Map as YMap } from 'yjs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MAYBE_MAP = YMap<any> | undefined

export enum DIR {
  NONE,
  UP,
  DOWN,
  LEFT,
  RIGHT,
  BY,
  AT,
  FROM,
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
  // aliases
  IDLE = NONE,
  U = UP,
  NORTH = UP,
  N = UP,
  D = DOWN,
  SOUTH = DOWN,
  S = DOWN,
  L = LEFT,
  WEST = LEFT,
  W = LEFT,
  R = RIGHT,
  EAST = RIGHT,
  E = RIGHT,
}

export type POINT = {
  x: number
  y: number
}

/*

A code page is a bundle of assets to describe terrain / object behavior

for example:

@named code which has @attributes

@terrain
@water

@object (object is default)
@shark

sfxr sounds

beepbox tracks

custom chars

*/
