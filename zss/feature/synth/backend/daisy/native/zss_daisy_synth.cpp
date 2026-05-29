/**
 * ZSS monolithic DaisySP synth — reads control layout matching wasmsabchannels.ts.
 */
#ifdef __arm__
#undef __arm__
#endif

#include <algorithm>
#include <cmath>
#include <cstring>

#include "daisysp.h"

using namespace daisysp;

namespace {

constexpr int kVoiceCount = 8;
constexpr int kVoiceStride = 6;
constexpr int kDrumCount = 10;
constexpr int kFxGroups = 4;
constexpr int kFxSendCount = 7;
constexpr int kFxParamCount = 20;
constexpr int kVoiceCfgStride = 6;

constexpr int kVoicesLen = kVoiceCount * kVoiceStride;
constexpr int kDrumsLen = kDrumCount * 2;
constexpr int kMasterLen = 3;
constexpr int kFxLen = kFxGroups * kFxSendCount + kFxGroups * kFxParamCount;
constexpr int kVoiceCfgLen = kVoiceCount * kVoiceCfgStride;
constexpr int kOscCfgLen = kVoiceCount * 21;
constexpr int kAlgoCfgLen = kVoiceCount * 26;
constexpr int kVibratoLen = 13;
constexpr int kControlLen =
    kVoicesLen + kDrumsLen + kMasterLen + kFxLen + kVoiceCfgLen + kOscCfgLen +
    kAlgoCfgLen + kVibratoLen;

enum VoiceType
{
  kSynth = 0,
  kRetroNoise = 1,
  kBuzzNoise = 2,
  kClangNoise = 3,
  kMetallicNoise = 4,
  kBells = 5,
  kDoot = 6,
  kAlgoSynth = 7,
  kHollowNoise = 8,
  kWhiteNoise = 9,
};

enum OscType
{
  kOscSquare = 0,
  kOscSine = 1,
  kOscTriangle = 2,
  kOscSaw = 3,
};

constexpr float kDrumGains[kDrumCount] = {0.26f, 0.24f, 0.4f,  0.35f, 0.3f,
                                          0.26f, 0.3f,  0.28f, 0.26f, 0.67f};

float dbtoamp(float db)
{
  return std::pow(10.f, db / 20.f);
}

float clampf(float x, float lo, float hi)
{
  return std::max(lo, std::min(hi, x));
}

struct ZssVoice
{
  Oscillator osc;
  Adsr       env;
  Fm2        fm;
  String     stringvoice;
  WhiteNoise noise;
  ClockedNoise clocknoise;
  float      curfreq = 440.f;
  float      targetfreq = 440.f;
  bool       prev_gate = false;
  float      string_exc = 0.f;
};

struct ZssDrumVoice
{
  AnalogBassDrum     bass;
  AnalogSnareDrum    snare;
  SyntheticBassDrum  synthbass;
  SyntheticSnareDrum synthsnare;
  HiHat<>            hihat;
  String             karplus;
  Oscillator         osc;
  AdEnv              env;
  WhiteNoise         noise;
  int                remain = 0;
  uint32_t           prev_strike = 0;
};

struct ZssFxGroup
{
  Overdrive drive;
  Autowah   wah;
  Svf       filter;
  Tremolo   trem;
  Phaser    phaser;
  float     echo_buf[88200];
  int       echo_pos = 0;
  float     rev_buf[44100];
  int       rev_pos = 0;
};

struct ZssEngine
{
  float          sample_rate = 44100.f;
  ZssVoice       voices[kVoiceCount];
  ZssDrumVoice   drums[kDrumCount];
  ZssFxGroup     fx[kFxGroups];
  float          comp_env = 0.f;
  bool           ready = false;
};

alignas(8) double g_control[kControlLen];
ZssEngine         g_engine;

int off_voices()
{
  return 0;
}
int off_drums()
{
  return kVoicesLen;
}
int off_master()
{
  return kVoicesLen + kDrumsLen;
}
int off_fx()
{
  return off_master() + kMasterLen;
}
int off_voicecfg()
{
  return off_fx() + kFxLen;
}

float readctrl(int idx)
{
  return static_cast<float>(g_control[idx]);
}

bool fxsend(int group, int send_idx)
{
  const int base = off_fx() + group * kFxSendCount + send_idx;
  return readctrl(base) > 0.5f;
}

float fxparam(int group, int param_idx)
{
  const int base =
      off_fx() + kFxGroups * kFxSendCount + group * kFxParamCount + param_idx;
  return readctrl(base);
}

uint8_t oscwave(int osc_type)
{
  switch(osc_type)
  {
    case kOscSine: return Oscillator::WAVE_SIN;
    case kOscTriangle: return Oscillator::WAVE_TRI;
    case kOscSaw: return Oscillator::WAVE_POLYBLEP_SAW;
    default: return Oscillator::WAVE_SQUARE;
  }
}

void initvoice(ZssVoice& v, float sr)
{
  v.osc.Init(sr);
  v.env.Init(sr);
  v.fm.Init(sr);
  v.stringvoice.Init(sr);
  v.stringvoice.SetDamping(0.5f);
  v.stringvoice.SetBrightness(0.8f);
  v.noise.Init();
  v.clocknoise.Init(sr);
  v.env.SetTime(ADSR_SEG_ATTACK, 0.01f);
  v.env.SetTime(ADSR_SEG_DECAY, 0.01f);
  v.env.SetSustainLevel(0.5f);
  v.env.SetTime(ADSR_SEG_RELEASE, 0.01f);
}

void initdrum(ZssDrumVoice& d, float sr)
{
  d.bass.Init(sr);
  d.snare.Init(sr);
  d.synthbass.Init(sr);
  d.synthsnare.Init(sr);
  d.hihat.Init(sr);
  d.karplus.Init(sr);
  d.karplus.SetDamping(0.6f);
  d.osc.Init(sr);
  d.env.Init(sr);
  d.noise.Init();
  d.env.SetTime(ADENV_SEG_ATTACK, 0.001f);
  d.env.SetTime(ADENV_SEG_DECAY, 0.05f);
}

void initfx(ZssFxGroup& fx, float sr)
{
  fx.drive.Init();
  fx.wah.Init(sr);
  fx.filter.Init(sr);
  fx.trem.Init(sr);
  fx.phaser.Init(sr);
  std::memset(fx.echo_buf, 0, sizeof(fx.echo_buf));
  std::memset(fx.rev_buf, 0, sizeof(fx.rev_buf));
}

void retriggerdrum(ZssDrumVoice& d, int id, float dursec)
{
  switch(id)
  {
    case 0:
    case 3:
    case 4:
    case 6:
      d.snare.Trig();
      d.remain = static_cast<int>(0.08f * g_engine.sample_rate);
      break;
    case 1:
      d.hihat.Trig();
      d.remain = static_cast<int>(0.16f * g_engine.sample_rate);
      break;
    case 2:
      d.osc.SetFreq(800.f);
      d.osc.SetWaveform(Oscillator::WAVE_SQUARE);
      d.env.Trigger();
      d.remain = static_cast<int>(0.12f * g_engine.sample_rate);
      break;
    case 5:
    case 8:
      d.karplus.SetFreq(400.f + id * 20.f);
      d.remain = static_cast<int>(0.1f * g_engine.sample_rate);
      break;
    case 7:
      d.synthbass.Trig();
      d.remain = static_cast<int>(0.15f * g_engine.sample_rate);
      break;
    case 9:
      d.bass.Trig();
      d.remain = static_cast<int>((0.35f + dursec) * g_engine.sample_rate);
      break;
    default:
      d.remain = static_cast<int>(0.1f * g_engine.sample_rate);
      break;
  }
}

float processdrum(ZssDrumVoice& d, int id)
{
  if(d.remain <= 0)
  {
    return 0.f;
  }
  d.remain--;
  float out = 0.f;
  switch(id)
  {
    case 0:
    case 3:
    case 4:
    case 6: out = d.snare.Process(); break;
    case 1: out = d.hihat.Process(); break;
    case 2:
      out = d.osc.Process() * d.env.Process();
      break;
    case 5:
    case 8:
      out = d.karplus.Process(id == 5 ? 0.9f : 0.7f);
      break;
    case 7: out = d.synthbass.Process(); break;
    case 9: out = d.bass.Process(); break;
    default: out = d.noise.Process(); break;
  }
  return out * kDrumGains[id];
}

float processvoice(ZssVoice& v, int idx)
{
  const int base = off_voices() + idx * kVoiceStride;
  const int cfgbase = off_voicecfg() + idx * kVoiceCfgStride;

  const float freq     = readctrl(base + 0);
  const float gate     = readctrl(base + 1);
  const int   type     = static_cast<int>(readctrl(base + 2));
  const int   algo     = static_cast<int>(readctrl(base + 3));
  const float detune   = readctrl(base + 4);
  const int   osc_type = static_cast<int>(readctrl(base + 5));

  const float atk = readctrl(cfgbase + 0);
  const float dec = readctrl(cfgbase + 1);
  const float sus = readctrl(cfgbase + 2);
  const float rel = readctrl(cfgbase + 3);
  const float port = readctrl(cfgbase + 4);
  const float vol_db = readctrl(cfgbase + 5);

  const bool gating = gate > 0.5f;
  if(gating && !v.prev_gate)
  {
    v.targetfreq = freq > 0.f ? freq : 440.f;
    if(type == kBells || type == kDoot)
    {
      v.stringvoice.SetFreq(v.targetfreq * std::pow(2.f, detune / 12.f));
      v.string_exc = 1.f;
    }
    else
    {
      v.env.Retrigger(false);
    }
  }
  v.prev_gate = gating;

  if(port > 0.f && v.curfreq != v.targetfreq)
  {
    const float coef = 1.f - std::exp(-1.f / (port * g_engine.sample_rate));
    v.curfreq += (v.targetfreq - v.curfreq) * coef;
  }
  else
  {
    v.curfreq = v.targetfreq;
  }

  v.env.SetTime(ADSR_SEG_ATTACK, std::max(0.001f, atk));
  v.env.SetTime(ADSR_SEG_DECAY, std::max(0.001f, dec));
  v.env.SetSustainLevel(clampf(sus, 0.f, 1.f));
  v.env.SetTime(ADSR_SEG_RELEASE, std::max(0.001f, rel));

  float sig = 0.f;
  const float env = v.env.Process(gating);
  const float pitch = v.curfreq * std::pow(2.f, detune / 12.f);

  switch(type)
  {
    case kSynth:
      v.osc.SetFreq(pitch);
      v.osc.SetWaveform(oscwave(osc_type));
      v.osc.SetAmp(0.5f);
      sig = v.osc.Process();
      if(osc_type == kOscSine)
      {
        sig *= 1.414f;
      }
      break;
    case kRetroNoise:
    case kBuzzNoise:
    case kClangNoise:
    case kMetallicNoise:
      sig = v.clocknoise.Process() * 0.5f + v.noise.Process() * 0.25f;
      break;
    case kWhiteNoise:
    case kHollowNoise:
      sig = v.noise.Process();
      break;
    case kBells:
    case kDoot:
    {
      const float exc = v.string_exc;
      v.string_exc = 0.f;
      sig = v.stringvoice.Process(exc);
      break;
    }
    case kAlgoSynth:
      v.fm.SetFrequency(pitch);
      v.fm.SetIndex(2.f + algo * 0.5f);
      v.fm.SetRatio(1.f + algo * 0.1f);
      sig = v.fm.Process();
      break;
    default:
      v.osc.SetFreq(pitch);
      v.osc.SetWaveform(oscwave(osc_type));
      sig = v.osc.Process();
      break;
  }

  const float ch_gain = idx < 4 ? 1.f : 0.85f;
  return sig * env * dbtoamp(vol_db) * ch_gain;
}

float processsendfx(ZssFxGroup& fx, int group, float in)
{
  float out = in;
  if(fxsend(group, 5))
  {
    fx.drive.SetDrive(clampf(fxparam(group, 5), 0.f, 1.f));
    out = fx.drive.Process(out);
  }
  if(fxsend(group, 6))
  {
    fx.wah.SetWah(fxparam(group, 12));
    fx.wah.SetLevel(fxparam(group, 14));
    out = fx.wah.Process(out);
  }
  if(fxsend(group, 3))
  {
    fx.filter.SetFreq(fxparam(group, 6));
    fx.filter.SetRes(fxparam(group, 18));
    fx.filter.Process(out);
    out = fx.filter.Low();
  }
  if(fxsend(group, 4))
  {
    fx.trem.SetFreq(fxparam(group, 11));
    fx.trem.SetDepth(fxparam(group, 10));
    out = fx.trem.Process(out);
  }
  if(fxsend(group, 0))
  {
    const float rate = fxparam(group, 4);
    fx.phaser.SetFreq(rate);
    out = fx.phaser.Process(out);
  }
  if(fxsend(group, 1))
  {
    const float delay = fxparam(group, 0) * g_engine.sample_rate;
    const int   d_samp = static_cast<int>(clampf(delay, 1.f, 88000.f));
    const float fb     = clampf(fxparam(group, 1), 0.f, 0.95f);
    const int   pos    = fx.echo_pos;
    const float delayed = fx.echo_buf[pos];
    fx.echo_buf[pos]    = out + delayed * fb;
    fx.echo_pos         = (pos + 1) % d_samp;
    out                 = out * 0.5f + delayed * 0.5f;
  }
  if(fxsend(group, 2))
  {
    const float decay = clampf(fxparam(group, 2) / 5.f, 0.f, 0.95f);
    const int   pos     = fx.rev_pos;
    const float delayed = fx.rev_buf[pos];
    fx.rev_buf[pos]     = out + delayed * decay;
    fx.rev_pos          = (pos + 1) % 44100;
    out                 = out * 0.6f + delayed * 0.4f;
  }
  return out;
}

} // namespace

