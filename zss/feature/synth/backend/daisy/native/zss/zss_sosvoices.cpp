/**
 * SOS Synth Secrets voice implementations (wind, piano, timpani, bowed, guitar, organ).
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

static float windcutoff(float hz, float envout, int algo, float brightness,
                        float pressure) {
  const float kf = std::pow(clampf(hz / 440.f, 0.25f, 4.f), algo == 2 ? 0.28f : 0.38f);
  float base = 400.f + brightness * 2200.f * kf;
  if (algo == 1) {
    base *= 0.75f;
  }
  if (algo == 3) {
    base *= 0.85f;
  }
  return clampf(base + envout * pressure * 1800.f, 300.f,
                  g_engine.sample_rate * 0.33f);
}

static float windres(float envout, int algo, float resonance, float pressure) {
  float r = 0.08f + resonance * 0.35f;
  if (algo == 2) {
    r += envout * pressure * 0.25f;
  }
  return clampf(r, 0.05f, 0.55f);
}

static float breathlayer(ZssVoice &v, float envout, float breath) {
  const float nois = stringbownoisesample(v);
  v.stringbowhp.SetFilterMode(OnePole::FILTER_MODE_HIGH_PASS);
  float hpnorm = 900.f / g_engine.sample_rate;
  if (hpnorm > 0.497f) {
    hpnorm = 0.497f;
  }
  v.stringbowhp.SetFrequency(hpnorm);
  return v.stringbowhp.Process(nois) * envout * breath * 0.35f;
}

float windvoice(ZssVoice &v, float hz, bool gate, int algo, int cfg) {
  const SosParams p = readsosparams(cfg);
  const float breath = clamp01(p.p0 > 0.f ? p.p0 : 0.3f);
  const float pressure = clamp01(p.p1 > 0.f ? p.p1 : 0.45f);
  const float brightness = clamp01(p.p2 > 0.f ? p.p2 : 0.45f);
  const float resonance = clamp01(p.p3 > 0.f ? p.p3 : 0.15f);

  float envout = v.voiceenv.process(gate);
  float sig = 0.f;

  if (algo == 3) {
    const float ratios[] = {1.f, 1.002f, 0.998f, 1.004f};
    for (int i = 0; i < 4; ++i) {
      Oscillator &o = i == 0 ? v.synthosc : v.algoops[i - 1];
      const int wave = i % 2 == 0 ? 2 : 3;
      sig += oscbasicwave(o, wave, hz * ratios[i], 0.22f);
    }
    sig *= 0.85f;
  } else {
    const int wave =
        algo == 1 ? 0 : (algo == 2 ? 3 : 2);
    float body = oscbasicwave(v.synthosc, wave, hz, 0.55f);
    if (algo == 0) {
      body = body * 0.55f + oscbasicwave(v.synthmod, 3, hz, 0.45f) * 0.45f;
    }
    sig = body;
  }

  const float cutoff = windcutoff(hz, envout, algo, brightness, pressure);
  v.stringlp.SetFreq(cutoff);
  v.stringlp.SetRes(windres(envout, algo, resonance, pressure));
  v.stringlp.SetDrive(1.f);
  v.stringlp.Process(sig);
  float out = v.stringlp.Low();

  if (algo == 1) {
    v.stringbodylo.SetFreq(420.f);
    v.stringbodylo.SetRes(0.4f);
    v.stringbodylo.Process(sig);
    out += v.stringbodylo.Band() * 0.12f;
  }

  out += breathlayer(v, envout, breath);
  v.lastenv = envout;
  return out * envout * kWindVoiceGain;
}

float pianovoice(ZssVoice &v, float hz, bool gate, int algo, int cfg,
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
  const float stretch = 1.f + clampf(hz / 880.f, 0.f, 1.f) * 0.004f;

  float body = oscbasicwave(v.synthosc, algo == 1 ? 1 : 3, hz, 0.34f);
  body += oscbasicwave(v.synthmod, algo == 1 ? 1 : 3, hz * detmul, 0.33f);
  body += oscbasicwave(v.algoops[0], algo == 1 ? 1 : 3, hz / detmul * stretch, 0.33f);
  body /= 3.f;

  float impact = 0.f;
  if (trigger || gate) {
    v.sparkleenv.SetTime(ADSR_SEG_ATTACK, 0.001f);
    v.sparkleenv.SetTime(ADSR_SEG_DECAY, algo == 1 ? 0.08f : 0.05f);
    v.sparkleenv.SetSustainLevel(0.f);
    v.sparkleenv.SetTime(ADSR_SEG_RELEASE, 0.04f);
    float sparkenv = v.sparkleenv.Process(trigger);
    float sparkhz = hz * (algo == 1 ? 3.5f : 4.f);
    v.sparklemod.SetFreq(sparkhz * 5.1f);
    v.sparklemod.SetWaveform(Oscillator::WAVE_SIN);
    v.sparklemod.SetAmp(1.f);
    float sparkmod = v.sparklemod.Process() * 16.f;
    v.sparklecar.SetFreq(sparkhz + sparkmod * 0.002f);
    v.sparklecar.SetWaveform(Oscillator::WAVE_SIN);
    v.sparklecar.SetAmp(1.f);
    impact = v.sparklecar.Process() * sparkenv * hammer * vel * 0.22f;
    const float clunk = stringbownoisesample(v) * sparkenv * hammer * 0.08f;
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

  v.lastenv = envout;
  return out * kPianoVoiceGain;
}

float timpanivoice(ZssVoice &v, float hz, bool gate, int cfg, float velocity) {
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
    const float bend = 0.999f - (1.f - tension) * 0.0004f;
    v.timpanipitch *= bend;
    if (v.timpanipitch < 0.55f + (1.f - decayscale) * 0.15f) {
      v.timpanipitch = 0.55f + (1.f - decayscale) * 0.15f;
    }
  }

  float envout = v.voiceenv.process(gate) * vel;
  const float pitchmul = 0.55f + v.timpanipitch * 0.45f;
  v.dootosc.SetFreq(hz * pitchmul);
  v.dootosc.SetWaveform(Oscillator::WAVE_SIN);
  v.dootosc.SetAmp(1.f);
  float body = v.dootosc.Process() * envout;

  if (gate && envout > 0.01f) {
    body += stringbownoisesample(v) * envout * strike * tone * 0.12f;
  }

  v.lastenv = envout;
  return body * kTimpaniVoiceGain;
}

float bowedvoice(ZssVoice &v, int vi, float hz, bool gate, int algo, int cfg,
                 float port, float velocity) {
  const SosParams p = readsosparams(cfg);
  const float bow = clamp01(p.p0 > 0.f ? p.p0 : 0.24f);
  const float pressure = clamp01(p.p1 > 0.f ? p.p1 : 0.5f);
  const float vibdepth = clamp01(p.p2 > 0.f ? p.p2 : 0.35f);
  const float bodymix = clamp01(p.p3 > 0.f ? p.p3 : 0.55f);
  const float vel = clampf(velocity, 0.1f, 1.f);

  hz = glidefreq(v, vi, hz > 0.f ? hz : 440.f, kBowedVoice, port);
  float envout = v.voiceenv.process(gate) * vel;

  v.stringviblfo.SetFreq(4.8f);
  v.stringviblfo.SetWaveform(Oscillator::WAVE_TRI);
  v.stringviblfo.SetAmp(1.f);
  const float vibcents = vibdepth * (algo == 1 ? 6.f : 8.f);
  const float viblfo = v.stringviblfo.Process() * (vibcents / 1200.f);
  const float playhz = hz * (1.f + viblfo);

  float sig = oscbasicwave(v.synthosc, 3, playhz, 0.6f);
  sig += breathlayer(v, envout, bow * (algo == 1 ? 1.15f : 1.f));

  v.stringbodylo.SetFreq(algo == 1 ? 380.f : 450.f);
  v.stringbodylo.SetRes(0.35f);
  v.stringbodylo.Process(sig);
  float out = sig * (1.f - bodymix * 0.45f);
  out += v.stringbodylo.Band() * bodymix * 0.35f;

  v.stringbodyhi.SetFreq(algo == 1 ? 2600.f : 3000.f);
  v.stringbodyhi.SetRes(0.22f);
  v.stringbodyhi.Process(sig);
  out += v.stringbodyhi.Band() * bodymix * 0.18f;

  const float cutoff =
      clampf(500.f + pressure * envout * vel * 2200.f, 350.f,
             g_engine.sample_rate * 0.3f);
  v.stringlp.SetFreq(cutoff);
  v.stringlp.SetRes(0.14f);
  v.stringlp.SetDrive(1.f);
  v.stringlp.Process(out);
  out = v.stringlp.Low() * envout;

  v.lastenv = envout;
  return out * kBowedVoiceGain;
}

static void applyguitarparams(ZssVoice &v, int cfg, int algo) {
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

float guitarvoice(ZssVoice &v, float hz, bool gate, int algo, int cfg,
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
    float pick = stringbownoisesample(v) * sparkenv * v.guitarpick * vel * 0.35f;
    out += pick;
  }

  v.lastenv = std::fabs(out);
  return out * kGuitarVoiceGain;
}

float organvoice(ZssVoice &v, float hz, bool gate, int algo, int cfg) {
  const SosParams p = readsosparams(cfg);
  const float drawbar = clamp01(p.p0 > 0.f ? p.p0 : 0.7f);
  const float click = clamp01(p.p1 > 0.f ? p.p1 : 0.15f);
  const float leak = clamp01(p.p2 > 0.f ? p.p2 : 0.2f);
  const float bright = clamp01(p.p3 > 0.f ? p.p3 : 0.5f);

  hz = hz > 0.f ? hz : 440.f;
  bool trigger = gate && !v.organgateprev;
  v.organgateprev = gate;

  float envout = v.voiceenv.process(gate);
  const float d8 = algo == 1 ? drawbar : 0.75f;
  const float d4 = algo == 0 ? 0.55f : 0.45f;
  const float d2 = 0.35f + bright * 0.25f;
  const float d1 = 0.25f + bright * 0.15f;

  float sig = 0.f;
  sig += oscbasicwave(v.synthosc, 1, hz, d8 * 0.35f);
  sig += oscbasicwave(v.synthmod, 1, hz * 2.f, d4 * 0.28f);
  sig += oscbasicwave(v.algoops[0], 1, hz * 4.f, d2 * 0.22f);
  sig += oscbasicwave(v.algoops[1], 3, hz * 8.f, d1 * 0.18f);
  sig += oscbasicwave(v.algoops[2], 3, hz * 0.5f, leak * 0.12f);

  if (trigger) {
    sig += stringbownoisesample(v) * click * 0.15f;
  }

  v.lastenv = envout;
  return sig * envout * kOrganVoiceGain;
}

} // namespace zss_daisy
