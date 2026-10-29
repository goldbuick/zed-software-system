import Alea from 'alea'
import { wfcoverlappinggenerate } from 'zss/feature/wfcoverlapping'

function fillrgba(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number, number],
): Uint8Array {
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y)
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }
  return data
}

function windowkey(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  n: number,
  wrap: boolean,
): string {
  const parts: number[] = []
  for (let dy = 0; dy < n; dy++) {
    for (let dx = 0; dx < n; dx++) {
      let xx = x + dx
      let yy = y + dy
      if (wrap) {
        xx = ((xx % width) + width) % width
        yy = ((yy % height) + height) % height
      }
      const i = (yy * width + xx) * 4
      parts.push(data[i], data[i + 1], data[i + 2], data[i + 3])
    }
  }
  return parts.join(',')
}

function inputwindows(
  data: Uint8Array,
  width: number,
  height: number,
  n: number,
): Set<string> {
  const keys = new Set<string>()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      keys.add(windowkey(data, width, height, x, y, n, true))
    }
  }
  return keys
}

function expectwindowsin(
  output: Uint8Array,
  outwidth: number,
  outheight: number,
  n: number,
  allowed: Set<string>,
) {
  for (let y = 0; y <= outheight - n; y++) {
    for (let x = 0; x <= outwidth - n; x++) {
      const key = windowkey(output, outwidth, outheight, x, y, n, false)
      expect(allowed.has(key)).toBe(true)
    }
  }
}

test('same seed produces the same image', () => {
  const width = 8
  const height = 6
  const input = fillrgba(width, height, (x, y) => [
    (x * 3 + y) % 5,
    (x + y * 2) % 4,
    0,
    1,
  ])
  const a = wfcoverlappinggenerate(
    input,
    width,
    height,
    2,
    10,
    8,
    1,
    Alea('remix-seed'),
  )
  const b = wfcoverlappinggenerate(
    input,
    width,
    height,
    2,
    10,
    8,
    1,
    Alea('remix-seed'),
  )
  expect(a).toEqual(b)
  expect(a).toBeInstanceOf(Uint8Array)
})

test('every output window is a pattern from the input', () => {
  const width = 6
  const height = 4
  const n = 2
  const input = fillrgba(width, height, (x, y) => [
    (x + y * 3) % 3,
    x % 2,
    y % 2,
    7,
  ])
  const outwidth = 9
  const outheight = 7
  const output = wfcoverlappinggenerate(
    input,
    width,
    height,
    n,
    outwidth,
    outheight,
    1,
    Alea('windows'),
  )
  expect(output).toBeInstanceOf(Uint8Array)
  if (!output) {
    return
  }
  expectwindowsin(
    output,
    outwidth,
    outheight,
    n,
    inputwindows(input, width, height, n),
  )
})

test('uniform input fills the output', () => {
  const input = fillrgba(4, 4, () => [9, 1, 2, 3])
  const output = wfcoverlappinggenerate(
    input,
    4,
    4,
    2,
    6,
    5,
    4,
    Alea('flat'),
  )
  expect(output).toBeInstanceOf(Uint8Array)
  if (!output) {
    return
  }
  for (let i = 0; i < output.length; i += 4) {
    expect(output[i]).toBe(9)
    expect(output[i + 1]).toBe(1)
    expect(output[i + 2]).toBe(2)
    expect(output[i + 3]).toBe(3)
  }
})

test('checkerboard output stays a checkerboard', () => {
  const input = fillrgba(2, 2, (x, y) => [(x + y) % 2 === 0 ? 1 : 2, 0, 0, 4])
  const output = wfcoverlappinggenerate(
    input,
    2,
    2,
    2,
    8,
    8,
    1,
    Alea('checker'),
  )
  expect(output).toBeInstanceOf(Uint8Array)
  if (!output) {
    return
  }
  expectwindowsin(output, 8, 8, 2, inputwindows(input, 2, 2, 2))
  const at = (x: number, y: number) => output[(y * 8 + x) * 4]
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (x + 1 < 8) {
        expect(at(x, y)).not.toBe(at(x + 1, y))
      }
      if (y + 1 < 8) {
        expect(at(x, y)).not.toBe(at(x, y + 1))
      }
    }
  }
})

test('output smaller than the pattern returns undefined', () => {
  const input = fillrgba(4, 4, (x, y) => [x, y, 1, 1])
  expect(
    wfcoverlappinggenerate(input, 4, 4, 3, 2, 2, 1, Alea('too-small')),
  ).toBeUndefined()
})

test('60x25 pattern 3 mirror 8 finishes', () => {
  const width = 60
  const height = 25
  const input = fillrgba(width, height, (x, y) => {
    const edge = x % 5 === 0 || y % 4 === 0 ? 1 : 0
    const band = (Math.floor(x / 5) + Math.floor(y / 4)) % 4
    return [edge ? 1 : band + 2, band, edge, 8]
  })
  const started = performance.now()
  const output = wfcoverlappinggenerate(
    input,
    width,
    height,
    3,
    width,
    height,
    8,
    Alea('timing'),
  )
  const elapsed = performance.now() - started
  console.info(
    `wfcoverlapping 60x25 n=3 sym=8 ${elapsed.toFixed(1)}ms success=${output instanceof Uint8Array}`,
  )
  expect(output === undefined || output.length === width * height * 4).toBe(
    true,
  )
})
