import { SOURCE_TYPE } from 'zss/feature/synth/source'

export const NOISE_SAMPLE_COUNT = 131072

/** Same LFSR noise tables as Tone `generatenoisesynth` in source.ts. */
export function generatenoisewave(source: SOURCE_TYPE): Float64Array {
  const wave = new Float64Array(NOISE_SAMPLE_COUNT)
  let drumbuffer = 1
  for (let i = 0; i < NOISE_SAMPLE_COUNT; i++) {
    if (source === SOURCE_TYPE.METALLIC_NOISE) {
      wave[i] = (drumbuffer & 1) * 4.0 * (Math.random() * 14 + 1) - 8.0
    } else {
      wave[i] = (drumbuffer & 1) * 2.0 - 1.0
    }
    let newbuffer = drumbuffer >> 1
    if (((drumbuffer + newbuffer) & 1) === 1) {
      switch (source) {
        default:
        case SOURCE_TYPE.RETRO_NOISE:
          newbuffer += 1 << 14
          break
        case SOURCE_TYPE.CLANG_NOISE:
          newbuffer += 2 << 14
          break
        case SOURCE_TYPE.BUZZ_NOISE:
          newbuffer += 10 << 2
          break
        case SOURCE_TYPE.METALLIC_NOISE:
          newbuffer += 15 << 2
          break
      }
    }
    drumbuffer = newbuffer
  }
  return wave
}

/** Maximilian setup snippet: build four noise tables once at voice init. */
export const WASM_NOISE_SETUP_CODE = `
function wasmgeneratenoise(kind) {
  var count = 131072;
  var buf = new Float64Array(count);
  var drumbuffer = 1;
  for (var i = 0; i < count; i++) {
    if (kind === 4) {
      buf[i] = (drumbuffer & 1) * 4.0 * (Math.random() * 14 + 1) - 8.0;
    } else {
      buf[i] = (drumbuffer & 1) * 2.0 - 1.0;
    }
    var newbuffer = drumbuffer >> 1;
    if (((drumbuffer + newbuffer) & 1) === 1) {
      if (kind === 1) { newbuffer += 1 << 14; }
      else if (kind === 3) { newbuffer += 2 << 14; }
      else if (kind === 2) { newbuffer += 10 << 2; }
      else if (kind === 4) { newbuffer += 15 << 2; }
      else { newbuffer += 1 << 14; }
    }
    drumbuffer = newbuffer;
  }
  return buf;
}
var noiseRetro = null;
var noiseBuzz = null;
var noiseClang = null;
var noiseMetallic = null;
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
  if (!noiseMetallic) { noiseMetallic = wasmgeneratenoise(4); }
  return noiseMetallic;
}
`
