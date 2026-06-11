import {
  WASM_AUTOWAH_DEFAULT_BASE_FREQ,
  WASM_AUTOWAH_DEFAULT_FOLLOWER,
  WASM_AUTOWAH_DEFAULT_GAIN,
  WASM_AUTOWAH_DEFAULT_OCTAVES,
  WASM_AUTOWAH_Q,
  WASM_AUTOWAH_SCALE_EXP,
} from 'zss/feature/synth/backend/wasm/wasmautowah'
import { WASM_FX_GROUP_COUNT, WASM_FX_PARAM_IDX } from 'zss/feature/synth/backend/wasm/wasmfxstate'

const FX_GROUP_COUNT = WASM_FX_GROUP_COUNT

function fxgrouparray(name: string, init: string): string {
  const items = new Array(FX_GROUP_COUNT).fill(init).join(', ')
  return `var ${name} = [${items}];`
}

/** Tone.js AutoWah — follower + sweeping bandpass/peaking (parallel wet delta). */
export const WASM_AUTOWAH_PLAY_CODE = `
var WASM_AUTOWAH_Q = ${WASM_AUTOWAH_Q};
var WASM_AUTOWAH_SCALE_EXP = ${WASM_AUTOWAH_SCALE_EXP};
${fxgrouparray('fxautowahfollower', '0')}
${fxgrouparray('fxautowahbp0', 'drumfilterzero()')}
${fxgrouparray('fxautowahbp1', 'drumfilterzero()')}
${fxgrouparray('fxautowahpeak', 'drumfilterzero()')}
var fxautowahbpcoef = [];
var fxautowahpeakcoef = [];
var fxautowahsweepcache = [];
var fxautowahcoeftick = [];
for (var awg = 0; awg < ${FX_GROUP_COUNT}; awg++) {
  fxautowahbpcoef.push({ b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 });
  fxautowahpeakcoef.push({ b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 });
  fxautowahsweepcache.push(0);
  fxautowahcoeftick.push(0);
}

function fxautowahcoefsat(group, sweep, gaindb) {
  var tick = fxautowahcoeftick[group] + 1;
  fxautowahcoeftick[group] = tick;
  var prev = fxautowahsweepcache[group];
  var due = tick >= FX_COEF_RECOMPUTE_TICKS;
  var changed = prev <= 0 || Math.abs(sweep - prev) / prev > FX_COEF_CUTOFF_EPS;
  if (due || changed) {
    fxautowahcoeftick[group] = 0;
    fxautowahsweepcache[group] = sweep;
    fxautowahbpcoef[group] = drumbiquadcoef('bandpass', sweep, WASM_AUTOWAH_Q, 0);
    fxautowahpeakcoef[group] = drumbiquadcoef('peaking', sweep, WASM_AUTOWAH_Q, gaindb);
  }
  return {
    bp: fxautowahbpcoef[group],
    peak: fxautowahpeakcoef[group],
  };
}

function autowahdbtogain(db) {
  return Math.pow(10, db / 20);
}

function autowahinputboost(sensitivitydb) {
  var gain = autowahdbtogain(sensitivitydb);
  if (gain <= 0) {
    return 1;
  }
  return 1 / gain;
}

function autowahfolloweralpha(followersec) {
  var sec = followersec > 0 ? followersec : ${WASM_AUTOWAH_DEFAULT_FOLLOWER};
  return 1 - Math.exp(-6.28318530718 / (sec * FX_SR));
}

function autowahmaxhz(basefreq, octaves) {
  var base = basefreq > 0 ? basefreq : ${WASM_AUTOWAH_DEFAULT_BASE_FREQ};
  var oct = octaves > 0 ? octaves : ${WASM_AUTOWAH_DEFAULT_OCTAVES};
  var maxhz = base * Math.pow(2, oct);
  var nyq = FX_SR * 0.5;
  if (maxhz > nyq) {
    maxhz = nyq;
  }
  return maxhz;
}

function autowahsweephz(follower, basefreq, octaves) {
  var minhz = basefreq > 0 ? basefreq : ${WASM_AUTOWAH_DEFAULT_BASE_FREQ};
  var maxhz = autowahmaxhz(basefreq, octaves);
  var norm = follower > 0 ? Math.pow(follower, WASM_AUTOWAH_SCALE_EXP) : 0;
  return minhz + (maxhz - minhz) * norm;
}

function fxautowahbus(x, group) {
  if (x !== x) {
    return 0;
  }
  var basefreq = fxparam(group, ${WASM_FX_PARAM_IDX.AUTOWAH_BASE_FREQ});
  if (basefreq <= 0) {
    basefreq = ${WASM_AUTOWAH_DEFAULT_BASE_FREQ};
  }
  var octaves = fxparam(group, ${WASM_FX_PARAM_IDX.AUTOWAH_OCTAVES});
  if (octaves <= 0) {
    octaves = ${WASM_AUTOWAH_DEFAULT_OCTAVES};
  }
  var sensitivity = fxparam(group, ${WASM_FX_PARAM_IDX.AUTOWAH_SENS});
  var gaindb = fxparam(group, ${WASM_FX_PARAM_IDX.AUTOWAH_GAIN});
  if (gaindb <= 0 && gaindb !== 0) {
    gaindb = ${WASM_AUTOWAH_DEFAULT_GAIN};
  }
  var followersec = fxparam(group, ${WASM_FX_PARAM_IDX.AUTOWAH_FOLLOWER});
  if (followersec <= 0) {
    followersec = ${WASM_AUTOWAH_DEFAULT_FOLLOWER};
  }

  var follower = fxautowahfollower[group];
  var alpha = autowahfolloweralpha(followersec);
  var boost = autowahinputboost(sensitivity);
  var target = Math.abs(x * boost);
  follower += (target - follower) * alpha;
  fxautowahfollower[group] = follower;

  var sweep = autowahsweephz(follower, basefreq, octaves);
  if (sweep < 20) {
    sweep = 20;
  }
  var coefs = fxautowahcoefsat(group, sweep, gaindb);
  var bpcoef = coefs.bp;
  var peakcoef = coefs.peak;
  var band = drumbiquadrun(fxautowahbp0[group], bpcoef, x);
  band = drumbiquadrun(fxautowahbp1[group], bpcoef, band);
  var filtered = drumbiquadrun(fxautowahpeak[group], peakcoef, band);
  if (filtered !== filtered) {
    return 0;
  }
  return filtered - x;
}
`
