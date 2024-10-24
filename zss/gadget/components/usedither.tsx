/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react'
import { proxy, useSnapshot } from 'valtio'

import { Dither } from './dither'

export function useDither(width: number, height: number) {
  const size = width * height
  const dither = useMemo(() => {
    return proxy<number[]>(new Array(size).fill(0))
  }, [size])

  return dither
}

type DitherSnapshotProps = {
  width: number
  height: number
  dither: number[]
}

export function DitherSnapshot({ width, height, dither }: DitherSnapshotProps) {
  const snapshot = useSnapshot(dither) as number[]

  return <Dither width={width} height={height} alphas={snapshot} />
}

export function resetDither(dither: number[]) {
  dither.splice(0, dither.length, ...new Array(dither.length).fill(0))
}

export function readDither(
  dither: number[],
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return -1
  }
  return dither[x + y * width]
}

export function writeDither(
  dither: number[],
  width: number,
  height: number,
  x: number,
  y: number,
  value: number,
) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return -1
  }
  dither[x + y * width] = value
}
