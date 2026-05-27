import { WASM_DRUM_PLAY_CODE } from './drumplaycode'
import { WASM_NOISE_PLAY_CODE } from './noiseplaycode'
import { NOISE_SAMPLE_COUNT, WASM_NOISE_SETUP_CODE } from './noisewave'
import { WASM_ALGO_CFG_PLAY_CODE } from './wasmalgoplaycode'
import { WASM_AUTOFILTER_PLAY_CODE } from './wasmautofilterplaycode'
import { WASM_AUTOWAH_PLAY_CODE } from './wasmautowahplaycode'
import { WASM_ENV_CODE } from './wasmenv'
import { WASM_FX_PLAY_CODE } from './wasmfxplaycode'
import {
  WASM_ALGO_OP_GAIN,
  WASM_ALGO_OUT_GAIN,
  WASM_SINE_VOICE_GAIN,
} from './wasmlevels'
import { WASM_MASTER_PLAY_CODE } from './wasmmasterplaycode'
import { WASM_OSC_CFG_PLAY_CODE } from './wasmoscplaycode'
import { WASM_PERF_BOOTSTRAP } from './wasmperfplaycode'
import { WASM_VIBRATO_PLAY_CODE } from './wasmvibratoplaycode'
import { WASM_SAB_SEQ_PLAY_CODE } from './wasmplaysabseq'
import { WASM_VOICE_CFG_STRIDE } from './wasmvoicecfgsab'

