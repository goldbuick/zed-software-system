import { COLLISION, COLOR } from 'zss/words/types'

export type FpvTileBuffers = {
  floor: { char: number[]; color: number[]; bg: number[] }
  walls: { char: number[]; color: number[]; bg: number[] }
  water: { char: number[]; color: number[]; bg: number[] }
  sky: { char: number[]; color: number[]; bg: number[] }
  flooredge: { char: number[]; color: number[]; bg: number[] }
  skyedge: { char: number[]; color: number[]; bg: number[] }
}

/** One pass over the board; equivalent to six separate `filterlayer2*` maps for FPV tiles. */
export function splitlayer2fpvtiles(
  char: number[],
  color: number[],
  bg: number[],
  stats: number[],
): FpvTileBuffers {
  const n = char.length
  const floorc = new Array<number>(n)
  const floorcol = new Array<number>(n)
  const floorbg = new Array<number>(n)
  const wallc = new Array<number>(n)
  const wallbg = new Array<number>(n)
  const waterc = new Array<number>(n)
  const waterbg = new Array<number>(n)
  const skyc = new Array<number>(n)
  const skybg = new Array<number>(n)
  const fechar = new Array<number>(n)
  const fecol = new Array<number>(n)
  const febg = new Array<number>(n)
  const sechar = new Array<number>(n)
  const secol = new Array<number>(n)
  const sebg = new Array<number>(n)

  for (let idx = 0; idx < n; ++idx) {
    const v = char[idx]
    const c = color[idx]
    const b = bg[idx]
    const stat = stats[idx] as COLLISION

    switch (stat) {
      case COLLISION.ISSWIM: {
        floorc[idx] = 0
        floorcol[idx] = COLOR.ONCLEAR
        floorbg[idx] = COLOR.ONCLEAR
        wallc[idx] = 0
        wallbg[idx] = COLOR.ONCLEAR
        waterc[idx] = Math.abs(v)
        waterbg[idx] = b
        skyc[idx] = 0
        skybg[idx] = COLOR.ONCLEAR
        fechar[idx] = 0
        fecol[idx] = 0
        febg[idx] = COLOR.ONCLEAR
        sechar[idx] = 0
        secol[idx] = 0
        sebg[idx] = COLOR.ONCLEAR
        break
      }
      case COLLISION.ISSOLID: {
        floorc[idx] = 0
        floorcol[idx] = COLOR.ONCLEAR
        floorbg[idx] = COLOR.BLACK
        wallc[idx] = Math.abs(v)
        wallbg[idx] = b
        waterc[idx] = 0
        waterbg[idx] = COLOR.ONCLEAR
        skyc[idx] = 0
        skybg[idx] = COLOR.ONCLEAR
        fechar[idx] = 176
        fecol[idx] = COLOR.DKGRAY
        febg[idx] = COLOR.BLACK
        sechar[idx] = 0
        secol[idx] = 0
        sebg[idx] = COLOR.ONCLEAR
        break
      }
      default: {
        floorc[idx] = Math.abs(v)
        floorcol[idx] = c
        floorbg[idx] = b
        wallc[idx] = 0
        wallbg[idx] = COLOR.ONCLEAR
        waterc[idx] = 0
        waterbg[idx] = COLOR.ONCLEAR
        const neg = v < 0
        if (neg) {
          skyc[idx] = 0
          skybg[idx] = COLOR.ONCLEAR
          sechar[idx] = 0
          secol[idx] = 0
          sebg[idx] = COLOR.ONCLEAR
        } else {
          skyc[idx] = v
          skybg[idx] = b
          sechar[idx] = 176
          secol[idx] = COLOR.DKGRAY
          sebg[idx] = COLOR.BLACK
        }
        fechar[idx] = 176
        fecol[idx] = COLOR.DKGRAY
        febg[idx] = COLOR.BLACK
        break
      }
    }
  }

  return {
    floor: { char: floorc, color: floorcol, bg: floorbg },
    walls: { char: wallc, color, bg: wallbg },
    water: { char: waterc, color, bg: waterbg },
    sky: { char: skyc, color, bg: skybg },
    flooredge: { char: fechar, color: fecol, bg: febg },
    skyedge: { char: sechar, color: secol, bg: sebg },
  }
}

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
      return Math.abs(v)
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
          return COLOR.ONCLEAR
        case COLLISION.ISSOLID:
          return COLOR.BLACK
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
          return Math.abs(v)
      }
      return 0
    }),
    color,
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
          return Math.abs(v)
      }
      return 0
    }),
    color,
    bg: bg.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
          return v
      }
      return COLOR.ONCLEAR
    }),
  }
}

export function filterlayer2sky(
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
      if (char[idx] < 0) {
        return 0
      }
      return v
    }),
    color,
    bg: bg.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
        case COLLISION.ISSOLID:
          return COLOR.ONCLEAR
      }
      if (char[idx] < 0) {
        return COLOR.ONCLEAR
      }
      return v
    }),
  }
}

export function filterlayer2flooredge(
  char: number[],
  color: number[],
  bg: number[],
  stats: number[],
) {
  return {
    char: char.map((_, idx) => {
      if ((stats[idx] as COLLISION) === COLLISION.ISSWIM) {
        return 0
      }
      return 176
    }),
    color: color.map((_, idx) => {
      if ((stats[idx] as COLLISION) === COLLISION.ISSWIM) {
        return 0
      }
      return COLOR.DKGRAY
    }),
    bg: bg.map((_, idx) => {
      if ((stats[idx] as COLLISION) === COLLISION.ISSWIM) {
        return COLOR.ONCLEAR
      }
      return COLOR.BLACK
    }),
  }
}

export function filterlayer2skyedge(
  char: number[],
  color: number[],
  bg: number[],
  stats: number[],
) {
  return {
    char: char.map((_, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
        case COLLISION.ISSOLID:
          return 0
      }
      if (char[idx] < 0) {
        return 0
      }
      return 176
    }),
    color: color.map((_, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
        case COLLISION.ISSOLID:
          return 0
      }
      if (char[idx] < 0) {
        return 0
      }
      return COLOR.DKGRAY
    }),
    bg: bg.map((_, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
        case COLLISION.ISSOLID:
          return COLOR.ONCLEAR
      }
      if (char[idx] < 0) {
        return COLOR.ONCLEAR
      }
      return COLOR.BLACK
    }),
  }
}
