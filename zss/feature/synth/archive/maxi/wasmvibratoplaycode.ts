import {
  WASM_VIBRATO_GROUP_COUNT,
  WASM_VIBRATO_STRIDE,
} from '../../backend/wasm/wasmsabchannels'

/** Worklet-side vibrato note schedule (replaces timed FX depth pushes). */
export const WASM_VIBRATO_PLAY_CODE = `
var VIBRATO_GROUP_COUNT = ${WASM_VIBRATO_GROUP_COUNT};
var VIBRATO_STRIDE = ${WASM_VIBRATO_STRIDE};
var vibtimeepoch = 0;
var vibschedstart = [];
var vibschedend = [];
var vibschedpeak = [];
var vibschedfreq = [];

for (var vg = 0; vg < VIBRATO_GROUP_COUNT; vg++) {
  vibschedstart.push(0);
  vibschedend.push(0);
  vibschedpeak.push(0);
  vibschedfreq.push(1);
}

function readvibratosab() {
  var raw = qref.zssVibratoSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssVibratoSab;
  }
  if (!raw || typeof raw.length !== 'number') {
    return;
  }
  vibtimeepoch = raw[0] || 0;
  for (var g = 0; g < VIBRATO_GROUP_COUNT; g++) {
    var base = 1 + g * VIBRATO_STRIDE;
    vibschedstart[g] = base < raw.length ? raw[base] : 0;
    vibschedend[g] = base + 1 < raw.length ? raw[base + 1] : 0;
    vibschedpeak[g] = base + 2 < raw.length ? raw[base + 2] : 0;
    vibschedfreq[g] = base + 3 < raw.length ? raw[base + 3] : 1;
  }
}

function playtimesec() {
  return vibtimeepoch + playsampleclock / FX_SR;
}

function vibratodepthat(group, t) {
  var start = vibschedstart[group];
  var end = vibschedend[group];
  var peak = vibschedpeak[group];
  if (end <= start || peak <= 0.0001) {
    return 0;
  }
  if (t < start || t >= end) {
    return 0;
  }
  var dur = end - start;
  var rampreset = dur * 0.48;
  if (rampreset > 0.35) {
    rampreset = 0.35;
  }
  var attackportion = dur * 0.35;
  if (attackportion > 0.35) {
    attackportion = 0.35;
  }
  if (attackportion > rampreset) {
    attackportion = rampreset;
  }
  var tpeak = start + attackportion;
  var trelease = end - rampreset;
  if (trelease < start + rampreset) {
    trelease = start + rampreset;
  }
  if (tpeak > trelease) {
    tpeak = trelease;
  }
  if (t <= tpeak) {
    if (tpeak <= start) {
      return peak;
    }
    return peak * (t - start) / (tpeak - start);
  }
  if (t < trelease) {
    return peak;
  }
  if (t >= end) {
    return 0;
  }
  if (end <= trelease) {
    return 0;
  }
  return peak * (1 - (t - trelease) / (end - trelease));
}

function vibratofreqat(group, t) {
  var depth = vibratodepthat(group, t);
  if (depth <= 0.0001) {
    return 1;
  }
  var freq = vibschedfreq[group];
  if (freq <= 0) {
    freq = 1;
  }
  return freq;
}
`