/** Phase 1 voices + Phase 2 drums + Phase 3 FX through Maximilian WASM worklet. */
export const WASM_SYNTH_VOICE_PLAY_CODE = `
${WASM_ENV_CODE}
${WASM_PERF_BOOTSTRAP}

var VOICE_COUNT = 8;
var PLAY_VOICE_COUNT = 4;
var VOICE_STRIDE = 6;
var VOICE_CFG_STRIDE = ${WASM_VOICE_CFG_STRIDE};
var C4_HZ = 261.63;

${WASM_NOISE_SETUP_CODE}
${WASM_NOISE_PLAY_CODE}
${WASM_OSC_CFG_PLAY_CODE}
${WASM_ALGO_CFG_PLAY_CODE}
${WASM_DRUM_PLAY_CODE}
${WASM_AUTOFILTER_PLAY_CODE}
${WASM_AUTOWAH_PLAY_CODE}
${WASM_FX_PLAY_CODE}
${WASM_VIBRATO_PLAY_CODE}
${WASM_MASTER_PLAY_CODE}
${WASM_SAB_SEQ_PLAY_CODE}

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
var algooutenvs = [];

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
var glidestart = [];
var glidetarget = [];
var glidetotal = [];
var glideremain = [];
var voicecfgattack = [];
var voicecfgdecay = [];
var voicecfgsustain = [];
var voicecfgrelease = [];
var voicecfgport = [];
var voicecfgvolume = [];
var voicegains = [];
var detunemuls = [];
var synthgateprev = [];
var playsampletick = 0;
var activevoicemask = 0;
var playsampleclock = 0;

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
  glidestart.push(440);
  glidetarget.push(440);
  glidetotal.push(0);
  glideremain.push(0);
  voicecfgattack.push(0.01);
  voicecfgdecay.push(0.01);
  voicecfgsustain.push(0.5);
  voicecfgrelease.push(0.01);
  voicecfgport.push(0);
  voicecfgvolume.push(0);
  voicegains.push(1);
  detunemuls.push(1);

  synthoscs.push(new Maximilian.maxiOsc());
  synthmods.push(new Maximilian.maxiOsc());
  bellmods.push(new Maximilian.maxiOsc());
  bellcars.push(new Maximilian.maxiOsc());
  sparklemods.push(new Maximilian.maxiOsc());
  sparklecars.push(new Maximilian.maxiOsc());
  dootoscs.push(new Maximilian.maxiOsc());

  synthgateprev.push(0);

  var env = zssenv(10, 10, 0.5, 10);
  envs.push(env);

  var bellenv = zssenv(10, 3000, 0.3, 6000);
  bellenvs.push(bellenv);

  var sparkenv = zssenv(1, 1400, 0, 321);
  sparkleenvs.push(sparkenv);

  var dootenvelope = zssenv(1, 400, 0.01, 1400);
  dootenvs.push(dootenvelope);

  var algooutenv = zssenv(10, 10, 0.5, 10);
  algooutenvs.push(algooutenv);

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
  var vib = gates[i] ? playvibratocents(i) : 0;
  if (vib !== 0) {
    var cents = (detunes[i] || 0) + vib;
    return hz * Math.pow(2, cents / 1200);
  }
  return hz * (detunemuls[i] || 1);
}

function glidefreq(i) {
  var target = freqs[i] > 0 ? freqs[i] : 440;
  var type = types[i];
  var port = voicecfgport[i] > 0 ? voicecfgport[i] : 0;
  if ((type !== 0 && type !== 7) || port <= 0) {
    playfreqs[i] = target;
    glidetarget[i] = target;
    glideremain[i] = 0;
    return target;
  }
  var sr = typeof sampleRate !== 'undefined' ? sampleRate : 44100;
  if (target !== glidetarget[i]) {
    var level = voiceenvlevel(i);
    if (gates[i] && level > 0.05 && playfreqs[i] > 0) {
      glidestart[i] = playfreqs[i];
      glidetarget[i] = target;
      glidetotal[i] = Math.max(1, Math.round(port * sr));
      glideremain[i] = glidetotal[i];
    } else {
      playfreqs[i] = target;
      glidetarget[i] = target;
      glideremain[i] = 0;
    }
  }
  if (glideremain[i] > 0) {
    var progress = 1 - glideremain[i] / glidetotal[i];
    var start = glidestart[i];
    var end = glidetarget[i];
    if (start > 0 && end > 0) {
      playfreqs[i] = start * Math.pow(end / start, progress);
    } else {
      playfreqs[i] = start + (end - start) * progress;
    }
    glideremain[i]--;
    if (glideremain[i] <= 0) {
      playfreqs[i] = end;
    }
  }
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
    algooutenvs[i].setparams(atk, dec, sustain, rel);
    return;
  }
  envs[i].setparams(atk, dec, sustain, rel);
}

function voicevolumegain(i) {
  return voicegains[i] || 1;
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
    var vol = raw[base + 5];
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
    voicecfgvolume[i] = vol;
    voicegains[i] = Math.pow(10, (vol || 0) / 20);
  }
}

function synthwavegain(osc) {
  if (osc === 1 || osc === 10 || osc === 20 || osc === 30) {
    return ${WASM_SINE_VOICE_GAIN};
  }
  return 1;
}

function fatosccount(i) {
  return osccount[i] > 1 ? Math.round(osccount[i]) : 3;
}

function synthsource(i, freq, gate) {
  var hz = detunedhz(i, freq);
  var osc = osctypes[i] || 0;
  var o = synthoscs[i];
  var m = synthmods[i];
  var sig = 0;
  var width = oscwidth[i] > 0 ? oscwidth[i] : 0.2;
  var modidx = oscmodindex[i] > 0 ? oscmodindex[i] : 2;
  var harm = oscharmonicity[i] > 0 ? oscharmonicity[i] : 1;
  var modhz = hz * (oscmodfreq[i] > 0 ? oscmodfreq[i] : 1);
  var pcount = oscpartialcount[i] > 0 ? oscpartialcount[i] : 0;

  if (pcount > 0) {
    sig = oscpartialsynth(o, hz, pcount, oscpartials[i]);
  } else if (osc === 0) { sig = oscwavewithphase(o, 0, hz, oscphase[i], i); }
  else if (osc === 1) { sig = oscwavewithphase(o, 1, hz, oscphase[i], i); }
  else if (osc === 2) { sig = oscwavewithphase(o, 2, hz, oscphase[i], i); }
  else if (osc === 3) { sig = oscwavewithphase(o, 3, hz, oscphase[i], i); }
  else if (osc === 4) { sig = o.pulse(hz, width); }
  else if (osc === 5) { sig = o.pulse(hz, width > 0 ? width : 0.2); }
  else if (osc === 10) {
    var moddepth = modenvs[i].adsr(1, gate);
    var modsig = oscmodwave(m, oscmodtype[i], hz * harm) * moddepth;
    sig = o.sinewave(hz) * (0.5 + 0.5 * modsig);
  } else if (osc === 11) {
    var moddepth = modenvs[i].adsr(1, gate);
    var modsig = oscmodwave(m, oscmodtype[i], hz * harm) * moddepth;
    sig = o.square(hz) * (0.5 + 0.5 * modsig);
  } else if (osc === 12) {
    var moddepth = modenvs[i].adsr(1, gate);
    var modsig = oscmodwave(m, oscmodtype[i], hz * harm) * moddepth;
    sig = o.triangle(hz) * (0.5 + 0.5 * modsig);
  } else if (osc === 13) {
    var moddepth = modenvs[i].adsr(1, gate);
    var modsig = oscmodwave(m, oscmodtype[i], hz * harm) * moddepth;
    sig = o.saw(hz) * (0.5 + 0.5 * modsig);
  } else if (osc === 20) {
    var moddepth = modenvs[i].adsr(1, gate);
    sig = fmcarriersample(o, m, oscmodtype[i], hz, modhz, modidx, moddepth, 1);
  } else if (osc === 21) {
    var moddepth = modenvs[i].adsr(1, gate);
    sig = fmcarriersample(o, m, oscmodtype[i], hz, modhz, modidx, moddepth, 0);
  } else if (osc === 22) {
    var moddepth = modenvs[i].adsr(1, gate);
    sig = fmcarriersample(o, m, oscmodtype[i], hz, modhz, modidx, moddepth, 2);
  } else if (osc === 23) {
    var moddepth = modenvs[i].adsr(1, gate);
    sig = fmcarriersample(o, m, oscmodtype[i], hz, modhz, modidx, moddepth, 3);
  } else if (osc === 30) {
    var cnt = fatosccount(i);
    var spread = oscspread[i] > 0 ? oscspread[i] : 20;
    var det = spread / 1200;
    sig = 0;
    for (var fi = 0; fi < cnt; fi++) {
      var mul = 1 + (fi - (cnt - 1) * 0.5) * det;
      sig += o.sinewave(hz * mul);
    }
    sig /= cnt;
  } else if (osc === 31) {
    var cnt = fatosccount(i);
    var spread = oscspread[i] > 0 ? oscspread[i] : 20;
    var det = spread / 1200;
    sig = 0;
    for (var fi = 0; fi < cnt; fi++) {
      var mul = 1 + (fi - (cnt - 1) * 0.5) * det;
      sig += o.square(hz * mul);
    }
    sig /= cnt;
  } else if (osc === 32) {
    var cnt = fatosccount(i);
    var spread = oscspread[i] > 0 ? oscspread[i] : 20;
    var det = spread / 1200;
    sig = 0;
    for (var fi = 0; fi < cnt; fi++) {
      var mul = 1 + (fi - (cnt - 1) * 0.5) * det;
      sig += o.triangle(hz * mul);
    }
    sig /= cnt;
  } else if (osc === 33) {
    var cnt = fatosccount(i);
    var spread = oscspread[i] > 0 ? oscspread[i] : 20;
    var det = spread / 1200;
    sig = 0;
    for (var fi = 0; fi < cnt; fi++) {
      var mul = 1 + (fi - (cnt - 1) * 0.5) * det;
      sig += o.saw(hz * mul);
    }
    sig /= cnt;
  } else { sig = o.square(hz); }

  return sig * synthwavegain(osc);
}

function synthvoice(i, freq, gate) {
  if (gate && !synthgateprev[i]) {
    voicephasestep[i] = 0;
  }
  synthgateprev[i] = gate;
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
  var h1 = algoh1[i] > 0 ? algoh1[i] : 2;
  var h2 = algoh2[i] > 0 ? algoh2[i] : 2;
  var h3 = algoh3[i] > 0 ? algoh3[i] : 2;
  var mi1 = algomi1[i] > 0 ? algomi1[i] : 1;
  var mi2 = algomi2[i] > 0 ? algomi2[i] : 1;
  var mi3 = algomi3[i] > 0 ? algomi3[i] : 1;
  var types = algoosctype[i];
  var ops = algooscs[i];
  var envs4 = algoenvs[i];
  var opgain = ${WASM_ALGO_OP_GAIN};

  var raw1 = algopwave(ops[0], types[0], hz * h1) * opgain;
  var raw2 = algopwave(ops[1], types[1], hz * h2) * opgain;
  var raw3 = algopwave(ops[2], types[2], hz * h3) * opgain;
  var raw4 = algopwave(ops[3], types[3], hz) * opgain;

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
  if (algo === 4) { out = op2 + op4; }
  else if (algo === 5) { out = op2 + op3 + op4; }
  else if (algo === 6) { out = op2; }
  else if (algo === 7) { out = op1 + op2 + op3 + op4; }

  return out * algooutenvs[i].adsr(1, gate) * ${WASM_ALGO_OUT_GAIN};
}

function voiceenvlevel(i) {
  var type = types[i];
  if (type === 5) {
    return bellenvs[i].level;
  }
  if (type === 6) {
    return dootenvs[i].level;
  }
  if (type === 7) {
    return algooutenvs[i].level;
  }
  return envs[i].level;
}

function voiceissilent(i) {
  if (gates[i]) {
    return false;
  }
  return voiceenvlevel(i) < 0.00005;
}

function readsynthcontrolblock() {
  var fxchanged = false;
  if (sabseqchanged(SAB_SEQ_VOICES)) {
    readvoicessab();
  }
  if (sabseqchanged(SAB_SEQ_DRUMS)) {
    readdrumsab();
  }
  if (sabseqchanged(SAB_SEQ_FX)) {
    refreshfxsends();
    refreshfxparams();
    fxchanged = true;
  }
  if (sabseqchanged(SAB_SEQ_MASTER)) {
    refreshmastergains();
  }
  if (sabseqchanged(SAB_SEQ_VOICE_CFG)) {
    readvoicecfgsab();
  }
  if (sabseqchanged(SAB_SEQ_OSC_CFG)) {
    readosccfgsab();
  }
  if (sabseqchanged(SAB_SEQ_ALGO_CFG)) {
    readalgocfgsab();
  }
  if (sabseqchanged(SAB_SEQ_VIBRATO)) {
    readvibratosab();
  }
  if (fxchanged || anyplayvibratosend()) {
    updateplayvibratodepth();
  }
}

function readsynthcontrolsifdue() {
  if (playsampletick === 0) {
    readsynthcontrolblock();
    playsampletick = 1;
    return;
  }
  playsampletick++;
  if (playsampletick < WASM_BLOCK_SIZE) {
    return;
  }
  playsampletick = 0;
  readsynthcontrolblock();
}

function voiceout(i) {
  var freq = freqs[i];
  var gate = gates[i];
  var type = types[i];
  var algo = algos[i];
  var out = 0;

  if (type === 0) { out = synthvoice(i, freq, gate); }
  else if ((type >= 1 && type <= 4) || type === 8 || type === 9) {
    out = noisevoice(i, type, freq, gate);
  }
  else if (type === 5) { out = bellsvoice(i, freq, gate); }
  else if (type === 6) { out = dootvoice(i, freq, gate); }
  else if (type === 7) { out = algovoice(i, freq, gate, algo); }
  else { out = synthvoice(i, freq, gate); }

  return out * voicevolumegain(i);
}

function touchactivevoicemask(i) {
  if (gates[i]) {
    activevoicemask |= 1 << i;
    return;
  }
  if (voiceissilent(i)) {
    activevoicemask &= ~(1 << i);
  } else {
    activevoicemask |= 1 << i;
  }
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
    detunemuls[i] = Math.pow(2, detunes[i] / 1200);
    osctypes[i] = Math.round(raw[base + 5]);
    if (gates[i]) {
      activevoicemask |= 1 << i;
    }
  }
}

function play(inputsample) {
  readsynthcontrolsifdue();
  playsampleclock++;

  var play0 = 0;
  var play1 = 0;
  var bgvoices = 0;
  for (var i = 0; i < VOICE_COUNT; i++) {
    if (!(activevoicemask & (1 << i))) {
      continue;
    }
    touchactivevoicemask(i);
    if (!(activevoicemask & (1 << i))) {
      continue;
    }
    var out = voiceout(i);
    if (i < 2) {
      play0 += out;
    } else if (i < PLAY_VOICE_COUNT) {
      play1 += out;
    } else {
      bgvoices += out;
    }
  }
  var drums = safedrumsout();
  var play0fx = applyfxgroup(play0, 0);
  var play1fx = applyfxgroup(play1, 1);
  var bgfx = applyfxgroup(bgvoices, 2);
  var ttsraw = 0;
  if (typeof inputsample === 'number' && inputsample === inputsample) {
    ttsraw = inputsample;
  }
  var ttsfx = applyfxgroup(ttsraw, 3);
  return masterout(play0fx + play1fx, bgfx, drums, ttsraw, ttsfx);
}

function safedrumsout() {
  try {
    return drumsout();
  } catch (err) {
    return 0;
  }
}
`
