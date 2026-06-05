/**
 * Voice, FX, drum, and engine state types (DaisySP module instances).
 */
#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>

#include "daisysp.h"
#include "reverbsc.h"
#include "zss_config.h"
#include "zss_math.h"

using namespace daisysp;

namespace zss_daisy {

struct NoiseMeta
{
  float basepitch;
  float pitchfiltermult;
  bool  issoft;
  float expression;
};

struct OscCfg
{
  float phase, width, modfreq, harmonicity, modindex, count, spread, partialcount;
  float partials[8];
  float modenv_a, modenv_d, modenv_s, modenv_r;
  int   modtype;
};

struct AlgoCfg
{
  float h1, h2, h3, mi1, mi2, mi3;
  int   osctype[4];
  float env_a[4], env_d[4], env_s[4], env_r[4];
};

/** Tone-shaped play envelope: linear attack, exponential decay/release (AmplitudeEnvelope defaults). */
struct ZssLinearEnv
{
  float attack_sec  = 0.01f;
  float decay_sec   = 0.01f;
  float sustain     = 0.5f;
  float release_sec = 0.01f;
  float level       = 0.f;
  float sample_rate = 44100.f;
  float atkinc      = 0.f;
  float deccoef     = 0.f;
  float relcoef     = 0.f;
  bool  gateprev    = false;

  enum Stage
  {
    Idle = 0,
    Attack,
    Decay,
    Sustain,
    Release
  };
  Stage stage = Idle;

  static float onepolecoef(float sec, float sr)
  {
    const float tau = std::max(1.f, sec * sr);
    return 1.f - std::exp(-1.f / tau);
  }

  void refreshinc()
  {
    atkinc    = 1.f / std::max(1.f, attack_sec * sample_rate);
    deccoef   = onepolecoef(decay_sec * kEnvDecayTauScale, sample_rate);
    relcoef   = onepolecoef(release_sec * kEnvReleaseTauScale, sample_rate);
  }

  void init(float sr)
  {
    sample_rate = sr;
    setparams(0.01f, 0.01f, 0.5f, 0.01f);
    reset();
  }

  void reset()
  {
    level    = 0.f;
    stage    = Idle;
    gateprev = false;
  }

  void setparams(float a, float d, float s, float r)
  {
    attack_sec  = std::max(0.001f, a);
    decay_sec   = std::max(0.001f, d);
    sustain     = clampf(s, 0.f, 1.f);
    release_sec = std::max(0.001f, r);
    refreshinc();
  }

  /** Restart attack while gate stays high (Tone triggerAttackRelease legato). */
  void retrigger()
  {
    stage = Attack;
    level = 0.f;
  }

  float process(bool gate)
  {
    const bool g = gate;
    if(g && !gateprev)
    {
      stage = Attack;
      level = 0.f;
    }
    else if(!g && gateprev)
    {
      stage = Release;
    }
    gateprev = g;

    switch(stage)
    {
      case Attack:
        level += atkinc;
        if(level >= 1.f)
        {
          level = 1.f;
          stage = Decay;
        }
        break;
      case Decay:
        level += (sustain - level) * deccoef;
        if(level <= sustain + 1e-5f)
        {
          level = sustain;
          stage = g ? Sustain : Release;
        }
        break;
      case Sustain:
        level = sustain;
        if(!g)
        {
          stage = Release;
        }
        break;
      case Release:
        level += (0.f - level) * relcoef;
        if(level <= 1e-5f)
        {
          level = 0.f;
          stage = Idle;
        }
        break;
      case Idle:
      default:
        level = 0.f;
        if(g)
        {
          stage = Attack;
          level = 0.f;
        }
        break;
    }
    return level;
  }
};

/** One playable voice — oscillators, physical models, and per-voice envelopes */
struct ZssVoice
{
  Oscillator synthosc, synthmod, dootosc;
  Oscillator sparklemod, sparklecar;
  Oscillator algoops[4];
  ZssLinearEnv voiceenv;
  ZssLinearEnv modenv;
  Adsr       dootenv, sparkleenv, algooutenv;
  Adsr       algoenvs[4];
  float      playfreq = 440.f;
  float      glidestart = 440.f, glidetarget = 440.f;
  int        glidetotal = 0, glideremain = 0;
  float      voicephasestep = 0.f;
  float      noteonfade     = 1.f;
  bool       synthgateprev = false, gateprev = false, noiseprev = false;
  float      synthschedhz  = 0.f;
  float      synthstriketag = 0.f;
  float      dootpitch = 1.f;
  float      noisephase = 0.f, noisesample = 0.f;
  uint32_t   noiserng = 0;
  float modenvprev_a = -1.f;
  float modenvprev_d = -1.f, modenvprev_s = -1.f, modenvprev_r = -1.f;
  float      envprev_a = -1.f, envprev_d = -1.f, envprev_s = -1.f, envprev_r = -1.f;
  float      dootprev_a = -1.f, dootprev_d = -1.f, dootprev_s = -1.f, dootprev_r = -1.f;
  float      algoprev_a = -1.f, algoprev_d = -1.f, algoprev_s = -1.f, algoprev_r = -1.f;
  float      algoenvprev_a[4] = {-1.f, -1.f, -1.f, -1.f};
  float      algoenvprev_d[4] = {-1.f, -1.f, -1.f, -1.f};
  float      algoenvprev_s[4] = {-1.f, -1.f, -1.f, -1.f};
  float      algoenvprev_r[4] = {-1.f, -1.f, -1.f, -1.f};
  float      lastenv = 0.f;
  StringVoice stringvoice;
  Svf           stringlp;
  Svf           stringbodylo;
  Svf           stringbodyhi;
  OnePole       stringbowhp;
  Oscillator    stringviblfo;
  Oscillator    stringpwmlfo;
  ModalVoice    modalvoice;
  Drip          drip;
  int           stringvoicepreset = -1;
  float         pluckprev[4]      = {-1.f, -1.f, -1.f, -1.f};
  bool          stringgateprev = false;
  bool          bellgateprev   = false;
  bool          dripgateprev   = false;
  bool          pianogateprev  = false;
  bool          timpanigateprev = false;
  bool          guitargateprev = false;
  bool          organgateprev  = false;
  float         timpanipitch   = 1.f;
  int           guitarpreset   = -1;
  float         guitarprev[4]  = {-1.f, -1.f, -1.f, -1.f};
  float         guitarbodymix  = 0.38f;
  float         guitarpick     = 0.35f;
};

/** Schroeder-style comb for reverb predelay */
struct MaxiCombLine
{
  float buf[kRevCombMaxLen] = {};
  int   pos                 = 0;
  int   len                 = 1;

