import { WASM_DRUM_PLAY_CODE } from './drumplaycode'
import { WASM_FX_PLAY_CODE } from './wasmfxplaycode'
import { WASM_ENV_CODE } from './wasmenv'
import { WASM_SINE_VOICE_GAIN } from './wasmlevels'
import { WASM_MASTER_PLAY_CODE } from './wasmmasterplaycode'
import { WASM_NOISE_PLAY_CODE } from './noiseplaycode'
import { NOISE_SAMPLE_COUNT, WASM_NOISE_SETUP_CODE } from './noisewave'
import {
  WASM_VOICE_CFG_STRIDE,
} from './wasmvoicecfgsab'

/** Phase 1 voices + Phase 2 drums + Phase 3 FX through Maximilian WASM worklet. */
export const WASM_SYNTH_VOICE_PLAY_CODE = `
${WASM_ENV_CODE}

var VOICE_COUNT = 8;
var PLAY_VOICE_COUNT = 4;
var VOICE_STRIDE = 6;
var VOICE_CFG_STRIDE = ${WASM_VOICE_CFG_STRIDE};
var C4_HZ = 261.63;

${WASM_NOISE_SETUP_CODE}
${WASM_NOISE_PLAY_CODE}
${WASM_DRUM_PLAY_CODE}
${WASM_FX_PLAY_CODE}
${WASM_MASTER_PLAY_CODE}

var synthoscs = [];
var synthmods = [];
var bellmods = [];
var bellcars = [];
var sparklemods = [];
var sparklecars = [];
var dootoscs = [];
var envs = [];
var bellenvs = [];
var sparkleenvs = [];
var dootenvs = [];
var algooscs = [];
var algoenvs = [];
var filtlow = [];
var filthigh = [];

var freqs = [];
var gates = [];
var types = [];
var algos = [];
var detunes = [];
var osctypes = [];

var noisephase = [];
var noiseprev = [];
var gateprev = [];
var dootpitch = [];
var playfreqs = [];
var voicecfgattack = [];
var voicecfgdecay = [];
var voicecfgsustain = [];
var voicecfgrelease = [];
var voicecfgport = [];

for (var vi = 0; vi < VOICE_COUNT; vi++) {
  freqs.push(440);
  gates.push(0);
  types.push(0);
  algos.push(0);
  detunes.push(0);
  osctypes.push(0);
  noisephase.push(0);
  noiseprev.push(0);
  noisesample.push(0);
  noiserng.push((${NOISE_SAMPLE_COUNT} + vi * 7919) >>> 0);
  noisenotecount.push(0);
  gateprev.push(0);
  dootpitch.push(1);
  playfreqs.push(440);
  voicecfgattack.push(0.01);
  voicecfgdecay.push(0.05);
  voicecfgsustain.push(0.6);
  voicecfgrelease.push(0.08);
  voicecfgport.push(0);

  synthoscs.push(new Maximilian.maxiOsc());
  synthmods.push(new Maximilian.maxiOsc());
  bellmods.push(new Maximilian.maxiOsc());
  bellcars.push(new Maximilian.maxiOsc());
  sparklemods.push(new Maximilian.maxiOsc());
  sparklecars.push(new Maximilian.maxiOsc());
  dootoscs.push(new Maximilian.maxiOsc());

  var env = zssenv(10, 50, 0.6, 80);
  envs.push(env);

  var bellenv = zssenv(10, 3000, 0.3, 6000);
  bellenvs.push(bellenv);

  var sparkenv = zssenv(1, 1400, 0, 321);
  sparkleenvs.push(sparkenv);

  var dootenvelope = zssenv(1, 400, 0.01, 1400);
  dootenvs.push(dootenvelope);

  filtlow.push(new Maximilian.maxiFilter());
  filthigh.push(new Maximilian.maxiFilter());

  var voicealgos = [];
  var voicealgoenvs = [];
  for (var oi = 0; oi < 4; oi++) {
    voicealgos.push(new Maximilian.maxiOsc());
    var algoenv = zssenv(10, 10, 1, 500);
    voicealgoenvs.push(algoenv);
  }
  algooscs.push(voicealgos);
  algoenvs.push(voicealgoenvs);
}

function detunedhz(i, freq) {
  var hz = freq > 0 ? freq : 440;
  var cents = detunes[i] || 0;
  if (gates[i]) {
    cents += playvibratocents(i);
  }
  return hz * Math.pow(2, cents / 1200);
}

function glidefreq(i) {
  var target = freqs[i] > 0 ? freqs[i] : 440;
  var type = types[i];
  var port = voicecfgport[i] || 0;
  if ((type !== 0 && type !== 7) || port <= 0) {
    playfreqs[i] = target;
    return target;
  }
  var sr = typeof sampleRate !== 'undefined' ? sampleRate : 44100;
  var rate = 1 / Math.max(1, port * sr);
  playfreqs[i] += (target - playfreqs[i]) * rate;
  return playfreqs[i];
}

function applyvoiceenvelope(i, attack, decay, sustain, release) {
  var atk = attack * 1000;
  var dec = decay * 1000;
  var rel = release * 1000;
  var type = types[i];
  if (type === 5) {
    bellenvs[i].setparams(atk, dec, sustain, rel);
    return;
  }
  if (type === 6) {
    dootenvs[i].setparams(atk, dec, sustain, rel);
    return;
  }
  if (type === 7) {
    var envs4 = algoenvs[i];
    for (var oi = 0; oi < 4; oi++) {
      envs4[oi].setparams(atk, dec, sustain, rel);
    }
    return;
  }
  envs[i].setparams(atk, dec, sustain, rel);
}

function readvoicecfgsab() {
  var raw = qref.zssVoiceCfgSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssVoiceCfgSab;
  }
  if (!raw || typeof raw.length !== 'number' || raw.length < VOICE_COUNT * VOICE_CFG_STRIDE) {
    return;
  }
  for (var i = 0; i < VOICE_COUNT; i++) {
    var base = i * VOICE_CFG_STRIDE;
    var atk = raw[base];
    var dec = raw[base + 1];
    var sus = raw[base + 2];
    var rel = raw[base + 3];
    var port = raw[base + 4];
    if (
      voicecfgattack[i] !== atk ||
      voicecfgdecay[i] !== dec ||
      voicecfgsustain[i] !== sus ||
      voicecfgrelease[i] !== rel
    ) {
      voicecfgattack[i] = atk;
      voicecfgdecay[i] = dec;
      voicecfgsustain[i] = sus;
      voicecfgrelease[i] = rel;
      applyvoiceenvelope(i, atk, dec, sus, rel);
    }
    voicecfgport[i] = port;
  }
}

function synthwavegain(osc) {
  if (osc === 1 || osc === 10 || osc === 20 || osc === 30) {
    return ${WASM_SINE_VOICE_GAIN};
  }
  return 1;
}

function synthsource(i, freq, gate) {
  var hz = detunedhz(i, freq);
  var osc = osctypes[i] || 0;
  var o = synthoscs[i];
  var m = synthmods[i];
  var sig = 0;

  if (osc === 0) { sig = o.square(hz); }
  else if (osc === 1) { sig = o.sinewave(hz); }
  else if (osc === 2) { sig = o.triangle(hz); }
  else if (osc === 3) { sig = o.saw(hz); }
  else if (osc === 4) { sig = o.pulse(hz, 0.5); }
  else if (osc === 5) { sig = o.pulse(hz, 0.2); }
  else if (osc === 10) { sig = o.sinewave(hz) * (0.5 + 0.5 * m.sinewave(hz * 2)); }
  else if (osc === 11) { sig = o.square(hz) * (0.5 + 0.5 * m.sinewave(hz * 2)); }
  else if (osc === 12) { sig = o.triangle(hz) * (0.5 + 0.5 * m.sinewave(hz * 2)); }
  else if (osc === 13) { sig = o.saw(hz) * (0.5 + 0.5 * m.sinewave(hz * 2)); }
  else if (osc === 20) {
    var fmmod = m.sinewave(hz * 2) * 10;
    sig = o.sinewave(hz + fmmod * 0.05);
  } else if (osc === 21) {
    var fmmod = m.sinewave(hz * 2) * 10;
    sig = o.square(hz + fmmod * 0.05);
  } else if (osc === 22) {
    var fmmod = m.sinewave(hz * 2) * 10;
    sig = o.triangle(hz + fmmod * 0.05);
  } else if (osc === 23) {
    var fmmod = m.sinewave(hz * 2) * 10;
    sig = o.saw(hz + fmmod * 0.05);
  } else if (osc === 30) {
    sig = (o.sinewave(hz) + o.sinewave(hz * 1.004) + o.sinewave(hz * 0.996)) / 3;
  } else if (osc === 31) {
    sig = (o.square(hz) + o.square(hz * 1.004) + o.square(hz * 0.996)) / 3;
  } else if (osc === 32) {
    sig = (o.triangle(hz) + o.triangle(hz * 1.004) + o.triangle(hz * 0.996)) / 3;
  } else if (osc === 33) {
    sig = (o.saw(hz) + o.saw(hz * 1.004) + o.saw(hz * 0.996)) / 3;
  } else { sig = o.square(hz); }

  return sig * synthwavegain(osc);
}

function synthvoice(i, freq, gate) {
  return synthsource(i, glidefreq(i), gate) * envs[i].adsr(1, gate);
}

function bellsvoice(i, freq, gate) {
  var hz = detunedhz(i, freq);
  var mod = bellmods[i].square(hz * 1.5) * 30;
  var carrier = bellcars[i].sinewave(hz + mod * 0.01);
  var envout = bellenvs[i].adsr(1, gate);
  var sig = carrier * envout;

  var sparkhz = hz * 4;
  var sparkmod = sparklemods[i].sinewave(sparkhz * 5.1) * 32;
  var spark = sparklecars[i].sinewave(sparkhz + sparkmod * 0.002);
  var sparkenv = sparkleenvs[i].adsr(1, gate);
  sig += spark * sparkenv * 0.15;

  return sig * 0.35;
}

function dootvoice(i, freq, gate) {
  if (gate && !gateprev[i]) {
    dootpitch[i] = 1;
  }
  gateprev[i] = gate;
  var hz = freq > 0 ? freq : 110;
  if (gate) {
    dootpitch[i] *= 0.9993;
    if (dootpitch[i] < 0.15) { dootpitch[i] = 0.15; }
  }
  var pitchmul = 0.15 + dootpitch[i] * 0.85;
  var sig = dootoscs[i].sinewave(hz * pitchmul);
  return sig * dootenvs[i].adsr(1, gate) * 0.6;
}

function algovoice(i, freq, gate, algo) {
  var hz = glidefreq(i);
  var h1 = 2, h2 = 2, h3 = 2;
  var mi1 = 1, mi2 = 1, mi3 = 1;
  var ops = algooscs[i];
  var envs4 = algoenvs[i];

  var raw1 = ops[0].sinewave(hz * h1);
  var raw2 = ops[1].sinewave(hz * h2);
  var raw3 = ops[2].sinewave(hz * h3);
  var raw4 = ops[3].sinewave(hz);

  var op1 = raw1 * envs4[0].adsr(1, gate);
  var op2 = raw2 * envs4[1].adsr(1, gate);
  var op3 = raw3 * envs4[2].adsr(1, gate);
  var op4 = raw4 * envs4[3].adsr(1, gate);

  if (algo === 0) {
    op2 = ops[1].sinewave(hz * h2 + raw1 * mi1) * envs4[1].adsr(1, gate);
    op3 = ops[2].sinewave(hz * h3 + raw2 * mi2) * envs4[2].adsr(1, gate);
    op4 = ops[3].sinewave(hz + raw3 * mi3) * envs4[3].adsr(1, gate);
  } else if (algo === 1) {
    op3 = ops[2].sinewave(hz * h3 + (raw1 + raw2) * mi2 * 0.5) * envs4[2].adsr(1, gate);
    op4 = ops[3].sinewave(hz + raw3 * mi3) * envs4[3].adsr(1, gate);
  } else if (algo === 2) {
    op3 = ops[2].sinewave(hz * h3 + raw2 * mi2) * envs4[2].adsr(1, gate);
    op4 = ops[3].sinewave(hz + (raw1 + raw3) * mi3 * 0.5) * envs4[3].adsr(1, gate);
  } else if (algo === 3) {
    op4 = ops[3].sinewave(hz + (raw1 + raw2 + raw3) * mi3 * 0.33) * envs4[3].adsr(1, gate);
  } else if (algo === 5) {
    op2 = ops[1].sinewave(hz * h2 + raw1 * mi1) * envs4[1].adsr(1, gate);
    op3 = ops[2].sinewave(hz * h3 + raw1 * mi2) * envs4[2].adsr(1, gate);
    op4 = ops[3].sinewave(hz + raw1 * mi3) * envs4[3].adsr(1, gate);
  } else if (algo === 6) {
    op2 = ops[1].sinewave(hz * h2 + raw1 * mi1) * envs4[1].adsr(1, gate);
  }

  var out = op4;
  if (algo === 4) { out = (op2 + op4) * 0.5; }
  else if (algo === 5) { out = (op2 + op3 + op4) / 3; }
  else if (algo === 6) { out = op2; }
  else if (algo === 7) { out = (op1 + op2 + op3 + op4) * 0.25; }

  return out * 0.35;
}

function voiceout(i) {
  var freq = freqs[i];
  var gate = gates[i];
  var type = types[i];
  var algo = algos[i];

  if (type === 0) { return synthvoice(i, freq, gate); }
  if ((type >= 1 && type <= 4) || type === 8 || type === 9) {
    return noisevoice(i, type, freq, gate);
  }
  if (type === 5) { return bellsvoice(i, freq, gate); }
  if (type === 6) { return dootvoice(i, freq, gate); }
  if (type === 7) { return algovoice(i, freq, gate, algo); }
  return synthvoice(i, freq, gate);
}

function readvoicessab() {
  var raw = qref.zssVoiceSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssVoiceSab;
  }
  if (!raw || typeof raw.length !== 'number' || raw.length < VOICE_COUNT * VOICE_STRIDE) {
    return;
  }
  for (var i = 0; i < VOICE_COUNT; i++) {
    var base = i * VOICE_STRIDE;
    freqs[i] = raw[base];
    gates[i] = raw[base + 1] > 0.5 ? 1 : 0;
    types[i] = Math.round(raw[base + 2]);
    algos[i] = Math.round(raw[base + 3]);
    detunes[i] = raw[base + 4];
    osctypes[i] = Math.round(raw[base + 5]);
  }
}

function play() {
  readvoicessab();
  readvoicecfgsab();
  updateplayvibratodepth();
  playbuswahenv = 0;
  bgbuswahenv = 0;

  var playvoices = 0;
  var bgvoices = 0;
  for (var i = 0; i < VOICE_COUNT; i++) {
    var out = voiceout(i);
    var lvl = voicelevelat(i);
    if (i >= PLAY_VOICE_COUNT) {
      bgvoices += out;
      if (lvl > bgbuswahenv) {
        bgbuswahenv = lvl;
      }
    } else {
      playvoices += out;
      if (lvl > playbuswahenv) {
        playbuswahenv = lvl;
      }
    }
  }
  var drums = safedrumsout();
  var mixed = applyfxchain(playvoices, bgvoices);
  return masterout(mixed[0], mixed[1], drums);
}

function safedrumsout() {
  try {
    return drumsout();
  } catch (err) {
    return 0;
  }
}
`