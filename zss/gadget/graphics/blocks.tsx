import { COLLISION, COLOR } from 'zss/words/types'

export function filterlayer2floor(
  char: number[],
  color: number[],
  bg: number[],
  stats: number[],
) {
  return {
    char: char.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
        case COLLISION.ISSOLID:
          return 0
      }
      return v
    }),
    color: color.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
        case COLLISION.ISSOLID:
          return COLOR.ONCLEAR
      }
      return v
    }),
    bg: bg.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
        case COLLISION.ISSOLID:
          return COLOR.ONCLEAR
      }
      return v
    }),
  }
}

export function filterlayer2walls(
  char: number[],
  color: number[],
  bg: number[],
  stats: number[],
) {
  return {
    char: char.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSOLID:
          return v
      }
      return 0
    }),
    color: color.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSOLID:
          return v
      }
      return 0
    }),
    bg: bg.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSOLID:
          return v
      }
      return COLOR.ONCLEAR
    }),
  }
}

export function filterlayer2water(
  char: number[],
  color: number[],
  bg: number[],
  stats: number[],
) {
  return {
    char: char.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
          return v
      }
      return 0
    }),
    color: color.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
          return v
      }
      return 0
    }),
    bg: bg.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
          return v
      }
      return COLOR.ONCLEAR
    }),
  }
}

export function filterlayer2ground(
  char: number[],
  color: number[],
  bg: number[],
  stats: number[],
) {
  return {
    char: char.map((_, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
          return 0
      }
      return 176
    }),
    color: color.map((_, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
          return 0
      }
      return COLOR.DKGRAY
    }),
    bg: bg.map((_, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
          return COLOR.ONCLEAR
      }
      return COLOR.BLACK
    }),
  }
}
