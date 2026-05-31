import {
  WASM_AUTOFILTER_DEFAULT_BASE_FREQ,
  WASM_AUTOFILTER_DEFAULT_DEPTH,
  WASM_AUTOFILTER_DEFAULT_FREQUENCY,
  WASM_AUTOFILTER_DEFAULT_OCTAVES,
  WASM_AUTOFILTER_DEFAULT_Q,
  WASM_AUTOFILTER_TYPE,
} from '../../backend/wasm/wasmautofilter'
import { WASM_FX_GROUP_COUNT, WASM_FX_PARAM_IDX } from '../../backend/wasm/wasmfxstate'

const FX_GROUP_COUNT = WASM_FX_GROUP_COUNT

function fxgrouparray(name: string, init: string): string {
  const items = new Array(FX_GROUP_COUNT).fill(init).join(', ')
  return `var ${name} = [${items}];`
}

/** Tone.js AutoFilter — LFO sine modulating biquad cutoff (parallel wet delta). */
export const WASM_AUTOFILTER_PLAY_CODE = `
${fxgrouparray('fxautofilterphase', '0')}
${fxgrouparray('fxautofilterst', 'drumfilterzero()')}
var fxautofiltercoef = [];
var fxautofiltercoefcutoff = [];
var fxautofiltercoeftick = [];
var FX_COEF_RECOMPUTE_TICKS = 32;
var FX_COEF_CUTOFF_EPS = 0.01;
for (var afg = 0; afg < ${FX_GROUP_COUNT}; afg++) {
  fxautofiltercoef.push({ b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 });
  fxautofiltercoefcutoff.push(0);
  fxautofiltercoeftick.push(0);
}

function fxautofiltercoefat(group, typename, cutoff, q) {
  var tick = fxautofiltercoeftick[group] + 1;
  fxautofiltercoeftick[group] = tick;
  var prev = fxautofiltercoefcutoff[group];
  var due = tick >= FX_COEF_RECOMPUTE_TICKS;
  var changed = prev <= 0 || Math.abs(cutoff - prev) / prev > FX_COEF_CUTOFF_EPS;
  if (due || changed) {
    fxautofiltercoeftick[group] = 0;
    fxautofiltercoefcutoff[group] = cutoff;
    fxautofiltercoef[group] = drumbiquadcoef(typename, cutoff, q, 0);
  }
  return fxautofiltercoef[group];
}

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
  var coef = fxautofiltercoefat(group, typename, cutoff, q);
  var filtered = drumbiquadrun(fxautofilterst[group], coef, x);
  if (filtered !== filtered) {
    return 0;
  }
  return filtered - x;
}
`