  void setlen(int samples)
  {
    len = std::max(1, std::min(kRevCombMaxLen, samples));
    pos = 0;
    std::memset(buf, 0, sizeof(buf));
  }

  float dl(float input, float fb)
  {
    if(pos >= len)
    {
      pos = 0;
    }
    const float out = buf[pos];
    buf[pos]        = input * fb * 0.5f + buf[pos] * fb;
    pos             = pos + 1;
    return out;
  }
};

struct ZssDrumState
{
  int        remain = 0;
  uint32_t   prev_strike = 0;
  OnePole    hp;
  BiquadState eq[3], bp;
};

/** Per-bus FX rack: Daisy Decimator, Overdrive, Svf, ReverbSc, Autowah, echo line */
struct ZssFxGroup
{
  Decimator                      decimator;
  Overdrive                      overdrive;
  Svf                            autofilter_svf;
  Phasor                         autofilter_phasor;
  DelayLine<float, kEchoBufLen>  echo_line;
  int                            echo_delay = 1;
  float                          echo_feedback = 0.f;
  MaxiCombLine                   rev_predelay_line;
  ReverbSc                       reverbsc;
  float                          rev_predelay_fb  = 0.f;
  int                            rev_predelay_len = 0;
  Autowah                        autowah;
  float                          return_comp_env = 0.f;
};

/** Global synth engine — voices, drums, FX groups, main dynamics */
struct ZssEngine
{
  float        sample_rate = 44100.f;
  ZssVoice     voices[kVoiceCount];
  ZssDrumState drums[kDrumCount];
  AnalogBassDrum    bass_drum;
  SyntheticBassDrum tom_drum;
  ZssFxGroup   fx[kFxGroups];
  Oscillator   drumoscA[kDrumCount], drumoscB[kDrumCount];
  float        drumsidechain = 0.f;
  float        sc_prevlevel = 1e-6f;
  float        sc_prevgaindb = 0.f;
  float        sc_gainlinear = 1.f;
  float        fxvibrato_depth = 0.f;
  WhiteNoise   drum_whitenoise;
  Oscillator   fxvibratolfo;
  Oscillator   razzlevibratolfo, razzlechoruslfo, razzlehissmod;
  WhiteNoise   razzlehiss;
  DcBlock      main_dcblock;
  float        razzle_vib_buf[512];
  float        razzle_chorus_buf[512];
  int          razzle_vib_pos = 0;
  int          razzle_chorus_pos = 0;
  float        comp_env = 0.f;
  float        comp_gr_db = 0.f;
  float        comp_gain_smooth = 1.f;
  float        comp_gain_attack_coef = 0.f;
  float        comp_gain_release_coef = 0.f;
  float        debug_duck_gain = 1.f;
  float        debug_dry_peak = 0.f;
  float        comp_attack_coef = 0.f;
  float        comp_release_coef = 0.f;
  float        fx_return_attack_coef  = 0.f;
  float        fx_return_release_coef = 0.f;
  int          sampleclock = 0;
  float        cached_mainvol = 0.f, cached_bggain = 0.f;
  float        cached_ttsgain = 0.f;
  float        cached_mainraw = 80.f, cached_bgraw = 100.f, cached_ttsraw = 25.f;
  float        mainvolprev = 80.f;
  bool         ready = false;
};

extern ZssEngine g_engine;

} // namespace zss_daisy
