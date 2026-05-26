import {
  WASM_OSC_CFG_IDX,
  WASM_OSC_CFG_STRIDE,
} from './wasmoscconfigsab'
import { WASM_FM_HZ_SCALE } from './wasmlevels'

/** Per-voice osc tuning from zss_osccfg SAB — Tone SYNTH param parity. */
export const WASM_OSC_CFG_PLAY_CODE = `
var OSC_CFG_STRIDE = ${WASM_OSC_CFG_STRIDE};
var WASM_FM_HZ_SCALE = ${WASM_FM_HZ_SCALE};
var oscphase = [];
var oscwidth = [];
var oscmodfreq = [];
var oscharmonicity = [];
var oscmodindex = [];
var osccount = [];
var oscspread = [];
var oscpartialcount = [];
var oscpartials = [];
var oscmodenvattack = [];
var oscmodenvdecay = [];
var oscmodenvsustain = [];
var oscmodenvrelease = [];
var oscmodtype = [];
var modenvs = [];
var oscmodenvprevattack = [];
var oscmodenvprevdecay = [];
var oscmodenvprevsustain = [];
var oscmodenvprevrelease = [];
var voicephasestep = [];

for (var oi = 0; oi < VOICE_COUNT; oi++) {
  oscphase.push(0);
  oscwidth.push(0.2);
  oscmodfreq.push(1);
  oscharmonicity.push(1);
  oscmodindex.push(2);
  osccount.push(3);
  oscspread.push(20);
  oscpartialcount.push(0);
  oscpartials.push([0, 0, 0, 0, 0, 0, 0, 0]);
  oscmodenvattack.push(0.01);
  oscmodenvdecay.push(0.01);
  oscmodenvsustain.push(1);
  oscmodenvrelease.push(0.08);
  oscmodtype.push(0);
  modenvs.push(zssenv(10, 10, 1000, 500));
  oscmodenvprevattack.push(0);
  oscmodenvprevdecay.push(0);
  oscmodenvprevsustain.push(0);
  oscmodenvprevrelease.push(0);
  voicephasestep.push(0);
}

function readosccfgsab() {
  var raw = qref.zssOscCfgSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssOscCfgSab;
  }
  if (!raw || typeof raw.length !== 'number' || raw.length < VOICE_COUNT * OSC_CFG_STRIDE) {
    return;
  }
  for (var i = 0; i < VOICE_COUNT; i++) {
    var base = i * OSC_CFG_STRIDE;
    oscphase[i] = raw[base + ${WASM_OSC_CFG_IDX.PHASE}];
    oscwidth[i] = raw[base + ${WASM_OSC_CFG_IDX.WIDTH}];
    oscmodfreq[i] = raw[base + ${WASM_OSC_CFG_IDX.MODFREQ}];
    oscharmonicity[i] = raw[base + ${WASM_OSC_CFG_IDX.HARMONICITY}];
    oscmodindex[i] = raw[base + ${WASM_OSC_CFG_IDX.MODINDEX}];
    osccount[i] = raw[base + ${WASM_OSC_CFG_IDX.COUNT}];
    oscspread[i] = raw[base + ${WASM_OSC_CFG_IDX.SPREAD}];
    oscpartialcount[i] = Math.round(raw[base + ${WASM_OSC_CFG_IDX.PARTIALCOUNT}]);
    var parts = oscpartials[i];
    for (var p = 0; p < 8; p++) {
      parts[p] = raw[base + ${WASM_OSC_CFG_IDX.PARTIAL0} + p];
    }
    oscmodenvattack[i] = raw[base + ${WASM_OSC_CFG_IDX.MODENV_ATTACK}];
    oscmodenvdecay[i] = raw[base + ${WASM_OSC_CFG_IDX.MODENV_DECAY}];
    oscmodenvsustain[i] = raw[base + ${WASM_OSC_CFG_IDX.MODENV_SUSTAIN}];
    oscmodenvrelease[i] = raw[base + ${WASM_OSC_CFG_IDX.MODENV_RELEASE}];
    oscmodtype[i] = raw[base + ${WASM_OSC_CFG_IDX.MODTYPE}];
    if (
      oscmodenvprevattack[i] !== oscmodenvattack[i] ||
      oscmodenvprevdecay[i] !== oscmodenvdecay[i] ||
      oscmodenvprevsustain[i] !== oscmodenvsustain[i] ||
      oscmodenvprevrelease[i] !== oscmodenvrelease[i]
    ) {
      oscmodenvprevattack[i] = oscmodenvattack[i];
      oscmodenvprevdecay[i] = oscmodenvdecay[i];
      oscmodenvprevsustain[i] = oscmodenvsustain[i];
      oscmodenvprevrelease[i] = oscmodenvrelease[i];
      modenvs[i].setparams(
        oscmodenvattack[i] * 1000,
        oscmodenvdecay[i] * 1000,
        oscmodenvsustain[i],
        oscmodenvrelease[i] * 1000
      );
    }
  }
}

function oscmodwave(oscobj, typeid, hz) {
  if (typeid === 1) { return oscobj.sinewave(hz); }
  if (typeid === 2) { return oscobj.triangle(hz); }
  if (typeid === 3) { return oscobj.saw(hz); }
  return oscobj.square(hz);
}

function oscbasicwave(oscobj, typeid, hz) {
  if (typeid === 1) { return oscobj.sinewave(hz); }
  if (typeid === 2) { return oscobj.triangle(hz); }
  if (typeid === 3) { return oscobj.saw(hz); }
  if (typeid === 4) { return oscobj.pulse(hz, 0.5); }
  if (typeid === 5) { return oscobj.pulse(hz, 0.2); }
  return oscobj.square(hz);
}

function oscwavefromphase(typeid, phase01) {
  var p = phase01 - Math.floor(phase01);
  if (typeid === 1) {
    return Math.sin(p * 6.28318530718);
  }
  if (typeid === 2) {
    var tri = p < 0.5 ? p * 4 - 1 : 3 - p * 4;
    return tri;
  }
  if (typeid === 3) {
    return p * 2 - 1;
  }
  return p < 0.5 ? 1 : -1;
}

function oscwavewithphase(oscobj, typeid, hz, phase, vi) {
  if (phase === 0 && voicephasestep[vi] === 0) {
    return oscbasicwave(oscobj, typeid, hz);
  }
  var sr = typeof sampleRate !== 'undefined' ? sampleRate : 44100;
  voicephasestep[vi] += hz / sr;
  var p = voicephasestep[vi] + phase;
  if (typeid === 0 || typeid === 1 || typeid === 2 || typeid === 3) {
    return oscwavefromphase(typeid, p);
  }
  return oscbasicwave(oscobj, typeid, hz);
}

function fmcarriersample(carrier, modulator, modtypeid, hz, modhz, modidx, moddepth, carriertype) {
  var mod = oscmodwave(modulator, modtypeid, modhz) * modidx * moddepth;
  var fmhertz = hz + mod * hz * WASM_FM_HZ_SCALE;
  if (carriertype === 1) { return carrier.sinewave(fmhertz); }
  if (carriertype === 2) { return carrier.triangle(fmhertz); }
  if (carriertype === 3) { return carrier.saw(fmhertz); }
  return carrier.square(fmhertz);
}

function oscpartialsynth(oscobj, hz, count, partials) {
  var n = count > 0 ? Math.min(8, Math.round(count)) : 0;
  if (n <= 0) {
    return oscobj.sinewave(hz);
  }
  var sum = 0;
  var norm = 0;
  for (var pi = 0; pi < n; pi++) {
    var amp = partials[pi] || 0;
    if (amp === 0) {
      continue;
    }
    sum += oscobj.sinewave(hz * (pi + 1)) * amp;
    norm += amp < 0 ? -amp : amp;
  }
  if (norm <= 0) {
    return oscobj.sinewave(hz);
  }
  return sum / norm;
}
`
