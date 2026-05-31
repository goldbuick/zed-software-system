import {
  WASM_DRUM_BUS_GAIN,
  WASM_MASTER_MAKEUP_DB,
  WASM_MASTER_TRIM_DB,
  WASM_PLAY_BUS_GAIN,
  WASM_VOICE_OUT_GAIN,
} from '../../backend/wasm/wasmlevels'
import { WASM_RAZZLE_PLAY_CODE } from './wasmrazzleplaycode'
import { WASM_SIDECHAIN_PLAY_CODE } from './wasmsidechainplaycode'

const WASM_COMP_THRESHOLD_DB = -28
const WASM_COMP_RATIO = 4
const WASM_COMP_ATTACK_SEC = 0.003
const WASM_COMP_RELEASE_SEC = 0.15

/** Matches Tone main compressor threshold in linear amplitude. */
const WASM_COMP_THRESHOLD_LIN = Math.pow(10, WASM_COMP_THRESHOLD_DB / 20)

export const WASM_MASTER_PLAY_CODE = `
var MASTER_SR = typeof sampleRate !== 'undefined' ? sampleRate : 48000;

${WASM_RAZZLE_PLAY_CODE}
${WASM_SIDECHAIN_PLAY_CODE}

var MASTER_VOICE_GAIN = ${WASM_VOICE_OUT_GAIN};
var MASTER_DRUM_GAIN = ${WASM_DRUM_BUS_GAIN};
var MASTER_PLAY_TRIM = ${WASM_PLAY_BUS_GAIN};
var MASTER_TRIM_DB = ${WASM_MASTER_TRIM_DB};
var MASTER_MAKEUP_DB = ${WASM_MASTER_MAKEUP_DB};
var MASTER_COMP_THRESH = ${WASM_COMP_THRESHOLD_LIN};
var MASTER_COMP_RATIO = ${WASM_COMP_RATIO};

var COMP_ATTACK_COEF = 1 - Math.exp(-1 / (${WASM_COMP_ATTACK_SEC} * MASTER_SR));
var COMP_RELEASE_COEF = 1 - Math.exp(-1 / (${WASM_COMP_RELEASE_SEC} * MASTER_SR));

var compenv = 0;
var mastervolprev = 80;
var cachedmastervolgain = 0;
var cachedbggain = 0;
var cachedttsgain = 0;
var cachedmastervolraw = 80;
var cachedbgvolraw = 100;
var cachedttsvolraw = 25;
var cachedmastermuted = false;

function readmastervolraw() {
  var raw = qref.zssMasterSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssMasterSab;
  }
  if (raw && typeof raw.length === 'number' && raw.length >= 1) {
    return raw[0];
  }
  return 80;
}

function readbgplayvolraw() {
  var raw = qref.zssMasterSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssMasterSab;
  }
  if (raw && typeof raw.length === 'number' && raw.length >= 2) {
    return raw[1];
  }
  return 100;
}

function readttsvolraw() {
  var raw = qref.zssMasterSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssMasterSab;
  }
  if (raw && typeof raw.length === 'number' && raw.length >= 3) {
    return raw[2];
  }
  return 25;
}

function ismastermuted() {
  return cachedmastermuted;
}

function refreshmastergains() {
  var vol = readmastervolraw();
  var bg = readbgplayvolraw();
  var tts = readttsvolraw();
  cachedmastermuted = vol <= 0.001;
  if (
    vol !== cachedmastervolraw ||
    bg !== cachedbgvolraw ||
    tts !== cachedttsvolraw
  ) {
    cachedmastervolraw = vol;
    cachedbgvolraw = bg;
    cachedttsvolraw = tts;
    cachedmastervolgain = cachedmastermuted ? 0 : readmastervolume();
    cachedbggain = readbgplayvolume();
    cachedttsgain = readttsvolume();
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
  var vol = readmastervolraw();
  if (vol <= 0.001) {
    return 0;
  }
  if (mastervolprev <= 0.001 && vol > 0.001) {
    compenv = 0;
    scprevgaindb = 0;
    scgainlinear = 1;
    scprevlevelpow = 1e-6;
  }
  mastervolprev = vol;
  var db = 20 * Math.log10(vol * 0.25) - 35 + MASTER_TRIM_DB + MASTER_MAKEUP_DB;
  return Math.pow(10, db / 20);
}

function readbgplayvolume() {
  var vol = readbgplayvolraw();
  if (vol <= 0.001) {
    return 0;
  }
  var db = 20 * Math.log10(vol) - 35;
  return Math.pow(10, db / 20);
}

function readttsvolume() {
  var vol = readttsvolraw();
  if (vol <= 0.001) {
    return 0;
  }
  return vol / 100;
}

function masterout(playvoices, bgvoices, drums, ttstrigger, ttsmix) {
  if (ismastermuted()) {
    return 0;
  }
  var volgain = cachedmastervolgain;
  var bggain = cachedbggain;
  var ttsgain = cachedttsgain;
  var tts = 0;
  var mixsrc = ttsmix;
  if (typeof mixsrc !== 'number' || mixsrc !== mixsrc) {
    mixsrc = ttstrigger;
  }
  if (typeof mixsrc === 'number' && mixsrc === mixsrc) {
    tts = mixsrc * ttsgain;
  }
  var trigsrc = ttstrigger;
  if (typeof trigsrc !== 'number' || trigsrc !== trigsrc) {
    trigsrc = mixsrc;
  }
  var ttssidechain = 0;
  if (typeof trigsrc === 'number' && trigsrc === trigsrc) {
    ttssidechain = trigsrc * ttsgain;
  }
  var bg = bgvoices * MASTER_VOICE_GAIN * bggain;
  sidechaintriggersample(bg, ttssidechain, drumsidechainout());
  var duck = sidechaingain();
  var playbus = playvoices * duck * MASTER_VOICE_GAIN * MASTER_PLAY_TRIM;
  var d = drums * MASTER_DRUM_GAIN;
  var dry = playbus + bg + tts + d;
  var comp = applycompressor(dry);
  var razz = applyrazzle(comp);
  return razz * volgain;
}
`
