// Overlapping model and propagator adapted from fast-wfc.
// Copyright (c) 2018-2019 Mathieu Fehr and Nathanaelle Courant. MIT License.
// https://github.com/math-fehr/fast-wfc

// Periodic input, non-periodic output. Symmetry is the first 1..8 of
// identity, reflect, rotate, reflect, ... (same order as fast-wfc).

const DIRECTION_COUNT = 4
const DIRECTION_X = [0, -1, 1, 0]
const DIRECTION_Y = [-1, 0, 0, 1]

function oppositedirection(direction: number): number {
  return 3 - direction
}

function readpixel(input: Uint8Array, index: number): number {
  const i = index * 4
  return (
    (input[i] |
      (input[i + 1] << 8) |
      (input[i + 2] << 16) |
      (input[i + 3] << 24)) >>>
    0
  )
}

function writepixel(output: Uint8Array, index: number, pixel: number) {
  const i = index * 4
  output[i] = pixel & 255
  output[i + 1] = (pixel >>> 8) & 255
  output[i + 2] = (pixel >>> 16) & 255
  output[i + 3] = (pixel >>> 24) & 255
}

function reflectpattern(src: Uint32Array, dst: Uint32Array, n: number) {
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      dst[y * n + x] = src[y * n + (n - 1 - x)]
    }
  }
}

function rotatepattern(src: Uint32Array, dst: Uint32Array, n: number) {
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      dst[y * n + x] = src[x * n + (n - 1 - y)]
    }
  }
}

