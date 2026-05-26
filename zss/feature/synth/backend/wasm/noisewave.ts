import { SOURCE_TYPE } from 'zss/feature/synth/shared/sourcetype'

import { inverserealfouriertransform, scaleelementsbyfactor } from './noisefft'
import { NOISE_WHITE_SEED, noiseprngnext } from './noiseprng'

/** BeepBox chipNoiseLength — 32768 with seam sample at index 32768. */
export const NOISE_SAMPLE_COUNT = 32768
export const NOISE_TABLE_LENGTH = NOISE_SAMPLE_COUNT + 1

const METALLIC_AMP_MULT = 7.5

function advance_lfsr(
  drumbuffer: number,
  tap: number,
): [number, number] {
  const sample = (drumbuffer & 1) * 2.0 - 1.0
  let newbuffer = drumbuffer >> 1
  if (((drumbuffer + newbuffer) & 1) === 1) {
    newbuffer += tap
  }
  return [newbuffer, sample]
}

export function generateretrowave(): Float64Array {
  const wave = new Float64Array(NOISE_TABLE_LENGTH)
  let drumbuffer = 1
  for (let i = 0; i < NOISE_SAMPLE_COUNT; i++) {
    ;[drumbuffer, wave[i]] = advance_lfsr(drumbuffer, 1 << 14)
  }
  wave[NOISE_SAMPLE_COUNT] = wave[0]
  return wave
}

export function generateclangwave(): Float64Array {
  const wave = new Float64Array(NOISE_TABLE_LENGTH)
  let drumbuffer = 1
  for (let i = 0; i < NOISE_SAMPLE_COUNT; i++) {
    ;[drumbuffer, wave[i]] = advance_lfsr(drumbuffer, 2 << 14)
  }
  wave[NOISE_SAMPLE_COUNT] = wave[0]
  return wave
}

export function generatebuzzwave(): Float64Array {
  const wave = new Float64Array(NOISE_TABLE_LENGTH)
  let drumbuffer = 1
  for (let i = 0; i < NOISE_SAMPLE_COUNT; i++) {
    ;[drumbuffer, wave[i]] = advance_lfsr(drumbuffer, 10 << 2)
  }
  wave[NOISE_SAMPLE_COUNT] = wave[0]
  return wave
}

export function generatemetallicwave(): Float64Array {
  const wave = new Float64Array(NOISE_TABLE_LENGTH)
  let drumbuffer = 1
  for (let i = 0; i < NOISE_SAMPLE_COUNT; i++) {
    const bit = drumbuffer & 1
    wave[i] = bit * 4.0 * METALLIC_AMP_MULT - 8.0
    let newbuffer = drumbuffer >> 1
    if (((drumbuffer + newbuffer) & 1) === 1) {
      newbuffer += 15 << 2
    }
    drumbuffer = newbuffer
  }
  wave[NOISE_SAMPLE_COUNT] = wave[0]
  return wave
}

export function generatewhitewave(seed: number = NOISE_WHITE_SEED): Float64Array {
  const wave = new Float64Array(NOISE_TABLE_LENGTH)
  let state = seed >>> 0
  for (let i = 0; i < NOISE_SAMPLE_COUNT; i++) {
    let sample = 0
    ;[state, sample] = noiseprngnext(state)
    wave[i] = sample
  }
  wave[NOISE_SAMPLE_COUNT] = wave[0]
  return wave
}

function drawnoisespectrum(
  wave: Float64Array,
  retrowave: Float64Array,
  lowoctave: number,
  highoctave: number,
  lowpower: number,
  highpower: number,
  overallslope: number,
) {
  const referenceoctave = 11
  const referenceindex = 1 << referenceoctave
  const lowindex = Math.pow(2, lowoctave) | 0
  const highindex = Math.min(NOISE_SAMPLE_COUNT >> 1, Math.pow(2, highoctave) | 0)

  for (let i = lowindex; i < highindex; i++) {
    const lerped =
      lowpower +
      ((highpower - lowpower) * (Math.log2(i) - lowoctave)) / (highoctave - lowoctave)
    let amplitude = Math.pow(2, (lerped - 1) * 7 + 1) * lerped
    amplitude *= Math.pow(i / referenceindex, overallslope)
    amplitude *= retrowave[i]
    const radians = 0.61803398875 * i * i * Math.PI * 2.0
    wave[i] = Math.cos(radians) * amplitude
    wave[NOISE_SAMPLE_COUNT - i] = Math.sin(radians) * amplitude
  }
}

export function generatehollowwave(retrowave?: Float64Array): Float64Array {
  const retro = retrowave ?? generateretrowave()
  const wave = new Float64Array(NOISE_TABLE_LENGTH)
  drawnoisespectrum(wave, retro, 10, 11, 1, 1, 0)
  drawnoisespectrum(wave, retro, 11, 14, 0.6578, 0.6578, 0)
  inverserealfouriertransform(wave, NOISE_SAMPLE_COUNT)
  scaleelementsbyfactor(wave, 1.0 / Math.sqrt(NOISE_SAMPLE_COUNT))
  wave[NOISE_SAMPLE_COUNT] = wave[0]
  return wave
}

