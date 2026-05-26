/** BeepBox inverse real FFT — used once to build hollow noise spectrum. */

function ispowerof2(n: number) {
  return !!n && !(n & (n - 1))
}

function countbits(n: number) {
  if (!ispowerof2(n)) {
    throw new Error('FFT array length must be a power of 2.')
  }
  return Math.round(Math.log(n) / Math.log(2))
}

function reverseindexbits(
  array: { length: number; [index: number]: number },
  fulllength: number,
) {
  const bitcount = countbits(fulllength)
  const finalshift = 32 - bitcount
  for (let i = 0; i < fulllength; i++) {
    let j = ((i >> 1) & 0x55555555) | ((i & 0x55555555) << 1)
    j = ((j >> 2) & 0x33333333) | ((j & 0x33333333) << 2)
    j = ((j >> 4) & 0x0f0f0f0f) | ((j & 0x0f0f0f0f) << 4)
    j = ((j >> 8) & 0x00ff00ff) | ((j & 0x00ff00ff) << 8)
    j = ((j >> 16) & 0x0000ffff) | ((j & 0x0000ffff) << 16)
    j = j >>> finalshift
    if (j > i) {
      const temp = array[i]
      array[i] = array[j]
      array[j] = temp
    }
  }
}

export function inverserealfouriertransform(
  array: { length: number; [index: number]: number },
  fulllength: number,
) {
  const totalpasses = countbits(fulllength)
  if (fulllength < 4) {
    throw new Error('FFT array length must be at least 4.')
  }

  for (let pass = totalpasses - 1; pass >= 2; pass--) {
    const substride = 1 << pass
    const midsubstride = substride >> 1
    const stride = substride << 1
    const radiansincrement = (Math.PI * 2.0) / stride
    const cosincrement = Math.cos(radiansincrement)
    const sinincrement = Math.sin(radiansincrement)
    const oscillatormultiplier = 2.0 * cosincrement

    for (let startindex = 0; startindex < fulllength; startindex += stride) {
      const startindexa = startindex
      const midindexa = startindexa + midsubstride
      const startindexb = startindexa + substride
      const stopindex = startindexb + substride
      const realstarta = array[startindexa]
      const imagstartb = array[startindexb]
      array[startindexa] = realstarta + imagstartb
      array[midindexa] *= 2
      array[startindexb] = realstarta - imagstartb
      array[startindexb + midsubstride] *= 2
      let c = cosincrement
      let s = -sinincrement
      let cprev = 1.0
      let sprev = 0.0
      for (let index = 1; index < midsubstride; index++) {
        const indexa0 = startindexa + index
        const indexa1 = startindexb - index
        const indexb0 = startindexb + index
        const indexb1 = stopindex - index
        const real0 = array[indexa0]
        const real1 = array[indexa1]
        const imag0 = array[indexb0]
        const imag1 = array[indexb1]
        const tempa = real0 - real1
        const tempb = imag0 + imag1
        array[indexa0] = real0 + real1
        array[indexa1] = imag1 - imag0
        array[indexb0] = tempa * c - tempb * s
        array[indexb1] = tempb * c + tempa * s
        const ctemp = oscillatormultiplier * c - cprev
        const stemp = oscillatormultiplier * s - sprev
        cprev = c
        sprev = s
        c = ctemp
        s = stemp
      }
    }
  }

  for (let index = 0; index < fulllength; index += 4) {
    const index1 = index + 1
    const index2 = index + 2
    const index3 = index + 3
    const real0 = array[index]
    const real1 = array[index1] * 2
    const imag2 = array[index2]
    const imag3 = array[index3] * 2
    const tempa = real0 + imag2
    const tempb = real0 - imag2
    array[index] = tempa + real1
    array[index1] = tempa - real1
    array[index2] = tempb + imag3
    array[index3] = tempb - imag3
  }

  reverseindexbits(array, fulllength)
}

export function scaleelementsbyfactor(
  array: { length: number; [index: number]: number },
  factor: number,
) {
  for (let i = 0; i < array.length; i++) {
    array[i] *= factor
  }
}
