/**
 * ZSS DaisySP synth — see zss/README.md for module map.
 */
#ifdef __arm__
#undef __arm__
#endif

#include "zss_internal.h"

namespace zss_daisy {

// --- Voice dispatch: 4-op algo, LFSR/soft noise (processvoice lives in
// zss_engine.cpp) ---

float algovoice(ZssVoice& v, int vi, float freq, bool gate, int algo,
                float vfreq[kVibratoGroups]) {
  AlgoCfg cfg = readalgocfg(vi);
  float hz = glidefreq(v, vi, freq > 0.f ? freq : 440.f, kAlgoSynth,
                       readctrl(off_voicecfg() + vi * kVoiceCfgStride + 4));
  float h1 = cfg.h1 > 0.f ? cfg.h1 : 2.f;
  float h2 = cfg.h2 > 0.f ? cfg.h2 : 2.f;
  float h3 = cfg.h3 > 0.f ? cfg.h3 : 2.f;
  float mi1 = cfg.mi1 > 0.f ? cfg.mi1 : 1.f;
  float mi2 = cfg.mi2 > 0.f ? cfg.mi2 : 1.f;
  float mi3 = cfg.mi3 > 0.f ? cfg.mi3 : 1.f;

  for (int oi = 0; oi < 4; ++oi) {
    if (v.algoenvprev_a[oi] != cfg.env_a[oi] ||
        v.algoenvprev_d[oi] != cfg.env_d[oi] ||
        v.algoenvprev_s[oi] != cfg.env_s[oi] ||
        v.algoenvprev_r[oi] != cfg.env_r[oi]) {
      v.algoenvs[oi].SetTime(ADSR_SEG_ATTACK, std::max(0.001f, cfg.env_a[oi]));
      v.algoenvs[oi].SetTime(ADSR_SEG_DECAY, std::max(0.001f, cfg.env_d[oi]));
      v.algoenvs[oi].SetSustainLevel(clampf(cfg.env_s[oi], 0.f, 1.f));
      v.algoenvs[oi].SetTime(ADSR_SEG_RELEASE, std::max(0.001f, cfg.env_r[oi]));
      v.algoenvprev_a[oi] = cfg.env_a[oi];
      v.algoenvprev_d[oi] = cfg.env_d[oi];
      v.algoenvprev_s[oi] = cfg.env_s[oi];
      v.algoenvprev_r[oi] = cfg.env_r[oi];
    }
  }

  float e0 = v.algoenvs[0].Process(gate);
  float e1 = v.algoenvs[1].Process(gate);
  float e2 = v.algoenvs[2].Process(gate);
  float e3 = v.algoenvs[3].Process(gate);

  // Single Process() per operator per sample (serial FM dependency order).
  float raw1 = algopwave(v.algoops[0], cfg.osctype[0], hz * h1) * kAlgoOpGain;
  float op1 = raw1 * e0;
  float op2 = 0.f;
  float op3 = 0.f;
  float op4 = 0.f;

  if (algo == 0) {
    float raw2 = algopwave(v.algoops[1], cfg.osctype[1], hz * h2 + raw1 * mi1) *
                 kAlgoOpGain;
    op2 = raw2 * e1;
    float raw3 = algopwave(v.algoops[2], cfg.osctype[2], hz * h3 + raw2 * mi2) *
                 kAlgoOpGain;
    op3 = raw3 * e2;
    float raw4 =
        algopwave(v.algoops[3], cfg.osctype[3], hz + raw3 * mi3) * kAlgoOpGain;
    op4 = raw4 * e3;
  } else if (algo == 1) {
    float raw2 = algopwave(v.algoops[1], cfg.osctype[1], hz * h2) * kAlgoOpGain;
    op2 = raw2 * e1;
    float raw3 = algopwave(v.algoops[2], cfg.osctype[2],
                           hz * h3 + (raw1 + raw2) * mi2 * 0.5f) *
                 kAlgoOpGain;
    op3 = raw3 * e2;
    float raw4 =
        algopwave(v.algoops[3], cfg.osctype[3], hz + raw3 * mi3) * kAlgoOpGain;
    op4 = raw4 * e3;
  } else if (algo == 2) {
    float raw2 = algopwave(v.algoops[1], cfg.osctype[1], hz * h2) * kAlgoOpGain;
    op2 = raw2 * e1;
    float raw3 = algopwave(v.algoops[2], cfg.osctype[2], hz * h3 + raw2 * mi2) *
                 kAlgoOpGain;
    op3 = raw3 * e2;
    float raw4 = algopwave(v.algoops[3], cfg.osctype[3],
                           hz + (raw1 + raw3) * mi3 * 0.5f) *
                 kAlgoOpGain;
    op4 = raw4 * e3;
  } else if (algo == 3) {
    float raw2 = algopwave(v.algoops[1], cfg.osctype[1], hz * h2) * kAlgoOpGain;
    op2 = raw2 * e1;
    float raw3 = algopwave(v.algoops[2], cfg.osctype[2], hz * h3) * kAlgoOpGain;
    op3 = raw3 * e2;
    float raw4 = algopwave(v.algoops[3], cfg.osctype[3],
                           hz + (raw1 + raw2 + raw3) * mi3 * 0.33f) *
                 kAlgoOpGain;
    op4 = raw4 * e3;
  } else if (algo == 4) {
    // 1→2, 3→4 → op2 + op4
    float raw2 = algopwave(v.algoops[1], cfg.osctype[1], hz * h2 + raw1 * mi1) *
                 kAlgoOpGain;
    op2 = raw2 * e1;
    float raw3 = algopwave(v.algoops[2], cfg.osctype[2], hz * h3) * kAlgoOpGain;
    op3 = raw3 * e2;
    float raw4 =
        algopwave(v.algoops[3], cfg.osctype[3], hz + raw3 * mi3) * kAlgoOpGain;
    op4 = raw4 * e3;
  } else if (algo == 5) {
    float raw2 = algopwave(v.algoops[1], cfg.osctype[1], hz * h2 + raw1 * mi1) *
                 kAlgoOpGain;
    op2 = raw2 * e1;
    float raw3 = algopwave(v.algoops[2], cfg.osctype[2], hz * h3 + raw1 * mi2) *
                 kAlgoOpGain;
    op3 = raw3 * e2;
    float raw4 =
        algopwave(v.algoops[3], cfg.osctype[3], hz + raw1 * mi3) * kAlgoOpGain;
    op4 = raw4 * e3;
  } else if (algo == 6) {
    float raw2 = algopwave(v.algoops[1], cfg.osctype[1], hz * h2 + raw1 * mi1) *
                 kAlgoOpGain;
    op2 = raw2 * e1;
  } else {
    // algo 7 — additive
    float raw2 = algopwave(v.algoops[1], cfg.osctype[1], hz * h2) * kAlgoOpGain;
    op2 = raw2 * e1;
    float raw3 = algopwave(v.algoops[2], cfg.osctype[2], hz * h3) * kAlgoOpGain;
    op3 = raw3 * e2;
    float raw4 = algopwave(v.algoops[3], cfg.osctype[3], hz) * kAlgoOpGain;
    op4 = raw4 * e3;
  }

  float out = op4;
  if (algo == 4) {
    out = op2 + op4;
  } else if (algo == 5) {
    out = (op2 + op3 + op4) * (1.f / 3.f);
  } else if (algo == 6) {
    out = op2;
  } else if (algo == 7) {
    out = (op1 + op2 + op3 + op4) * 0.25f;
  }
  return out * v.algooutenv.Process(gate) * kAlgoOutGain;
}

float noisevoice(ZssVoice& v, int vi, int noisetype, float freq, bool gate,
                 float envout) {
  NoiseMeta meta = noisemetafor(noisetype);
  const float* buf = noiseforvoice(noisetype);
  int count = meta.issoft ? kNoiseSoftCount : kNoiseLfsrCount;
  int mask = count - 1;

  if (gate && !v.noiseprev) {
    if (v.noisephase == 0.f) {
      float rnd = 0.f;
      v.noiserng = noiseprngnext(v.noiserng + vi * 7919u, &rnd);
      v.noisephase = (0.5f + rnd * 0.5f) * count;
    }
    v.noisesample = 0.f;
  }
  v.noiseprev = gate;
  if (!gate && envout < 0.00005f) {
    v.noisephase = 0.f;
    v.noisesample = 0.f;
    return 0.f;
  }

  float hz = freq > 0.f ? freq : 440.f;
  float phasedelta = hz / g_engine.sample_rate;
  float pitchfilter = std::min(1.f, phasedelta * meta.pitchfiltermult);
  float notepitch = 69.f + 12.f * (std::log(hz / 440.f) / std::log(2.f));
  float pitchdamping = meta.issoft ? 24.f : 60.f;
  float pitchmul = std::pow(2.f, -(notepitch - meta.basepitch) / pitchdamping);

  int idx = static_cast<int>(v.noisephase) & mask;
  float frac = v.noisephase - std::floor(v.noisephase);
  float wave = buf[idx] + (buf[idx + 1] - buf[idx]) * frac;
  float scale = noisetype == kMetallicNoise ? kMetallicNorm : 1.f;
  float soft = meta.issoft ? kNoiseSoftGain : 1.f;
  v.noisesample += (wave * scale - v.noisesample) * pitchfilter;
  if (gate) {
    v.noisephase += phasedelta;
    if (v.noisephase >= count) {
      v.noisephase -= count;
    }
  }
  float gain = pitchmul * meta.expression * kNoiseBaseExpr * kNoiseVoiceGain;
  float lfsrboost = meta.issoft ? 1.f : kLfsrVoiceBoost;
  return v.noisesample * gain * soft * envout * lfsrboost;
}
} // namespace zss_daisy
