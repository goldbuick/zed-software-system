import { WASM_ALGO_CFG_IDX, WASM_ALGO_CFG_STRIDE } from './wasmalgoconfigsab'

/** Per-voice algo op config from zss_algocfg SAB — Tone AlgoSynth parity. */
export const WASM_ALGO_CFG_PLAY_CODE = `
var ALGO_CFG_STRIDE = ${WASM_ALGO_CFG_STRIDE};
var algoh1 = [];
var algoh2 = [];
var algoh3 = [];
var algomi1 = [];
var algomi2 = [];
var algomi3 = [];
var algoosctype = [];
var algoenvattack = [];
var algoenvdecay = [];
var algoenvsustain = [];
var algoenvrelease = [];

for (var ai = 0; ai < VOICE_COUNT; ai++) {
  algoh1.push(2);
  algoh2.push(2);
  algoh3.push(2);
  algomi1.push(1);
  algomi2.push(1);
  algomi3.push(1);
  algoosctype.push([1, 1, 1, 1]);
  algoenvattack.push([0.01, 0.01, 0.01, 0.01]);
  algoenvdecay.push([0.01, 0.01, 0.01, 0.01]);
  algoenvsustain.push([1, 1, 1, 1]);
  algoenvrelease.push([0.5, 0.5, 0.5, 0.5]);
}

function readalgocfgsab() {
  var raw = qref.zssAlgoCfgSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssAlgoCfgSab;
  }
  if (!raw || typeof raw.length !== 'number' || raw.length < VOICE_COUNT * ALGO_CFG_STRIDE) {
    return;
  }
  for (var i = 0; i < VOICE_COUNT; i++) {
    var base = i * ALGO_CFG_STRIDE;
    algoh1[i] = raw[base + ${WASM_ALGO_CFG_IDX.HARMONICITY1}];
    algoh2[i] = raw[base + ${WASM_ALGO_CFG_IDX.HARMONICITY2}];
    algoh3[i] = raw[base + ${WASM_ALGO_CFG_IDX.HARMONICITY3}];
    algomi1[i] = raw[base + ${WASM_ALGO_CFG_IDX.MODINDEX1}];
    algomi2[i] = raw[base + ${WASM_ALGO_CFG_IDX.MODINDEX2}];
    algomi3[i] = raw[base + ${WASM_ALGO_CFG_IDX.MODINDEX3}];
    algoosctype[i][0] = Math.round(raw[base + ${WASM_ALGO_CFG_IDX.OSC1}]);
    algoosctype[i][1] = Math.round(raw[base + ${WASM_ALGO_CFG_IDX.OSC2}]);
    algoosctype[i][2] = Math.round(raw[base + ${WASM_ALGO_CFG_IDX.OSC3}]);
    algoosctype[i][3] = Math.round(raw[base + ${WASM_ALGO_CFG_IDX.OSC4}]);
    algoenvattack[i][0] = raw[base + ${WASM_ALGO_CFG_IDX.ENV1_ATTACK}];
    algoenvdecay[i][0] = raw[base + ${WASM_ALGO_CFG_IDX.ENV1_DECAY}];
    algoenvsustain[i][0] = raw[base + ${WASM_ALGO_CFG_IDX.ENV1_SUSTAIN}];
    algoenvrelease[i][0] = raw[base + ${WASM_ALGO_CFG_IDX.ENV1_RELEASE}];
    algoenvattack[i][1] = raw[base + ${WASM_ALGO_CFG_IDX.ENV2_ATTACK}];
    algoenvdecay[i][1] = raw[base + ${WASM_ALGO_CFG_IDX.ENV2_DECAY}];
    algoenvsustain[i][1] = raw[base + ${WASM_ALGO_CFG_IDX.ENV2_SUSTAIN}];
    algoenvrelease[i][1] = raw[base + ${WASM_ALGO_CFG_IDX.ENV2_RELEASE}];
    algoenvattack[i][2] = raw[base + ${WASM_ALGO_CFG_IDX.ENV3_ATTACK}];
    algoenvdecay[i][2] = raw[base + ${WASM_ALGO_CFG_IDX.ENV3_DECAY}];
    algoenvsustain[i][2] = raw[base + ${WASM_ALGO_CFG_IDX.ENV3_SUSTAIN}];
    algoenvrelease[i][2] = raw[base + ${WASM_ALGO_CFG_IDX.ENV3_RELEASE}];
    algoenvattack[i][3] = raw[base + ${WASM_ALGO_CFG_IDX.ENV4_ATTACK}];
    algoenvdecay[i][3] = raw[base + ${WASM_ALGO_CFG_IDX.ENV4_DECAY}];
    algoenvsustain[i][3] = raw[base + ${WASM_ALGO_CFG_IDX.ENV4_SUSTAIN}];
    algoenvrelease[i][3] = raw[base + ${WASM_ALGO_CFG_IDX.ENV4_RELEASE}];
    var changed = false;
    for (var oj = 0; oj < 4; oj++) {
      if (
        algoenvprevattack[i][oj] !== algoenvattack[i][oj] ||
        algoenvprevdecay[i][oj] !== algoenvdecay[i][oj] ||
        algoenvprevsustain[i][oj] !== algoenvsustain[i][oj] ||
        algoenvprevrelease[i][oj] !== algoenvrelease[i][oj]
      ) {
        changed = true;
        algoenvprevattack[i][oj] = algoenvattack[i][oj];
        algoenvprevdecay[i][oj] = algoenvdecay[i][oj];
        algoenvprevsustain[i][oj] = algoenvsustain[i][oj];
        algoenvprevrelease[i][oj] = algoenvrelease[i][oj];
      }
    }
    if (changed) {
      applyalgoenvfromsab(i);
    }
  }
}

function applyalgoenvfromsab(i) {
  var envs4 = algoenvs[i];
  for (var oi = 0; oi < 4; oi++) {
    envs4[oi].setparams(
      algoenvattack[i][oi] * 1000,
      algoenvdecay[i][oi] * 1000,
      algoenvsustain[i][oi],
      algoenvrelease[i][oi] * 1000
    );
  }
}

var algoenvprevattack = [];
var algoenvprevdecay = [];
var algoenvprevsustain = [];
var algoenvprevrelease = [];
for (var api = 0; api < VOICE_COUNT; api++) {
  algoenvprevattack.push([0, 0, 0, 0]);
  algoenvprevdecay.push([0, 0, 0, 0]);
  algoenvprevsustain.push([0, 0, 0, 0]);
  algoenvprevrelease.push([0, 0, 0, 0]);
}

function algopwave(oscobj, typeid, hz) {
  return oscbasicwave(oscobj, typeid, hz);
}
`
