import {
  WASM_DRUM_BUS_GAIN,
  WASM_MASTER_MAKEUP_DB,
  WASM_MASTER_TRIM_DB,
  WASM_PLAY_BUS_GAIN,
  WASM_VOICE_OUT_GAIN,
} from './wasmlevels'
import { WASM_RAZZLE_PLAY_CODE } from './wasmrazzleplaycode'

/** Voice-bus duck depth/recovery (clap stronger, bass lighter). */
const WASM_DUCK_ATTACK_SEC = 0.004
const WASM_DUCK_CLAP_FLOOR = 0.28
const WASM_DUCK_CLAP_HOLD_SEC = 0.018
const WASM_DUCK_CLAP_RELEASE_SEC = 0.11
const WASM_DUCK_BASS_FLOOR = 0.92
const WASM_DUCK_BASS_HOLD_SEC = 0
const WASM_DUCK_BASS_RELEASE_SEC = 0.045

const WASM_COMP_THRESHOLD_DB = -28
const WASM_COMP_RATIO = 4
const WASM_COMP_ATTACK_SEC = 0.003
const WASM_COMP_RELEASE_SEC = 0.15

/** Matches Tone main compressor threshold in linear amplitude. */
const WASM_COMP_THRESHOLD_LIN = Math.pow(10, WASM_COMP_THRESHOLD_DB / 20)

export const WASM_MASTER_PLAY_CODE = `
${WASM_RAZZLE_PLAY_CODE}

var MASTER_SR = 48000;
var MASTER_VOICE_GAIN = ${WASM_VOICE_OUT_GAIN};
var MASTER_DRUM_GAIN = ${WASM_DRUM_BUS_GAIN};
var MASTER_PLAY_TRIM = ${WASM_PLAY_BUS_GAIN};
var MASTER_TRIM_DB = ${WASM_MASTER_TRIM_DB};
var MASTER_MAKEUP_DB = ${WASM_MASTER_MAKEUP_DB};
var MASTER_COMP_THRESH = ${WASM_COMP_THRESHOLD_LIN};
var MASTER_COMP_RATIO = ${WASM_COMP_RATIO};

var DUCK_ATTACK_SAMPLES = Math.max(1, Math.round(${WASM_DUCK_ATTACK_SEC} * MASTER_SR));
var COMP_ATTACK_COEF = 1 - Math.exp(-1 / (${WASM_COMP_ATTACK_SEC} * MASTER_SR));
var COMP_RELEASE_COEF = 1 - Math.exp(-1 / (${WASM_COMP_RELEASE_SEC} * MASTER_SR));

var voiceduckgain = 1;
var duckphase = 'idle';
var duckfloor = 1;
var duckholdleft = 0;
var duckattackstep = 0;
var duckreleasestep = 0;
var duckdrumprev = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var compenv = 0;

function startduck(floor, holdsec, releasesec) {
  duckfloor = floor;
  duckattackstep = (voiceduckgain - floor) / DUCK_ATTACK_SAMPLES;
  if (duckattackstep <= 0) {
    duckattackstep = (1 - floor) / DUCK_ATTACK_SAMPLES;
  }
  duckphase = 'attack';
  duckholdleft = Math.max(0, Math.round(holdsec * MASTER_SR));
  duckreleasestep = (1 - floor) / Math.max(1, Math.round(releasesec * MASTER_SR));
}

function tickduck() {
  if (duckphase === 'attack') {
    voiceduckgain -= duckattackstep;
    if (voiceduckgain <= duckfloor) {
      voiceduckgain = duckfloor;
      duckphase = duckholdleft > 0 ? 'hold' : 'release';
    }
  } else if (duckphase === 'hold') {
    duckholdleft--;
    if (duckholdleft <= 0) {
      duckphase = 'release';
    }
  } else if (duckphase === 'release') {
    voiceduckgain += duckreleasestep;
    if (voiceduckgain >= 1) {
      voiceduckgain = 1;
      duckphase = 'idle';
    }
  }
}

function checkducktriggers() {
  var raw = qref.zssDrumSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssDrumSab;
  }
  if (!raw || typeof raw.length !== 'number') {
    return;
  }
  for (var i = 0; i < 10; i++) {
    var trig = Math.round(raw[i]);
    if (trig > duckdrumprev[i]) {
      if (i === 3) {
        startduck(${WASM_DUCK_CLAP_FLOOR}, ${WASM_DUCK_CLAP_HOLD_SEC}, ${WASM_DUCK_CLAP_RELEASE_SEC});
      } else if (i === 9) {
        startduck(${WASM_DUCK_BASS_FLOOR}, ${WASM_DUCK_BASS_HOLD_SEC}, ${WASM_DUCK_BASS_RELEASE_SEC});
      }
    }
    duckdrumprev[i] = trig;
  }
}

function applycompressor(x) {
  var ax = x < 0 ? -x : x;
  var coef = ax > compenv ? COMP_ATTACK_COEF : COMP_RELEASE_COEF;
  compenv += (ax - compenv) * coef;
  if (compenv <= MASTER_COMP_THRESH) {
    return x;
  }
  var dbover = 20 * Math.log10(compenv / MASTER_COMP_THRESH);
  var reduced = dbover - dbover / MASTER_COMP_RATIO;
  var gain = Math.pow(10, -reduced / 20);
  return x * gain;
}

function readmastervolume() {
  var raw = qref.zssMasterSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssMasterSab;
  }
  var vol = 80;
  if (raw && typeof raw.length === 'number' && raw.length >= 1) {
    vol = raw[0];
  }
  if (vol <= 0.001) {
    vol = 0.001;
  }
  var db = 20 * Math.log10(vol * 0.25) - 35 + MASTER_TRIM_DB + MASTER_MAKEUP_DB;
  return Math.pow(10, db / 20);
}

function masterout(voices, drums) {
  checkducktriggers();
  tickduck();
  var v = voices * voiceduckgain * MASTER_VOICE_GAIN * MASTER_PLAY_TRIM;
  var d = drums * MASTER_DRUM_GAIN;
  var dry = v + d;
  var comp = applycompressor(dry);
  var razz = applyrazzle(comp);
  return razz * readmastervolume();
}
`
