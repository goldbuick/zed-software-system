/**
 * ZSS DaisySP synth — see zss/README.md for module map.
 */
#ifdef __arm__
#undef __arm__
#endif

#include "zss_internal.h"

namespace zss_daisy {

// --- Dynamics: play-bus sidechain, main compressor, razzle, string machine ---

void resetsidechainstate() {
  g_engine.sc_prevgaindb = 0.f;
  g_engine.sc_prevlevel = 1e-6f;
  g_engine.sc_gainlinear = std::pow(10.f, kScMakeupDb / 20.f);
}

void initmainchain(float sr) {
  g_engine.comp_env = 0.f;
  g_engine.comp_gain_smooth = 1.f;
  g_engine.comp_attack_coef = 1.f - std::exp(-1.f / (kMainCompAttackSec * sr));
  g_engine.comp_release_coef =
      1.f - std::exp(-1.f / (kMainCompReleaseSec * sr));
  g_engine.comp_gain_attack_coef =
      1.f - std::exp(-1.f / (kMainCompGainAttackSec * sr));
  g_engine.comp_gain_release_coef =
      1.f - std::exp(-1.f / (kMainCompGainReleaseSec * sr));
  resetsidechainstate();
}

void initrazzlechain(float sr) {
  g_engine.razzlevibratolfo.Init(sr);
  g_engine.razzlevibratolfo.SetFreq(0.125f);
  g_engine.razzlevibratolfo.SetWaveform(Oscillator::WAVE_SQUARE);
  g_engine.razzlevibratolfo.SetAmp(1.f);
  g_engine.razzlechoruslfo.Init(sr);
  g_engine.razzlechoruslfo.SetFreq(0.01f);
  g_engine.razzlechoruslfo.SetWaveform(Oscillator::WAVE_SAW);
  g_engine.razzlechoruslfo.SetAmp(1.f);
  g_engine.razzlehissmod.Init(sr);
  g_engine.razzlehissmod.SetFreq(0.25f * kPi);
  g_engine.razzlehissmod.SetWaveform(Oscillator::WAVE_SIN);
  g_engine.razzlehissmod.SetAmp(1.f);
  g_engine.razzlehiss.Init();
  g_engine.razzle_vib_pos = 0;
  g_engine.razzle_chorus_pos = 0;
  std::memset(g_engine.razzle_vib_buf, 0, sizeof(g_engine.razzle_vib_buf));
  std::memset(g_engine.razzle_chorus_buf, 0,
              sizeof(g_engine.razzle_chorus_buf));
}

float sidechainkey(float bg, float tts, float drumtap) {
  const float sc_send_trim = dbtoamp(-12.f);
  const float sc_drum_trim = dbtoamp(-28.f);
  float trigger = 0.f;
  trigger += std::fabs(bg) * sc_send_trim;
  trigger += std::fabs(tts) * sc_send_trim;
  trigger += std::fabs(drumtap) * sc_drum_trim;
  if (trigger < kScTriggerFloor) {
    trigger = 0.f;
  }
  return trigger;
}

void sidechainupdate(float signal) {
  float s = std::fabs(signal);
  const float sc_attack =
      1.f - std::exp(-1.f / (kScAttackSec * g_engine.sample_rate));
  const float sc_release =
      1.f - std::exp(-1.f / (kScReleaseSec * g_engine.sample_rate));
  // Tone/Maxi: power envelope always smoothed with attack coef (not amp vs
  // power compare).
  g_engine.sc_prevlevel += (s * s - g_engine.sc_prevlevel) * sc_attack;
  if (g_engine.sc_prevlevel < 1e-6f) {
    g_engine.sc_prevlevel = 1e-6f;
  }
  float leveldb = std::log10(g_engine.sc_prevlevel) * 10.f;
  float above = leveldb - (-42.f);
  float targetdb = above / 5.f - above;
  if (targetdb > 0.f) {
    targetdb = 0.f;
  }
  float gaindb = targetdb;
  if (gaindb < g_engine.sc_prevgaindb) {
    gaindb =
        g_engine.sc_prevgaindb + (gaindb - g_engine.sc_prevgaindb) * sc_attack;
  } else {
    gaindb =
        g_engine.sc_prevgaindb + (gaindb - g_engine.sc_prevgaindb) * sc_release;
  }
  g_engine.sc_prevgaindb = gaindb;
  g_engine.sc_gainlinear = std::pow(10.f, (gaindb + kScMakeupDb) / 20.f);
}

float sidechaingain() { return 1.f + (g_engine.sc_gainlinear - 1.f) * kScMix; }

float readttsvolume() {
  float vol = readctrl(off_main() + 2);
  if (vol <= 0.001f) {
    return 0.f;
  }
  return vol / 100.f;
}

float razzledelay(float *buf, int &pos, int len, float in, float delaysec) {
  int d = std::max(1, static_cast<int>(delaysec * g_engine.sample_rate));
  if (d >= len) {
    d = len - 1;
  }
  int readpos = pos - d;
  if (readpos < 0) {
    readpos += len;
  }
  float out = buf[readpos];
  buf[pos] = in;
  pos = (pos + 1) % len;
  return out;
}

float compressorskneedb(float dbover, float ratio, float kneedb) {
  if (dbover <= 0.f) {
    return 0.f;
  }
  if (kneedb <= 0.f) {
    return dbover - dbover / ratio;
  }
  const float halfknee = kneedb * 0.5f;
  if (dbover < halfknee) {
    const float x = dbover + halfknee;
    return x * x / (2.f * kneedb) * (1.f / ratio - 1.f);
  }
  return dbover - dbover / ratio;
}

float maincomptargetgain() {
  const float thresh = std::pow(10.f, kMainCompThresholdDb / 20.f);
  float dbover = 20.f * std::log10(g_engine.comp_env / thresh);
  if (dbover < 0.f) {
    dbover = 0.f;
  }
  float reduced = compressorskneedb(dbover, kMainCompRatio, kMainCompKneeDb);
  return std::pow(10.f, -reduced / 20.f);
}

void maincompdetect(float ax) {
  if (ax < kMainCompSilenceFloor) {
    g_engine.comp_env *= kMainCompSilenceDecay;
    if (g_engine.comp_env < 1e-8f) {
      g_engine.comp_env = 0.f;
    }
    return;
  }
  float coef = (ax > g_engine.comp_env) ? g_engine.comp_attack_coef
                                        : g_engine.comp_release_coef;
  g_engine.comp_env += (ax - g_engine.comp_env) * coef;
}

float maincompressor(float x) {
  if (readctrl(off_main() + 3) > 0.5f) {
    g_engine.comp_gr_db = 0.f;
    return x;
  }
  maincompdetect(std::fabs(x));
  float target = maincomptargetgain();
  float gcoef = (target < g_engine.comp_gain_smooth)
                    ? g_engine.comp_gain_attack_coef
                    : g_engine.comp_gain_release_coef;
  g_engine.comp_gain_smooth += (target - g_engine.comp_gain_smooth) * gcoef;
  const float applied =
      (1.f - kMainCompMix) + kMainCompMix * g_engine.comp_gain_smooth;
  const float grlinear = std::max(applied, 1e-6f);
  g_engine.comp_gr_db = 20.f * std::log10(grlinear);
  return x * applied;
}

float applyrazzle(float input) {
  float vibratodepth = g_engine.razzlevibratolfo.Process() * 0.0015f;
  float vibtap = razzledelay(g_engine.razzle_vib_buf, g_engine.razzle_vib_pos,
                             512, input, 0.005f + vibratodepth);
  float vibrato = input + (vibtap - input) * kRazzleVibratoWet;

  float chorusdepth =
      g_engine.razzlechoruslfo.Process() * kRazzleChorusDepthSec;
  float hissmod =
      0.35f + 0.65f * (0.5f + 0.5f * g_engine.razzlehissmod.Process());
  float hissamp = g_engine.razzlehiss.Process() * kRazzleHissGain * hissmod;

  // Tone: modulated tape hiss feeds the chorus input (always-on bed, even when
  // dry=0).
  float chortap =
      razzledelay(g_engine.razzle_chorus_buf, g_engine.razzle_chorus_pos, 512,
                  vibrato + hissamp, kRazzleChorusBaseSec + chorusdepth);
  return vibrato + (chortap - vibrato) * kRazzleChorusWet;
}

float readmainvolume() {
  float vol = readctrl(off_main());
  if (vol <= 0.001f) {
    return 0.f;
  }
  if (g_engine.mainvolprev <= 0.001f && vol > 0.001f) {
    initmainchain(g_engine.sample_rate);
  }
  g_engine.mainvolprev = vol;
  float db = 20.f * std::log10(vol * 0.25f) - 35.f;
  return std::pow(10.f, db / 20.f);
}

float readbgplayvolume() {
  float vol = readctrl(off_main() + 1);
  if (vol <= 0.001f) {
    return 0.f;
  }
  return std::pow(10.f, (20.f * std::log10(vol) - 35.f) / 20.f);
}

void applypluckparams(ZssVoice &v, int cfg) {
  const float structure = readctrl(cfg + 6);
  const float brightness = readctrl(cfg + 7);
  const float damping = readctrl(cfg + 8);
  const float accent = readctrl(cfg + 9);
  if (structure != v.pluckprev[0]) {
    v.stringvoice.SetStructure(structure);
    v.pluckprev[0] = structure;
  }
  if (brightness != v.pluckprev[1]) {
    v.stringvoice.SetBrightness(brightness);
    v.pluckprev[1] = brightness;
  }
  if (damping != v.pluckprev[2]) {
    v.stringvoice.SetDamping(damping);
    v.pluckprev[2] = damping;
  }
  if (accent != v.pluckprev[3]) {
    v.stringvoice.SetAccent(accent);
    v.pluckprev[3] = accent;
  }
}

void applystringensembleparams(ZssVoice &v, int cfg, float &detunecents,
                               float &pwmdepth, float &vibcents,
                               float &filterscale) {
  const float detraw = readctrl(cfg + 6);
  const float pwmraw = readctrl(cfg + 7);
  const float vibraw = readctrl(cfg + 8);
  const float filtraw = readctrl(cfg + 9);
  detunecents = detraw > 0.f ? clampf(detraw, 0.f, 1.f) * kStringMaxDetuneCents
                             : kStringDefaultDetune;
  pwmdepth = pwmraw > 0.f ? clampf(pwmraw, 0.f, 1.f) : kStringDefaultPwm;
  vibcents = vibraw > 0.f ? clampf(vibraw, 0.f, 1.f) * kStringMaxVibCents
                          : kStringDefaultVib;
  filterscale =
      filtraw > 0.f ? clampf(filtraw, 0.f, 1.f) : kStringDefaultFilter;
}

void applystringvoicepreset(ZssVoice &v, int algo) {
  if (v.stringvoicepreset == algo) {
    return;
  }
  v.stringvoicepreset = algo;
  if (algo == 1) {
    v.pluckprev[0] = v.pluckprev[1] = v.pluckprev[2] = v.pluckprev[3] = -1.f;
  }
}

float stringmachinevoice(ZssVoice &v, float hz, float envout, float detunecents,
                         float pwmdepth, float vibcents, float filterscale) {
  v.stringviblfo.SetFreq(4.8f);
  v.stringviblfo.SetWaveform(Oscillator::WAVE_TRI);
  v.stringviblfo.SetAmp(1.f);
  const float viblfo = v.stringviblfo.Process() * (vibcents / 1200.f);

  v.stringpwmlfo.SetFreq(0.75f);
  v.stringpwmlfo.SetWaveform(Oscillator::WAVE_SQUARE);
  v.stringpwmlfo.SetAmp(1.f);
  const float pwmfm = v.stringpwmlfo.Process() * pwmdepth * 0.004f;

  const float detmul = std::pow(2.f, detunecents / 1200.f);
  const float hz1 = hz * (1.f + viblfo);
  const float hz2 = hz * detmul * (1.f + pwmfm);

  const float vco1 = oscbasicwave(v.synthosc, 3, hz1, 1.f);
  const float vco2 = oscbasicwave(v.synthmod, 3, hz2, 1.f);
  float sig = (vco1 + vco2) * 0.5f;
  sig += oscbasicwave(v.algoops[0], 3, hz * 0.5f, 1.f) * kStringSubOctaveMix;
  sig /= (1.f + kStringSubOctaveMix);

  const float kf = std::pow(clampf(hz / 440.f, 0.25f, 4.f), 0.38f);
  const float basecut = 520.f + kf * 2100.f;
  const float filtenv = envout * 600.f * filterscale;
  const float cutoff =
      clampf((basecut + filtenv) * (0.75f + filterscale * 0.5f), 400.f,
             g_engine.sample_rate * 0.33f);
  v.stringlp.SetFreq(cutoff);
  v.stringlp.SetRes(0.12f);
  v.stringlp.SetDrive(1.f);
  v.stringlp.Process(sig);
  float out = v.stringlp.Low();

  v.stringbodylo.SetFreq(450.f);
  v.stringbodylo.SetRes(0.35f);
  v.stringbodylo.Process(sig);
  out += v.stringbodylo.Band() * kStringBodyLowMix;

  v.stringbodyhi.SetFreq(3000.f);
  v.stringbodyhi.SetRes(0.2f);
  v.stringbodyhi.Process(sig);
  out += v.stringbodyhi.Band() * kStringBodyHiMix;

  const float nois = stringbownoisesample(v);
  v.stringbowhp.SetFilterMode(OnePole::FILTER_MODE_HIGH_PASS);
  float hpnorm = 1200.f / g_engine.sample_rate;
  if (hpnorm > 0.497f) {
    hpnorm = 0.497f;
  }
  v.stringbowhp.SetFrequency(hpnorm);
  out += v.stringbowhp.Process(nois) * envout * kStringBowNoiseMix;

  return out;
}
} // namespace zss_daisy
