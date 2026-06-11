/**
 * SOS Synth Secrets voice implementations (wind, piano, timpani, bowed, guitar,
 * organ).
 */
#ifdef __arm__
#undef __arm__
#endif

#include "zss_internal.h"

namespace zss_daisy {

struct SosParams {
  float p0, p1, p2, p3;
};

static SosParams readsosparams(int cfg) {
  return {readctrl(cfg + 6), readctrl(cfg + 7), readctrl(cfg + 8),
          readctrl(cfg + 9)};
}

static float clamp01(float x) { return clampf(x, 0.f, 1.f); }

static float sosdelayedvibrato(ZssVoice& v, bool gate, float depthcents,
                               float delaysec = 0.3f) {
  if (gate) {
    const float inc = 1.f / std::max(1.f, delaysec * g_engine.sample_rate);
    v.sosvibramp = std::min(1.f, v.sosvibramp + inc);
  } else {
    v.sosvibramp = 0.f;
  }
  v.stringviblfo.SetFreq(4.8f);
  v.stringviblfo.SetWaveform(Oscillator::WAVE_TRI);
  v.stringviblfo.SetAmp(1.f);
  return v.stringviblfo.Process() * (depthcents / 1200.f) * v.sosvibramp;
}

static float breathlayer(ZssVoice& v, float envout, float breath) {
  const float nois = stringbownoisesample(v);
  v.stringbowhp.SetFilterMode(OnePole::FILTER_MODE_HIGH_PASS);
  float hpnorm = 900.f / g_engine.sample_rate;
  if (hpnorm > 0.497f) {
    hpnorm = 0.497f;
  }
  v.stringbowhp.SetFrequency(hpnorm);
  return v.stringbowhp.Process(nois) * envout * breath * 0.35f;
}

static float windbreathburst(ZssVoice& v, bool trigger, float breath,
                             float envout) {
  v.sparkleenv.SetTime(ADSR_SEG_ATTACK, 0.002f);
  v.sparkleenv.SetTime(ADSR_SEG_DECAY, 0.07f);
  v.sparkleenv.SetSustainLevel(0.f);
  v.sparkleenv.SetTime(ADSR_SEG_RELEASE, 0.05f);
  const float burstenv = v.sparkleenv.Process(trigger);
  return breathlayer(v, burstenv * envout, breath * 1.35f);
}

static float windformantmix(ZssVoice& v, float sig, int algo, float mix) {
  float f1 = 720.f;
  float f2 = 2600.f;
  float m1 = 0.16f;
  float m2 = 0.1f;
  if (algo == 0) {
    f1 = 820.f;
    f2 = 3400.f;
    m1 = 0.14f;
    m2 = 0.08f;
  } else if (algo == 1) {
    f1 = 420.f;
    f2 = 1800.f;
    m1 = 0.22f;
    m2 = 0.14f;
  } else if (algo == 2) {
    f1 = 580.f;
    f2 = 2200.f;
    m1 = 0.2f;
    m2 = 0.15f;
  }
  v.stringbodylo.SetFreq(f1);
  v.stringbodylo.SetRes(0.38f);
  v.stringbodylo.Process(sig);
  float out = v.stringbodylo.Band() * m1 * mix;
  v.stringbodyhi.SetFreq(f2);
  v.stringbodyhi.SetRes(0.28f);
  v.stringbodyhi.Process(sig);
  out += v.stringbodyhi.Band() * m2 * mix;
  return sig * (0.42f + mix * 0.18f) + out;
}

static float windcutoff(float hz, float envout, int algo, float brightness,
                        float pressure) {
  const float kf =
      std::pow(clampf(hz / 440.f, 0.25f, 4.f), algo == 2 ? 0.28f : 0.38f);
  float base = 400.f + brightness * 2200.f * kf;
  if (algo == 1) {
    base *= 0.75f;
  }
  if (algo == 3) {
    base *= 0.85f;
  }
  if (algo == 2) {
    base += envout * pressure * 2400.f;
  } else {
    base += envout * pressure * 1800.f;
  }
  return clampf(base, 300.f, g_engine.sample_rate * 0.33f);
}

static float windres(float envout, int algo, float resonance, float pressure) {
  float r = 0.08f + resonance * 0.35f;
  if (algo == 2) {
    r += envout * pressure * 0.32f;
  }
  return clampf(r, 0.05f, 0.55f);
}

float windvoice(ZssVoice& v, float hz, bool gate, int algo, int cfg) {
  const SosParams p = readsosparams(cfg);
  const float breath = clamp01(p.p0 > 0.f ? p.p0 : 0.3f);
  const float pressure = clamp01(p.p1 > 0.f ? p.p1 : 0.45f);
  const float brightness = clamp01(p.p2 > 0.f ? p.p2 : 0.45f);
  const float resonance = clamp01(p.p3 > 0.f ? p.p3 : 0.15f);

  bool trigger = gate && !v.windgateprev;
  v.windgateprev = gate;

  float envout = v.voiceenv.process(gate);
  const float vibcents = algo == 3 ? 4.f : 5.f;
  const float vib = sosdelayedvibrato(v, gate, vibcents, 0.35f);
  const float playhz = hz * (1.f + vib);

  float sig = 0.f;
  if (algo == 3) {
    const float ratios[] = {1.f, 1.002f, 0.998f, 1.004f};
    const float amps[] = {0.28f, 0.24f, 0.22f, 0.18f};
    for (int i = 0; i < 4; ++i) {
      Oscillator& o = i == 0 ? v.synthosc : v.algoops[i - 1];
      const int wave = i % 2 == 0 ? 2 : 3;
      sig += oscbasicwave(o, wave, playhz * ratios[i], amps[i]);
    }
  } else {
    const int wave = algo == 1 ? 0 : (algo == 2 ? 3 : 2);
    float body = oscbasicwave(v.synthosc, wave, playhz, 0.55f);
    if (algo == 0) {
      body = body * 0.55f + oscbasicwave(v.synthmod, 3, playhz, 0.45f) * 0.45f;
    }
    sig = body;
  }

  sig = windformantmix(v, sig, algo, 0.55f + brightness * 0.35f);

  const float cutoff = windcutoff(hz, envout, algo, brightness, pressure);
  v.stringlp.SetFreq(cutoff);
  v.stringlp.SetRes(windres(envout, algo, resonance, pressure));
  v.stringlp.SetDrive(1.f);
  v.stringlp.Process(sig);
  float out = v.stringlp.Low();

  out += windbreathburst(v, trigger, breath, envout);
  out += breathlayer(v, envout, breath * 0.65f);
  v.lastenv = envout;
  return out * envout * kWindVoiceGain;
}

static float pianostretchratio(float hz) {
  return 1.f + 0.00028f * std::log2(clampf(hz / 220.f, 0.5f, 8.f) + 0.5f);
}

static float pianobodyresonance(ZssVoice& v, float sig, float mix) {
  v.stringbodylo.SetFreq(105.f);
  v.stringbodylo.SetRes(0.42f);
  v.stringbodylo.Process(sig);
  float out = v.stringbodylo.Band() * mix * 0.22f;
  v.stringbodyhi.SetFreq(420.f);
  v.stringbodyhi.SetRes(0.3f);
  v.stringbodyhi.Process(sig);
  out += v.stringbodyhi.Band() * mix * 0.14f;
  return out;
}

float pianovoice(ZssVoice& v, float hz, bool gate, int algo, int cfg,
                 float velocity) {
  const SosParams p = readsosparams(cfg);
  const float spread = clamp01(p.p0 > 0.f ? p.p0 : 0.18f);
  const float hammer = clamp01(p.p1 > 0.f ? p.p1 : 0.55f);
  const float brightness = clamp01(p.p2 > 0.f ? p.p2 : 0.5f);
  const float damping = clamp01(p.p3 > 0.f ? p.p3 : 0.45f);
  const float vel = clampf(velocity, 0.1f, 1.f);

  bool trigger = gate && !v.pianogateprev;
  v.pianogateprev = gate;

  float envout = v.voiceenv.process(gate) * vel;
  const float cents = spread * 12.f;
  const float detmul = std::pow(2.f, cents / 1200.f);
  const float stretch = pianostretchratio(hz);
  const float kbtrack = 1.f + 0.00018f * std::log2(hz / 440.f + 0.5f);

  float body = 0.f;
  if (algo == 1) {
    v.epfm.SetFrequency(hz * kbtrack);
    v.epfm.SetRatio(2.01f + spread * 0.08f);
    v.epfm.SetIndex(2.5f + hammer * vel * 5.f);
    if (trigger) {
      v.epfm.Reset();
    }
    body = v.epfm.Process() * 0.62f;
    body += oscbasicwave(v.algoops[0], 1, hz * detmul, 0.18f);
    body += oscbasicwave(v.algoops[1], 3, hz / detmul * stretch, 0.12f);
    body /= 1.3f;
  } else {
    body = oscbasicwave(v.synthosc, 3, hz * kbtrack, 0.34f);
    body += oscbasicwave(v.synthmod, 3, hz * detmul * stretch, 0.33f);
    body +=
        oscbasicwave(v.algoops[0], 3, hz / detmul * stretch * kbtrack, 0.33f);
    body /= 3.f;
  }

  float impact = 0.f;
  if (trigger || gate) {
    v.sparkleenv.SetTime(ADSR_SEG_ATTACK, 0.001f);
    v.sparkleenv.SetTime(ADSR_SEG_DECAY, algo == 1 ? 0.12f : 0.05f);
    v.sparkleenv.SetSustainLevel(0.f);
    v.sparkleenv.SetTime(ADSR_SEG_RELEASE, algo == 1 ? 0.08f : 0.04f);
    float sparkenv = v.sparkleenv.Process(trigger);
    float sparkhz = hz * (algo == 1 ? 3.2f : 4.f);
    v.sparklemod.SetFreq(sparkhz * 5.1f);
    v.sparklemod.SetWaveform(Oscillator::WAVE_SIN);
    v.sparklemod.SetAmp(1.f);
    float sparkmod = v.sparklemod.Process() * 16.f;
    v.sparklecar.SetFreq(sparkhz + sparkmod * 0.002f);
    v.sparklecar.SetWaveform(Oscillator::WAVE_SIN);
    v.sparklecar.SetAmp(1.f);
    impact = v.sparklecar.Process() * sparkenv * hammer * vel * 0.22f;
    const float clunk = stringbownoisesample(v) * sparkenv * hammer * 0.1f;
    impact += clunk;
  }

  const float kf = std::pow(clampf(hz / 440.f, 0.25f, 4.f), 0.45f);
  float cutoff = (520.f + brightness * 2400.f * kf + envout * vel * 900.f) *
                 (1.f - damping * 0.35f);
  cutoff = clampf(cutoff, 400.f, g_engine.sample_rate * 0.35f);
  v.stringlp.SetFreq(cutoff);
  v.stringlp.SetRes(0.1f + envout * 0.12f);
  v.stringlp.SetDrive(1.f);
  v.stringlp.Process(body);
  float out = v.stringlp.Low() * envout + impact;
  out += pianobodyresonance(v, body, envout * (1.f - damping * 0.4f));

  v.lastenv = envout;
  return out * kPianoVoiceGain;
}

float timpanivoice(ZssVoice& v, float hz, bool gate, int cfg, float velocity) {
  const SosParams p = readsosparams(cfg);
  const float tension = clamp01(p.p0 > 0.f ? p.p0 : 0.5f);
  const float decayscale = clamp01(p.p1 > 0.f ? p.p1 : 0.55f);
  const float tone = clamp01(p.p2 > 0.f ? p.p2 : 0.45f);
  const float strike = clamp01(p.p3 > 0.f ? p.p3 : 0.6f);
  const float vel = clampf(velocity, 0.1f, 1.f);

  bool trigger = gate && !v.timpanigateprev;
  if (trigger) {
    v.timpanipitch = 1.f;
  }
  v.timpanigateprev = gate;

  hz = hz > 0.f ? hz : 110.f;
  if (gate) {
    const float bend = 0.9992f - (1.f - tension) * 0.0005f;
    v.timpanipitch *= bend;
    if (v.timpanipitch < 0.52f + (1.f - decayscale) * 0.18f) {
      v.timpanipitch = 0.52f + (1.f - decayscale) * 0.18f;
    }
  }

  float envout = v.voiceenv.process(gate) * vel;
  const float pitchmul = 0.5f + v.timpanipitch * 0.5f;
  v.modalvoice.SetFreq(hz * pitchmul);
  v.modalvoice.SetStructure(0.25f + tension * 0.45f);
  v.modalvoice.SetBrightness(0.35f + tone * 0.4f);
  v.modalvoice.SetDamping(0.45f + decayscale * 0.35f);
  v.modalvoice.SetAccent(strike * vel);
  v.modalvoice.SetSustain(gate);
  float body = v.modalvoice.Process(trigger) * envout;

  if (trigger) {
    v.sparkleenv.SetTime(ADSR_SEG_ATTACK, 0.001f);
    v.sparkleenv.SetTime(ADSR_SEG_DECAY, 0.04f + strike * 0.06f);
    v.sparkleenv.SetSustainLevel(0.f);
    v.sparkleenv.SetTime(ADSR_SEG_RELEASE, 0.03f);
    const float strikeenv = v.sparkleenv.Process(true);
    body += stringbownoisesample(v) * strikeenv * strike * tone * vel * 0.35f;
  } else if (gate && envout > 0.01f) {
    body += stringbownoisesample(v) * envout * strike * tone * 0.06f;
  }

  v.lastenv = envout;
  return body * kTimpaniVoiceGain;
}

float bowedvoice(ZssVoice& v, int vi, float hz, bool gate, int algo, int cfg,
                 float port, float velocity) {
  const SosParams p = readsosparams(cfg);
  const float bow = clamp01(p.p0 > 0.f ? p.p0 : 0.24f);
  const float pressure = clamp01(p.p1 > 0.f ? p.p1 : 0.5f);
  const float vibdepth = clamp01(p.p2 > 0.f ? p.p2 : 0.35f);
  const float bodymix = clamp01(p.p3 > 0.f ? p.p3 : 0.55f);
  const float vel = clampf(velocity, 0.1f, 1.f);

  hz = glidefreq(v, vi, hz > 0.f ? hz : 440.f, kBowedVoice, port);
  float envout = v.voiceenv.process(gate) * vel;

  const float vibcents = vibdepth * (algo == 1 ? 6.f : 8.f);
  const float viblfo = sosdelayedvibrato(v, gate, vibcents, 0.3f);
  const float playhz = hz * (1.f + viblfo);

  float sig = oscbasicwave(v.synthosc, 3, playhz, 0.6f);
  const float bowamt =
      bow * (algo == 1 ? 1.2f : 1.f) * (0.65f + pressure * 0.55f);
  sig += breathlayer(v, envout, bowamt);

  v.stringbodylo.SetFreq(algo == 1 ? 360.f : 450.f);
  v.stringbodylo.SetRes(0.38f);
  v.stringbodylo.Process(sig);
  float out = sig * (1.f - bodymix * 0.45f);
  out += v.stringbodylo.Band() * bodymix * 0.38f;

  v.stringbodyhi.SetFreq(algo == 1 ? 2400.f : 3000.f);
  v.stringbodyhi.SetRes(0.24f);
  v.stringbodyhi.Process(sig);
  out += v.stringbodyhi.Band() * bodymix * 0.2f;

  const float cutoff = clampf(480.f + pressure * envout * vel * 2600.f, 350.f,
                              g_engine.sample_rate * 0.32f);
  v.stringlp.SetFreq(cutoff);
  v.stringlp.SetRes(0.12f + pressure * envout * 0.18f);
  v.stringlp.SetDrive(1.f);
  v.stringlp.Process(out);
  out = v.stringlp.Low() * envout;

  v.lastenv = envout;
  return out * kBowedVoiceGain;
}

static void applyguitarparams(ZssVoice& v, int cfg, int algo) {
  const SosParams p = readsosparams(cfg);
  const float pick = clamp01(p.p0 > 0.f ? p.p0 : 0.35f);
  const float body = clamp01(p.p1 > 0.f ? p.p1 : 0.38f);
  const float damping = clamp01(p.p2 > 0.f ? p.p2 : 0.5f);
  const float position = clamp01(p.p3 > 0.f ? p.p3 : 0.45f);

  const float structure = 0.1f + position * 0.12f;
  const float brightness = 0.15f + position * 0.35f + (algo == 1 ? 0.12f : 0.f);
  const float damp = 0.45f + damping * 0.4f;
  const float accent = 0.35f + pick * 0.35f;

  if (structure != v.guitarprev[0]) {
    v.stringvoice.SetStructure(structure);
    v.guitarprev[0] = structure;
  }
  if (brightness != v.guitarprev[1]) {
    v.stringvoice.SetBrightness(brightness);
    v.guitarprev[1] = brightness;
  }
  if (damp != v.guitarprev[2]) {
    v.stringvoice.SetDamping(damp);
    v.guitarprev[2] = damp;
  }
  if (accent != v.guitarprev[3]) {
    v.stringvoice.SetAccent(accent);
    v.guitarprev[3] = accent;
  }
  v.guitarbodymix = body;
  v.guitarpick = pick;
}

float guitarvoice(ZssVoice& v, float hz, bool gate, int algo, int cfg,
                  float velocity) {
  const float vel = clampf(velocity, 0.1f, 1.f);
  hz = hz > 0.f ? hz : 220.f;
  bool trigger = gate && !v.guitargateprev;
  v.guitargateprev = gate;

  applyguitarparams(v, cfg, algo);
  v.stringvoice.SetFreq(hz);
  v.stringvoice.SetSustain(false);
  if (trigger) {
    v.stringvoice.Reset();
  }
  float out = v.stringvoice.Process(trigger);

  v.stringbodylo.SetFreq(180.f);
  v.stringbodylo.SetRes(0.3f);
  v.stringbodylo.Process(out);
  out += v.stringbodylo.Band() * v.guitarbodymix * 0.25f;

  if (trigger) {
    v.sparkleenv.SetTime(ADSR_SEG_ATTACK, 0.001f);
    v.sparkleenv.SetTime(ADSR_SEG_DECAY, algo == 1 ? 0.025f : 0.035f);
    v.sparkleenv.SetSustainLevel(0.f);
    v.sparkleenv.SetTime(ADSR_SEG_RELEASE, 0.02f);
    float sparkenv = v.sparkleenv.Process(true);
    float pick =
        stringbownoisesample(v) * sparkenv * v.guitarpick * vel * 0.35f;
    out += pick;
  }

  v.lastenv = std::fabs(out);
  return out * kGuitarVoiceGain;
}

static float orgscannervib(ZssVoice& v, float hz, float leak, int harmonic) {
  const float rate = 5.8f + leak * 1.4f;
  v.organvibphase += (kTwoPi * rate) / g_engine.sample_rate;
  if (v.organvibphase > kTwoPi) {
    v.organvibphase -= kTwoPi;
  }
  const float depth = 0.0012f + leak * 0.0018f;
  const float phase = v.organvibphase * (1.f + harmonic * 0.17f);
  return hz * (1.f + std::sin(phase) * depth);
}

float organvoice(ZssVoice& v, float hz, bool gate, int algo, int cfg) {
  const SosParams p = readsosparams(cfg);
  const float drawbar = clamp01(p.p0 > 0.f ? p.p0 : 0.7f);
  const float click = clamp01(p.p1 > 0.f ? p.p1 : 0.15f);
  const float leak = clamp01(p.p2 > 0.f ? p.p2 : 0.2f);
  const float bright = clamp01(p.p3 > 0.f ? p.p3 : 0.5f);

  hz = hz > 0.f ? hz : 440.f;
  bool trigger = gate && !v.organgateprev;
  v.organgateprev = gate;

  float envout = v.voiceenv.process(gate);

  float sig = 0.f;
  if (algo == 1) {
    const float d16 = drawbar * 0.35f;
    const float d513 = drawbar * 0.22f * bright;
    const float d8 = 0.35f + drawbar * 0.35f;
    const float d4 = 0.28f + drawbar * 0.3f;
    const float d223 = 0.18f + bright * 0.22f;
    const float d2 = 0.2f + bright * 0.18f;
    const float d1 = 0.14f + bright * 0.12f;
    const float d12 = 0.1f + bright * 0.08f;
    sig += oscbasicwave(v.synthosc, 1, orgscannervib(v, hz * 0.5f, leak, 0),
                        d16 + leak * 0.08f);
    sig += oscbasicwave(v.synthmod, 1, orgscannervib(v, hz * 0.666f, leak, 1),
                        d513);
    sig += oscbasicwave(v.algoops[0], 1, orgscannervib(v, hz, leak, 2), d8);
    sig +=
        oscbasicwave(v.algoops[1], 1, orgscannervib(v, hz * 2.f, leak, 3), d4);
    sig += oscbasicwave(v.algoops[2], 3, orgscannervib(v, hz * 2.67f, leak, 4),
                        d223);
    sig +=
        oscbasicwave(v.sparklemod, 1, orgscannervib(v, hz * 4.f, leak, 5), d2);
    sig +=
        oscbasicwave(v.sparklecar, 1, orgscannervib(v, hz * 8.f, leak, 6), d1);
    sig +=
        oscbasicwave(v.dootosc, 3, orgscannervib(v, hz * 12.f, leak, 7), d12);
  } else {
    const float d8 = 0.55f;
    const float d4 = 0.45f;
    const float d2 = 0.35f + bright * 0.25f;
    const float d1 = 0.25f + bright * 0.15f;
    sig +=
        oscbasicwave(v.synthosc, 1, orgscannervib(v, hz, leak, 0), d8 * 0.35f);
    sig += oscbasicwave(v.synthmod, 1, orgscannervib(v, hz * 2.f, leak, 1),
                        d4 * 0.28f);
    sig += oscbasicwave(v.algoops[0], 1, orgscannervib(v, hz * 4.f, leak, 2),
                        d2 * 0.22f);
    sig += oscbasicwave(v.algoops[1], 3, orgscannervib(v, hz * 8.f, leak, 3),
                        d1 * 0.18f);
    sig += oscbasicwave(v.algoops[2], 3, orgscannervib(v, hz * 0.5f, leak, 4),
                        leak * 0.12f);
  }

  if (trigger) {
    sig += stringbownoisesample(v) * click * 0.18f;
    if (algo == 1 && click > 0.4f) {
      v.sparkleenv.SetTime(ADSR_SEG_ATTACK, 0.001f);
      v.sparkleenv.SetTime(ADSR_SEG_DECAY, 0.06f);
      v.sparkleenv.SetSustainLevel(0.f);
      v.sparkleenv.SetTime(ADSR_SEG_RELEASE, 0.04f);
      sig +=
          stringbownoisesample(v) * v.sparkleenv.Process(true) * click * 0.12f;
    }
  }

  v.lastenv = envout;
  return sig * envout * kOrganVoiceGain;
}

} // namespace zss_daisy
