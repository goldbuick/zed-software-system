import {
  WASM_FX_GROUP_COUNT,
  WASM_FX_PARAM_COUNT,
  WASM_FX_PARAM_OFFSET,
  WASM_FX_SEND_COUNT,
} from '../../backend/wasm/wasmfxstate'

const FX_GROUP_COUNT = WASM_FX_GROUP_COUNT

function fxgrouparray(name: string, init: string): string {
  const items = new Array(FX_GROUP_COUNT).fill(init).join(', ')
  return `var ${name} = [${items}];`
}

/** Per-bus FX chain (echo1–4 map to groups 0–3). */
export const WASM_FX_PLAY_CODE = `
var FX_GROUP_COUNT = ${FX_GROUP_COUNT};
var FX_SEND_COUNT = ${WASM_FX_SEND_COUNT};
var FX_PARAM_COUNT = ${WASM_FX_PARAM_COUNT};
var FX_PARAM_BASE = ${WASM_FX_PARAM_OFFSET};
var FX_SR = typeof sampleRate !== 'undefined' ? sampleRate : 48000;
var WASM_BLOCK_SIZE = 128;

${fxgrouparray('fxechodelay', 'new Maximilian.maxiDelayline()')}
${fxgrouparray('fxechofb', '0')}
${fxgrouparray('fxrevpredelay', 'new Maximilian.maxiDelayline()')}
${fxgrouparray('fxrevpredelayfb', '0')}
${fxgrouparray('fxrevcomb0', 'new Maximilian.maxiDelayline()')}
${fxgrouparray('fxrevcomb1', 'new Maximilian.maxiDelayline()')}
${fxgrouparray('fxrevcomb2', 'new Maximilian.maxiDelayline()')}
${fxgrouparray('fxrevcomb3', 'new Maximilian.maxiDelayline()')}
${fxgrouparray('fxrevcomb0fb', '0')}
${fxgrouparray('fxrevcomb1fb', '0')}
${fxgrouparray('fxrevcomb2fb', '0')}
${fxgrouparray('fxrevcomb3fb', '0')}
${fxgrouparray('fxfccounter', '0')}
${fxgrouparray('fxfcsample', '0')}
var fxvibratolfo = new Maximilian.maxiOsc();
var fxvibratodepth = 0;

function fxsecstosamples(sec) {
  if (sec <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(sec * FX_SR));
}

var FX_REV_COMB0_SAMPLES = fxsecstosamples(0.029);
var FX_REV_COMB1_SAMPLES = fxsecstosamples(0.037);
var FX_REV_COMB2_SAMPLES = fxsecstosamples(0.053);
var FX_REV_COMB3_SAMPLES = fxsecstosamples(0.067);

var fxsends = [];
var fxparams = [];
var fxechodelaysamples = [];
var fxechofeedbackcache = [];
var fxreverbdecaycache = [];
var fxreverbfbcache = [];
var fxrevpredelaysamples = [];
var fxfcrushratecache = [];
var fxdistortamtcache = [];

for (var gfx = 0; gfx < FX_GROUP_COUNT; gfx++) {
  var sg = [];
  for (var sfx = 0; sfx < FX_SEND_COUNT; sfx++) {
    sg.push(0);
  }
  fxsends.push(sg);
  var pg = [];
  for (var pfx = 0; pfx < FX_PARAM_COUNT; pfx++) {
    pg.push(0);
  }
  fxparams.push(pg);
  fxechodelaysamples.push(1);
  fxechofeedbackcache.push(0);
  fxreverbdecaycache.push(2.5);
  fxreverbfbcache.push(0.58);
  fxrevpredelaysamples.push(0);
  fxfcrushratecache.push(1);
  fxdistortamtcache.push(0.4);
}

function refreshfxderived(group) {
  var delaysec = fxparams[group][0];
  if (delaysec <= 0.0001) {
    delaysec = 0.22;
  }
  fxechodelaysamples[group] = fxsecstosamples(delaysec);
  var feedback = fxparams[group][1];
  if (feedback < 0) {
    feedback = 0;
  }
  if (feedback > 0.95) {
    feedback = 0.95;
  }
  fxechofeedbackcache[group] = feedback;
  var decay = fxparams[group][2];
  if (decay <= 0.05) {
    decay = 2.5;
  }
  fxreverbdecaycache[group] = decay;
  fxreverbfbcache[group] = fxreverbfeedback(decay);
  var predelaysec = fxparams[group][3];
  fxrevpredelaysamples[group] =
    predelaysec <= 0.0001 ? 0 : fxsecstosamples(predelaysec);
  var rate = fxparams[group][4];
  fxfcrushratecache[group] = rate <= 1 ? 1 : rate;
  var amt = fxparams[group][5];
  fxdistortamtcache[group] = amt <= 0 ? 0.4 : amt;
}

function refreshfxsends() {
  var raw = qref.zssFxSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssFxSab;
  }
  if (!raw || typeof raw.length !== 'number') {
    return;
  }
  for (var g = 0; g < FX_GROUP_COUNT; g++) {
    for (var s = 0; s < FX_SEND_COUNT; s++) {
      var sbase = g * FX_SEND_COUNT + s;
      var sval = sbase < raw.length ? raw[sbase] : 0;
      fxsends[g][s] = sval > 0 ? sval : 0;
    }
  }
}

function refreshfxparams() {
  var raw = qref.zssFxSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssFxSab;
  }
  if (!raw || typeof raw.length !== 'number') {
    return;
  }
  for (var g = 0; g < FX_GROUP_COUNT; g++) {
    for (var p = 0; p < FX_PARAM_COUNT; p++) {
      var pidx = FX_PARAM_BASE + g * FX_PARAM_COUNT + p;
      fxparams[g][p] = pidx < raw.length ? raw[pidx] : 0;
    }
    refreshfxderived(g);
  }
}

function refreshfxsnapshot() {
  refreshfxsends();
  refreshfxparams();
}

function fxgrouphasactivesends(group) {
  var sends = fxsends[group];
  for (var si = 0; si < FX_SEND_COUNT; si++) {
    if (sends[si] > 0.0001) {
      return true;
    }
  }
  return false;
}

function anyplayvibratosend() {
  for (var g = 0; g < 3; g++) {
    if (fxsends[g][4] > 0.0001) {
      return true;
    }
  }
  return false;
}

function fxsend(group, idx) {
  return fxsends[group][idx];
}

function fxparam(group, idx) {
  return fxparams[group][idx];
}

function applyfxgroup(sig, group) {
  if (!fxgrouphasactivesends(group)) {
    return sig;
  }
  var s0 = fxsend(group, 0);
  var s1 = fxsend(group, 1);
  var s2 = fxsend(group, 2);
  var s3 = fxsend(group, 3);
  var s5 = fxsend(group, 5);
  var s6 = fxsend(group, 6);
  var skipbiquad = WASM_PERF_MODE && group >= 2;
  var out = sig;
  if (s0 > 0) {
    var wet0 = fxfcrush(out, group);
    out = out + s0 * (wet0 - out);
  }
  if (s1 > 0) {
    var wet1 = fxecho(out, group);
    out = out + s1 * (wet1 - out);
  }
  if (s2 > 0) {
    var wet2 = fxreverb(out, group);
    out = out + s2 * (wet2 - out);
  }
  if (s3 > 0 && !skipbiquad) {
    var wet3 = fxautofilterbus(out, group);
    out = out + s3 * wet3;
  }
  if (s5 > 0) {
    var wet5 = fxdistortwet(out, group);
    out = out + s5 * (wet5 - out);
  }
  if (s6 > 0 && !skipbiquad) {
    var wet6 = fxautowahbus(out, group);
    out = out + s6 * wet6;
  }
  return out;
}

function fxfcrush(x, group) {
  var rate = fxfcrushratecache[group];
  fxfccounter[group]++;
  if (fxfccounter[group] >= rate) {
    fxfccounter[group] = 0;
    fxfcsample[group] = x;
  }
  return fxfcsample[group];
}

function fxecho(x, group) {
  var delaysamples = fxechodelaysamples[group];
  var feedback = fxechofeedbackcache[group];
  var input = x + fxechofb[group] * feedback;
  var wet = fxechodelay[group].dl(input, delaysamples, feedback);
  fxechofb[group] = wet;
  return wet;
}

function fxreverbfeedback(decay) {
  var t = decay;
  if (t < 0.2) {
    t = 0.2;
  }
  if (t > 12) {
    t = 12;
  }
  var fb = 0.58 + (1 - Math.exp(-t / 5.5)) * 0.14;
  if (fb > 0.72) {
    fb = 0.72;
  }
  return fb;
}

function fxreverbinput(x, group) {
  var pd = fxrevpredelaysamples[group];
  if (pd <= 0) {
    return x;
  }
  var pdin = x + fxrevpredelayfb[group] * 0.35;
  var pdout = fxrevpredelay[group].dl(pdin, pd, 0.35);
  fxrevpredelayfb[group] = pdout;
  return pdout;
}

function fxreverb(x, group) {
  var src = fxreverbinput(x, group);
  var fb = fxreverbfbcache[group];
  var regen = fb * 0.42;
  var in0 = src + fxrevcomb0fb[group] * regen;
  var in1 = src + fxrevcomb1fb[group] * regen;
  var c0 = fxrevcomb0[group].dl(in0, FX_REV_COMB0_SAMPLES, fb);
  var c1 = fxrevcomb1[group].dl(in1, FX_REV_COMB1_SAMPLES, fb);
  fxrevcomb0fb[group] = c0;
  fxrevcomb1fb[group] = c1;
  var wet;
  if (WASM_PERF_MODE) {
    wet = (c0 + c1) * 0.5;
  } else {
    var in2 = src + fxrevcomb2fb[group] * regen;
    var in3 = src + fxrevcomb3fb[group] * regen;
    var c2 = fxrevcomb2[group].dl(in2, FX_REV_COMB2_SAMPLES, fb);
    var c3 = fxrevcomb3[group].dl(in3, FX_REV_COMB3_SAMPLES, fb);
    fxrevcomb2fb[group] = c2;
    fxrevcomb3fb[group] = c3;
    wet = (c0 + c1 + c2 + c3) * 0.25;
  }
  return Math.tanh(wet * 1.6);
}

function tonedistort(x, amt) {
  var k = amt * 100;
  var deg = 0.01745329252;
  var ax = x < 0 ? -x : x;
  if (ax < 0.001) {
    return 0;
  }
  var sign = x < 0 ? -1 : 1;
  return sign * ((3 + k) * ax * 20 * deg) / (Math.PI + k * ax);
}

function fxdistort(x, group) {
  return tonedistort(x, fxdistortamtcache[group]);
}

function fxdistortwet(x, group) {
  return tonedistort(x * 3, fxdistortamtcache[group]);
}

function voicefxgroup(voicei) {
  if (voicei < 2) {
    return 0;
  }
  if (voicei < PLAY_VOICE_COUNT) {
    return 1;
  }
  return 2;
}

function updateplayvibratodepth() {
  if (!anyplayvibratosend()) {
    if (fxvibratodepth > 0.0001) {
      fxvibratodepth += (0 - fxvibratodepth) * 0.001;
    }
    return;
  }
  var t = playtimesec();
  var target = 0;
  for (var g = 0; g < 3; g++) {
    if (fxsends[g][4] <= 0) {
      continue;
    }
    var start = g < 2 ? g * 2 : PLAY_VOICE_COUNT;
    var end = g < 2 ? start + 2 : VOICE_COUNT;
    var gated = 0;
    for (var i = start; i < end; i++) {
      if (gates[i]) {
        gated = 1;
        break;
      }
    }
    if (!gated) {
      continue;
    }
    var depth = vibratodepthat(g, t);
    if (depth > target) {
      target = depth;
    }
  }
  if (target <= 0.0001) {
    var sabdepth = 0;
    for (var g2 = 0; g2 < 3; g2++) {
      if (fxsends[g2][4] <= 0) {
        continue;
      }
      var depth2 = fxparams[g2][10];
      if (depth2 > sabdepth) {
        sabdepth = depth2;
      }
    }
    if (sabdepth > 0.0001) {
      target = sabdepth;
    } else {
      target = 0.5;
    }
  }
  if (target > fxvibratodepth) {
    fxvibratodepth += (target - fxvibratodepth) * 0.004;
  } else {
    fxvibratodepth += (target - fxvibratodepth) * 0.001;
  }
}

function playvibratocents(voicei) {
  var group = voicefxgroup(voicei);
  var send = fxsends[group][4];
  if (send <= 0 || !gates[voicei]) {
    return 0;
  }
  if (fxvibratodepth <= 0.0001) {
    return 0;
  }
  var freq = vibratofreqat(group, playtimesec());
  if (freq <= 0) {
    freq = fxparams[group][11];
  }
  if (freq <= 0) {
    freq = 5;
  }
  var maxdelay = fxparams[group][8];
  if (maxdelay <= 0) {
    maxdelay = 0.02;
  }
  var lfo = fxvibratolfo.sinewave(freq);
  return lfo * fxvibratodepth * maxdelay * 3500 * send;
}
`
