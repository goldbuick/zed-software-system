import {
  WASM_AUTOFILTER_DEFAULT_BASE_FREQ,
  WASM_AUTOFILTER_DEFAULT_DEPTH,
  WASM_AUTOFILTER_DEFAULT_FREQUENCY,
  WASM_AUTOFILTER_DEFAULT_OCTAVES,
  WASM_AUTOFILTER_DEFAULT_Q,
  WASM_AUTOFILTER_TYPE,
} from './wasmautofilter'
import { WASM_FX_GROUP_COUNT, WASM_FX_PARAM_IDX } from './wasmfxstate'

const FX_GROUP_COUNT = WASM_FX_GROUP_COUNT

function fxgroupvars(prefix: string, init: string): string {
  const lines: string[] = []
  for (let i = 0; i < FX_GROUP_COUNT; i++) {
    lines.push(`var ${prefix}${i} = ${init};`)
  }
  return lines.join('\n')
}

/** Tone.js AutoFilter — LFO sine modulating biquad cutoff (parallel wet delta). */
export const WASM_AUTOFILTER_PLAY_CODE = `
${fxgroupvars('fxautofilterphase', '0')}
${fxgroupvars('fxautofilterst', 'drumfilterzero()')}

function autofiltertypenametype(typeid) {
  var id = Math.round(typeid);
  if (id === ${WASM_AUTOFILTER_TYPE.HIGHPASS}) { return 'highpass'; }
  if (id === ${WASM_AUTOFILTER_TYPE.BANDPASS}) { return 'bandpass'; }
  if (id === ${WASM_AUTOFILTER_TYPE.LOWSHELF}) { return 'lowshelf'; }
  if (id === ${WASM_AUTOFILTER_TYPE.HIGHSHELF}) { return 'highshelf'; }
  if (id === ${WASM_AUTOFILTER_TYPE.PEAKING}) { return 'peaking'; }
  if (id === ${WASM_AUTOFILTER_TYPE.NOTCH}) { return 'notch'; }
  if (id === ${WASM_AUTOFILTER_TYPE.ALLPASS}) { return 'allpass'; }
  return 'lowpass';
}

function autofiltermaxhz(basefreq, octaves) {
  var base = basefreq > 0 ? basefreq : ${WASM_AUTOFILTER_DEFAULT_BASE_FREQ};
  var oct = octaves > 0 ? octaves : ${WASM_AUTOFILTER_DEFAULT_OCTAVES};
  var maxhz = base * Math.pow(2, oct);
  var nyq = FX_SR * 0.5;
  if (maxhz > nyq) {
    maxhz = nyq;
  }
  return maxhz;
}

function autofiltercutoffhz(lfo, basefreq, octaves, depth) {
  var minhz = basefreq > 0 ? basefreq : ${WASM_AUTOFILTER_DEFAULT_BASE_FREQ};
  var maxhz = autofiltermaxhz(basefreq, octaves);
  var d = depth > 0 ? depth : ${WASM_AUTOFILTER_DEFAULT_DEPTH};
  var unipolar = (lfo * d + 1) * 0.5;
  return minhz + (maxhz - minhz) * unipolar;
}

function autofilterlfophase(phase, frequency) {
  var hz = frequency > 0 ? frequency : ${WASM_AUTOFILTER_DEFAULT_FREQUENCY};
  var next = phase + (6.28318530718 * hz) / FX_SR;
  if (next >= 6.28318530718) {
    next -= 6.28318530718;
  }
  return next;
}

function fxautofilterbus(x, group) {
  if (x !== x) {
    return 0;
  }
  var freq = fxparam(group, ${WASM_FX_PARAM_IDX.AUTOFILTER_FREQ});
  if (freq <= 0) {
    freq = ${WASM_AUTOFILTER_DEFAULT_FREQUENCY};
  }
  var depth = fxparam(group, ${WASM_FX_PARAM_IDX.AUTOFILTER_DEPTH});
  if (depth <= 0) {
    depth = ${WASM_AUTOFILTER_DEFAULT_DEPTH};
  }
  var basefreq = fxparam(group, ${WASM_FX_PARAM_IDX.AUTOFILTER_BASE_FREQ});
  if (basefreq <= 0) {
    basefreq = ${WASM_AUTOFILTER_DEFAULT_BASE_FREQ};
  }
  var octaves = fxparam(group, ${WASM_FX_PARAM_IDX.AUTOFILTER_OCTAVES});
  if (octaves <= 0) {
    octaves = ${WASM_AUTOFILTER_DEFAULT_OCTAVES};
  }
  var q = fxparam(group, ${WASM_FX_PARAM_IDX.AUTOFILTER_Q});
  if (q <= 0) {
    q = ${WASM_AUTOFILTER_DEFAULT_Q};
  }
  var typeid = fxparam(group, ${WASM_FX_PARAM_IDX.AUTOFILTER_TYPE});
  var typename = autofiltertypenametype(typeid);

  var phase = fxautofilterphase[group];
  var lfo = Math.sin(phase);
  fxautofilterphase[group] = autofilterlfophase(phase, freq);

  var cutoff = autofiltercutoffhz(lfo, basefreq, octaves, depth);
  if (cutoff < 20) {
    cutoff = 20;
  }
  var coef = drumbiquadcoef(typename, cutoff, q, 0);
  var filtered = drumbiquadrun(fxautofilterst[group], coef, x);
  if (filtered !== filtered) {
    return 0;
  }
  return filtered - x;
}
`
