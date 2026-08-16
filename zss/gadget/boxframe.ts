import { COLOR } from 'zss/words/types'

const BORDER_TL = 218
const BORDER_TR = 191
const BORDER_BL = 192
const BORDER_BR = 217
const BORDER_HZ = 196
const BORDER_VT = 179
const BORDER_SINGLE = 254

export type BOX_FRAME = {
  char: number[]
  color: number[]
  bg: number[]
}

/** CP437 box frame; interior chars are 0 (discarded with ONCLEAR). */
export function buildboxframe(
  width: number,
  height: number,
  fgcolor: number = COLOR.WHITE,
): BOX_FRAME {
  const size = width * height
  const char = new Array<number>(size).fill(0)
  const color = new Array<number>(size).fill(fgcolor)
  const bg = new Array<number>(size).fill(COLOR.ONCLEAR)

  function setcell(x: number, y: number, code: number) {
    char[x + y * width] = code
  }

  if (width < 1 || height < 1) {
    return { char, color, bg }
  }

  if (width === 1 && height === 1) {
    setcell(0, 0, BORDER_SINGLE)
    return { char, color, bg }
  }

  if (width === 1) {
    setcell(0, 0, BORDER_VT)
    setcell(0, height - 1, BORDER_VT)
    for (let y = 1; y < height - 1; ++y) {
      setcell(0, y, BORDER_VT)
    }
    return { char, color, bg }
  }

  if (height === 1) {
    setcell(0, 0, BORDER_HZ)
    setcell(width - 1, 0, BORDER_HZ)
    for (let x = 1; x < width - 1; ++x) {
      setcell(x, 0, BORDER_HZ)
    }
    return { char, color, bg }
  }

  setcell(0, 0, BORDER_TL)
  setcell(width - 1, 0, BORDER_TR)
  setcell(0, height - 1, BORDER_BL)
  setcell(width - 1, height - 1, BORDER_BR)
  for (let x = 1; x < width - 1; ++x) {
    setcell(x, 0, BORDER_HZ)
    setcell(x, height - 1, BORDER_HZ)
  }
  for (let y = 1; y < height - 1; ++y) {
    setcell(0, y, BORDER_VT)
    setcell(width - 1, y, BORDER_VT)
  }
  return { char, color, bg }
}
