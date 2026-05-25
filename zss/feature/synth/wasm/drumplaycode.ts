import { WASM_DRUM_BUS_GAIN } from './wasmlevels'

/** Phase 2: Tone.js kit port — see zss/feature/synth/drums/*.ts */
export const WASM_DRUM_PLAY_CODE = `
var DRUM_COUNT = 10;
var DRUM_SR = 48000;
var DRUM_BUS_GAIN = ${WASM_DRUM_BUS_GAIN};
var drumtriggers = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var drumprev = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var drumremain = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var drumhpprev = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var drumhpstate = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var drumeqst = [];
var drumbpst = [];
var drumsready = false;
var drumnoise = null;
var drumoscA = [];
var drumoscB = [];

var DRUM_C4 = 261.63;
var DRUM_C5 = 523.25;
var DRUM_C0 = 16.35;
var DRUM_C1 = 32.7;
var DRUM_BASS_ROOT = 26.5;
var DRUM_QUARTER = 0.5;

function drumsamp(sec) {
  return Math.max(1, Math.round(sec * DRUM_SR));
}

var DRUM_TICK_LEN = drumsamp(0.001 + 0.05 + 0.05);
var DRUM_TWEET_LEN = drumsamp(0.001 + 0.16 + 0.18);
var DRUM_COWBELL_LEN = drumsamp(0.001 + 0.01 + 0.1 + 0.12 + 0.2);
var DRUM_CLAP_LEN = drumsamp(0.01 + 0.1 + 0.1 + 0.1);
var DRUM_SNARE_LEN = drumsamp(0.1 + 0.055);
var DRUM_WOOD_LEN = drumsamp(0.001 + 0.1 + 0.08);
var DRUM_TOM_LEN = drumsamp(0.01 + 0.1 + 0.08);
var DRUM_BASS_LEN = drumsamp(0.001 + 0.35 + drumnotelen(8));
var DRUM_LENGTHS = [
  DRUM_TICK_LEN,
  DRUM_TWEET_LEN,
  DRUM_COWBELL_LEN,
  DRUM_CLAP_LEN,
  DRUM_SNARE_LEN,
  DRUM_WOOD_LEN,
  DRUM_SNARE_LEN,
  DRUM_TOM_LEN,
  DRUM_WOOD_LEN,
  DRUM_BASS_LEN
];

function ensuredrums() {
  if (drumsready) {
    return;
  }
  drumsready = true;
  drumnoise = new Maximilian.maxiOsc();
  for (var di = 0; di < DRUM_COUNT; di++) {
    drumoscA.push(new Maximilian.maxiOsc());
    drumoscB.push(new Maximilian.maxiOsc());
  }
}

function drumlength(i) {
  return DRUM_LENGTHS[i] || DRUM_SNARE_LEN;
}

function drumfilterzero() {
  return { x1: 0, x2: 0, y1: 0, y2: 0 };
}

function drumfilterreset(st) {
  st.x1 = 0;
  st.x2 = 0;
  st.y1 = 0;
  st.y2 = 0;
}

function drumeqstatefor(i) {
  if (!drumeqst[i]) {
    drumeqst[i] = [drumfilterzero(), drumfilterzero(), drumfilterzero()];
  }
  return drumeqst[i];
}

function drumbpstatefor(i) {
  if (!drumbpst[i]) {
    drumbpst[i] = drumfilterzero();
  }
  return drumbpst[i];
}

function retriggerdrum(i) {
  drumremain[i] = drumlength(i);
  drumhpprev[i] = 0;
  drumhpstate[i] = 0;
  if (drumeqst[i]) {
    drumfilterreset(drumeqst[i][0]);
    drumfilterreset(drumeqst[i][1]);
    drumfilterreset(drumeqst[i][2]);
  }
  if (drumbpst[i]) {
    drumfilterreset(drumbpst[i]);
  }
}

function readdrumsab() {
  var raw = qref.zssDrumSab;
  if (!raw && qref.engine) {
    raw = qref.engine.zssDrumSab;
  }
  if (!raw || typeof raw.length !== 'number' || raw.length < DRUM_COUNT) {
    return;
  }
  for (var i = 0; i < DRUM_COUNT; i++) {
    drumtriggers[i] = Math.round(raw[i]);
    if (drumtriggers[i] > drumprev[i]) {
      drumprev[i] = drumtriggers[i];
      retriggerdrum(i);
    } else {
      drumprev[i] = drumtriggers[i];
    }
  }
}

function safedrum(fn) {
  try {
    return fn();
  } catch (err) {
    return 0;
  }
}

function drumactive() {
  for (var i = 0; i < DRUM_COUNT; i++) {
    if (drumremain[i] > 0) {
      return true;
    }
  }
  return false;
}

function drumadvance(i) {
  var remain = drumremain[i];
  if (remain <= 0) {
    return -1;
  }
  var age = drumlength(i) - remain;
  drumremain[i] = remain - 1;
  return age;
}

function adsr(age, atk, dec, sus, rel) {
  if (age < atk) {
    return age / atk;
  }
  age -= atk;
  if (age < dec) {
    return 1 - (age / dec) * (1 - sus);
  }
  age -= dec;
  if (age < rel) {
    return sus * (1 - age / rel);
  }
  return 0;
}

function expramp(age, dur, start, end) {
  if (dur <= 0) {
    return end;
  }
  var t = Math.min(1, age / dur);
  if (start <= 0 || end <= 0) {
    return start + (end - start) * t;
  }
  return start * Math.pow(end / start, t);
}

function expexp(age, dur) {
  if (dur <= 0) {
    return 0;
  }
  var t = Math.min(1, age / dur);
  return Math.pow(0.001, t);
}

function drumdistort(x, amt) {
  var k = 1 + amt * 12;
  return Math.tanh(x * k) / Math.tanh(k);
}

function drumhipass(i, input, cutoff) {
  var previn = drumhpprev[i];
  var state = drumhpstate[i];
  var rc = 1 / (6.28318530718 * cutoff);
  var dt = 1 / DRUM_SR;
  var alpha = rc / (rc + dt);
  var hp = alpha * (state + input - previn);
  drumhpprev[i] = input;
  drumhpstate[i] = hp;
  return hp;
}

function drumbiquadrun(st, c, x) {
  var y = c.b0 * x + c.b1 * st.x1 + c.b2 * st.x2 - c.a1 * st.y1 - c.a2 * st.y2;
  st.x2 = st.x1;
  st.x1 = x;
  st.y2 = st.y1;
  st.y1 = y;
  return y;
}

function drumbiquadcoef(type, freq, q, gaindb) {
  var w0 = 6.28318530718 * freq / DRUM_SR;
  var cosw0 = Math.cos(w0);
  var sinw0 = Math.sin(w0);
  var alpha = sinw0 / (2 * q);
  var b0 = 0;
  var b1 = 0;
  var b2 = 0;
  var a0 = 1;
  var a1 = 0;
  var a2 = 0;
  if (type === 'lowshelf') {
    var al = Math.pow(10, gaindb / 40);
    var sq = 2 * Math.sqrt(al) * alpha;
    var ap1 = al + 1;
    var am1 = al - 1;
    b0 = al * (ap1 - am1 * cosw0 + sq);
    b1 = 2 * al * (am1 - ap1 * cosw0);
    b2 = al * (ap1 - am1 * cosw0 - sq);
    a0 = ap1 + am1 * cosw0 + sq;
    a1 = -2 * (am1 + ap1 * cosw0);
    a2 = ap1 + am1 * cosw0 - sq;
  } else if (type === 'highshelf') {
    var ah = Math.pow(10, gaindb / 40);
    var sqh = 2 * Math.sqrt(ah) * alpha;
    var hp1 = ah + 1;
    var hm1 = ah - 1;
    b0 = ah * (hp1 + hm1 * cosw0 + sqh);
    b1 = -2 * ah * (hm1 + hp1 * cosw0);
    b2 = ah * (hp1 + hm1 * cosw0 - sqh);
    a0 = hp1 - hm1 * cosw0 + sqh;
    a1 = 2 * (hm1 - hp1 * cosw0);
    a2 = hp1 - hm1 * cosw0 - sqh;
  } else if (type === 'peaking') {
    var ap = Math.pow(10, gaindb / 40);
    b0 = 1 + alpha * ap;
    b1 = -2 * cosw0;
    b2 = 1 - alpha * ap;
    a0 = 1 + alpha / ap;
    a1 = -2 * cosw0;
    a2 = 1 - alpha / ap;
  } else if (type === 'bandpass') {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
    a0 = 1 + alpha;
    a1 = -2 * cosw0;
    a2 = 1 - alpha;
  }
  var inv = 1 / a0;
  return {
    b0: b0 * inv,
    b1: b1 * inv,
    b2: b2 * inv,
    a1: a1 * inv,
    a2: a2 * inv
  };
}

function drumeq3(i, input, lowc, midc, highc) {
  var st = drumeqstatefor(i);
  var x = drumbiquadrun(st[0], lowc, input);
  x = drumbiquadrun(st[1], midc, x);
  return drumbiquadrun(st[2], highc, x);
}

function drumbandpass(i, input, coef) {
  return drumbiquadrun(drumbpstatefor(i), coef, input);
}

var DRUM_EQ_LOW_HZ = 400;
var DRUM_EQ_MID_HZ = 1000;
var DRUM_EQ_HIGH_HZ = 2500;
var DRUM_EQ_TICK_LOW = drumbiquadcoef('lowshelf', DRUM_EQ_LOW_HZ, 0.707, -6);
var DRUM_EQ_TICK_MID = drumbiquadcoef('peaking', DRUM_EQ_MID_HZ, 1, 6);
var DRUM_EQ_TICK_HIGH = drumbiquadcoef('highshelf', DRUM_EQ_HIGH_HZ, 0.707, 10);
var DRUM_EQ_TWEET_LOW = drumbiquadcoef('lowshelf', DRUM_EQ_LOW_HZ, 0.707, -6);
var DRUM_EQ_TWEET_MID = drumbiquadcoef('peaking', DRUM_EQ_MID_HZ, 1, 3);
var DRUM_EQ_TWEET_HIGH = drumbiquadcoef('highshelf', DRUM_EQ_HIGH_HZ, 0.707, 8);
var DRUM_EQ_CLAP_LOW = drumbiquadcoef('lowshelf', DRUM_EQ_LOW_HZ, 0.707, -10);
var DRUM_EQ_CLAP_MID = drumbiquadcoef('peaking', DRUM_EQ_MID_HZ, 1, 10);
var DRUM_EQ_CLAP_HIGH = drumbiquadcoef('highshelf', DRUM_EQ_HIGH_HZ, 0.707, -1);
var DRUM_COWBELL_BP = drumbiquadcoef('bandpass', 350, 1, 0);
var DRUM_WOOD_BP = drumbiquadcoef('bandpass', 256, 0.17, 0);

function drumnotelen(n) {
  return (DRUM_QUARTER * 4) / n;
}

function tickenv(age) {
  return adsr(
    age,
    drumsamp(0.001),
    drumsamp(0.05),
    0.001,
    drumsamp(0.05)
  );
}

function tweetenv(age) {
  return adsr(
    age,
    drumsamp(0.001),
    drumsamp(0.16),
    0.06,
    drumsamp(0.18)
  );
}

function cowbellsynthenv(age) {
  return adsr(
    age,
    drumsamp(0.001),
    drumsamp(0.01),
    0.1,
    drumsamp(0.1)
  );
}

function cowbellgainenv(age) {
  var dur = drumsamp(0.35);
  return 0.5 * Math.pow(0.02, Math.min(1, age / dur));
}

function cowbellamp(age) {
  return cowbellsynthenv(age) * cowbellgainenv(age);
}

function clapenv(age) {
  return adsr(
    age,
    drumsamp(0.01),
    drumsamp(0.1),
    0.1,
    drumsamp(0.1)
  );
}

function snareoscenv(age) {
  var dec = drumsamp(0.1);
  if (age >= dec) {
    return 0;
  }
  return 1 - age / dec;
}

function snarenoiseenv(age) {
  var atk = drumsamp(0.01);
  if (age < atk) {
    return age / atk;
  }
  return expexp(age - atk, drumsamp(drumnotelen(32)));
}

function woodenv(age) {
  return adsr(
    age,
    drumsamp(0.001),
    drumsamp(0.1),
    0.001,
    drumsamp(0.08)
  );
}

function tomoscenv(age) {
  return adsr(
    age,
    drumsamp(0.01),
    drumsamp(0.1),
    0.001,
    drumsamp(0.1)
  );
}

function bassenv(age) {
  return adsr(
    age,
    drumsamp(0.001),
    drumsamp(0.35),
    0.08,
    drumsamp(drumnotelen(8))
  );
}

function snarepitch(hi, age) {
  var ramp1 = drumsamp(drumnotelen(512));
  var ramp2 = drumsamp(drumnotelen(32));
  var start = 10000;
  var mid = hi ? 300 : 150;
  var end = 100;
  if (age < ramp1) {
    return expramp(age, ramp1, start, mid);
  }
  if (age < ramp2) {
    return expramp(age - ramp1, ramp2 - ramp1, mid, end);
  }
  return end;
}

function drumtick() {
  var age = drumadvance(0);
  if (age < 0) {
    return 0;
  }
  var amp = tickenv(age);
  if (amp <= 0) {
    return 0;
  }
  var raw = drumnoise.noise() * amp;
  var n = drumhipass(0, raw, 8000);
  n = drumeq3(0, n, DRUM_EQ_TICK_LOW, DRUM_EQ_TICK_MID, DRUM_EQ_TICK_HIGH);
  return n * 1.22 * 0.22;
}

function drumtweet() {
  var age = drumadvance(1);
  if (age < 0) {
    return 0;
  }
  var amp = tweetenv(age);
  if (amp <= 0) {
    return 0;
  }
  var raw = drumnoise.noise() * amp;
  var n = drumhipass(1, raw, 6000);
  n = drumeq3(1, n, DRUM_EQ_TWEET_LOW, DRUM_EQ_TWEET_MID, DRUM_EQ_TWEET_HIGH);
  return n * 1.1 * 0.2;
}

function drumcowbell() {
  var age = drumadvance(2);
  if (age < 0) {
    return 0;
  }
  var amp = cowbellamp(age);
  if (amp <= 0) {
    return 0;
  }
  var sig = drumoscA[2].square(800) + drumoscB[2].square(540);
  sig = sig * 0.35 * amp;
  sig = drumdistort(sig, 0.08);
  sig = drumbandpass(2, sig, DRUM_COWBELL_BP);
  return sig * 0.42;
}

function drumclap() {
  var age = drumadvance(3);
  if (age < 0) {
    return 0;
  }
  var amp = clapenv(age);
  if (amp <= 0) {
    return 0;
  }
  var raw = drumnoise.noise() * amp;
  var n = drumhipass(3, raw, 800);
  n = drumeq3(3, n, DRUM_EQ_CLAP_LOW, DRUM_EQ_CLAP_MID, DRUM_EQ_CLAP_HIGH);
  var dry = raw * 0.35;
  return (n * 1.1 + dry) * 0.28;
}

function drumsnare(hi) {
  var idx = hi ? 4 : 6;
  var age = drumadvance(idx);
  if (age < 0) {
    return 0;
  }
  var oscamp = snareoscenv(age);
  var noiseamp = snarenoiseenv(age);
  if (oscamp <= 0 && noiseamp <= 0) {
    return 0;
  }
  var hz = snarepitch(hi, age);
  var body = drumoscA[idx].triangle(hz) * oscamp;
  var nraw = drumnoise.noise() * noiseamp;
  var n = drumhipass(idx, nraw, 10000);
  var mix = body + n * (hi ? 0.333 : 0.25);
  return drumdistort(mix, hi ? 0.666 : 0.876) * 0.28;
}

function drumwoodblock(hi) {
  var idx = hi ? 5 : 8;
  var age = drumadvance(idx);
  if (age < 0) {
    return 0;
  }
  var amp = woodenv(age);
  if (amp <= 0) {
    return 0;
  }
  var clackend = hi ? 1000 : 100;
  var donkend = hi ? 888 : 399;
  var clackstart = 2000;
  var donkstart = hi ? 999 : 699;
  var clackhz = expramp(age, drumsamp(drumnotelen(32)), clackstart, clackend);
  var donkhz = expramp(age, drumsamp(drumnotelen(256)), donkstart, donkend);
  var clack = drumoscA[idx].saw(clackhz);
  var donk = drumoscB[idx].sinewave(donkhz);
  var sig = (clack + donk) * amp;
  sig = drumbandpass(idx, sig, DRUM_WOOD_BP);
  return sig * 0.24;
}

function drumtom() {
  var age = drumadvance(7);
  if (age < 0) {
    return 0;
  }
  var amp = tomoscenv(age);
  var namp = snarenoiseenv(age);
  if (amp <= 0 && namp <= 0) {
    return 0;
  }
  var margin = drumsamp(drumnotelen(256));
  var ramp = Math.max(1, DRUM_TOM_LEN - margin);
  var hz = expramp(age, ramp, DRUM_C4, DRUM_C0);
  var hz2 = expramp(age, ramp, DRUM_C5, DRUM_C0);
  var body = drumoscA[7].saw(hz) + drumoscB[7].triangle(hz2) * 0.5;
  var n = drumnoise.noise() * namp * 0.12;
  return (body * amp + n) * 0.26;
}

function drumbass() {
  var age = drumadvance(9);
  if (age < 0) {
    return 0;
  }
  var amp = bassenv(age);
  if (amp <= 0) {
    return 0;
  }
  var hz = DRUM_BASS_ROOT * Math.pow(0.01, age / drumsamp(0.125));
  var fund = drumoscA[9].sinewave(hz);
  var oct = drumoscB[9].sinewave(hz * 2) * 0.42;
  var sub = drumoscA[9].sinewave(hz * 0.5) * 0.55;
  var body = fund + oct + sub;
  return drumdistort(body, 0.22) * amp * 0.78;
}

function drumsout() {
  readdrumsab();
  if (!drumactive()) {
    return 0;
  }
  ensuredrums();
  var sum = 0;
  sum += safedrum(drumtick);
  sum += safedrum(drumtweet);
  sum += safedrum(drumcowbell);
  sum += safedrum(drumclap);
  sum += safedrum(function() { return drumsnare(true); });
  sum += safedrum(function() { return drumwoodblock(true); });
  sum += safedrum(function() { return drumsnare(false); });
  sum += safedrum(drumtom);
  sum += safedrum(function() { return drumwoodblock(false); });
  sum += safedrum(drumbass);
  return sum * DRUM_BUS_GAIN;
}
`
