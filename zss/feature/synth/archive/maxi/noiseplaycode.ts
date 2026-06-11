import { WASM_NOISE_META_CODE } from 'zss/feature/synth/backend/wasm/noisemeta'

/** BeepBox chip noiseSynth playback — per-sample in Maximilian play(). */
export const WASM_NOISE_PLAY_CODE = `
${WASM_NOISE_META_CODE}

var noisesample = [];
var noiserng = [];
var noisenotecount = [];

function noiseforvoice(noisetype) {
  return noiseready(noisetype);
}

function noiserandphase(i) {
  var state = noiserng[i] >>> 0;
  var out = noiseprngnext(state);
  noiserng[i] = out[0];
  return out[1];
}

function noisevoice(i, noisetype, freq, gate) {
  var meta = noisemetafor(noisetype);
  var buf = noiseforvoice(noisetype);
  var g = gate > 0.5 ? 1 : 0;
  var envout = envs[i].adsr(1, g);

  if (g && !noiseprev[i]) {
    noisenotecount[i]++;
    if (noisephase[i] === 0) {
      noisephase[i] = (0.5 + noiserandphase(i) * 0.5) * NOISE_COUNT;
    }
    noisesample[i] = 0;
  }
  noiseprev[i] = g;

  if (!g && envout < 0.00005) {
    noisephase[i] = 0;
    noisesample[i] = 0;
    return 0;
  }

  var sr = typeof sampleRate !== 'undefined' ? sampleRate : 44100;
  var hz = freq > 0 ? freq : 440;
  var phasedelta = hz / sr;
  var pitchfilter = Math.min(1.0, phasedelta * meta.pitchfiltermult);
  var notepitch = 69 + 12 * (Math.log(hz / 440) / Math.LN2);
  var pitchdamping = meta.issoft ? 24.0 : 60.0;
  var pitchmul = Math.pow(2.0, -(notepitch - meta.basepitch) / pitchdamping);
  var phase = noisephase[i];
  var idx = Math.floor(phase) & NOISE_MASK;
  var frac = phase - Math.floor(phase);
  var wavesample = buf[idx] + (buf[idx + 1] - buf[idx]) * frac;
  var wavescale = noisetype === 4 ? METALLIC_WAVE_NORM : 1;
  var softgain = meta.issoft ? WASM_NOISE_SOFT_GAIN : 1;
  noisesample[i] += ((wavesample * wavescale) - noisesample[i]) * pitchfilter;
  if (g) {
    noisephase[i] += phasedelta;
    if (noisephase[i] >= NOISE_COUNT) {
      noisephase[i] -= NOISE_COUNT;
    }
  }

  var gain = pitchmul * meta.expression * NOISE_BASE_EXPRESSION * WASM_NOISE_VOICE_GAIN;
  var lfsrboost = meta.issoft ? 1 : WASM_LFSR_VOICE_BOOST;
  return noisesample[i] * gain * softgain * envout * lfsrboost;
}
`
