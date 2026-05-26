import {
  WASM_AUTOFILTER_DEFAULT_BASE_FREQ,
  WASM_AUTOFILTER_DEFAULT_DEPTH,
  WASM_AUTOFILTER_DEFAULT_FREQUENCY,
  WASM_AUTOFILTER_DEFAULT_OCTAVES,
  WASM_AUTOFILTER_DEFAULT_Q,
  WASM_AUTOFILTER_TYPE,
} from './wasmautofilter'
import { WASM_FX_PARAM_IDX } from './wasmfxstate'

/** Tone.js AutoFilter — LFO sine modulating biquad cutoff (parallel wet delta). */
export const WASM_AUTOFILTER_PLAY_CODE = `
var fxautofilterphase0 = 0;
var fxautofilterphase1 = 0;
var fxautofilterst0 = drumfilterzero();
var fxautofilterst1 = drumfilterzero();

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
  var freq = fxparam(${WASM_FX_PARAM_IDX.AUTOFILTER_FREQ});
  if (freq <= 0) {
    freq = ${WASM_AUTOFILTER_DEFAULT_FREQUENCY};
  }
  var depth = fxparam(${WASM_FX_PARAM_IDX.AUTOFILTER_DEPTH});
  if (depth <= 0) {
    depth = ${WASM_AUTOFILTER_DEFAULT_DEPTH};
  }
  var basefreq = fxparam(${WASM_FX_PARAM_IDX.AUTOFILTER_BASE_FREQ});
  if (basefreq <= 0) {
    basefreq = ${WASM_AUTOFILTER_DEFAULT_BASE_FREQ};
  }
  var octaves = fxparam(${WASM_FX_PARAM_IDX.AUTOFILTER_OCTAVES});
  if (octaves <= 0) {
    octaves = ${WASM_AUTOFILTER_DEFAULT_OCTAVES};
  }
  var q = fxparam(${WASM_FX_PARAM_IDX.AUTOFILTER_Q});
  if (q <= 0) {
    q = ${WASM_AUTOFILTER_DEFAULT_Q};
  }
  var typeid = fxparam(${WASM_FX_PARAM_IDX.AUTOFILTER_TYPE});
  var typename = autofiltertypenametype(typeid);

  var phase = group > 0 ? fxautofilterphase1 : fxautofilterphase0;
  var lfo = Math.sin(phase);
  if (group > 0) {
    fxautofilterphase1 = autofilterlfophase(phase, freq);
  } else {
    fxautofilterphase0 = autofilterlfophase(phase, freq);
  }

  var cutoff = autofiltercutoffhz(lfo, basefreq, octaves, depth);
  if (cutoff < 20) {
    cutoff = 20;
  }
  var coef = drumbiquadcoef(typename, cutoff, q, 0);
  var st = group > 0 ? fxautofilterst1 : fxautofilterst0;
  var filtered = drumbiquadrun(st, coef, x);
  if (filtered !== filtered) {
    return 0;
  }
  return filtered - x;
}
`