function patternhash(src: Uint32Array, n2: number): number {
  let hash = 2166136261
  for (let i = 0; i < n2; i++) {
    hash ^= src[i]
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function patternsequal(a: Uint32Array, b: Uint32Array, n2: number): boolean {
  for (let i = 0; i < n2; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

function agrees(
  patterns: Uint32Array,
  p1: number,
  p2: number,
  n: number,
  dy: number,
  dx: number,
): boolean {
  const xmin = dx < 0 ? 0 : dx
  const xmax = dx < 0 ? dx + n : n
  const ymin = dy < 0 ? 0 : dy
  const ymax = dy < 0 ? dy + n : n
  const base1 = p1 * n * n
  const base2 = p2 * n * n
  for (let y = ymin; y < ymax; y++) {
    const row1 = base1 + y * n
    const row2 = base2 + (y - dy) * n
    for (let x = xmin; x < xmax; x++) {
      if (patterns[row1 + x] !== patterns[row2 + (x - dx)]) {
        return false
      }
    }
  }
  return true
}

type PATTERN_SET = {
  patterns: Uint32Array
  frequencies: Float64Array
  plogp: Float64Array
  minabshalfplogp: number
}

function extractpatterns(
  pixels: Uint32Array,
  width: number,
  height: number,
  patternsize: number,
  symmetry: number,
): PATTERN_SET | undefined {
  const requested = Math.floor(symmetry)
  if (!Number.isInteger(requested) || requested < 1) {
    return undefined
  }
  const sym = Math.min(8, requested)
  const n2 = patternsize * patternsize
  const base = new Uint32Array(n2)
  const forms: Uint32Array[] = []
  for (let i = 0; i < sym; i++) {
    forms.push(new Uint32Array(n2))
  }
  const found = new Map<number, number[]>()
  const weights: number[] = []
  const chunks: Uint32Array[] = []

  function record(src: Uint32Array) {
    const hash = patternhash(src, n2)
    const bucket = found.get(hash)
    if (bucket) {
      for (let i = 0; i < bucket.length; i++) {
        const id = bucket[i]
        if (patternsequal(chunks[id], src, n2)) {
          weights[id] += 1
          return
        }
      }
      bucket.push(chunks.length)
    } else {
      found.set(hash, [chunks.length])
    }
    const copy = new Uint32Array(n2)
    copy.set(src)
    weights.push(1)
    chunks.push(copy)
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let py = 0; py < patternsize; py++) {
        const sy = (y + py) % height
        const row = sy * width
        for (let px = 0; px < patternsize; px++) {
          base[py * patternsize + px] = pixels[row + ((x + px) % width)]
        }
      }
      forms[0].set(base)
      if (sym > 1) {
        reflectpattern(forms[0], forms[1], patternsize)
      }
      if (sym > 2) {
        rotatepattern(forms[0], forms[2], patternsize)
      }
      if (sym > 3) {
        reflectpattern(forms[2], forms[3], patternsize)
      }
      if (sym > 4) {
        rotatepattern(forms[2], forms[4], patternsize)
      }
      if (sym > 5) {
        reflectpattern(forms[4], forms[5], patternsize)
      }
      if (sym > 6) {
        rotatepattern(forms[4], forms[6], patternsize)
      }
      if (sym > 7) {
        reflectpattern(forms[6], forms[7], patternsize)
      }
      for (let k = 0; k < sym; k++) {
        record(forms[k])
      }
    }
  }

  const patterncount = chunks.length
  if (patterncount === 0) {
    return undefined
  }
  const patterns = new Uint32Array(patterncount * n2)
  let sum = 0
  for (let i = 0; i < patterncount; i++) {
    patterns.set(chunks[i], i * n2)
    sum += weights[i]
  }
  const inv = 1 / sum
  const frequencies = new Float64Array(patterncount)
  const plogp = new Float64Array(patterncount)
  let minabshalfplogp = Infinity
  for (let i = 0; i < patterncount; i++) {
    const p = weights[i] * inv
    frequencies[i] = p
    const plog = p * Math.log(p)
    plogp[i] = plog
    const half = Math.abs(plog / 2)
    if (half < minabshalfplogp) {
      minabshalfplogp = half
    }
  }
  return { patterns, frequencies, plogp, minabshalfplogp }
}

type COMPAT_LISTS = {
  offsets: Int32Array
  counts: Int32Array
  data: Int32Array
}

function buildcompatible(
  patterns: Uint32Array,
  patterncount: number,
  patternsize: number,
): COMPAT_LISTS {
  const lists: number[][] = new Array(patterncount * DIRECTION_COUNT)
  for (let i = 0; i < lists.length; i++) {
    lists[i] = []
  }
  for (let p1 = 0; p1 < patterncount; p1++) {
    for (let direction = 0; direction < DIRECTION_COUNT; direction++) {
      const bucket = lists[p1 * DIRECTION_COUNT + direction]
      const dy = DIRECTION_Y[direction]
      const dx = DIRECTION_X[direction]
      for (let p2 = 0; p2 < patterncount; p2++) {
        if (agrees(patterns, p1, p2, patternsize, dy, dx)) {
          bucket.push(p2)
        }
      }
    }
  }
  const offsets = new Int32Array(lists.length)
  const counts = new Int32Array(lists.length)
  let total = 0
  for (let i = 0; i < lists.length; i++) {
    offsets[i] = total
    counts[i] = lists[i].length
    total += lists[i].length
  }
  const data = new Int32Array(total)
  let cursor = 0
  for (let i = 0; i < lists.length; i++) {
    const bucket = lists[i]
    for (let k = 0; k < bucket.length; k++) {
      data[cursor++] = bucket[k]
    }
  }
  return { offsets, counts, data }
}

function topixels(
  patterns: Uint32Array,
  chosen: Int32Array,
  patternsize: number,
  wavewidth: number,
  waveheight: number,
  outwidth: number,
  outheight: number,
): Uint8Array {
  const output = new Uint8Array(outwidth * outheight * 4)
  const n2 = patternsize * patternsize
  for (let y = 0; y < waveheight; y++) {
    for (let x = 0; x < wavewidth; x++) {
      const pid = chosen[y * wavewidth + x]
      writepixel(output, y * outwidth + x, patterns[pid * n2])
    }
  }
  for (let y = 0; y < waveheight; y++) {
    const pid = chosen[y * wavewidth + (wavewidth - 1)]
    const base = pid * n2
    for (let dx = 1; dx < patternsize; dx++) {
      writepixel(
        output,
        y * outwidth + (wavewidth - 1 + dx),
        patterns[base + dx],
      )
    }
  }
  for (let x = 0; x < wavewidth; x++) {
    const pid = chosen[(waveheight - 1) * wavewidth + x]
    const base = pid * n2
    for (let dy = 1; dy < patternsize; dy++) {
      writepixel(
        output,
        (waveheight - 1 + dy) * outwidth + x,
        patterns[base + dy * patternsize],
      )
    }
  }
  const corner = chosen[(waveheight - 1) * wavewidth + (wavewidth - 1)]
  const cornerbase = corner * n2
  for (let dy = 1; dy < patternsize; dy++) {
    for (let dx = 1; dx < patternsize; dx++) {
      writepixel(
        output,
        (waveheight - 1 + dy) * outwidth + (wavewidth - 1 + dx),
        patterns[cornerbase + dy * patternsize + dx],
      )
    }
  }
  return output
}

export function wfcoverlappinggenerate(
  input: Uint8Array,
  width: number,
  height: number,
  patternsize: number,
  outwidth: number,
  outheight: number,
  symmetry: number,
  random: () => number,
): Uint8Array | undefined {
  if (
    patternsize < 1 ||
    width < 1 ||
    height < 1 ||
    outwidth < patternsize ||
    outheight < patternsize
  ) {
    return undefined
  }

  const pixels = new Uint32Array(width * height)
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = readpixel(input, i)
  }
  const set = extractpatterns(pixels, width, height, patternsize, symmetry)
  if (!set) {
    return undefined
  }
  const { patterns, frequencies, plogp, minabshalfplogp } = set
  const patterncount = frequencies.length
  const compat = buildcompatible(patterns, patterncount, patternsize)

  const wavewidth = outwidth - patternsize + 1
  const waveheight = outheight - patternsize + 1
  const cellcount = wavewidth * waveheight

  const wave = new Uint8Array(cellcount * patterncount)
  wave.fill(1)
  const plogpsum = new Float64Array(cellcount)
  const sumweights = new Float64Array(cellcount)
  const entropies = new Float64Array(cellcount)
  const patterncounts = new Int32Array(cellcount)
  let baseplogp = 0
  let basesum = 0
  for (let i = 0; i < patterncount; i++) {
    baseplogp += plogp[i]
    basesum += frequencies[i]
  }
  const baseentropy = Math.log(basesum) - baseplogp / basesum
  plogpsum.fill(baseplogp)
  sumweights.fill(basesum)
  entropies.fill(baseentropy)
  patterncounts.fill(patterncount)

  const compatible = new Int32Array(cellcount * patterncount * DIRECTION_COUNT)
  const template = new Int32Array(patterncount * DIRECTION_COUNT)
  for (let pattern = 0; pattern < patterncount; pattern++) {
    for (let direction = 0; direction < DIRECTION_COUNT; direction++) {
      template[pattern * DIRECTION_COUNT + direction] =
        compat.counts[pattern * DIRECTION_COUNT + oppositedirection(direction)]
    }
  }
  for (let cell = 0; cell < cellcount; cell++) {
    compatible.set(template, cell * patterncount * DIRECTION_COUNT)
  }

  const state = { impossible: false }
  let stack = new Int32Array(Math.max(1024, patterncount * 3))
  let stacksize = 0

  function waveset(index: number, pattern: number) {
    const slot = index * patterncount + pattern
    if (wave[slot] === 0) {
      return
    }
    wave[slot] = 0
    plogpsum[index] -= plogp[pattern]
    sumweights[index] -= frequencies[pattern]
    patterncounts[index] -= 1
    if (patterncounts[index] === 0) {
      state.impossible = true
      return
    }
    const nextsum = sumweights[index]
    entropies[index] = Math.log(nextsum) - plogpsum[index] / nextsum
  }

  function pushban(y: number, x: number, pattern: number) {
    const base =
      ((y * wavewidth + x) * patterncount + pattern) * DIRECTION_COUNT
    compatible[base] = 0
    compatible[base + 1] = 0
    compatible[base + 2] = 0
    compatible[base + 3] = 0
    if (stacksize + 3 > stack.length) {
      const grown = new Int32Array(stack.length * 2)
      grown.set(stack)
      stack = grown
    }
    stack[stacksize++] = y
    stack[stacksize++] = x
    stack[stacksize++] = pattern
  }

  function propagate() {
    while (stacksize > 0) {
      const pattern = stack[--stacksize]
      const x1 = stack[--stacksize]
      const y1 = stack[--stacksize]
      for (let direction = 0; direction < DIRECTION_COUNT; direction++) {
        const x2 = x1 + DIRECTION_X[direction]
        const y2 = y1 + DIRECTION_Y[direction]
        if (x2 < 0 || x2 >= wavewidth || y2 < 0 || y2 >= waveheight) {
          continue
        }
        const listindex = pattern * DIRECTION_COUNT + direction
        const start = compat.offsets[listindex]
        const count = compat.counts[listindex]
        const i2 = y2 * wavewidth + x2
        for (let k = 0; k < count; k++) {
          const p2 = compat.data[start + k]
          const slot = (i2 * patterncount + p2) * DIRECTION_COUNT + direction
          const next = compatible[slot] - 1
          compatible[slot] = next
          if (next === 0) {
            pushban(y2, x2, p2)
            waveset(i2, p2)
          }
        }
      }
    }
  }

  // A pattern whose support count starts at 0 can never sit next to a real
  // neighbor. fast-wfc only removes a pattern when a count *reaches* 0, so
  // those stay in the wave and can be chosen. Ban them up front.
  for (let y = 0; y < waveheight; y++) {
    for (let x = 0; x < wavewidth; x++) {
      const cell = y * wavewidth + x
      for (let pattern = 0; pattern < patterncount; pattern++) {
        if (wave[cell * patterncount + pattern] === 0) {
          continue
        }
        for (let direction = 0; direction < DIRECTION_COUNT; direction++) {
          const support = oppositedirection(direction)
          const ny = y + DIRECTION_Y[support]
          const nx = x + DIRECTION_X[support]
          if (ny < 0 || ny >= waveheight || nx < 0 || nx >= wavewidth) {
            continue
          }
          const slot =
            (cell * patterncount + pattern) * DIRECTION_COUNT + direction
          if (compatible[slot] === 0) {
            pushban(y, x, pattern)
            waveset(cell, pattern)
            break
          }
        }
      }
    }
  }
  propagate()

  function observe(): number {
    if (state.impossible) {
      return -2
    }
    let min = Infinity
    let argmin = -1
    for (let i = 0; i < cellcount; i++) {
      if (patterncounts[i] === 1) {
        continue
      }
      const entropy = entropies[i]
      if (entropy <= min) {
        const noise = random() * minabshalfplogp
        if (entropy + noise < min) {
          min = entropy + noise
          argmin = i
        }
      }
    }
    if (argmin === -1) {
      return -1
    }
    const base = argmin * patterncount
    let total = 0
    for (let k = 0; k < patterncount; k++) {
      if (wave[base + k]) {
        total += frequencies[k]
      }
    }
    let roll = random() * total
    let chosen = patterncount - 1
    for (let k = 0; k < patterncount; k++) {
      if (wave[base + k]) {
        roll -= frequencies[k]
      }
      if (roll <= 0) {
        chosen = k
        break
      }
    }
    const y = (argmin / wavewidth) | 0
    const x = argmin - y * wavewidth
    for (let k = 0; k < patterncount; k++) {
      const on = wave[base + k] !== 0
      if (on !== (k === chosen)) {
        pushban(y, x, k)
        waveset(argmin, k)
      }
    }
    return argmin
  }

  let observed = observe()
  while (observed >= 0) {
    propagate()
    observed = observe()
  }
  if (observed === -2) {
    return undefined
  }

  const chosen = new Int32Array(cellcount)
  for (let i = 0; i < cellcount; i++) {
    const base = i * patterncount
    for (let k = 0; k < patterncount; k++) {
      if (wave[base + k]) {
        chosen[i] = k
        break
      }
    }
  }
  return topixels(
    patterns,
    chosen,
    patternsize,
    wavewidth,
    waveheight,
    outwidth,
    outheight,
  )
}
