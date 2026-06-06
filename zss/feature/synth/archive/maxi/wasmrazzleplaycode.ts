import {
  WASM_RAZZLE_CHORUS_DEPTH_SEC,
  WASM_RAZZLE_CHORUS_WET,
  WASM_RAZZLE_HISS_GAIN,
  WASM_RAZZLE_VIBRATO_WET,
} from 'zss/feature/synth/backend/wasm/wasmlevels'

/** Maximilian razzle layer — vibrato delay, chorus delay, modulated hiss. */
export const WASM_RAZZLE_PLAY_CODE = `
var razzlevibratodelay = new Maximilian.maxiDelayline();
var razzlechorusdelay = new Maximilian.maxiDelayline();
var razzlevibratolfo = new Maximilian.maxiOsc();
var razzlechoruslfo = new Maximilian.maxiOsc();
var razzlehiss = new Maximilian.maxiOsc();
var razzlehissmod = new Maximilian.maxiOsc();

var RAZZLE_VIBRATO_WET = ${WASM_RAZZLE_VIBRATO_WET};
var RAZZLE_CHORUS_WET = ${WASM_RAZZLE_CHORUS_WET};
var RAZZLE_HISS_GAIN = ${WASM_RAZZLE_HISS_GAIN};

function applyrazzle(input) {
  var vibratodepth = razzlevibratolfo.square(0.125) * 0.0015;
  var vibtap = razzlevibratodelay.dl(input, 0.005 + vibratodepth, 0);
  var vibrato = input + (vibtap - input) * RAZZLE_VIBRATO_WET;
  var chorusdepth = razzlechoruslfo.saw(0.01) * ${WASM_RAZZLE_CHORUS_DEPTH_SEC};
  var hissmod = 0.35 + 0.65 * (0.5 + 0.5 * razzlehissmod.sinewave(Math.PI * 0.25));
  var hissamp = razzlehiss.noise() * RAZZLE_HISS_GAIN * hissmod;
  var chortap = razzlechorusdelay.dl(vibrato + hissamp, 0.007 + chorusdepth, 0);
  var out = vibrato + (chortap - vibrato) * RAZZLE_CHORUS_WET;
  if (WASM_PERF_MODE) {
    return out;
  }
  return out;
}
`
