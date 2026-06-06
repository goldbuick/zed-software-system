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
  float t = playtimesec();
  float target = 0.f;
  for (int g = 0; g < 3; ++g) {
    if (fxsendval(g, kFxVibrato) <= 0.f) {
      continue;
    }
    int start = g < 2 ? g * 2 : kPlayVoiceCount;
    int end = g < 2 ? start + 2 : kVoiceCount;
    bool gated = false;
    for (int i = start; i < end; ++i) {
      if (readctrl(off_voices() + i * kVoiceStride + 1) > 0.5f) {
        gated = true;
        break;
      }
    }
    if (!gated) {
      continue;
    }
    float depth = vibratodepthat(g, t, vstart, vend, vpeak);
    if (depth > target) {
      target = depth;
    }
  }
  if (target <= 0.0001f) {
    float sabdepth = 0.f;
    for (int g2 = 0; g2 < 3; ++g2) {
      if (fxsendval(g2, kFxVibrato) <= 0.f) {
        continue;
      }
      float d2 = fxparam(g2, kFxVibratoDepth);
      if (d2 > sabdepth) {
        sabdepth = d2;
      }
    }
    target = sabdepth > 0.0001f ? sabdepth : 0.5f;
  }
  float rate = target > g_engine.fxvibrato_depth ? 0.004f : 0.001f;
  g_engine.fxvibrato_depth += (target - g_engine.fxvibrato_depth) * rate;
}

float playvibratocents(int vi, float vfreq[kVibratoGroups]) {
  int group = voicefxgroup(vi);
  float send = fxsendval(group, kFxVibrato);
  if (send <= 0.f || readctrl(off_voices() + vi * kVoiceStride + 1) <= 0.5f) {
    return 0.f;
  }
  if (g_engine.fxvibrato_depth <= 0.0001f) {
    return 0.f;
  }
  float freq = vfreq[group];
  if (freq <= 0.f) {
    freq = fxparam(group, kFxVibratoFreq);
  }
  if (freq <= 0.f) {
    freq = 5.f;
  }
  float maxdelay = fxparam(group, kFxVibratoMaxdelay);
  if (maxdelay <= 0.f) {
    maxdelay = 0.02f;
  }
  g_engine.fxvibratolfo.SetFreq(freq);
  g_engine.fxvibratolfo.SetWaveform(Oscillator::WAVE_SIN);
  g_engine.fxvibratolfo.SetAmp(1.f);
  float lfo = g_engine.fxvibratolfo.Process();
  return lfo * g_engine.fxvibrato_depth * maxdelay * 3500.f * send;
}

float detunedhz(int vi, float freq, float detune, float vfreq[kVibratoGroups]) {
  float hz = freq > 0.f ? freq : 440.f;
  float vib = readctrl(off_voices() + vi * kVoiceStride + 1) > 0.5f
                  ? playvibratocents(vi, vfreq)
                  : 0.f;
  if (vib != 0.f) {
    return hz * std::pow(2.f, (detune + vib) / 1200.f);
  }
  return hz * std::pow(2.f, detune / 1200.f);
}
} // namespace zss_daisy
