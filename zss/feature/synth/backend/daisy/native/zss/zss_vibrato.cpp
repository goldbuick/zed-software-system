/**
 * ZSS DaisySP synth — see zss/README.md for module map.
 */
#ifdef __arm__
#undef __arm__
#endif

#include "zss_internal.h"

namespace zss_daisy {

void readvibratosab(float* epoch, float start[kVibratoGroups],
                    float end[kVibratoGroups], float peak[kVibratoGroups],
                    float freq[kVibratoGroups]) {
  const int b = off_vibrato();
  *epoch = readctrl(b);
  for (int g = 0; g < kVibratoGroups; ++g) {
    start[g] = readctrl(b + 1 + g * kVibratoStride);
    end[g] = readctrl(b + 2 + g * kVibratoStride);
    peak[g] = readctrl(b + 3 + g * kVibratoStride);
    freq[g] = readctrl(b + 4 + g * kVibratoStride);
  }
}

int voicefxgroup(int vi) {
  if (vi < 2) {
    return 0;
  }
  if (vi < kPlayVoiceCount) {
    return 1;
  }
  return 2;
}

float playtimesec() {
  return readctrl(off_vibrato()) + g_engine.sampleclock / g_engine.sample_rate;
}

float vibratodepthat(int group, float t, float start[kVibratoGroups],
                     float end[kVibratoGroups], float peak[kVibratoGroups]) {
  float s = start[group], e = end[group], pk = peak[group];
  if (e <= s || pk <= 0.0001f || t < s || t >= e) {
    return 0.f;
  }
  float dur = e - s;
  float rampreset = std::min(dur * 0.48f, 0.35f);
  float attackport = std::min(std::min(dur * 0.35f, 0.35f), rampreset);
  float tpeak = s + attackport;
  float trelease = std::max(e - rampreset, s + rampreset);
  if (tpeak > trelease) {
    tpeak = trelease;
  }
  if (t <= tpeak) {
    return tpeak <= s ? pk : pk * (t - s) / (tpeak - s);
  }
  if (t < trelease) {
    return pk;
  }
  if (e <= trelease) {
    return 0.f;
  }
  return pk * (1.f - (t - trelease) / (e - trelease));
}

bool anyplayvibratosend() {
  for (int g = 0; g < 3; ++g) {
    if (fxsendval(g, kFxVibrato) > 0.0001f) {
      return true;
    }
  }
  return false;
}

void updateplayvibratodepth(float vstart[kVibratoGroups],
                            float vend[kVibratoGroups],
                            float vpeak[kVibratoGroups]) {
  if (!anyplayvibratosend()) {
    if (g_engine.fxvibrato_depth > 0.0001f) {
      g_engine.fxvibrato_depth += (0.f - g_engine.fxvibrato_depth) * 0.001f;
    }
    return;
  }
  // FX depth is the wobble amount (auto 0.5 when unset). Play vibrato SAB is
  // only a 0..1 envelope shape while the note window is active -- it must not
  // replace `#vibrato depth`.
  float fxdepth = 0.f;
  for (int g = 0; g < 3; ++g) {
    if (fxsendval(g, kFxVibrato) <= 0.f) {
      continue;
    }
    float d = fxparam(g, kFxVibratoDepth);
    if (d > fxdepth) {
      fxdepth = d;
    }
  }
  if (fxdepth <= 0.0001f) {
    fxdepth = 0.5f;
  }
  float t = playtimesec();
  float target = 0.f;
  bool anygated = false;
  for (int g = 0; g < 3; ++g) {
    if (fxsendval(g, kFxVibrato) <= 0.f) {
      continue;
    }
    int start = g < 2 ? g * 2 : kPlayVoiceCount;
    int end = g < 2 ? start + 2 : kVoiceCount;
    bool gated = false;
    for (int i = start; i < end; ++i) {
      if (voicegateopen(i)) {
        gated = true;
        break;
      }
    }
    if (!gated) {
      continue;
    }
    anygated = true;
    float env = vibratodepthat(g, t, vstart, vend, vpeak);
    float pk = vpeak[g];
    float shaped = fxdepth;
    if (env > 0.0001f && pk > 0.0001f) {
      shaped = (env / pk) * fxdepth;
    }
    if (shaped > target) {
      target = shaped;
    }
  }
  if (!anygated || target <= 0.0001f) {
    target = fxdepth;
  }
  float rate = target > g_engine.fxvibrato_depth ? 0.004f : 0.001f;
  g_engine.fxvibrato_depth += (target - g_engine.fxvibrato_depth) * rate;
}

void advanceplayvibratolfos(float vfreq[kVibratoGroups]) {
  for (int g = 0; g < kVibratoGroups; ++g) {
    // Prefer `#vibrato frequency` (default 5). Play SAB rate is fallback only.
    float freq = fxparam(g, kFxVibratoFreq);
    if (freq <= 0.f) {
      freq = vfreq[g];
    }
    if (freq <= 0.f) {
      freq = 5.f;
    }
    g_engine.fxvibratolfo[g].SetFreq(freq);
    g_engine.fxvibratolfo[g].SetWaveform(Oscillator::WAVE_SIN);
    g_engine.fxvibratolfo[g].SetAmp(1.f);
    g_engine.fxvibratolfo_sample[g] = g_engine.fxvibratolfo[g].Process();
  }
}

float playvibratocents(int vi, float vfreq[kVibratoGroups]) {
  (void)vfreq;
  int group = voicefxgroup(vi);
  float send = fxsendval(group, kFxVibrato);
  if (send <= 0.f || !voicegateopen(vi)) {
    return 0.f;
  }
  if (g_engine.fxvibrato_depth <= 0.0001f) {
    return 0.f;
  }
  float maxdelay = fxparam(group, kFxVibratoMaxdelay);
  if (maxdelay <= 0.f) {
    maxdelay = 0.02f;
  }
  float lfo = g_engine.fxvibratolfo_sample[group];
  return lfo * g_engine.fxvibrato_depth * maxdelay * 3500.f * send;
}

float detunedhz(int vi, float freq, float detune, float vfreq[kVibratoGroups]) {
  float hz = freq > 0.f ? freq : 440.f;
  float vib = voicegateopen(vi) ? playvibratocents(vi, vfreq) : 0.f;
  if (vib != 0.f) {
    return hz * std::pow(2.f, (detune + vib) / 1200.f);
  }
  return hz * std::pow(2.f, detune / 1200.f);
}
} // namespace zss_daisy
