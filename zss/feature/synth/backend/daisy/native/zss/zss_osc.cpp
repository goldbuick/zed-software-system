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
  // Carrier at full amp; modulator already scaled by kOscModWaveGain in
  // oscmodwave.
  return oscbasicwave(carrier, carriertype, fmh, 1.f);
}

// am*/fm*/fat* enums are SINE,SQUARE,TRIANGLE,SAWTOOTH at +0..+3, but basic
// WASM_OSC_TYPE is SQUARE=0, SINE=1, TRIANGLE=2, SAWTOOTH=3.
static int familywavetobasic(int familywave) {
  switch (familywave) {
  case 0:
    return 1; // sine
  case 1:
    return 0; // square
  case 2:
    return 2; // triangle
  case 3:
    return 3; // sawtooth
  default:
    return 0;
  }
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

static float oscshapemakeup(int shape) {
  // WASM_OSC_TYPE basic: 0 square, 1 sine, 2 triangle, 3 sawtooth
  if (shape == 2) {
    return kTriangleVoiceGain;
  }
  if (shape == 3) {
    return kSawtoothVoiceGain;
  }
  return 1.f;
}

float synthwavegain(int osc) {
  // ONLY applies to #synth sine (not am/fm/fat sine — those match via family
  // gain)
  if (osc == 1) {
    return kSineVoiceGain;
  }
  if (osc == 2) {
    return kTriangleVoiceGain;
  }
  if (osc == 3) {
    return kSawtoothVoiceGain;
  }
  // Adjust am*
  if (osc >= 10 && osc <= 13) {
    return kAmVoiceGain * oscshapemakeup(familywavetobasic(osc - 10));
  }
  // Adjust fm*
  if (osc >= 20 && osc <= 23) {
    return kFmVoiceGain * oscshapemakeup(familywavetobasic(osc - 20));
  }
  // Adjust fat*
  if (osc >= 30 && osc <= 33) {
    return kFatVoiceGain * oscshapemakeup(familywavetobasic(osc - 30));
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
  } else if (osctype == 5) // #synth pwm — Tone PWMOscillator: LFO at modfreq
  {
    const float modfreq = cfg.modfreq > 0.f ? cfg.modfreq : 1.f;
    const float lfo = oscbasicwave(v.synthmod, 1, modfreq, 1.f);
    const float pw = clampf(0.5f + 0.5f * width * lfo, 0.01f, 0.99f);
    v.synthosc.SetFreq(hz);
    v.synthosc.SetWaveform(Oscillator::WAVE_SQUARE);
    v.synthosc.SetPw(pw);
    v.synthosc.SetAmp(1.f);
    sig = v.synthosc.Process();
  } else if (osctype >= 10 && osctype <= 13) // #synth am*
  {
    float modamp = v.modenv.process(gate);
    float modwave = oscmodwave(v.synthmod, cfg.modtype, hz * harm);
    int cartype = familywavetobasic(osctype - 10);
    // Tone AMOscillator: AudioToGain(mod) → 0.5 carrier when mod crosses 0.
    sig = oscbasicwave(v.synthosc, cartype, hz, 1.f) *
          (0.5f + 0.5f * modwave * modamp);
  } else if (osctype >= 20 && osctype <= 23) // #synth fm*
  {
    float moddepth = v.modenv.process(gate);
    int cartype = familywavetobasic(osctype - 20);
    // Tone FMOscillator: modulator rate = carrier hz * harmonicity
    const float fmmodhz = hz * harm;
    sig = fmcarriersample(v.synthosc, v.synthmod, cfg.modtype, hz, fmmodhz,
                          modidx, moddepth, cartype);
  } else if (osctype >= 30 && osctype <= 33) // #synth fat*
  {
    int cnt = cfg.count > 1.f ? static_cast<int>(cfg.count + 0.5f) : 3;
    float spread = cfg.spread > 0.f ? cfg.spread : 20.f;
    float det = spread / 1200.f;
    int cartype = familywavetobasic(osctype - 30);
    sig = 0.f;
    if (cfg.phase != 0.f || v.voicephasestep != 0.f) {
      v.voicephasestep += hz / g_engine.sample_rate;
      for (int fi = 0; fi < cnt; ++fi) {
        float mul = 1.f + (fi - (cnt - 1) * 0.5f) * det;
        if (cartype >= 0 && cartype <= 3) {
          sig += oscwavefromphase(cartype, v.voicephasestep * mul + cfg.phase);
        } else {
          sig += oscbasicwave(v.synthosc, cartype, hz * mul, 1.f);
        }
      }
    } else {
      for (int fi = 0; fi < cnt; ++fi) {
        float mul = 1.f + (fi - (cnt - 1) * 0.5f) * det;
        sig += oscbasicwave(v.synthosc, cartype, hz * mul, 1.f);
      }
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
  const float basehz = freq > 0.f ? freq : 110.f;
  bool trigger = gate && !v.gateprev;
  v.gateprev = gate;
  // Abutting note-ons keep gate high; re-arm pitch envelope on pitch change.
  const bool pitchstrike = gate && v.karplushzprev > 0.f &&
                           std::fabs(basehz - v.karplushzprev) > 0.5f;
  if (trigger || pitchstrike) {
    // Tone MembraneSynth: phase 0 = note*octaves, phase 1 = note.
    v.dootpitch = 0.f;
    v.dootenv.Retrigger(true);
  }
  v.karplushzprev = gate ? basehz : 0.f;
  if (gate && v.dootpitch < 1.f) {
    const float denom =
        std::max(1.f, kDootPitchDecaySec * g_engine.sample_rate);
    v.dootpitch += 1.f / denom;
    if (v.dootpitch > 1.f) {
      v.dootpitch = 1.f;
    }
  }
  // exponentialRamp: freq = note * octaves^(1 - phase)
  const float pitchmul = std::pow(kDootOctaves, 1.f - v.dootpitch);
  v.dootosc.SetFreq(basehz * pitchmul);
  v.dootosc.SetWaveform(Oscillator::WAVE_SIN);
  v.dootosc.SetAmp(1.f);
  return v.dootosc.Process() * v.dootenv.Process(gate) * kDootVoiceGain;
}

float algopwave(Oscillator& o, int wavetype, float hz) {
  return oscbasicwave(o, wavetype, hz, 1.f);
}
} // namespace zss_daisy
