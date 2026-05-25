import { WASM_DRUM_PLAY_CODE } from './drumplaycode'
import { WASM_ENV_CODE } from './wasmenv'
import { WASM_NOISE_SETUP_CODE } from './noisewave'

/** Phase 1 voices + Phase 2 drums through Maximilian WASM worklet. */
export const WASM_SYNTH_VOICE_PLAY_CODE = `
${WASM_ENV_CODE}
${WASM_NOISE_SETUP_CODE}
${WASM_DRUM_PLAY_CODE}

var VOICE_COUNT = 4;
var C4_HZ = 261.63;

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

var freqs = [440, 440, 440, 440];
var gates = [0, 0, 0, 0];
var types = [0, 0, 0, 0];
var algos = [0, 0, 0, 0];
var detunes = [0, 0, 0, 0];
var osctypes = [0, 0, 0, 0];

var noisephase = [0, 0, 0, 0];
var noiseprev = [0, 0, 0, 0];
var gateprev = [0, 0, 0, 0];
var dootpitch = [1, 1, 1, 1];

for (var vi = 0; vi < VOICE_COUNT; vi++) {
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

function noiseforvoice(noisetype) {
  if (noisetype === 1) { return noiseready(1); }
  if (noisetype === 2) { return noiseready(2); }
  if (noisetype === 3) { return noiseready(3); }
  return noiseready(4);
}

function readnoise(i, buf, freq, gate) {
  if (gate && !noiseprev[i]) {
    noisephase[i] = 0;
  }
  noiseprev[i] = gate;
  if (!gate) {
    return 0;
  }
  var rate = freq > 0 ? freq / C4_HZ : 1;
  var idx = Math.floor(noisephase[i]) % buf.length;
  var sample = buf[idx];
  noisephase[i] += rate;
  return sample;
}

function detunedhz(i, freq) {
  var hz = freq > 0 ? freq : 440;
  var cents = detunes[i] || 0;
  return hz * Math.pow(2, cents / 1200);
}

function synthvoice(i, freq, gate) {
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

  return sig * envs[i].adsr(1, gate);
}

function noisevoice(i, noisetype, freq, gate) {
  var buf = noiseforvoice(noisetype);
  var raw = readnoise(i, buf, freq, gate);
  var envout = envs[i].adsr(1, gate);
  var shaped = filtlow[i].lores(raw, 440, 0.3);
  shaped = filthigh[i].hipass(shaped, 440);
  return shaped * envout * 0.02;
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
  var hz = freq > 0 ? freq : 440;
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
  if (type >= 1 && type <= 4) { return noisevoice(i, type, freq, gate); }
  if (type === 5) { return bellsvoice(i, freq, gate); }
  if (type === 6) { return dootvoice(i, freq, gate); }
  if (type === 7) { return algovoice(i, freq, gate, algo); }
  return synthvoice(i, freq, gate);
}

function readvoicessab() {
  var raw = qref.zssVoiceSab;
  if (!raw || typeof raw.length !== 'number' || raw.length < 24) {
    return;
  }
  for (var i = 0; i < VOICE_COUNT; i++) {
    var base = i * 6;
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

  var sum = 0;
  for (var i = 0; i < VOICE_COUNT; i++) {
    sum += voiceout(i);
  }
  sum += safedrumsout();
  var out = sum * 0.35;
  return [out, out];
}

function safedrumsout() {
  try {
    return drumsout();
  } catch (err) {
    return 0;
  }
}
`