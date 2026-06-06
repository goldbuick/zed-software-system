/**
 * ZSS DaisySP synth — see zss/README.md for module map.
 */
#ifdef __arm__
#undef __arm__
#endif

#include "zss_internal.h"

namespace zss_daisy {

// --- Synthesis: Daisy Oscillator waves, FM, partials, main synthsource() ---

float voiceenvlevel(ZssVoice& v, int type) { return v.lastenv; }

float glidefreq(ZssVoice& v, int vi, float target, int type, float port) {
  if ((type != kSynth && type != kAlgoSynth && type != kBowedVoice) ||
      port <= 0.f) {
    v.playfreq = target;
    v.glidetarget = target;
    v.glideremain = 0;
    return target;
  }
  if (target != v.glidetarget) {
    bool gate = readctrl(off_voices() + vi * kVoiceStride + 1) > 0.5f;
    float level = voiceenvlevel(v, type);
    if (gate && level > 0.05f && v.playfreq > 0.f) {
      v.glidestart = v.playfreq;
      v.glidetarget = target;
      v.glidetotal = std::max(1, static_cast<int>(port * g_engine.sample_rate));
      v.glideremain = v.glidetotal;
    } else {
      v.playfreq = target;
      v.glidetarget = target;
      v.glideremain = 0;
    }
  }
  if (v.glideremain > 0) {
    float progress = 1.f - static_cast<float>(v.glideremain) / v.glidetotal;
    float start = v.glidestart;
    float end = v.glidetarget;
    if (start > 0.f && end > 0.f) {
      v.playfreq = start * std::pow(end / start, progress);
    } else {
      v.playfreq = start + (end - start) * progress;
    }
    --v.glideremain;
    if (v.glideremain <= 0) {
      v.playfreq = end;
    }
  }
  return v.playfreq;
}

void applyvoiceenv(ZssVoice& v, int type, float a, float d, float s, float r) {
  if (type == kDoot) {
    if (v.dootprev_a != a || v.dootprev_d != d || v.dootprev_s != s ||
        v.dootprev_r != r) {
      v.dootenv.SetTime(ADSR_SEG_ATTACK, std::max(0.001f, a));
      v.dootenv.SetTime(ADSR_SEG_DECAY, std::max(0.001f, d));
      v.dootenv.SetSustainLevel(clampf(s, 0.f, 1.f));
      v.dootenv.SetTime(ADSR_SEG_RELEASE, std::max(0.001f, r));
      v.dootprev_a = a;
      v.dootprev_d = d;
      v.dootprev_s = s;
      v.dootprev_r = r;
    }
    return;
  }
  if (type == kAlgoSynth) {
    if (v.algoprev_a != a || v.algoprev_d != d || v.algoprev_s != s ||
        v.algoprev_r != r) {
      v.algooutenv.SetTime(ADSR_SEG_ATTACK, std::max(0.001f, a));
      v.algooutenv.SetTime(ADSR_SEG_DECAY, std::max(0.001f, d));
      v.algooutenv.SetSustainLevel(clampf(s, 0.f, 1.f));
      v.algooutenv.SetTime(ADSR_SEG_RELEASE, std::max(0.001f, r));
      v.algoprev_a = a;
      v.algoprev_d = d;
      v.algoprev_s = s;
      v.algoprev_r = r;
    }
    return;
  }
  if (v.envprev_a != a || v.envprev_d != d || v.envprev_s != s ||
      v.envprev_r != r) {
    v.voiceenv.setparams(a, d, s, r);
    v.envprev_a = a;
    v.envprev_d = d;
    v.envprev_s = s;
    v.envprev_r = r;
  }
}

float oscwavefromphase(int wavetype, float phase01) {
  float p = phase01 - std::floor(phase01);
  if (wavetype == 1) {
    return std::sin(p * kTwoPi);
  }
  if (wavetype == 2) {
    return p < 0.5f ? p * 4.f - 1.f : 3.f - p * 4.f;
  }
  if (wavetype == 3) {
    return p * 2.f - 1.f;
  }
  return p < 0.5f ? 1.f : -1.f;
}

float oscbasicwave(Oscillator& o, int wavetype, float hz, float amp) {
  o.SetFreq(hz);
  o.SetAmp(amp);
  switch (wavetype) {
  case 1:
    o.SetWaveform(Oscillator::WAVE_SIN);
    break;
  case 2:
    o.SetWaveform(Oscillator::WAVE_POLYBLEP_TRI);
    break;
  case 3:
    o.SetWaveform(Oscillator::WAVE_POLYBLEP_SAW);
    break;
  case 4:
  case 5:
    o.SetWaveform(Oscillator::WAVE_POLYBLEP_SQUARE);
    o.SetPw(wavetype == 5 ? 0.2f : 0.5f);
    break;
  default:
    o.SetWaveform(Oscillator::WAVE_POLYBLEP_SQUARE);
    break;
  }
  return o.Process();
}

float stringbownoisesample(ZssVoice& v) {
  v.noiserng = v.noiserng * 1664525u + 1013904223u;
  return static_cast<float>((v.noiserng >> 8) & 0xffffff) / 8388608.f - 1.f;
}

float oscmodwave(Oscillator& o, int modwave, float hz) {
  return oscbasicwave(o, modwave, hz, kOscModWaveGain);
}

float oscwavewithphase(Oscillator& o, int wavetype, float hz, float phase,
                       ZssVoice& v) {
  if (phase == 0.f && v.voicephasestep == 0.f) {
    return oscbasicwave(o, wavetype, hz, 1.f);
  }
  v.voicephasestep += hz / g_engine.sample_rate;
  float p = v.voicephasestep + phase;
  if (wavetype >= 0 && wavetype <= 3) {
    return oscwavefromphase(wavetype, p);
  }
  return oscbasicwave(o, wavetype, hz, 1.f);
}

float fmcarriersample(Oscillator& carrier, Oscillator& modulator, int modtype,
                      float hz, float modhz, float modidx, float moddepth,
                      int carriertype) {
  float mod = oscmodwave(modulator, modtype, modhz) * modidx * moddepth;
  float fmh = hz + mod * hz * kFmHzScale;
  return oscbasicwave(carrier, carriertype, fmh, kOscModWaveGain);
}

float oscpartialsynth(Oscillator& o, float hz, int count,
                      const float* partials) {
  int n = count > 0 ? std::min(8, count) : 0;
  if (n <= 0) {
    return oscbasicwave(o, 1, hz, 1.f);
  }
  float sum = 0.f, norm = 0.f;
  for (int pi = 0; pi < n; ++pi) {
    float amp = partials[pi];
    if (amp == 0.f) {
      continue;
    }
    sum += oscbasicwave(o, 1, hz * (pi + 1), 1.f) * amp;
    norm += amp < 0.f ? -amp : amp;
  }
  return norm <= 0.f ? oscbasicwave(o, 1, hz, 1.f) : sum / norm;
}

float synthwavegain(int osc) {
  // ONLY applies to #synth sine
  if (osc == 1) {
    return kSineVoiceGain;
  }
  // Adjust am*
  if (osc >= 10 && osc <= 13) {
    return kAmVoiceGain;
  }
  // Adjust fm*
  if (osc >= 20 && osc <= 23) {
    return kFmVoiceGain;
  }
  // Adjust fat*
  if (osc >= 30 && osc <= 33) {
    return kFatVoiceGain;
  }
  return 1.f;
}

// #synth SYNTH voices only (VoiceType kSynth = 0; play 0–3, bgplay 4–7).
// processvoice() routes retro/buzz/clang/metallic, hollow/white noise, bells,
// doot, algo0–7, string/pluck, and drip elsewhere — not through synthsource().
//
// osctype = WASM_OSC_TYPE (wasmosctype.ts), from #synth wave names:
//   0–3  square, sine, triangle, sawtooth (+ custom → square)
//   4–5  pulse, pwm
//  10–13 am*sine|square|triangle|sawtooth
//  20–23 fm*sine|square|triangle|sawtooth
//  30–33 fat*sine|square|triangle|sawtooth
// partials override when zss_osccfg partialcount > 0 (#synth customN + array).
float synthsource(ZssVoice& v, int vi, float freq, bool gate, float detune,
                  int osctype, float vfreq[kVibratoGroups]) {
  OscCfg cfg = readosccfg(vi);
  float hz = detunedhz(vi, freq, detune, vfreq);
  float width = cfg.width > 0.f ? cfg.width : 0.2f;
  float modidx = cfg.modindex > 0.f ? cfg.modindex : 2.f;
  float harm = cfg.harmonicity > 0.f ? cfg.harmonicity : 1.f;
  float modhz = hz * (cfg.modfreq > 0.f ? cfg.modfreq : 1.f);
  int pcount =
      static_cast<int>(cfg.partialcount > 0.f ? cfg.partialcount : 0.f);
  float sig = 0.f;

  if (v.modenvprev_a != cfg.modenv_a || v.modenvprev_d != cfg.modenv_d ||
      v.modenvprev_s != cfg.modenv_s || v.modenvprev_r != cfg.modenv_r) {
    v.modenv.setparams(cfg.modenv_a, cfg.modenv_d, cfg.modenv_s, cfg.modenv_r);
    v.modenvprev_a = cfg.modenv_a;
    v.modenvprev_d = cfg.modenv_d;
    v.modenvprev_s = cfg.modenv_s;
    v.modenvprev_r = cfg.modenv_r;
  }

  if (pcount > 0) {
    sig = oscpartialsynth(v.synthosc, hz, pcount, cfg.partials);
  } else if (osctype == 4) // #synth pulse
  {
    v.synthosc.SetFreq(hz);
    v.synthosc.SetWaveform(Oscillator::WAVE_SQUARE);
    v.synthosc.SetPw(width);
    v.synthosc.SetAmp(1.f);
    sig = v.synthosc.Process();
  } else if (osctype == 5) // #synth pwm
  {
    v.synthosc.SetFreq(hz);
    v.synthosc.SetWaveform(Oscillator::WAVE_SQUARE);
    v.synthosc.SetPw(width > 0.f ? width : 0.2f);
    v.synthosc.SetAmp(1.f);
    sig = v.synthosc.Process();
  } else if (osctype >= 10 && osctype <= 13) // #synth am*
  {
    float modamp = v.modenv.process(gate);
    float modwave = oscmodwave(v.synthmod, cfg.modtype, hz * harm);
    int cartype = osctype - 10;
    // Tone AMOscillator: AudioToGain(mod) → 0.5 carrier when mod crosses 0.
    sig = oscbasicwave(v.synthosc, cartype, hz, 1.f) *
          (0.5f + 0.5f * modwave * modamp);
  } else if (osctype >= 20 && osctype <= 23) // #synth fm*
  {
    float moddepth = v.modenv.process(gate);
    int cartype =
        osctype == 20 ? 1 : (osctype == 21 ? 0 : (osctype == 22 ? 2 : 3));
    sig = fmcarriersample(v.synthosc, v.synthmod, cfg.modtype, hz, modhz,
                          modidx, moddepth, cartype);
  } else if (osctype >= 30 && osctype <= 33) // #synth fat*
  {
    int cnt = cfg.count > 1.f ? static_cast<int>(cfg.count + 0.5f) : 3;
    float spread = cfg.spread > 0.f ? cfg.spread : 20.f;
    float det = spread / 1200.f;
    int cartype = osctype - 30;
    sig = 0.f;
    for (int fi = 0; fi < cnt; ++fi) {
      float mul = 1.f + (fi - (cnt - 1) * 0.5f) * det;
      sig += oscbasicwave(v.synthosc, cartype, hz * mul, 1.f);
    }
    sig /= cnt;
  } else if (osctype >= 0 &&
             osctype <= 3) // #synth sine|square|triangle|sawtooth|custom
  {
    sig = oscwavewithphase(v.synthosc, osctype, hz, cfg.phase, v);
  } else // unknown osctype → square fallback
  {
    sig = oscbasicwave(v.synthosc, 0, hz, 1.f);
  }
  return sig * synthwavegain(osctype);
}

float dootvoice(ZssVoice& v, float freq, bool gate) {
  if (gate && !v.gateprev) {
    v.dootpitch = 1.f;
  }
  v.gateprev = gate;
  float hz = freq > 0.f ? freq : 110.f;
  if (gate) {
    v.dootpitch *= 0.9993f;
    if (v.dootpitch < 0.15f) {
      v.dootpitch = 0.15f;
    }
  }
  float pitchmul = 0.15f + v.dootpitch * 0.85f;
  v.dootosc.SetFreq(hz * pitchmul);
  v.dootosc.SetWaveform(Oscillator::WAVE_SIN);
  v.dootosc.SetAmp(1.f);
  return v.dootosc.Process() * v.dootenv.Process(gate) * 0.6f;
}

float algopwave(Oscillator& o, int wavetype, float hz) {
  return oscbasicwave(o, wavetype, hz, 1.f);
}
} // namespace zss_daisy