export function generatenoisewave(source: SOURCE_TYPE): Float64Array {
  switch (source) {
    case SOURCE_TYPE.RETRO_NOISE:
      return generateretrowave()
    case SOURCE_TYPE.BUZZ_NOISE:
      return generatebuzzwave()
    case SOURCE_TYPE.CLANG_NOISE:
      return generateclangwave()
    case SOURCE_TYPE.METALLIC_NOISE:
      return generatemetallicwave()
    case SOURCE_TYPE.HOLLOW_NOISE:
      return generatehollowwave()
    case SOURCE_TYPE.WHITE_NOISE:
      return generatewhitewave()
    default:
      return generateretrowave()
  }
}

/** Golden vectors — first 16 samples (BeepBox LFSR / fixed-seed parity). */
export const NOISE_GOLDEN_RETRO = [
  1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 1,
]
export const NOISE_GOLDEN_CLANG = [
  1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
]
export const NOISE_GOLDEN_BUZZ = [
  1, -1, -1, -1, 1, -1, 1, 1, 1, -1, -1, -1, -1, 1, 1, -1,
]

/** Maximilian setup — build noise tables once at voice init. */
export const WASM_NOISE_SETUP_CODE = `
var NOISE_COUNT = ${NOISE_SAMPLE_COUNT};
var NOISE_MASK = ${NOISE_SAMPLE_COUNT - 1};
var NOISE_WHITE_SEED = ${NOISE_WHITE_SEED};
var METALLIC_AMP_MULT = ${METALLIC_AMP_MULT};

function noiseprngnext(state) {
  var next = (state + 0x6d2b79f5) | 0;
  next = Math.imul(next ^ (next >>> 15), next | 1);
  next = (next ^ (next + Math.imul(next ^ (next >>> 7), next | 61))) | 0;
  var sample = ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  return [next, sample * 2 - 1];
}

function noiselfsr(buf, tap, metallic) {
  var drumbuffer = 1;
  for (var i = 0; i < NOISE_COUNT; i++) {
    if (metallic) {
      var bit = drumbuffer & 1;
      buf[i] = bit * 4.0 * METALLIC_AMP_MULT - 8.0;
    } else {
      buf[i] = (drumbuffer & 1) * 2.0 - 1.0;
    }
    var newbuffer = drumbuffer >> 1;
    if (((drumbuffer + newbuffer) & 1) === 1) {
      newbuffer += tap;
    }
    drumbuffer = newbuffer;
  }
  buf[NOISE_COUNT] = buf[0];
}

function noisewhite(buf) {
  var state = NOISE_WHITE_SEED >>> 0;
  for (var i = 0; i < NOISE_COUNT; i++) {
    var out = noiseprngnext(state);
    state = out[0];
    buf[i] = out[1];
  }
  buf[NOISE_COUNT] = buf[0];
}

function ispow2(n) {
  return !!n && !(n & (n - 1));
}

function countbits(n) {
  return Math.round(Math.log(n) / Math.log(2));
}

function reverseindexbits(array, fulllength) {
  var bitcount = countbits(fulllength);
  var finalshift = 32 - bitcount;
  for (var i = 0; i < fulllength; i++) {
    var j = ((i >> 1) & 0x55555555) | ((i & 0x55555555) << 1);
    j = ((j >> 2) & 0x33333333) | ((j & 0x33333333) << 2);
    j = ((j >> 4) & 0x0f0f0f0f) | ((j & 0x0f0f0f0f) << 4);
    j = ((j >> 8) & 0x00ff00ff) | ((j & 0x00ff00ff) << 8);
    j = ((j >> 16) & 0x0000ffff) | ((j & 0x0000ffff) << 16);
    j = j >>> finalshift;
    if (j > i) {
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }
}

function inverserealfouriertransform(array, fulllength) {
  var totalpasses = countbits(fulllength);
  for (var pass = totalpasses - 1; pass >= 2; pass--) {
    var substride = 1 << pass;
    var midsubstride = substride >> 1;
    var stride = substride << 1;
    var radiansincrement = Math.PI * 2.0 / stride;
    var cosincrement = Math.cos(radiansincrement);
    var sinincrement = Math.sin(radiansincrement);
    var oscillatormultiplier = 2.0 * cosincrement;
    for (var startindex = 0; startindex < fulllength; startindex += stride) {
      var startindexa = startindex;
      var midindexa = startindexa + midsubstride;
      var startindexb = startindexa + substride;
      var stopindex = startindexb + substride;
      var realstarta = array[startindexa];
      var imagstartb = array[startindexb];
      array[startindexa] = realstarta + imagstartb;
      array[midindexa] *= 2;
      array[startindexb] = realstarta - imagstartb;
      array[startindexb + midsubstride] *= 2;
      var c = cosincrement;
      var s = -sinincrement;
      var cprev = 1.0;
      var sprev = 0.0;
      for (var index = 1; index < midsubstride; index++) {
        var indexa0 = startindexa + index;
        var indexa1 = startindexb - index;
        var indexb0 = startindexb + index;
        var indexb1 = stopindex - index;
        var real0 = array[indexa0];
        var real1 = array[indexa1];
        var imag0 = array[indexb0];
        var imag1 = array[indexb1];
        var tempa = real0 - real1;
        var tempb = imag0 + imag1;
        array[indexa0] = real0 + real1;
        array[indexa1] = imag1 - imag0;
        array[indexb0] = tempa * c - tempb * s;
        array[indexb1] = tempb * c + tempa * s;
        var ctemp = oscillatormultiplier * c - cprev;
        var stemp = oscillatormultiplier * s - sprev;
        cprev = c;
        sprev = s;
        c = ctemp;
        s = stemp;
      }
    }
  }
  for (var idx = 0; idx < fulllength; idx += 4) {
    var index1 = idx + 1;
    var index2 = idx + 2;
    var index3 = idx + 3;
    var real0 = array[idx];
    var real1 = array[index1] * 2;
    var imag2 = array[index2];
    var imag3 = array[index3] * 2;
    var tempa2 = real0 + imag2;
    var tempb2 = real0 - imag2;
    array[idx] = tempa2 + real1;
    array[index1] = tempa2 - real1;
    array[index2] = tempb2 + imag3;
    array[index3] = tempb2 - imag3;
  }
  reverseindexbits(array, fulllength);
}

function drawnoisespectrum(wave, retro, lowoctave, highoctave, lowpower, highpower, overallslope) {
  var referenceindex = 1 << 11;
  var lowindex = Math.pow(2, lowoctave) | 0;
  var highindex = Math.min(NOISE_COUNT >> 1, Math.pow(2, highoctave) | 0);
  for (var i = lowindex; i < highindex; i++) {
    var lerped = lowpower + ((highpower - lowpower) * (Math.log2(i) - lowoctave)) / (highoctave - lowoctave);
    var amplitude = Math.pow(2, (lerped - 1) * 7 + 1) * lerped;
    amplitude *= Math.pow(i / referenceindex, overallslope);
    amplitude *= retro[i];
    var radians = 0.61803398875 * i * i * Math.PI * 2.0;
    wave[i] = Math.cos(radians) * amplitude;
    wave[NOISE_COUNT - i] = Math.sin(radians) * amplitude;
  }
}

function noisehollow(buf, retro) {
  drawnoisespectrum(buf, retro, 10, 11, 1, 1, 0);
  drawnoisespectrum(buf, retro, 11, 14, 0.6578, 0.6578, 0);
  inverserealfouriertransform(buf, NOISE_COUNT);
  var scale = 1.0 / Math.sqrt(NOISE_COUNT);
  for (var i = 0; i <= NOISE_COUNT; i++) {
    buf[i] *= scale;
  }
  buf[NOISE_COUNT] = buf[0];
}

function wasmgeneratenoise(kind) {
  var buf = new Float64Array(NOISE_COUNT + 1);
  if (kind === 9) {
    noisewhite(buf);
    return buf;
  }
  if (kind === 8) {
    var retro = wasmgeneratenoise(1);
    noisehollow(buf, retro);
    return buf;
  }
  if (kind === 4) {
    noiselfsr(buf, 15 << 2, true);
    return buf;
  }
  if (kind === 3) {
    noiselfsr(buf, 2 << 14, false);
    return buf;
  }
  if (kind === 2) {
    noiselfsr(buf, 10 << 2, false);
    return buf;
  }
  noiselfsr(buf, 1 << 14, false);
  return buf;
}

var noiseRetro = null;
var noiseBuzz = null;
var noiseClang = null;
var noiseMetallic = null;
var noiseWhite = null;
var noiseHollow = null;

function noiseready(kind) {
  if (kind === 1) {
    if (!noiseRetro) { noiseRetro = wasmgeneratenoise(1); }
    return noiseRetro;
  }
  if (kind === 2) {
    if (!noiseBuzz) { noiseBuzz = wasmgeneratenoise(2); }
    return noiseBuzz;
  }
  if (kind === 3) {
    if (!noiseClang) { noiseClang = wasmgeneratenoise(3); }
    return noiseClang;
  }
  if (kind === 4) {
    if (!noiseMetallic) { noiseMetallic = wasmgeneratenoise(4); }
    return noiseMetallic;
  }
  if (kind === 8) {
    if (!noiseHollow) { noiseHollow = wasmgeneratenoise(8); }
    return noiseHollow;
  }
  if (kind === 9) {
    if (!noiseWhite) { noiseWhite = wasmgeneratenoise(9); }
    return noiseWhite;
  }
  if (!noiseRetro) { noiseRetro = wasmgeneratenoise(1); }
  return noiseRetro;
}
`
