import { WASM_DRUM_PLAY_CODE } from './drumplaycode'

/** Minimal SAB-driven voices + drums (same boot path as the working spike). */
export const WASM_SAB_VOICE_PLAY_CODE = `
${WASM_DRUM_PLAY_CODE}

var VOICE_COUNT = 4;
var oscs = [];
var voicesready = false;

function ensurevoices() {
  if (voicesready) {
    return;
  }
  voicesready = true;
  for (var i = 0; i < VOICE_COUNT; i++) {
    oscs.push(new Maximilian.maxiOsc());
  }
}

function readsabvoices() {
  var raw = qref.zssVoiceSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssVoiceSab;
  }
  return raw;
}

function play() {
  ensurevoices();
  var raw = readsabvoices();
  var sum = 0;
  if (raw && typeof raw.length === 'number' && raw.length >= 24) {
    for (var i = 0; i < VOICE_COUNT; i++) {
      var base = i * 6;
      if (raw[base + 1] <= 0.5) {
        continue;
      }
      var freq = raw[base] > 0 ? raw[base] : 440;
      sum += oscs[i].square(freq) * 0.28;
    }
  }
  sum += safedrumsout();
  return [sum, sum];
}

function safedrumsout() {
  try {
    return drumsout();
  } catch (err) {
    return 0;
  }
}
`
