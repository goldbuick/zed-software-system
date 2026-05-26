import {
  WASM_OSC_CFG_IDX,
  WASM_OSC_CFG_STRIDE,
} from './wasmoscconfigsab'

/** Per-voice osc tuning from zss_osccfg SAB — Tone SYNTH param parity. */
export const WASM_OSC_CFG_PLAY_CODE = `
var OSC_CFG_STRIDE = ${WASM_OSC_CFG_STRIDE};
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

for (var oi = 0; oi < VOICE_COUNT; oi++) {
  oscphase.push(0);
  oscwidth.push(0.5);
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
  oscmodtype.push(1);
  modenvs.push(zssenv(10, 10, 1000, 500));
  oscmodenvprevattack.push(0);
  oscmodenvprevdecay.push(0);
  oscmodenvprevsustain.push(0);
  oscmodenvprevrelease.push(0);
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

function oscwavewithphase(oscobj, typeid, hz, phase) {
  if (phase === 0) {
    return oscbasicwave(oscobj, typeid, hz);
  }
  var ph = phase * 6.28318530718;
  if (typeid === 1) { return Math.sin(ph + hz * 0.0001); }
  return oscbasicwave(oscobj, typeid, hz);
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