extern "C" {

void zss_init(float sample_rate)
{
  g_engine.sample_rate = sample_rate;
  for(int i = 0; i < kVoiceCount; ++i)
  {
    initvoice(g_engine.voices[i], sample_rate);
  }
  for(int i = 0; i < kDrumCount; ++i)
  {
    initdrum(g_engine.drums[i], sample_rate);
  }
  for(int i = 0; i < kFxGroups; ++i)
  {
    initfx(g_engine.fx[i], sample_rate);
  }
  std::memset(g_control, 0, sizeof(g_control));
  g_control[off_master() + 0] = 80.0;
  g_control[off_master() + 1] = 100.0;
  g_control[off_master() + 2] = 25.0;
  g_engine.ready = true;
}

double* zss_control_ptr()
{
  return g_control;
}

int zss_control_len()
{
  return kControlLen;
}

void zss_process(float* out, int frames)
{
  if(!g_engine.ready)
  {
    std::memset(out, 0, frames * sizeof(float));
    return;
  }

  const float play_vol = readctrl(off_master() + 0) / 100.f;
  const float bg_vol   = readctrl(off_master() + 1) / 100.f;

  for(int f = 0; f < frames; ++f)
  {
    float drumsum = 0.f;
    for(int d = 0; d < kDrumCount; ++d)
    {
      const int strike_idx = off_drums() + d;
      const int dur_idx    = off_drums() + kDrumCount + d;
      const uint32_t strike = static_cast<uint32_t>(readctrl(strike_idx));
      if(strike != g_engine.drums[d].prev_strike)
      {
        retriggerdrum(g_engine.drums[d], d, readctrl(dur_idx));
        g_engine.drums[d].prev_strike = strike;
      }
      drumsum += processdrum(g_engine.drums[d], d);
    }

    float playbus = 0.f;
    float bgbus = 0.f;
    for(int v = 0; v < kVoiceCount; ++v)
    {
      const float sample = processvoice(g_engine.voices[v], v);
      if(v < 4)
      {
        playbus += processsendfx(g_engine.fx[v], v, sample);
      }
      else
      {
        bgbus += processsendfx(g_engine.fx[v], v, sample);
      }
    }

    float mix = playbus * play_vol + bgbus * bg_vol + drumsum * 0.85f;

    const float thresh = std::pow(10.f, -28.f / 20.f);
    const float abs_in = std::fabs(mix);
    const float target = abs_in > thresh ? thresh + (abs_in - thresh) / 4.f : abs_in;
    const float coef   = abs_in > g_engine.comp_env ? 0.003f : 0.15f;
    g_engine.comp_env += (target - g_engine.comp_env) * coef;
    mix = (mix > 0.f ? 1.f : -1.f) * g_engine.comp_env;

    const float trim = std::pow(10.f, -3.f / 20.f);
    out[f]           = clampf(mix * trim, -1.f, 1.f);
  }
}

} // extern "C"
