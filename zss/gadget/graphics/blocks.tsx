/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react'
import { RUNTIME } from 'zss/config'
import { COLLISION, COLOR } from 'zss/words/types'

import { createdarknessmaterial } from '../display/blocks'

export function DarknessMesh() {
  const [material] = useState(() => createdarknessmaterial())
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  return (
    <>
      <boxGeometry args={[drawwidth, drawheight, drawheight]} />
      <primitive object={material} attach="material" />
    </>
  )
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
      return 176
    }),
    color: color.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
          return v
      }
      return COLOR.DKGRAY
    }),
    bg: bg.map((v, idx) => {
      switch (stats[idx] as COLLISION) {
        case COLLISION.ISSWIM:
          return v
      }
      return COLOR.BLACK
    }),
  }
}
