import {
  WASM_RAZZLE_HISS_GAIN,
  WASM_RAZZLE_WET_MIX,
} from './wasmlevels'

/** Maximilian razzle layer — vibrato delay, chorus delay, modulated hiss. */
export const WASM_RAZZLE_PLAY_CODE = `
var razzlevibratodelay = new Maximilian.maxiDelayline();
var razzlechorusdelay = new Maximilian.maxiDelayline();
var razzlevibratolfo = new Maximilian.maxiOsc();
var razzlechoruslfo = new Maximilian.maxiOsc();
var razzlehiss = new Maximilian.maxiOsc();
var razzlehissmod = new Maximilian.maxiOsc();

var RAZZLE_WET_MIX = ${WASM_RAZZLE_WET_MIX};
var RAZZLE_HISS_GAIN = ${WASM_RAZZLE_HISS_GAIN};

function applyrazzle(input) {
  var vibratodepth = razzlevibratolfo.square(0.125) * 0.0015;
  var vibrato = razzlevibratodelay.dl(input, 0.005 + vibratodepth, 0);
  var chorusdepth = razzlechoruslfo.saw(0.01) * 0.0035;
  var chorused = razzlechorusdelay.dl(vibrato, 0.007 + chorusdepth, 0);
  var effect = chorused - input;
  var out = input + effect * RAZZLE_WET_MIX;
  var hissmod = 0.35 + 0.65 * (0.5 + 0.5 * razzlehissmod.sinewave(Math.PI * 0.25));
  var hissamp = razzlehiss.noise() * RAZZLE_HISS_GAIN * hissmod;
  return out + hissamp;
}
`
