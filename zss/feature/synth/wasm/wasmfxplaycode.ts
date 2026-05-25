import {
  WASM_FX_PARAM_OFFSET,
  WASM_FX_SEND_COUNT,
} from './wasmfxstate'

/** Shared FX chain + per-group sends (Tone FXCHAIN + FX[0|1] send levels). */
export const WASM_FX_PLAY_CODE = `
var FX_SEND_COUNT = ${WASM_FX_SEND_COUNT};
var FX_PARAM_BASE = ${WASM_FX_PARAM_OFFSET};
var FX_SR = typeof sampleRate !== 'undefined' ? sampleRate : 48000;

var fxechodelay0 = new Maximilian.maxiDelayline();
var fxechodelay1 = new Maximilian.maxiDelayline();
var fxechofb0 = 0;
var fxechofb1 = 0;
var fxrevpredelay0 = new Maximilian.maxiDelayline();
var fxrevpredelay1 = new Maximilian.maxiDelayline();
var fxrevpredelayfb0 = 0;
var fxrevpredelayfb1 = 0;
var fxrevcomb00 = new Maximilian.maxiDelayline();
var fxrevcomb01 = new Maximilian.maxiDelayline();
var fxrevcomb02 = new Maximilian.maxiDelayline();
var fxrevcomb03 = new Maximilian.maxiDelayline();
var fxrevcomb10 = new Maximilian.maxiDelayline();
var fxrevcomb11 = new Maximilian.maxiDelayline();
var fxrevcomb12 = new Maximilian.maxiDelayline();
var fxrevcomb13 = new Maximilian.maxiDelayline();
var fxrevcomb0fb0 = 0;
var fxrevcomb1fb0 = 0;
var fxrevcomb2fb0 = 0;
var fxrevcomb3fb0 = 0;
var fxrevcomb0fb1 = 0;
var fxrevcomb1fb1 = 0;
var fxrevcomb2fb1 = 0;
var fxrevcomb3fb1 = 0;
var fxfccounter0 = 0;
var fxfccounter1 = 0;
var fxfcsample0 = 0;
var fxfcsample1 = 0;
var fxautofilter0 = new Maximilian.maxiFilter();
var fxautofilter1 = new Maximilian.maxiFilter();
var fxautofilterlfo = new Maximilian.maxiOsc();
var fxvibratolfo = new Maximilian.maxiOsc();
var fxvibratodepth = 0;
var playbuswahenv = 0;
var bgbuswahenv = 0;
var fxautowahbplow0 = drumfilterzero();
var fxautowahbphigh0 = drumfilterzero();
var fxautowahbplow1 = drumfilterzero();
var fxautowahbphigh1 = drumfilterzero();
var fxautowahsm0 = 0;
var fxautowahsm1 = 0;

function wahbiquadcoef(freq, q) {
  var w0 = 6.28318530718 * freq / FX_SR;
  var cosw0 = Math.cos(w0);
  var sinw0 = Math.sin(w0);
  var alpha = sinw0 / (2 * q);
  var b0 = alpha;
  var b1 = 0;
  var b2 = -alpha;
  var a0 = 1 + alpha;
  var a1 = -2 * cosw0;
  var a2 = 1 - alpha;
  var inv = 1 / a0;
  return {
    b0: b0 * inv,
    b1: b1 * inv,
    b2: b2 * inv,
    a1: a1 * inv,
    a2: a2 * inv
  };
}

function voicelevelat(i) {
  var type = types[i];
  if (type === 5) {
    return bellenvs[i].level;
  }
  if (type === 6) {
    return dootenvs[i].level;
  }
  if (type === 7) {
    return algoenvs[i][3].level;
  }
  return envs[i].level;
}

function fxautowahbus(x, group) {
  if (x !== x) {
    return 0;
  }
  var env = group > 0 ? bgbuswahenv : playbuswahenv;
  if (env <= 0) {
    if (group > 0) {
      fxautowahsm1 = 0;
    } else {
      fxautowahsm0 = 0;
    }
    return 0;
  }
  var sm = group > 0 ? fxautowahsm1 : fxautowahsm0;
  if (env > sm) {
    sm += (env - sm) * 0.08;
  } else {
    sm += (env - sm) * 0.005;
  }
  if (group > 0) {
    fxautowahsm1 = sm;
  } else {
    fxautowahsm0 = sm;
  }
  var sens = fxparam(9);
  if (sens <= 0) {
    sens = 0.5;
  }
  var lowhz = 200 + (1 - sens) * 220;
  var highhz = 1400 + sens * 3600;
  var lowcoef = wahbiquadcoef(lowhz, 0.55);
  var highcoef = wahbiquadcoef(highhz, 0.55);
  var lowst = group > 0 ? fxautowahbplow1 : fxautowahbplow0;
  var highst = group > 0 ? fxautowahbphigh1 : fxautowahbphigh0;
  var low = drumbiquadrun(lowst, lowcoef, x);
  var high = drumbiquadrun(highst, highcoef, x);
  if (low !== low || high !== high) {
    return 0;
  }
  var resonant = low * (1 - sm) + high * sm;
  var boost = 16 + sens * 18;
  var wahout = x + resonant * boost;
  return wahout - x;
}

function fxsecstosamples(sec) {
  if (sec <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(sec * FX_SR));
}

function readfxsab() {
  var raw = qref.zssFxSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssFxSab;
  }
  return raw;
}

function fxsend(group, idx) {
  var raw = readfxsab();
  if (!raw || typeof raw.length !== 'number') {
    return 0;
  }
  var base = group * FX_SEND_COUNT + idx;
  if (base >= raw.length) {
    return 0;
  }
  return raw[base] > 0 ? raw[base] : 0;
}

function fxparam(idx) {
  var raw = readfxsab();
  if (!raw || typeof raw.length !== 'number') {
    return 0;
  }
  var i = FX_PARAM_BASE + idx;
  if (i >= raw.length) {
    return 0;
  }
  return raw[i];
}

function addfxparallelwetplay(playin, sendidx, processor) {
  var send = fxsend(0, sendidx);
  if (send <= 0) {
    return 0;
  }
  return processor(playin, 0) * send;
}

function addfxparallelwetbg(bgin, sendidx, processor) {
  var send = fxsend(1, sendidx);
  if (send <= 0) {
    return 0;
  }
  return processor(bgin, 1) * send;
}

function addfxparallelwet(playin, bgin, sendidx, processor) {
  return addfxparallelwetplay(playin, sendidx, processor)
    + addfxparallelwetbg(bgin, sendidx, processor);
}

function fxfcrush(x, group) {
  var rate = fxparam(4);
  if (rate <= 1) {
    rate = 1;
  }
  if (group > 0) {
    fxfccounter1++;
    if (fxfccounter1 >= rate) {
      fxfccounter1 = 0;
      fxfcsample1 = x;
    }
    return fxfcsample1;
  }
  fxfccounter0++;
  if (fxfccounter0 >= rate) {
    fxfccounter0 = 0;
    fxfcsample0 = x;
  }
  return fxfcsample0;
}

function fxecho(x, group) {
  var delaysec = fxparam(0);
  if (delaysec <= 0.0001) {
    delaysec = 0.22;
  }
  var delaysamples = fxsecstosamples(delaysec);
  var feedback = fxparam(1);
  if (feedback < 0) {
    feedback = 0;
  }
  if (feedback > 0.95) {
    feedback = 0.95;
  }
  var line = group > 0 ? fxechodelay1 : fxechodelay0;
  var fb = group > 0 ? fxechofb1 : fxechofb0;
  var input = x + fb * feedback;
  var wet = line.dl(input, delaysamples, feedback);
  if (group > 0) {
    fxechofb1 = wet;
  } else {
    fxechofb0 = wet;
  }
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
  var predelaysec = fxparam(3);
  if (predelaysec <= 0.0001) {
    return x;
  }
  var pd = fxsecstosamples(predelaysec);
  var line = group > 0 ? fxrevpredelay1 : fxrevpredelay0;
  var pdfb = group > 0 ? fxrevpredelayfb1 : fxrevpredelayfb0;
  var pdin = x + pdfb * 0.35;
  var pdout = line.dl(pdin, pd, 0.35);
  if (group > 0) {
    fxrevpredelayfb1 = pdout;
  } else {
    fxrevpredelayfb0 = pdout;
  }
  return pdout;
}

function fxreverb(x, group) {
  var decay = fxparam(2);
  if (decay <= 0.05) {
    decay = 2.5;
  }
  var src = fxreverbinput(x, group);
  var fb = fxreverbfeedback(decay);
  var regen = fb * 0.42;
  var c0line = group > 0 ? fxrevcomb10 : fxrevcomb00;
  var c1line = group > 0 ? fxrevcomb11 : fxrevcomb01;
  var c2line = group > 0 ? fxrevcomb12 : fxrevcomb02;
  var c3line = group > 0 ? fxrevcomb13 : fxrevcomb03;
  var c0fb = group > 0 ? fxrevcomb0fb1 : fxrevcomb0fb0;
  var c1fb = group > 0 ? fxrevcomb1fb1 : fxrevcomb1fb0;
  var c2fb = group > 0 ? fxrevcomb2fb1 : fxrevcomb2fb0;
  var c3fb = group > 0 ? fxrevcomb3fb1 : fxrevcomb3fb0;
  var in0 = src + c0fb * regen;
  var in1 = src + c1fb * regen;
  var in2 = src + c2fb * regen;
  var in3 = src + c3fb * regen;
  var c0 = c0line.dl(in0, fxsecstosamples(0.029), fb);
  var c1 = c1line.dl(in1, fxsecstosamples(0.037), fb);
  var c2 = c2line.dl(in2, fxsecstosamples(0.053), fb);
  var c3 = c3line.dl(in3, fxsecstosamples(0.067), fb);
  if (group > 0) {
    fxrevcomb0fb1 = c0;
    fxrevcomb1fb1 = c1;
    fxrevcomb2fb1 = c2;
    fxrevcomb3fb1 = c3;
  } else {
    fxrevcomb0fb0 = c0;
    fxrevcomb1fb0 = c1;
    fxrevcomb2fb0 = c2;
    fxrevcomb3fb0 = c3;
  }
  var wet = (c0 + c1 + c2 + c3) * 0.25;
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
  var amt = fxparam(5);
  if (amt <= 0) {
    amt = 0.4;
  }
  return tonedistort(x, amt);
}

function fxdistortwet(x, group) {
  var amt = fxparam(5);
  if (amt <= 0) {
    amt = 0.4;
  }
  return tonedistort(x * 3, amt);
}

function fxautofilterfx(x, group) {
  var freq = fxparam(6);
  if (freq <= 0) {
    freq = 3;
  }
  var depth = fxparam(7);
  if (depth <= 0) {
    depth = 0.5;
  }
  var lfo = 0.5 + 0.5 * fxautofilterlfo.sinewave(freq);
  var cutoff = 220 * Math.pow(2, (lfo - 0.5) * depth * 5);
  if (cutoff < 80) {
    cutoff = 80;
  }
  if (cutoff > 12000) {
    cutoff = 12000;
  }
  var filt = group > 0 ? fxautofilter1 : fxautofilter0;
  var filtered = filt.lores(x, cutoff, 0.7);
  return (filtered - x) * 0.5;
}

function updateplayvibratodepth() {
  var sabdepth = fxparam(10);
  var active = 0;
  if (fxsend(0, 4) > 0) {
    for (var i = 0; i < PLAY_VOICE_COUNT; i++) {
      if (gates[i]) {
        active = 1;
      }
    }
  }
  if (fxsend(1, 4) > 0) {
    for (var j = PLAY_VOICE_COUNT; j < VOICE_COUNT; j++) {
      if (gates[j]) {
        active = 1;
      }
    }
  }
  var target = 0;
  if (active > 0) {
    target = sabdepth > 0.0001 ? sabdepth : 0.5;
  }
  if (target > fxvibratodepth) {
    fxvibratodepth += (target - fxvibratodepth) * 0.004;
  } else {
    fxvibratodepth += (target - fxvibratodepth) * 0.001;
  }
}

function playvibratocents(voicei) {
  var group = voicei >= PLAY_VOICE_COUNT ? 1 : 0;
  var send = fxsend(group, 4);
  if (send <= 0 || !gates[voicei]) {
    return 0;
  }
  if (fxvibratodepth <= 0.0001) {
    return 0;
  }
  var freq = fxparam(11);
  if (freq <= 0) {
    freq = 5;
  }
  var maxdelay = fxparam(8);
  if (maxdelay <= 0) {
    maxdelay = 0.02;
  }
  var lfo = fxvibratolfo.sinewave(freq);
  return lfo * fxvibratodepth * maxdelay * 3500 * send;
}

function applyfxchain(playin, bgin) {
  var wetplay = 0;
  var wetbg = 0;
  wetplay += addfxparallelwetplay(playin, 0, fxfcrush);
  wetbg += addfxparallelwetbg(bgin, 0, fxfcrush);
  wetplay += addfxparallelwetplay(playin, 1, fxecho);
  wetbg += addfxparallelwetbg(bgin, 1, fxecho);
  wetplay += addfxparallelwetplay(playin, 2, fxreverb);
  wetbg += addfxparallelwetbg(bgin, 2, fxreverb);
  wetplay += addfxparallelwetplay(playin, 3, fxautofilterfx);
  wetbg += addfxparallelwetbg(bgin, 3, fxautofilterfx);
  wetplay += addfxparallelwetplay(playin, 5, fxdistortwet);
  wetbg += addfxparallelwetbg(bgin, 5, fxdistortwet);
  wetplay += addfxparallelwetplay(playin, 6, fxautowahbus);
  wetbg += addfxparallelwetbg(bgin, 6, fxautowahbus);
  return [playin + wetplay, bgin + wetbg];
}
`
