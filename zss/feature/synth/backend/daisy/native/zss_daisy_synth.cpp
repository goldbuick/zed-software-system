/**
 * ZSS monolithic DaisySP synth — control layout: wasmsabchannels.ts / daisycontrol.ts.
 */
#ifdef __arm__
#undef __arm__
#endif

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <cstdlib>

#include "daisysp.h"
#include "reverbsc.h"

using namespace daisysp;

namespace {

constexpr int   kVoiceCount       = 8;
constexpr int   kPlayVoiceCount   = 4;
constexpr int   kVoiceStride      = 6;
constexpr int   kDrumCount        = 10;
constexpr int   kFxGroups         = 4;
constexpr int   kFxSendCount      = 7;
constexpr int   kFxParamCount     = 20;
constexpr int   kVoiceCfgStride   = 10; // 0–5 env/port/vol; 6–9 pluck or string ensemble
constexpr int   kOscCfgStride     = 21;
constexpr int   kAlgoCfgStride    = 26;
constexpr int   kVibratoGroups    = 3;
constexpr int   kVibratoStride    = 4;

constexpr int kVoicesLen    = kVoiceCount * kVoiceStride;
constexpr int kDrumsLen     = kDrumCount * 2;
constexpr int kMasterLen    = 3;
constexpr int kFxLen        = kFxGroups * kFxSendCount + kFxGroups * kFxParamCount;
constexpr int kVoiceCfgLen  = kVoiceCount * kVoiceCfgStride;
constexpr int kOscCfgLen    = kVoiceCount * kOscCfgStride;
constexpr int kAlgoCfgLen   = kVoiceCount * kAlgoCfgStride;
constexpr int kVibratoLen   = 1 + kVibratoGroups * kVibratoStride;
constexpr int kControlLen   = kVoicesLen + kDrumsLen + kMasterLen + kFxLen +
                              kVoiceCfgLen + kOscCfgLen + kAlgoCfgLen + kVibratoLen;

constexpr int kNoiseLfsrCount  = 131072;
constexpr int kNoiseSoftCount  = 32768;
constexpr int kNoiseSoftMask   = kNoiseSoftCount - 1;
constexpr int kEchoBufLen      = 88200;
constexpr int kRevPredelayLen  = 4410;

constexpr float kPi            = 3.14159265358979323846f;
constexpr float kTwoPi         = 6.28318530718f;
constexpr float kSineVoiceGain = 1.4142135623730951f;
constexpr float kFmHzScale     = 1.f;
constexpr float kAlgoOpGain    = 0.31622776601683794f;
constexpr float kAlgoOutGain   = 0.18f;
constexpr float kNoiseVoiceGain = 21.f;
constexpr float kLfsrVoiceBoost = 2.5f;
constexpr float kNoiseBaseExpr = 0.19f;
constexpr float kNoiseSoftGain = 3.f;
constexpr float kMetallicNorm  = 1.f / 22.f;
constexpr float kMetallicAmp   = 7.5f;
// `#synth string` = SOS string-machine (detuned saws + PWM FM); pluck = StringVoice.
constexpr float kStringMachineGain     = 0.42f;
constexpr float kStringPluckGain       = 0.38f;
constexpr float kStringDefaultDetune   = 2.f;
constexpr float kStringDefaultPwm      = 0.2f;
constexpr float kStringDefaultVib      = 2.5f;
constexpr float kStringDefaultFilter   = 0.5f;
constexpr float kStringMaxDetuneCents  = 8.f;
constexpr float kStringMaxVibCents     = 8.f;
constexpr float kStringSubOctaveMix    = 0.1f;
constexpr float kStringBodyLowMix      = 0.18f;
constexpr float kStringBodyHiMix       = 0.1f;
constexpr float kStringBowNoiseMix     = 0.03f;
constexpr float kDrumTickTrim  = 1.35f;
constexpr float kDrumTweetTrim = 1.25f;
constexpr float kVoiceOutGain  = 1.f;
// Tone drumvolume is volumetodb(100)+10 (+15 dB); monolithic Daisy path lands ~+7 dB
constexpr float kPlayBusGain    = 0.3548133892336194f;
constexpr float kDrumBusGain    = 2.23606797749979f;
constexpr float kMasterTrimDb   = -3.f;
constexpr float kMasterMakeupDb = 22.f;
constexpr float kRazzleVibratoWet      = 0.1f;
constexpr float kRazzleChorusWet       = 0.4f;
constexpr float kRazzleHissGain        = 0.0035f;
constexpr float kRazzleChorusBaseSec   = 0.007f;
constexpr float kRazzleChorusDepthSec  = 0.007f;
constexpr float kMasterCompThresholdDb = -28.f;
constexpr float kMasterCompRatio       = 4.f;
constexpr float kMasterCompAttackSec   = 0.003f;
constexpr float kMasterCompReleaseSec  = 0.15f;
// ReverbSc internal gain is 0.35; match prior comb+tanh level in the wet chain.
constexpr float kReverbOutGain    = 1.55f;
constexpr float kScMix            = 0.75f;
constexpr float kScTriggerFloor   = 1e-5f;
constexpr float kAutowahDefaultOct  = 6.f;
constexpr float kAutowahDefaultGain = 2.f;

constexpr float kDrumGains[kDrumCount] = {0.26f, 0.24f, 0.4f,  0.35f, 0.3f,
                                          0.26f, 0.3f,  0.28f, 0.26f, 0.67f};

enum VoiceType
{
  kSynth         = 0,
  kRetroNoise    = 1,
  kBuzzNoise     = 2,
  kClangNoise    = 3,
  kMetallicNoise = 4,
  kBells         = 5,
  kDoot          = 6,
  kAlgoSynth     = 7,
  kHollowNoise   = 8,
  kWhiteNoise    = 9,
  kStringVoice   = 10,
  kDripVoice     = 11,
};

enum FxSend
{
  kFxFc         = 0,
  kFxEcho       = 1,
  kFxReverb     = 2,
  kFxAutofilter = 3,
  kFxVibrato    = 4,
  kFxDistort    = 5,
  kFxAutowah    = 6,
};

enum FxParam
{
  kFxEchoDelay      = 0,
  kFxEchoFeedback   = 1,
  kFxReverbDecay    = 2,
  kFxReverbPredelay = 3,
  kFxFcRate         = 4,
  kFxDistortion     = 5,
  kFxAutofilterFreq = 6,
  kFxAutofilterDepth = 7,
  kFxVibratoMaxdelay = 8,
  kFxAutowahSens    = 9,
  kFxVibratoDepth   = 10,
  kFxVibratoFreq    = 11,
  kFxAutowahBase    = 12,
  kFxAutowahOct     = 13,
  kFxAutowahGain    = 14,
  kFxAutowahFollow  = 15,
  kFxAutofilterBase = 16,
  kFxAutofilterOct  = 17,
  kFxAutofilterQ    = 18,
  kFxAutofilterType = 19,
};

alignas(8) double g_control[kControlLen];

float dbtoamp(float db)
{
  return std::pow(10.f, db / 20.f);
}

float clampf(float x, float lo, float hi)
{
  return std::max(lo, std::min(hi, x));
}

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
int off_osccfg()
{
  return off_voicecfg() + kVoiceCfgLen;
}
int off_algocfg()
{
  return off_osccfg() + kOscCfgLen;
}
int off_vibrato()
{
  return off_algocfg() + kAlgoCfgLen;
}

float readctrl(int idx)
{
  return static_cast<float>(g_control[idx]);
}

float fxsendval(int group, int send_idx)
{
  return readctrl(off_fx() + group * kFxSendCount + send_idx);
}

float fxparam(int group, int param_idx)
{
  return readctrl(off_fx() + kFxGroups * kFxSendCount + group * kFxParamCount
                 + param_idx);
}

struct BiquadCoef
{
  float b0 = 1.f, b1 = 0.f, b2 = 0.f, a1 = 0.f, a2 = 0.f;
};

struct BiquadState
{
  float x1 = 0.f, x2 = 0.f, y1 = 0.f, y2 = 0.f;
};

void biquadreset(BiquadState& st)
{
  st.x1 = st.x2 = st.y1 = st.y2 = 0.f;
}

float biquadrun(BiquadState& st, const BiquadCoef& c, float x)
{
  float y = c.b0 * x + c.b1 * st.x1 + c.b2 * st.x2 - c.a1 * st.y1 - c.a2 * st.y2;
  st.x2   = st.x1;
  st.x1   = x;
  st.y2   = st.y1;
  st.y1   = y;
  return y;
}

BiquadCoef biquadcoef(const char* type, float freq, float q, float gaindb, float sr)
{
  BiquadCoef c;
  float      w0    = kTwoPi * freq / sr;
  float      cosw0 = std::cos(w0);
  float      sinw0 = std::sin(w0);
  float      alpha = sinw0 / (2.f * q);
  float      b0 = 0, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

  if(std::strcmp(type, "lowshelf") == 0)
  {
    float al = std::pow(10.f, gaindb / 40.f);
    float sq = 2.f * std::sqrt(al) * alpha;
    float ap1 = al + 1.f, am1 = al - 1.f;
    b0 = al * (ap1 - am1 * cosw0 + sq);
    b1 = 2.f * al * (am1 - ap1 * cosw0);
    b2 = al * (ap1 - am1 * cosw0 - sq);
    a0 = ap1 + am1 * cosw0 + sq;
    a1 = -2.f * (am1 + ap1 * cosw0);
    a2 = ap1 + am1 * cosw0 - sq;
  }
  else if(std::strcmp(type, "highshelf") == 0)
  {
    float ah = std::pow(10.f, gaindb / 40.f);
    float sq = 2.f * std::sqrt(ah) * alpha;
    float hp1 = ah + 1.f, hm1 = ah - 1.f;
    b0 = ah * (hp1 + hm1 * cosw0 + sq);
    b1 = -2.f * ah * (hm1 + hp1 * cosw0);
    b2 = ah * (hp1 + hm1 * cosw0 - sq);
    a0 = hp1 - hm1 * cosw0 + sq;
    a1 = 2.f * (hm1 - hp1 * cosw0);
    a2 = hp1 - hm1 * cosw0 - sq;
  }
  else if(std::strcmp(type, "peaking") == 0)
  {
    float ap = std::pow(10.f, gaindb / 40.f);
    b0 = 1.f + alpha * ap;
    b1 = -2.f * cosw0;
    b2 = 1.f - alpha * ap;
    a0 = 1.f + alpha / ap;
    a1 = -2.f * cosw0;
    a2 = 1.f - alpha / ap;
  }
  else if(std::strcmp(type, "bandpass") == 0)
  {
    b0 = alpha;
    b1 = 0.f;
    b2 = -alpha;
    a0 = 1.f + alpha;
    a1 = -2.f * cosw0;
    a2 = 1.f - alpha;
  }
  else if(std::strcmp(type, "lowpass") == 0)
  {
    b0 = (1.f - cosw0) * 0.5f;
    b1 = 1.f - cosw0;
    b2 = (1.f - cosw0) * 0.5f;
    a0 = 1.f + alpha;
    a1 = -2.f * cosw0;
    a2 = 1.f - alpha;
  }
  else if(std::strcmp(type, "highpass") == 0)
  {
    b0 = (1.f + cosw0) * 0.5f;
    b1 = -(1.f + cosw0);
    b2 = (1.f + cosw0) * 0.5f;
    a0 = 1.f + alpha;
    a1 = -2.f * cosw0;
    a2 = 1.f - alpha;
  }

  float inv = 1.f / a0;
  c.b0      = b0 * inv;
  c.b1      = b1 * inv;
  c.b2      = b2 * inv;
  c.a1      = a1 * inv;
  c.a2      = a2 * inv;
  return c;
}

// --- noise tables (Tone LFSR 131072 + WASM hollow/white 32768) ---

float g_noise_lfsr[kNoiseLfsrCount + 1];
float g_noise_buzz[kNoiseLfsrCount + 1];
float g_noise_clang[kNoiseLfsrCount + 1];
float g_noise_metallic[kNoiseLfsrCount + 1];
float g_noise_hollow[kNoiseSoftCount + 1];
float g_noise_white[kNoiseSoftCount + 1];
bool  g_noise_ready = false;

void noiselfsrfill(float* buf, int tap, bool metallic)
{
  int drumbuffer = 1;
  for(int i = 0; i < kNoiseLfsrCount; ++i)
  {
    if(metallic)
    {
      int bit = drumbuffer & 1;
      buf[i]  = bit * 4.f * kMetallicAmp - 8.f;
    }
    else
    {
      buf[i] = (drumbuffer & 1) * 2.f - 1.f;
    }
    int newbuffer = drumbuffer >> 1;
    if(((drumbuffer + newbuffer) & 1) == 1)
    {
      newbuffer += tap;
    }
    drumbuffer = newbuffer;
  }
  buf[kNoiseLfsrCount] = buf[0];
}

uint32_t noiseprngnext(uint32_t state, float* sample)
{
  int32_t next = static_cast<int32_t>(state + 0x6d2b79f5);
  next         = (next ^ (next >> 15)) * (next | 1);
  next ^= next + ((next ^ (next >> 7)) * (next | 61));
  uint32_t u = static_cast<uint32_t>(next ^ (next >> 14));
  *sample    = (static_cast<float>(u) / 4294967296.f) * 2.f - 1.f;
  return static_cast<uint32_t>(next);
}

void countbitsreverse(float* array, int fulllength)
{
  int bitcount   = 0;
  int n          = fulllength;
  while(n > 1)
  {
    ++bitcount;
    n >>= 1;
  }
  int finalshift = 32 - bitcount;
  for(int i = 0; i < fulllength; ++i)
  {
    uint32_t j = static_cast<uint32_t>(i);
    j          = ((j >> 1) & 0x55555555u) | ((j & 0x55555555u) << 1);
    j          = ((j >> 2) & 0x33333333u) | ((j & 0x33333333u) << 2);
    j          = ((j >> 4) & 0x0f0f0f0fu) | ((j & 0x0f0f0f0fu) << 4);
    j          = ((j >> 8) & 0x00ff00ffu) | ((j & 0x00ff00ffu) << 8);
    j          = ((j >> 16) & 0x0000ffffu) | ((j & 0x0000ffffu) << 16);
    j >>= static_cast<uint32_t>(finalshift);
    if(static_cast<int>(j) > i)
    {
      float temp   = array[i];
      array[i]     = array[j];
      array[j]     = temp;
    }
  }
}

void inverserealfourier(float* array, int fulllength)
{
  int totalpasses = 0;
  for(int n = fulllength; n > 1; n >>= 1)
  {
    ++totalpasses;
  }
  for(int pass = totalpasses - 1; pass >= 2; --pass)
  {
    int   substride        = 1 << pass;
    int   midsubstride     = substride >> 1;
    int   stride           = substride << 1;
    float radiansincrement = kTwoPi / static_cast<float>(stride);
    float cosincrement     = std::cos(radiansincrement);
    float sinincrement     = std::sin(radiansincrement);
    float oscillatormult   = 2.f * cosincrement;
    for(int startindex = 0; startindex < fulllength; startindex += stride)
    {
      int   startindexa = startindex;
      int   midindexa   = startindexa + midsubstride;
      int   startindexb = startindexa + substride;
      int   stopindex   = startindexb + substride;
      float realstarta  = array[startindexa];
      float imagstartb  = array[startindexb];
      array[startindexa] = realstarta + imagstartb;
      array[midindexa] *= 2.f;
      array[startindexb] = realstarta - imagstartb;
      array[startindexb + midsubstride] *= 2.f;
      float c = cosincrement, s = -sinincrement;
      float cprev = 1.f, sprev = 0.f;
      for(int index = 1; index < midsubstride; ++index)
      {
        int   indexa0 = startindexa + index;
        int   indexa1 = startindexb - index;
        int   indexb0 = startindexb + index;
        int   indexb1 = stopindex - index;
        float real0     = array[indexa0];
        float real1     = array[indexa1];
        float imag0     = array[indexb0];
        float imag1     = array[indexb1];
        float tempa     = real0 - real1;
        float tempb     = imag0 + imag1;
        array[indexa0]  = real0 + real1;
        array[indexa1]  = imag1 - imag0;
        array[indexb0]  = tempa * c - tempb * s;
        array[indexb1]  = tempb * c + tempa * s;
        float ctemp = oscillatormult * c - cprev;
        float stemp = oscillatormult * s - sprev;
        cprev       = c;
        sprev       = s;
        c           = ctemp;
        s           = stemp;
      }
    }
  }
  for(int idx = 0; idx < fulllength; idx += 4)
  {
    float real0 = array[idx];
    float real1 = array[idx + 1] * 2.f;
    float imag2 = array[idx + 2];
    float imag3 = array[idx + 3] * 2.f;
    float tempa = real0 + imag2;
    float tempb = real0 - imag2;
    array[idx]     = tempa + real1;
    array[idx + 1] = tempa - real1;
    array[idx + 2] = tempb + imag3;
    array[idx + 3] = tempb - imag3;
  }
  countbitsreverse(array, fulllength);
}

void drawnoisespectrum(float* wave, const float* retro, int lowoctave,
                       int highoctave, float lowpower, float highpower,
                       float overallslope)
{
  int referenceindex = 1 << 11;
  int lowindex       = 1 << lowoctave;
  int highindex      = std::min(kNoiseSoftCount >> 1, 1 << highoctave);
  for(int i = lowindex; i < highindex; ++i)
  {
    float lerped = lowpower + (highpower - lowpower)
                             * (std::log2(static_cast<float>(i)) - lowoctave)
                             / static_cast<float>(highoctave - lowoctave);
    float amplitude = std::pow(2.f, (lerped - 1.f) * 7.f + 1.f) * lerped;
    amplitude *= std::pow(static_cast<float>(i) / referenceindex, overallslope);
    amplitude *= retro[i];
    float radians = 0.61803398875f * i * i * kTwoPi;
    wave[i]       = std::cos(radians) * amplitude;
    wave[kNoiseSoftCount - i] = std::sin(radians) * amplitude;
  }
}

void initnoisetables()
{
  if(g_noise_ready)
  {
    return;
  }
  noiselfsrfill(g_noise_lfsr, 1 << 14, false);
  noiselfsrfill(g_noise_buzz, 10 << 2, false);
  noiselfsrfill(g_noise_clang, 2 << 14, false);
  noiselfsrfill(g_noise_metallic, 15 << 2, true);

  std::memset(g_noise_hollow, 0, sizeof(g_noise_hollow));
  drawnoisespectrum(g_noise_hollow, g_noise_lfsr, 10, 11, 1.f, 1.f, 0.f);
  drawnoisespectrum(g_noise_hollow, g_noise_lfsr, 11, 14, 0.6578f, 0.6578f, 0.f);
  inverserealfourier(g_noise_hollow, kNoiseSoftCount);
  float scale = 1.f / std::sqrt(static_cast<float>(kNoiseSoftCount));
  for(int i = 0; i <= kNoiseSoftCount; ++i)
  {
    g_noise_hollow[i] *= scale;
  }
  g_noise_hollow[kNoiseSoftCount] = g_noise_hollow[0];

  uint32_t state = 0x6d2b79f5u;
  for(int i = 0; i < kNoiseSoftCount; ++i)
  {
    state = noiseprngnext(state, &g_noise_white[i]);
  }
  g_noise_white[kNoiseSoftCount] = g_noise_white[0];

  g_noise_ready = true;
}

const float* noiseforvoice(int noisetype)
{
  switch(noisetype)
  {
    case kBuzzNoise: return g_noise_buzz;
    case kClangNoise: return g_noise_clang;
    case kMetallicNoise: return g_noise_metallic;
    case kHollowNoise: return g_noise_hollow;
    case kWhiteNoise: return g_noise_white;
    default: return g_noise_lfsr;
  }
}

struct NoiseMeta
{
  float basepitch;
  float pitchfiltermult;
  bool  issoft;
  float expression;
};

NoiseMeta noisemetafor(int noisetype)
{
  switch(noisetype)
  {
    case kBuzzNoise:
      return {69.f, 1024.f, false, 0.3f};
    case kClangNoise:
      return {69.f, 1024.f, false, 0.4f};
    case kMetallicNoise:
      return {69.f, 1024.f, false, 0.4f};
    case kHollowNoise:
      return {96.f, 1.f, true, 1.5f};
    case kWhiteNoise:
      return {69.f, 8.f, true, 1.f};
    default:
      return {69.f, 1024.f, false, 0.25f};
  }
}

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

struct ZssVoice
{
  Oscillator synthosc, synthmod, dootosc;
  Oscillator sparklemod, sparklecar;
  Oscillator algoops[4];
  Adsr       env, dootenv, sparkleenv, algooutenv;
  Adsr       algoenvs[4];
  Adsr       modenv;
  float      playfreq = 440.f;
  float      glidestart = 440.f, glidetarget = 440.f;
  int        glidetotal = 0, glideremain = 0;
  float      voicephasestep = 0.f;
  bool       synthgateprev = false, gateprev = false, noiseprev = false;
  float      dootpitch = 1.f;
  float      noisephase = 0.f, noisesample = 0.f;
  uint32_t   noiserng = 0;
  int        modenvprev_a = -1;
  float      modenvprev_d = -1.f, modenvprev_s = -1.f, modenvprev_r = -1.f;
  float      envprev_a = -1.f, envprev_d = -1.f, envprev_s = -1.f, envprev_r = -1.f;
  float      dootprev_a = -1.f, algoprev_a = -1.f;
  float      algoenvprev_a[4] = {-1.f, -1.f, -1.f, -1.f};
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
};

struct ZssDrumState
{
  int        remain = 0;
  uint32_t   prev_strike = 0;
  OnePole    hp;
  BiquadState eq[3], bp;
};

struct ZssFxGroup
{
  Decimator                      decimator;
  Overdrive                      overdrive;
  Svf                            autofilter_svf;
  Phasor                         autofilter_phasor;
  DelayLine<float, kEchoBufLen>  echo_line;
  int                            echo_delay = 1;
  float                          echo_feedback = 0.f;
  ReverbSc                       reverb;
  float                          rev_feedback = 0.85f;
  float                          rev_lpfreq = 12000.f;
  float                          rev_predelay_buf[kRevPredelayLen];
  int                            rev_predelay_pos = 0;
  float                          rev_predelay_fb = 0.f;
  int                            rev_predelay_samples = 0;
  Autowah                        autowah;
};

struct ZssEngine
{
  float        sample_rate = 44100.f;
  ZssVoice     voices[kVoiceCount];
  ZssDrumState drums[kDrumCount];
  AnalogBassDrum         bass_drum;
  SyntheticBassDrum      tom_drum;
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
  DcBlock      master_dcblock;
  float        razzle_vib_buf[512];
  float        razzle_chorus_buf[512];
  int          razzle_vib_pos = 0;
  int          razzle_chorus_pos = 0;
  float        comp_env = 0.f;
  float        comp_attack_coef = 0.f;
  float        comp_release_coef = 0.f;
  int          sampleclock = 0;
  float        cached_mastervol = 0.f, cached_bggain = 0.f;
  float        cached_ttsgain = 0.f;
  float        cached_masterraw = 80.f, cached_bgraw = 100.f, cached_ttsraw = 25.f;
  float        mastervolprev = 80.f;
  bool         ready = false;
};

ZssEngine g_engine;

OscCfg readosccfg(int vi)
{
  const int b = off_osccfg() + vi * kOscCfgStride;
  OscCfg    c;
  c.phase         = readctrl(b + 0);
  c.width         = readctrl(b + 1);
  c.modfreq       = readctrl(b + 2);
  c.harmonicity   = readctrl(b + 3);
  c.modindex      = readctrl(b + 4);
  c.count         = readctrl(b + 5);
  c.spread        = readctrl(b + 6);
  c.partialcount  = readctrl(b + 7);
  for(int p = 0; p < 8; ++p)
  {
    c.partials[p] = readctrl(b + 8 + p);
  }
  c.modenv_a = readctrl(b + 16);
  c.modenv_d = readctrl(b + 17);
  c.modenv_s = readctrl(b + 18);
  c.modenv_r = readctrl(b + 19);
  c.modtype  = static_cast<int>(readctrl(b + 20));
  return c;
}

AlgoCfg readalgocfg(int vi)
{
  const int b = off_algocfg() + vi * kAlgoCfgStride;
  AlgoCfg   c;
  c.h1  = readctrl(b + 0);
  c.h2  = readctrl(b + 1);
  c.h3  = readctrl(b + 2);
  c.mi1 = readctrl(b + 3);
  c.mi2 = readctrl(b + 4);
  c.mi3 = readctrl(b + 5);
  c.osctype[0] = static_cast<int>(readctrl(b + 6));
  c.osctype[1] = static_cast<int>(readctrl(b + 7));
  c.osctype[2] = static_cast<int>(readctrl(b + 8));
  c.osctype[3] = static_cast<int>(readctrl(b + 9));
  for(int o = 0; o < 4; ++o)
  {
    c.env_a[o] = readctrl(b + 10 + o * 4);
    c.env_d[o] = readctrl(b + 11 + o * 4);
    c.env_s[o] = readctrl(b + 12 + o * 4);
    c.env_r[o] = readctrl(b + 13 + o * 4);
  }
  return c;
}

void readvibratosab(float* epoch, float start[kVibratoGroups], float end[kVibratoGroups],
                    float peak[kVibratoGroups], float freq[kVibratoGroups])
{
  const int b = off_vibrato();
  *epoch      = readctrl(b);
  for(int g = 0; g < kVibratoGroups; ++g)
  {
    start[g] = readctrl(b + 1 + g * kVibratoStride);
    end[g]   = readctrl(b + 2 + g * kVibratoStride);
    peak[g]  = readctrl(b + 3 + g * kVibratoStride);
    freq[g]  = readctrl(b + 4 + g * kVibratoStride);
  }
}

int voicefxgroup(int vi)
{
  if(vi < 2)
  {
    return 0;
  }
  if(vi < kPlayVoiceCount)
  {
    return 1;
  }
  return 2;
}

float playtimesec()
{
  return readctrl(off_vibrato()) + g_engine.sampleclock / g_engine.sample_rate;
}

float vibratodepthat(int group, float t, float start[kVibratoGroups],
                     float end[kVibratoGroups], float peak[kVibratoGroups])
{
  float s = start[group], e = end[group], pk = peak[group];
  if(e <= s || pk <= 0.0001f || t < s || t >= e)
  {
    return 0.f;
  }
  float dur        = e - s;
  float rampreset  = std::min(dur * 0.48f, 0.35f);
  float attackport = std::min(std::min(dur * 0.35f, 0.35f), rampreset);
  float tpeak      = s + attackport;
  float trelease   = std::max(e - rampreset, s + rampreset);
  if(tpeak > trelease)
  {
    tpeak = trelease;
  }
  if(t <= tpeak)
  {
    return tpeak <= s ? pk : pk * (t - s) / (tpeak - s);
  }
  if(t < trelease)
  {
    return pk;
  }
  if(e <= trelease)
  {
    return 0.f;
  }
  return pk * (1.f - (t - trelease) / (e - trelease));
}

bool anyplayvibratosend()
{
  for(int g = 0; g < 3; ++g)
  {
    if(fxsendval(g, kFxVibrato) > 0.0001f)
    {
      return true;
    }
  }
  return false;
}

void updateplayvibratodepth(float vstart[kVibratoGroups], float vend[kVibratoGroups],
                            float vpeak[kVibratoGroups])
{
  if(!anyplayvibratosend())
  {
    if(g_engine.fxvibrato_depth > 0.0001f)
    {
      g_engine.fxvibrato_depth += (0.f - g_engine.fxvibrato_depth) * 0.001f;
    }
    return;
  }
  float t      = playtimesec();
  float target = 0.f;
  for(int g = 0; g < 3; ++g)
  {
    if(fxsendval(g, kFxVibrato) <= 0.f)
    {
      continue;
    }
    int start = g < 2 ? g * 2 : kPlayVoiceCount;
    int end   = g < 2 ? start + 2 : kVoiceCount;
    bool gated = false;
    for(int i = start; i < end; ++i)
    {
      if(readctrl(off_voices() + i * kVoiceStride + 1) > 0.5f)
      {
        gated = true;
        break;
      }
    }
    if(!gated)
    {
      continue;
    }
    float depth = vibratodepthat(g, t, vstart, vend, vpeak);
    if(depth > target)
    {
      target = depth;
    }
  }
  if(target <= 0.0001f)
  {
    float sabdepth = 0.f;
    for(int g2 = 0; g2 < 3; ++g2)
    {
      if(fxsendval(g2, kFxVibrato) <= 0.f)
      {
        continue;
      }
      float d2 = fxparam(g2, kFxVibratoDepth);
      if(d2 > sabdepth)
      {
        sabdepth = d2;
      }
    }
    target = sabdepth > 0.0001f ? sabdepth : 0.5f;
  }
  float rate = target > g_engine.fxvibrato_depth ? 0.004f : 0.001f;
  g_engine.fxvibrato_depth += (target - g_engine.fxvibrato_depth) * rate;
}

float playvibratocents(int vi, float vfreq[kVibratoGroups])
{
  int   group = voicefxgroup(vi);
  float send  = fxsendval(group, kFxVibrato);
  if(send <= 0.f || readctrl(off_voices() + vi * kVoiceStride + 1) <= 0.5f)
  {
    return 0.f;
  }
  if(g_engine.fxvibrato_depth <= 0.0001f)
  {
    return 0.f;
  }
  float freq = vfreq[group];
  if(freq <= 0.f)
  {
    freq = fxparam(group, kFxVibratoFreq);
  }
  if(freq <= 0.f)
  {
    freq = 5.f;
  }
  float maxdelay = fxparam(group, kFxVibratoMaxdelay);
  if(maxdelay <= 0.f)
  {
    maxdelay = 0.02f;
  }
  g_engine.fxvibratolfo.SetFreq(freq);
  g_engine.fxvibratolfo.SetWaveform(Oscillator::WAVE_SIN);
  g_engine.fxvibratolfo.SetAmp(1.f);
  float lfo = g_engine.fxvibratolfo.Process();
  return lfo * g_engine.fxvibrato_depth * maxdelay * 3500.f * send;
}

float detunedhz(int vi, float freq, float detune, float vfreq[kVibratoGroups])
{
  float hz = freq > 0.f ? freq : 440.f;
  float vib = readctrl(off_voices() + vi * kVoiceStride + 1) > 0.5f
                  ? playvibratocents(vi, vfreq)
                  : 0.f;
  if(vib != 0.f)
  {
    return hz * std::pow(2.f, (detune + vib) / 1200.f);
  }
  return hz * std::pow(2.f, detune / 1200.f);
}

float voiceenvlevel(ZssVoice& v, int type)
{
  return v.lastenv;
}

float glidefreq(ZssVoice& v, int vi, float target, int type, float port)
{
  if((type != kSynth && type != kAlgoSynth) || port <= 0.f)
  {
    v.playfreq     = target;
    v.glidetarget  = target;
    v.glideremain  = 0;
    return target;
  }
  if(target != v.glidetarget)
  {
    bool  gate  = readctrl(off_voices() + vi * kVoiceStride + 1) > 0.5f;
    float level = voiceenvlevel(v, type);
    if(gate && level > 0.05f && v.playfreq > 0.f)
    {
      v.glidestart  = v.playfreq;
      v.glidetarget = target;
      v.glidetotal  = std::max(1, static_cast<int>(port * g_engine.sample_rate));
      v.glideremain = v.glidetotal;
    }
    else
    {
      v.playfreq    = target;
      v.glidetarget = target;
      v.glideremain = 0;
    }
  }
  if(v.glideremain > 0)
  {
    float progress = 1.f - static_cast<float>(v.glideremain) / v.glidetotal;
    float start    = v.glidestart;
    float end      = v.glidetarget;
    if(start > 0.f && end > 0.f)
    {
      v.playfreq = start * std::pow(end / start, progress);
    }
    else
    {
      v.playfreq = start + (end - start) * progress;
    }
    --v.glideremain;
    if(v.glideremain <= 0)
    {
      v.playfreq = end;
    }
  }
  return v.playfreq;
}

void applyvoiceenv(ZssVoice& v, int type, float a, float d, float s, float r)
{
  if(type == kDoot)
  {
    if(v.dootprev_a != a)
    {
      v.dootenv.SetTime(ADSR_SEG_ATTACK, std::max(0.001f, a));
      v.dootenv.SetTime(ADSR_SEG_DECAY, std::max(0.001f, d));
      v.dootenv.SetSustainLevel(clampf(s, 0.f, 1.f));
      v.dootenv.SetTime(ADSR_SEG_RELEASE, std::max(0.001f, r));
      v.dootprev_a = a;
    }
    return;
  }
  if(type == kAlgoSynth)
  {
    if(v.algoprev_a != a)
    {
      v.algooutenv.SetTime(ADSR_SEG_ATTACK, std::max(0.001f, a));
      v.algooutenv.SetTime(ADSR_SEG_DECAY, std::max(0.001f, d));
      v.algooutenv.SetSustainLevel(clampf(s, 0.f, 1.f));
      v.algooutenv.SetTime(ADSR_SEG_RELEASE, std::max(0.001f, r));
      v.algoprev_a = a;
    }
    return;
  }
  if(v.envprev_a != a || v.envprev_d != d || v.envprev_s != s || v.envprev_r != r)
  {
    v.env.SetTime(ADSR_SEG_ATTACK, std::max(0.001f, a));
    v.env.SetTime(ADSR_SEG_DECAY, std::max(0.001f, d));
    v.env.SetSustainLevel(clampf(s, 0.f, 1.f));
    v.env.SetTime(ADSR_SEG_RELEASE, std::max(0.001f, r));
    v.envprev_a = a;
    v.envprev_d = d;
    v.envprev_s = s;
    v.envprev_r = r;
  }
}

float oscwavefromphase(int wavetype, float phase01)
{
  float p = phase01 - std::floor(phase01);
  if(wavetype == 1)
  {
    return std::sin(p * kTwoPi);
  }
  if(wavetype == 2)
  {
    return p < 0.5f ? p * 4.f - 1.f : 3.f - p * 4.f;
  }
  if(wavetype == 3)
  {
    return p * 2.f - 1.f;
  }
  return p < 0.5f ? 1.f : -1.f;
}

float oscbasicwave(Oscillator& o, int wavetype, float hz)
{
  o.SetFreq(hz);
  o.SetAmp(1.f);
  switch(wavetype)
  {
    case 1:
      o.SetWaveform(Oscillator::WAVE_SIN);
      break;
    case 2:
      o.SetWaveform(Oscillator::WAVE_TRI);
      break;
    case 3:
      o.SetWaveform(Oscillator::WAVE_POLYBLEP_SAW);
      break;
    case 4:
    case 5:
      o.SetWaveform(Oscillator::WAVE_SQUARE);
      o.SetPw(wavetype == 5 ? 0.2f : 0.5f);
      break;
    default:
      o.SetWaveform(Oscillator::WAVE_SQUARE);
      break;
  }
  return o.Process();
}

float stringbownoisesample(ZssVoice& v)
{
  v.noiserng = v.noiserng * 1664525u + 1013904223u;
  return static_cast<float>((v.noiserng >> 8) & 0xffffff) / 8388608.f - 1.f;
}

float oscmodwave(Oscillator& o, int modwave, float hz)
{
  return oscbasicwave(o, modwave, hz);
}

float oscwavewithphase(Oscillator& o, int wavetype, float hz, float phase, ZssVoice& v)
{
  if(phase == 0.f && v.voicephasestep == 0.f)
  {
    return oscbasicwave(o, wavetype, hz);
  }
  v.voicephasestep += hz / g_engine.sample_rate;
  float p = v.voicephasestep + phase;
  if(wavetype >= 0 && wavetype <= 3)
  {
    return oscwavefromphase(wavetype, p);
  }
  return oscbasicwave(o, wavetype, hz);
}

float fmcarriersample(Oscillator& carrier, Oscillator& modulator, int modtype,
                      float hz, float modhz, float modidx, float moddepth,
                      int carriertype)
{
  float mod = oscmodwave(modulator, modtype, modhz) * modidx * moddepth;
  float fmh = hz + mod * hz * kFmHzScale;
  return oscbasicwave(carrier, carriertype, fmh);
}

float oscpartialsynth(Oscillator& o, float hz, int count, const float* partials)
{
  int n = count > 0 ? std::min(8, count) : 0;
  if(n <= 0)
  {
    return oscbasicwave(o, 1, hz);
  }
  float sum = 0.f, norm = 0.f;
  for(int pi = 0; pi < n; ++pi)
  {
    float amp = partials[pi];
    if(amp == 0.f)
    {
      continue;
    }
    sum += oscbasicwave(o, 1, hz * (pi + 1)) * amp;
    norm += amp < 0.f ? -amp : amp;
  }
  return norm <= 0.f ? oscbasicwave(o, 1, hz) : sum / norm;
}

float synthwavegain(int osc)
{
  if(osc == 1 || osc == 10 || osc == 20 || osc == 30)
  {
    return kSineVoiceGain;
  }
  return 1.f;
}

float synthsource(ZssVoice& v, int vi, float freq, bool gate, float detune,
                  int osctype, float vfreq[kVibratoGroups])
{
  OscCfg cfg = readosccfg(vi);
  float  hz  = detunedhz(vi, freq, detune, vfreq);
  float  width = cfg.width > 0.f ? cfg.width : 0.2f;
  float  modidx = cfg.modindex > 0.f ? cfg.modindex : 2.f;
  float  harm   = cfg.harmonicity > 0.f ? cfg.harmonicity : 1.f;
  float  modhz  = hz * (cfg.modfreq > 0.f ? cfg.modfreq : 1.f);
  int    pcount = static_cast<int>(cfg.partialcount > 0.f ? cfg.partialcount : 0.f);
  float  sig    = 0.f;

  if(static_cast<int>(cfg.modenv_a * 1000) != v.modenvprev_a
     || cfg.modenv_d != v.modenvprev_d)
  {
    v.modenv.SetTime(ADSR_SEG_ATTACK, std::max(0.001f, cfg.modenv_a));
    v.modenv.SetTime(ADSR_SEG_DECAY, std::max(0.001f, cfg.modenv_d));
    v.modenv.SetSustainLevel(clampf(cfg.modenv_s, 0.f, 1.f));
    v.modenv.SetTime(ADSR_SEG_RELEASE, std::max(0.001f, cfg.modenv_r));
    v.modenvprev_a = static_cast<int>(cfg.modenv_a * 1000);
    v.modenvprev_d = cfg.modenv_d;
  }

  if(pcount > 0)
  {
    sig = oscpartialsynth(v.synthosc, hz, pcount, cfg.partials);
  }
  else if(osctype == 4)
  {
    v.synthosc.SetFreq(hz);
    v.synthosc.SetWaveform(Oscillator::WAVE_SQUARE);
    v.synthosc.SetPw(width);
    v.synthosc.SetAmp(1.f);
    sig = v.synthosc.Process();
  }
  else if(osctype == 5)
  {
    v.synthosc.SetFreq(hz);
    v.synthosc.SetWaveform(Oscillator::WAVE_SQUARE);
    v.synthosc.SetPw(width > 0.f ? width : 0.2f);
    v.synthosc.SetAmp(1.f);
    sig = v.synthosc.Process();
  }
  else if(osctype >= 10 && osctype <= 13)
  {
    float moddepth = v.modenv.Process(gate);
    float modsig   = oscmodwave(v.synthmod, cfg.modtype, hz * harm) * moddepth;
    int   cartype  = osctype - 10;
    sig            = oscbasicwave(v.synthosc, cartype, hz) * (0.5f + 0.5f * modsig);
  }
  else if(osctype >= 20 && osctype <= 23)
  {
    float moddepth = v.modenv.Process(gate);
    int   cartype  = osctype == 20 ? 1 : (osctype == 21 ? 0 : (osctype == 22 ? 2 : 3));
    sig = fmcarriersample(v.synthosc, v.synthmod, cfg.modtype, hz, modhz, modidx,
                          moddepth, cartype);
  }
  else if(osctype >= 30 && osctype <= 33)
  {
    int   cnt    = cfg.count > 1.f ? static_cast<int>(cfg.count + 0.5f) : 3;
    float spread = cfg.spread > 0.f ? cfg.spread : 20.f;
    float det    = spread / 1200.f;
    int   cartype = osctype - 30;
    sig = 0.f;
    for(int fi = 0; fi < cnt; ++fi)
    {
      float mul = 1.f + (fi - (cnt - 1) * 0.5f) * det;
      sig += oscbasicwave(v.synthosc, cartype, hz * mul);
    }
    sig /= cnt;
  }
  else if(osctype >= 0 && osctype <= 3)
  {
    sig = oscwavewithphase(v.synthosc, osctype, hz, cfg.phase, v);
  }
  else
  {
    sig = oscbasicwave(v.synthosc, 0, hz);
  }
  return sig * synthwavegain(osctype);
}

float dootvoice(ZssVoice& v, float freq, bool gate)
{
  if(gate && !v.gateprev)
  {
    v.dootpitch = 1.f;
  }
  v.gateprev = gate;
  float hz = freq > 0.f ? freq : 110.f;
  if(gate)
  {
    v.dootpitch *= 0.9993f;
    if(v.dootpitch < 0.15f)
    {
      v.dootpitch = 0.15f;
    }
  }
  float pitchmul = 0.15f + v.dootpitch * 0.85f;
  v.dootosc.SetFreq(hz * pitchmul);
  v.dootosc.SetWaveform(Oscillator::WAVE_SIN);
  v.dootosc.SetAmp(1.f);
  return v.dootosc.Process() * v.dootenv.Process(gate) * 0.6f;
}

float algopwave(Oscillator& o, int wavetype, float hz)
{
  return oscbasicwave(o, wavetype, hz);
}

float algovoice(ZssVoice& v, int vi, float freq, bool gate, int algo, float vfreq[kVibratoGroups])
{
  AlgoCfg cfg = readalgocfg(vi);
  float   hz  = glidefreq(v, vi, freq > 0.f ? freq : 440.f, kAlgoSynth,
                          readctrl(off_voicecfg() + vi * kVoiceCfgStride + 4));
  float h1 = cfg.h1 > 0.f ? cfg.h1 : 2.f;
  float h2 = cfg.h2 > 0.f ? cfg.h2 : 2.f;
  float h3 = cfg.h3 > 0.f ? cfg.h3 : 2.f;
  float mi1 = cfg.mi1 > 0.f ? cfg.mi1 : 1.f;
  float mi2 = cfg.mi2 > 0.f ? cfg.mi2 : 1.f;
  float mi3 = cfg.mi3 > 0.f ? cfg.mi3 : 1.f;

  for(int oi = 0; oi < 4; ++oi)
  {
    if(v.algoenvprev_a[oi] != cfg.env_a[oi])
    {
      v.algoenvs[oi].SetTime(ADSR_SEG_ATTACK, std::max(0.001f, cfg.env_a[oi]));
      v.algoenvs[oi].SetTime(ADSR_SEG_DECAY, std::max(0.001f, cfg.env_d[oi]));
      v.algoenvs[oi].SetSustainLevel(clampf(cfg.env_s[oi], 0.f, 1.f));
      v.algoenvs[oi].SetTime(ADSR_SEG_RELEASE, std::max(0.001f, cfg.env_r[oi]));
      v.algoenvprev_a[oi] = cfg.env_a[oi];
    }
  }

  float raw1 = algopwave(v.algoops[0], cfg.osctype[0], hz * h1) * kAlgoOpGain;
  float raw2 = algopwave(v.algoops[1], cfg.osctype[1], hz * h2) * kAlgoOpGain;
  float raw3 = algopwave(v.algoops[2], cfg.osctype[2], hz * h3) * kAlgoOpGain;
  float raw4 = algopwave(v.algoops[3], cfg.osctype[3], hz) * kAlgoOpGain;

  float e0 = v.algoenvs[0].Process(gate);
  float e1 = v.algoenvs[1].Process(gate);
  float e2 = v.algoenvs[2].Process(gate);
  float e3 = v.algoenvs[3].Process(gate);

  float op1 = raw1 * e0;
  float op2 = raw2 * e1;
  float op3 = raw3 * e2;
  float op4 = raw4 * e3;

  if(algo == 0)
  {
    op2 = algopwave(v.algoops[1], 1, hz * h2 + raw1 * mi1) * e1;
    op3 = algopwave(v.algoops[2], 1, hz * h3 + raw2 * mi2) * e2;
    op4 = algopwave(v.algoops[3], 1, hz + raw3 * mi3) * e3;
  }
  else if(algo == 1)
  {
    op3 = algopwave(v.algoops[2], 1, hz * h3 + (raw1 + raw2) * mi2 * 0.5f) * e2;
    op4 = algopwave(v.algoops[3], 1, hz + raw3 * mi3) * e3;
  }
  else if(algo == 2)
  {
    op3 = algopwave(v.algoops[2], 1, hz * h3 + raw2 * mi2) * e2;
    op4 = algopwave(v.algoops[3], 1, hz + (raw1 + raw3) * mi3 * 0.5f) * e3;
  }
  else if(algo == 3)
  {
    op4 = algopwave(v.algoops[3], 1, hz + (raw1 + raw2 + raw3) * mi3 * 0.33f) * e3;
  }
  else if(algo == 5)
  {
    op2 = algopwave(v.algoops[1], 1, hz * h2 + raw1 * mi1) * e1;
    op3 = algopwave(v.algoops[2], 1, hz * h3 + raw1 * mi2) * e2;
    op4 = algopwave(v.algoops[3], 1, hz + raw1 * mi3) * e3;
  }
  else if(algo == 6)
  {
    op2 = algopwave(v.algoops[1], 1, hz * h2 + raw1 * mi1) * e1;
  }

  float out = op4;
  if(algo == 4)
  {
    out = op2 + op4;
  }
  else if(algo == 5)
  {
    out = op2 + op3 + op4;
  }
  else if(algo == 6)
  {
    out = op2;
  }
  else if(algo == 7)
  {
    out = op1 + op2 + op3 + op4;
  }
  return out * v.algooutenv.Process(gate) * kAlgoOutGain;
}

float noisevoice(ZssVoice& v, int vi, int noisetype, float freq, bool gate,
                 float envout)
{
  NoiseMeta meta = noisemetafor(noisetype);
  const float* buf = noiseforvoice(noisetype);
  int          count = meta.issoft ? kNoiseSoftCount : kNoiseLfsrCount;
  int          mask  = count - 1;

  if(gate && !v.noiseprev)
  {
    if(v.noisephase == 0.f)
    {
      float rnd = 0.f;
      v.noiserng = noiseprngnext(v.noiserng + vi * 7919u, &rnd);
      v.noisephase = (0.5f + rnd * 0.5f) * count;
    }
    v.noisesample = 0.f;
  }
  v.noiseprev = gate;
  if(!gate && envout < 0.00005f)
  {
    v.noisephase  = 0.f;
    v.noisesample = 0.f;
    return 0.f;
  }

  float hz           = freq > 0.f ? freq : 440.f;
  float phasedelta   = hz / g_engine.sample_rate;
  float pitchfilter  = std::min(1.f, phasedelta * meta.pitchfiltermult);
  float notepitch    = 69.f + 12.f * (std::log(hz / 440.f) / std::log(2.f));
  float pitchdamping = meta.issoft ? 24.f : 60.f;
  float pitchmul     = std::pow(2.f, -(notepitch - meta.basepitch) / pitchdamping);

  int   idx   = static_cast<int>(v.noisephase) & mask;
  float frac  = v.noisephase - std::floor(v.noisephase);
  float wave  = buf[idx] + (buf[idx + 1] - buf[idx]) * frac;
  float scale = noisetype == kMetallicNoise ? kMetallicNorm : 1.f;
  float soft  = meta.issoft ? kNoiseSoftGain : 1.f;
  v.noisesample += (wave * scale - v.noisesample) * pitchfilter;
  if(gate)
  {
    v.noisephase += phasedelta;
    if(v.noisephase >= count)
    {
      v.noisephase -= count;
    }
  }
  float gain = pitchmul * meta.expression * kNoiseBaseExpr * kNoiseVoiceGain;
  float lfsrboost = meta.issoft ? 1.f : kLfsrVoiceBoost;
  return v.noisesample * gain * soft * envout * lfsrboost;
}

int drumsamp(float sec)
{
  return std::max(1, static_cast<int>(sec * g_engine.sample_rate + 0.5f));
}

float drumnotelen(int n)
{
  return (0.5f * 4.f) / static_cast<float>(n);
}

float drumadsr(int age, int atk, int dec, float sus, int rel)
{
  if(age < atk)
  {
    return static_cast<float>(age) / atk;
  }
  age -= atk;
  if(age < dec)
  {
    return 1.f - (static_cast<float>(age) / dec) * (1.f - sus);
  }
  age -= dec;
  if(age < rel)
  {
    return sus * (1.f - static_cast<float>(age) / rel);
  }
  return 0.f;
}

float drumexpramp(int age, int dur, float start, float end)
{
  if(dur <= 0)
  {
    return end;
  }
  float t = std::min(1.f, static_cast<float>(age) / dur);
  if(start <= 0.f || end <= 0.f)
  {
    return start + (end - start) * t;
  }
  return start * std::pow(end / start, t);
}

float drumexpexp(int age, int dur)
{
  if(dur <= 0)
  {
    return 0.f;
  }
  float t = std::min(1.f, static_cast<float>(age) / dur);
  return std::pow(0.001f, t);
}

float drumdistort(float x, float amt)
{
  float k = 1.f + amt * 12.f;
  return std::tanh(x * k) / std::tanh(k);
}

float drumhipass(int idx, float input, float cutoff)
{
  OnePole& hp = g_engine.drums[idx].hp;
  float    norm = cutoff / g_engine.sample_rate;
  if(norm > 0.497f)
  {
    norm = 0.497f;
  }
  hp.SetFrequency(norm);
  return hp.Process(input);
}

float drumnoise()
{
  return g_engine.drum_whitenoise.Process();
}

float drumoscwave(Oscillator& o, int wave, float hz)
{
  o.SetFreq(hz);
  o.SetAmp(1.f);
  if(wave == 1)
  {
    o.SetWaveform(Oscillator::WAVE_SIN);
  }
  else if(wave == 2)
  {
    o.SetWaveform(Oscillator::WAVE_TRI);
  }
  else if(wave == 3)
  {
    o.SetWaveform(Oscillator::WAVE_POLYBLEP_SAW);
  }
  else
  {
    o.SetWaveform(Oscillator::WAVE_SQUARE);
  }
  return o.Process();
}

int drumlength(int i, float dursec)
{
  static const float kFixedSec[kDrumCount] = {
      0.001f + 0.05f + 0.05f,
      0.001f + 0.16f + 0.18f,
      0.001f + 0.01f + 0.1f + 0.12f + 0.2f,
      0.01f + 0.1f + 0.1f + 0.1f,
      0.1f + 0.055f,
      0.001f + 0.1f + 0.08f,
      0.1f + 0.055f,
      0.01f + 0.1f + 0.08f,
      0.001f + 0.1f + 0.08f,
      0.001f + 0.35f + drumnotelen(8),
  };
  int fixed = drumsamp(kFixedSec[i]);
  if(dursec <= 0.f)
  {
    return fixed;
  }
  int pattern = drumsamp(dursec);
  if(i == 5 || i == 8)
  {
    return std::min(fixed, pattern + drumsamp(0.08f));
  }
  return std::max(fixed, pattern);
}

void retriggerdrum(int i, float dursec)
{
  ZssDrumState& d = g_engine.drums[i];
  d.remain        = drumlength(i, dursec);
  d.hp.Reset();
  biquadreset(d.bp);
  for(int q = 0; q < 3; ++q)
  {
    biquadreset(d.eq[q]);
  }
  switch(i)
  {
  case 7: g_engine.tom_drum.Trig(); break;
  case 9: g_engine.bass_drum.Trig(); break;
  default: break;
  }
}

int drumadvance(int i)
{
  ZssDrumState& d = g_engine.drums[i];
  if(d.remain <= 0)
  {
    return -1;
  }
  float dursec = readctrl(off_drums() + kDrumCount + i);
  int   len    = drumlength(i, dursec);
  int   age    = len - d.remain;
  --d.remain;
  return age;
}

float drumeq3(int i, float input, const BiquadCoef& low, const BiquadCoef& mid,
              const BiquadCoef& high)
{
  ZssDrumState& d = g_engine.drums[i];
  float         x   = biquadrun(d.eq[0], low, input);
  x                 = biquadrun(d.eq[1], mid, x);
  return biquadrun(d.eq[2], high, x);
}

float drumbandpass(int i, float input, const BiquadCoef& coef)
{
  return biquadrun(g_engine.drums[i].bp, coef, input);
}

float drumtick()
{
  int age = drumadvance(0);
  if(age < 0)
  {
    return 0.f;
  }
  float sr = g_engine.sample_rate;
  float amp = drumadsr(age, drumsamp(0.001f), drumsamp(0.05f), 0.001f, drumsamp(0.05f));
  if(amp <= 0.f)
  {
    return 0.f;
  }
  static BiquadCoef hp, lo, mid, hi;
  static bool       init = false;
  if(!init)
  {
    hp  = biquadcoef("highpass", 8000.f, 0.707f, 0.f, sr);
    lo  = biquadcoef("lowshelf", 400.f, 0.707f, -6.f, sr);
    mid = biquadcoef("peaking", 1000.f, 1.f, 6.f, sr);
    hi  = biquadcoef("highshelf", 2500.f, 0.707f, 10.f, sr);
    init = true;
  }
  float n = biquadrun(g_engine.drums[0].bp, hp, drumnoise() * amp);
  n       = drumeq3(0, n, lo, mid, hi);
  return n * kDrumTickTrim * kDrumGains[0];
}

float drumtweet()
{
  int age = drumadvance(1);
  if(age < 0)
  {
    return 0.f;
  }
  float sr = g_engine.sample_rate;
  float amp = drumadsr(age, drumsamp(0.001f), drumsamp(0.16f), 0.06f, drumsamp(0.18f));
  if(amp <= 0.f)
  {
    return 0.f;
  }
  static BiquadCoef hp, lo, mid, hi;
  static bool       init = false;
  if(!init)
  {
    hp  = biquadcoef("highpass", 6000.f, 0.707f, 0.f, sr);
    lo  = biquadcoef("lowshelf", 400.f, 0.707f, -6.f, sr);
    mid = biquadcoef("peaking", 1000.f, 1.f, 3.f, sr);
    hi  = biquadcoef("highshelf", 2500.f, 0.707f, 8.f, sr);
    init = true;
  }
  float n = biquadrun(g_engine.drums[1].bp, hp, drumnoise() * amp);
  n       = drumeq3(1, n, lo, mid, hi);
  return n * kDrumTweetTrim * kDrumGains[1];
}

float drumcowbell()
{
  int age = drumadvance(2);
  if(age < 0)
  {
    return 0.f;
  }
  float sr = g_engine.sample_rate;
  float syn = drumadsr(age, drumsamp(0.001f), drumsamp(0.01f), 0.1f, drumsamp(0.1f));
  float genv = 0.5f * std::pow(0.02f, std::min(1.f, static_cast<float>(age) / drumsamp(0.35f)));
  float amp  = syn * genv;
  if(amp <= 0.f)
  {
    return 0.f;
  }
  static BiquadCoef bp;
  static bool       init = false;
  if(!init)
  {
    bp   = biquadcoef("bandpass", 350.f, 1.f, 0.f, sr);
    init = true;
  }
  float sig = drumoscwave(g_engine.drumoscA[2], 0, 800.f)
              + drumoscwave(g_engine.drumoscB[2], 0, 540.f);
  sig       = drumbandpass(2, drumdistort(sig * 0.35f * amp, 0.08f), bp);
  return sig * kDrumGains[2];
}

float drumclap()
{
  int age = drumadvance(3);
  if(age < 0)
  {
    return 0.f;
  }
  float sr = g_engine.sample_rate;
  float amp = drumadsr(age, drumsamp(0.01f), drumsamp(0.1f), 0.1f, drumsamp(0.1f));
  if(amp <= 0.f)
  {
    return 0.f;
  }
  static BiquadCoef hp, lo, mid, hi;
  static bool       init = false;
  if(!init)
  {
    hp  = biquadcoef("highpass", 800.f, 0.707f, 0.f, sr);
    lo  = biquadcoef("lowshelf", 400.f, 0.707f, -10.f, sr);
    mid = biquadcoef("peaking", 1000.f, 1.f, 10.f, sr);
    hi  = biquadcoef("highshelf", 2500.f, 0.707f, -1.f, sr);
    init = true;
  }
  float n = biquadrun(g_engine.drums[3].bp, hp, drumnoise() * amp);
  n       = drumeq3(3, n, lo, mid, hi);
  return n * kDrumGains[3];
}

float snarepitch(bool hi, int age)
{
  int   ramp1 = drumsamp(drumnotelen(512));
  int   ramp2 = drumsamp(drumnotelen(32));
  float start = 10000.f, mid = hi ? 300.f : 150.f, end = 100.f;
  if(age < ramp1)
  {
    return drumexpramp(age, ramp1, start, mid);
  }
  if(age < ramp2)
  {
    return drumexpramp(age - ramp1, ramp2 - ramp1, mid, end);
  }
  return end;
}

float snareoscenv(int age)
{
  int dec = drumsamp(0.1f);
  if(age >= dec)
  {
    return 0.f;
  }
  return 1.f - static_cast<float>(age) / dec;
}

float snarenoiseenv(int age)
{
  int atk = drumsamp(0.01f);
  if(age < atk)
  {
    return static_cast<float>(age) / atk;
  }
  return drumexpexp(age - atk, drumsamp(drumnotelen(32)));
}

float drumsnare(bool hi)
{
  int idx = hi ? 4 : 6;
  int age = drumadvance(idx);
  if(age < 0)
  {
    return 0.f;
  }
  float oscamp   = snareoscenv(age);
  float noiseamp = snarenoiseenv(age);
  if(oscamp <= 0.f && noiseamp <= 0.f)
  {
    return 0.f;
  }
  float hz   = snarepitch(hi, age);
  float body = drumoscwave(g_engine.drumoscA[idx], 2, hz) * oscamp;
  float n    = drumhipass(idx, drumnoise() * noiseamp, 10000.f);
  float mix  = body + n * (hi ? 0.333f : 0.25f);
  return drumdistort(mix, hi ? 0.666f : 0.876f) * kDrumGains[idx];
}

float drumwoodblock(bool hi)
{
  int idx = hi ? 5 : 8;
  int age = drumadvance(idx);
  if(age < 0)
  {
    return 0.f;
  }
  float sr = g_engine.sample_rate;
  float clackamp = drumadsr(age, drumsamp(0.001f), drumsamp(0.001f), 0.001f, drumsamp(0.08f));
  float donkamp  = drumadsr(age, drumsamp(0.001f), drumsamp(0.1f), 0.001f, drumsamp(0.08f));
  if(clackamp <= 0.f && donkamp <= 0.f)
  {
    return 0.f;
  }
  static BiquadCoef bp;
  static bool       init = false;
  if(!init)
  {
    bp   = biquadcoef("bandpass", 256.f, 0.17f, 0.f, sr);
    init = true;
  }
  float clackend = hi ? 1000.f : 100.f;
  float donkend  = hi ? 888.f : 399.f;
  float clackhz  = drumexpramp(age, drumsamp(drumnotelen(32)), hi ? 2000.f : 2000.f, clackend);
  float donkhz   = drumexpramp(age, drumsamp(drumnotelen(256)), hi ? 999.f : 699.f, donkend);
  float sig = drumoscwave(g_engine.drumoscA[idx], 3, clackhz) * clackamp
              + drumoscwave(g_engine.drumoscB[idx], 1, donkhz) * donkamp;
  return drumbandpass(idx, sig, bp) * kDrumGains[idx];
}

float drumtom()
{
  if(drumadvance(7) < 0)
  {
    return 0.f;
  }
  return g_engine.tom_drum.Process(false) * kDrumGains[7];
}

float drumbass()
{
  if(drumadvance(9) < 0)
  {
    return 0.f;
  }
  return g_engine.bass_drum.Process(false) * kDrumGains[9];
}

float drumsout()
{
  g_engine.drumsidechain = 0.f;
  float sum = 0.f, sc = 0.f, s;
  sum += drumtick();
  sum += drumtweet();
  sum += drumcowbell();
  s = drumclap();
  sum += s;
  sc += s;
  sum += drumsnare(true);
  sum += drumwoodblock(true);
  sum += drumsnare(false);
  sum += drumtom();
  sum += drumwoodblock(false);
  s = drumbass();
  sum += s;
  sc += s;
  g_engine.drumsidechain = sc;
  return sum;
}

float reverbdecaytofeedback(float decay)
{
  decay = clampf(decay, 0.2f, 12.f);
  float fb = 0.55f + (1.f - std::exp(-decay / 4.5f)) * 0.38f;
  return clampf(fb, 0.5f, 0.95f);
}

float reverbdecaytolpfreq(float decay)
{
  decay = clampf(decay, 0.2f, 12.f);
  return clampf(20000.f - decay * 900.f, 3500.f, 18000.f);
}

void refreshfxderived(int group)
{
  ZssFxGroup& fx = g_engine.fx[group];
  float       delaysec = fxparam(group, kFxEchoDelay);
  if(delaysec <= 0.0001f)
  {
    delaysec = 0.22f;
  }
  fx.echo_delay = std::max(1, static_cast<int>(delaysec * g_engine.sample_rate + 0.5f));
  if(fx.echo_delay >= kEchoBufLen)
  {
    fx.echo_delay = kEchoBufLen - 1;
  }
  fx.echo_feedback = clampf(fxparam(group, kFxEchoFeedback), 0.f, 0.95f);
  fx.echo_line.SetDelay(static_cast<float>(fx.echo_delay));
  float decay = fxparam(group, kFxReverbDecay);
  if(decay <= 0.05f)
  {
    decay = 2.5f;
  }
  decay = clampf(decay, 0.2f, 12.f);
  fx.rev_feedback = reverbdecaytofeedback(decay);
  fx.rev_lpfreq   = reverbdecaytolpfreq(decay);
  fx.reverb.SetFeedback(fx.rev_feedback);
  fx.reverb.SetLpFreq(fx.rev_lpfreq);
  float pd = fxparam(group, kFxReverbPredelay);
  fx.rev_predelay_samples = pd <= 0.0001f ? 0 : std::max(1, static_cast<int>(pd * g_engine.sample_rate + 0.5f));
  if(fx.rev_predelay_samples >= kRevPredelayLen)
  {
    fx.rev_predelay_samples = kRevPredelayLen - 1;
  }
}

float fxfcrush(float x, int group)
{
  ZssFxGroup& fx = g_engine.fx[group];
  int         rate = static_cast<int>(fxparam(group, kFxFcRate));
  if(rate <= 1)
  {
    rate = 1;
  }
  fx.decimator.SetDownsampleFactor(static_cast<float>(rate));
  float crush = clampf((static_cast<float>(rate) - 1.f) / 31.f, 0.f, 1.f);
  fx.decimator.SetBitcrushFactor(crush);
  fx.decimator.SetSmoothCrushing(true);
  return fx.decimator.Process(x);
}

float fxecho(float x, int group)
{
  ZssFxGroup& fx      = g_engine.fx[group];
  float       delayed = fx.echo_line.Read();
  float       input   = x + delayed * fx.echo_feedback;
  input               = std::tanh(input);
  fx.echo_line.Write(input);
  return delayed;
}

float fxreverbinput(float x, int group)
{
  ZssFxGroup& fx = g_engine.fx[group];
  if(fx.rev_predelay_samples <= 0)
  {
    return x;
  }
  int   pos = fx.rev_predelay_pos % kRevPredelayLen;
  float pdout = fx.rev_predelay_buf[pos];
  fx.rev_predelay_buf[pos] = x + fx.rev_predelay_fb * 0.35f;
  fx.rev_predelay_pos      = (pos + 1) % fx.rev_predelay_samples;
  fx.rev_predelay_fb       = pdout;
  return pdout;
}

float fxreverb(float x, int group)
{
  ZssFxGroup& fx  = g_engine.fx[group];
  float       src = fxreverbinput(x, group);
  float       wetl = 0.f;
  float       wetr = 0.f;
  fx.reverb.Process(src, src, &wetl, &wetr);
  float wet = (wetl + wetr) * 0.5f * kReverbOutGain;
  return std::tanh(wet);
}

float fxautofilterbus(float x, int group)
{
  ZssFxGroup& fx = g_engine.fx[group];
  float       freq = fxparam(group, kFxAutofilterFreq);
  if(freq <= 0.f)
  {
    freq = 1.f;
  }
  float depth = fxparam(group, kFxAutofilterDepth);
  if(depth <= 0.f)
  {
    depth = 0.5f;
  }
  float base = fxparam(group, kFxAutofilterBase);
  if(base <= 0.f)
  {
    base = 200.f;
  }
  float oct = fxparam(group, kFxAutofilterOct);
  if(oct <= 0.f)
  {
    oct = 4.f;
  }
  float q = fxparam(group, kFxAutofilterQ);
  if(q <= 0.f)
  {
    q = 1.f;
  }
  fx.autofilter_phasor.SetFreq(freq);
  float lfo      = fx.autofilter_phasor.Process();
  float maxhz    = base * std::pow(2.f, oct);
  if(maxhz > g_engine.sample_rate * 0.5f)
  {
    maxhz = g_engine.sample_rate * 0.5f;
  }
  float unipolar = lfo * depth + (1.f - depth) * 0.5f;
  float cutoff   = base + (maxhz - base) * unipolar;
  if(cutoff < 20.f)
  {
    cutoff = 20.f;
  }
  fx.autofilter_svf.SetFreq(cutoff);
  fx.autofilter_svf.SetRes(clampf(q / 10.f, 0.01f, 1.f));
  fx.autofilter_svf.Process(x);
  return fx.autofilter_svf.Band() - x;
}

float autowahinputboost(float sensitivitydb)
{
  float gain = std::pow(10.f, sensitivitydb / 20.f);
  if(gain <= 0.f)
  {
    return 1.f;
  }
  return 1.f / gain;
}

float fxautowahbus(float x, int group)
{
  if(!std::isfinite(x))
  {
    return 0.f;
  }
  ZssFxGroup& fx = g_engine.fx[group];
  float       octaves = fxparam(group, kFxAutowahOct);
  if(octaves <= 0.f)
  {
    octaves = kAutowahDefaultOct;
  }
  float sensitivity = fxparam(group, kFxAutowahSens);
  float gaindb      = fxparam(group, kFxAutowahGain);
  if(gaindb <= 0.f && gaindb != 0.f)
  {
    gaindb = kAutowahDefaultGain;
  }

  float input = x * autowahinputboost(sensitivity);
  fx.autowah.SetWah(clampf(octaves / 6.f, 0.f, 1.f));
  fx.autowah.SetLevel(clampf(dbtoamp(gaindb) / 4.f, 0.f, 1.f));
  fx.autowah.SetDryWet(100.f);
  float wet = fx.autowah.Process(input);
  if(!std::isfinite(wet))
  {
    return 0.f;
  }
  return wet - x;
}

float fxsoftclip(float x)
{
  return std::tanh(x);
}

int fxactiveendcount(float s0, float s1, float s2, float s3, float s5, float s6)
{
  int count = 0;
  if(s0 > 0.f)
  {
    ++count;
  }
  if(s1 > 0.f)
  {
    ++count;
  }
  if(s2 > 0.f)
  {
    ++count;
  }
  if(s3 > 0.f)
  {
    ++count;
  }
  if(s5 > 0.f)
  {
    ++count;
  }
  if(s6 > 0.f)
  {
    ++count;
  }
  return count;
}

bool fxgrouphasactivesends(int group)
{
  for(int s = 0; s < kFxSendCount; ++s)
  {
    if(fxsendval(group, s) > 0.0001f)
    {
      return true;
    }
  }
  return false;
}

void fxnormalizeends(float& s0, float& s1, float& s2, float& s3, float& s5,
                     float& s6)
{
  float sum = 0.f;
  if(s0 > 0.f)
  {
    sum += s0;
  }
  if(s1 > 0.f)
  {
    sum += s1;
  }
  if(s2 > 0.f)
  {
    sum += s2;
  }
  if(s3 > 0.f)
  {
    sum += s3;
  }
  if(s5 > 0.f)
  {
    sum += s5;
  }
  if(s6 > 0.f)
  {
    sum += s6;
  }
  if(sum <= 1.f)
  {
    return;
  }
  const float scale = 1.f / sum;
  if(s0 > 0.f)
  {
    s0 *= scale;
  }
  if(s1 > 0.f)
  {
    s1 *= scale;
  }
  if(s2 > 0.f)
  {
    s2 *= scale;
  }
  if(s3 > 0.f)
  {
    s3 *= scale;
  }
  if(s5 > 0.f)
  {
    s5 *= scale;
  }
  if(s6 > 0.f)
  {
    s6 *= scale;
  }
}

float applyfxgroup(float sig, int group)
{
  if(!fxgrouphasactivesends(group))
  {
    return sig;
  }
  refreshfxderived(group);
  float s0 = fxsendval(group, kFxFc);
  float s1 = fxsendval(group, kFxEcho);
  float s2 = fxsendval(group, kFxReverb);
  float s3 = fxsendval(group, kFxAutofilter);
  float s5 = fxsendval(group, kFxDistort);
  float s6 = fxsendval(group, kFxAutowah);
  fxnormalizeends(s0, s1, s2, s3, s5, s6);
  float out = sig;
  if(s0 > 0.f)
  {
    float wet0 = fxfcrush(out, group);
    out        = out + s0 * (wet0 - out);
  }
  if(s1 > 0.f)
  {
    float wet1 = fxecho(out, group);
    out        = out + s1 * (wet1 - out);
  }
  if(s2 > 0.f)
  {
    float wet2 = fxreverb(out, group);
    out        = out + s2 * (wet2 - out);
  }
  if(s3 > 0.f)
  {
    out += s3 * fxautofilterbus(out, group);
  }
  if(s5 > 0.f)
  {
    float amt  = fxparam(group, kFxDistortion);
    if(amt <= 0.f)
    {
      amt = 0.4f;
    }
    g_engine.fx[group].overdrive.SetDrive(clampf(amt, 0.f, 1.f));
    float wet5 = g_engine.fx[group].overdrive.Process(out * 3.f);
    out        = out + s5 * (wet5 - out);
  }
  if(s6 > 0.f)
  {
    out += s6 * fxautowahbus(out, group);
  }
  int active = fxactiveendcount(s0, s1, s2, s3, s5, s6);
  if(active >= 2)
  {
    out *= 1.f / std::sqrt(static_cast<float>(active));
  }
  return fxsoftclip(out);
}

bool bgplayactive()
{
  for(int i = kPlayVoiceCount; i < kVoiceCount; ++i)
  {
    if(readctrl(off_voices() + i * kVoiceStride + 1) > 0.5f)
    {
      return true;
    }
  }
  return false;
}

void initmasterchain(float sr)
{
  g_engine.comp_env = 0.f;
  g_engine.comp_attack_coef =
      1.f - std::exp(-1.f / (kMasterCompAttackSec * sr));
  g_engine.comp_release_coef =
      1.f - std::exp(-1.f / (kMasterCompReleaseSec * sr));
}

void initrazzlechain(float sr)
{
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
  std::memset(g_engine.razzle_chorus_buf, 0, sizeof(g_engine.razzle_chorus_buf));
}

float sidechainkey(float bg, float tts, float drumtap)
{
  const float sc_send_trim = dbtoamp(-12.f);
  const float sc_drum_trim = dbtoamp(-28.f);
  float       trigger      = 0.f;
  if(bgplayactive())
  {
    float bgabs = std::fabs(bg);
    if(bgabs * sc_send_trim > trigger)
    {
      trigger = bgabs * sc_send_trim;
    }
  }
  float ttabs = std::fabs(tts);
  if(ttabs * sc_send_trim > trigger)
  {
    trigger = ttabs * sc_send_trim;
  }
  float drabs = std::fabs(drumtap);
  if(drabs * sc_drum_trim > trigger)
  {
    trigger = drabs * sc_drum_trim;
  }
  if(trigger < kScTriggerFloor)
  {
    trigger = 0.f;
  }
  return trigger;
}

void sidechainupdate(float signal)
{
  float s = std::fabs(signal);
  const float sc_attack = 1.f - std::exp(-1.f / (0.005f * g_engine.sample_rate));
  const float sc_release = 1.f - std::exp(-1.f / (0.06f * g_engine.sample_rate));
  g_engine.sc_prevlevel = (s > g_engine.sc_prevlevel ? sc_attack : sc_release)
                          * g_engine.sc_prevlevel
                          + (1.f - (s > g_engine.sc_prevlevel ? sc_attack : sc_release)) * s * s;
  if(g_engine.sc_prevlevel < 1e-6f)
  {
    g_engine.sc_prevlevel = 1e-6f;
  }
  float leveldb = std::log10(g_engine.sc_prevlevel) * 10.f;
  float above   = leveldb - (-42.f);
  float targetdb = above / 5.f - above;
  if(targetdb > 0.f)
  {
    targetdb = 0.f;
  }
  float gaindb = targetdb;
  if(gaindb < g_engine.sc_prevgaindb)
  {
    gaindb = g_engine.sc_prevgaindb + (gaindb - g_engine.sc_prevgaindb) * sc_attack;
  }
  else
  {
    gaindb = g_engine.sc_prevgaindb + (gaindb - g_engine.sc_prevgaindb) * sc_release;
  }
  g_engine.sc_prevgaindb = gaindb;
  g_engine.sc_gainlinear = std::pow(10.f, (gaindb + 24.f) / 20.f);
}

float sidechaingain()
{
  return 1.f + (g_engine.sc_gainlinear - 1.f) * kScMix;
}

float readttsvolume()
{
  float vol = readctrl(off_master() + 2);
  if(vol <= 0.001f)
  {
    return 0.f;
  }
  return vol / 100.f;
}

float razzledelay(float* buf, int& pos, int len, float in, float delaysec)
{
  int   d = std::max(1, static_cast<int>(delaysec * g_engine.sample_rate));
  if(d >= len)
  {
    d = len - 1;
  }
  int   readpos = pos - d;
  if(readpos < 0)
  {
    readpos += len;
  }
  float out = buf[readpos];
  buf[pos]  = in;
  pos       = (pos + 1) % len;
  return out;
}

float applymastercompressor(float x)
{
  const float thresh =
      std::pow(10.f, kMasterCompThresholdDb / 20.f);
  float       ax   = std::fabs(x);
  float       coef = (ax > g_engine.comp_env) ? g_engine.comp_attack_coef
                                              : g_engine.comp_release_coef;
  g_engine.comp_env += (ax - g_engine.comp_env) * coef;
  if(g_engine.comp_env <= thresh)
  {
    return x;
  }
  float dbover  = 20.f * std::log10(g_engine.comp_env / thresh);
  float reduced = dbover - dbover / kMasterCompRatio;
  float gain    = std::pow(10.f, -reduced / 20.f);
  return x * gain;
}

float applyrazzle(float input)
{
  float vibratodepth = g_engine.razzlevibratolfo.Process() * 0.0015f;
  float vibtap       = razzledelay(g_engine.razzle_vib_buf, g_engine.razzle_vib_pos, 512,
                                   input, 0.005f + vibratodepth);
  float vibrato      = input + (vibtap - input) * kRazzleVibratoWet;

  float chorusdepth = g_engine.razzlechoruslfo.Process() * kRazzleChorusDepthSec;
  float hissmod     = 0.35f + 0.65f * (0.5f + 0.5f * g_engine.razzlehissmod.Process());
  float hissamp     = g_engine.razzlehiss.Process() * kRazzleHissGain * hissmod;

  // Tone: modulated tape hiss feeds the chorus input (always-on bed, even when dry=0).
  float chortap = razzledelay(g_engine.razzle_chorus_buf, g_engine.razzle_chorus_pos, 512,
                              vibrato + hissamp, kRazzleChorusBaseSec + chorusdepth);
  return vibrato + (chortap - vibrato) * kRazzleChorusWet;
}

float readmastervolume()
{
  float vol = readctrl(off_master());
  if(vol <= 0.001f)
  {
    return 0.f;
  }
  if(g_engine.mastervolprev <= 0.001f && vol > 0.001f)
  {
    initmasterchain(g_engine.sample_rate);
    g_engine.sc_prevgaindb = 0.f;
    g_engine.sc_gainlinear = 1.f;
    g_engine.sc_prevlevel  = 1e-6f;
  }
  g_engine.mastervolprev = vol;
  float db = 20.f * std::log10(vol * 0.25f) - 35.f + kMasterTrimDb + kMasterMakeupDb;
  return std::pow(10.f, db / 20.f);
}

float readbgplayvolume()
{
  float vol = readctrl(off_master() + 1);
  if(vol <= 0.001f)
  {
    return 0.f;
  }
  return std::pow(10.f, (20.f * std::log10(vol) - 35.f) / 20.f);
}

void applypluckparams(ZssVoice& v, int cfg)
{
  const float structure  = readctrl(cfg + 6);
  const float brightness = readctrl(cfg + 7);
  const float damping    = readctrl(cfg + 8);
  const float accent     = readctrl(cfg + 9);
  if(structure != v.pluckprev[0])
  {
    v.stringvoice.SetStructure(structure);
    v.pluckprev[0] = structure;
  }
  if(brightness != v.pluckprev[1])
  {
    v.stringvoice.SetBrightness(brightness);
    v.pluckprev[1] = brightness;
  }
  if(damping != v.pluckprev[2])
  {
    v.stringvoice.SetDamping(damping);
    v.pluckprev[2] = damping;
  }
  if(accent != v.pluckprev[3])
  {
    v.stringvoice.SetAccent(accent);
    v.pluckprev[3] = accent;
  }
}

void applystringensembleparams(ZssVoice& v, int cfg, float& detunecents,
                               float& pwmdepth, float& vibcents, float& filterscale)
{
  const float detraw = readctrl(cfg + 6);
  const float pwmraw = readctrl(cfg + 7);
  const float vibraw = readctrl(cfg + 8);
  const float filtraw = readctrl(cfg + 9);
  detunecents = detraw > 0.f ? clampf(detraw, 0.f, 1.f) * kStringMaxDetuneCents
                             : kStringDefaultDetune;
  pwmdepth = pwmraw > 0.f ? clampf(pwmraw, 0.f, 1.f) : kStringDefaultPwm;
  vibcents = vibraw > 0.f ? clampf(vibraw, 0.f, 1.f) * kStringMaxVibCents
                          : kStringDefaultVib;
  filterscale = filtraw > 0.f ? clampf(filtraw, 0.f, 1.f) : kStringDefaultFilter;
}

void applystringvoicepreset(ZssVoice& v, int algo)
{
  if(v.stringvoicepreset == algo)
  {
    return;
  }
  v.stringvoicepreset = algo;
  if(algo == 1)
  {
    v.pluckprev[0] = v.pluckprev[1] = v.pluckprev[2] = v.pluckprev[3] = -1.f;
  }
}

float stringmachinevoice(ZssVoice& v, float hz, float envout, float detunecents,
                         float pwmdepth, float vibcents, float filterscale)
{
  v.stringviblfo.SetFreq(4.8f);
  v.stringviblfo.SetWaveform(Oscillator::WAVE_TRI);
  v.stringviblfo.SetAmp(1.f);
  const float viblfo = v.stringviblfo.Process() * (vibcents / 1200.f);

  v.stringpwmlfo.SetFreq(0.75f);
  v.stringpwmlfo.SetWaveform(Oscillator::WAVE_SQUARE);
  v.stringpwmlfo.SetAmp(1.f);
  const float pwmfm = v.stringpwmlfo.Process() * pwmdepth * 0.004f;

  const float detmul = std::pow(2.f, detunecents / 1200.f);
  const float hz1    = hz * (1.f + viblfo);
  const float hz2    = hz * detmul * (1.f + pwmfm);

  const float vco1 = oscbasicwave(v.synthosc, 3, hz1);
  const float vco2 = oscbasicwave(v.synthmod, 3, hz2);
  float       sig  = (vco1 + vco2) * 0.5f;
  sig += oscbasicwave(v.algoops[0], 3, hz * 0.5f) * kStringSubOctaveMix;
  sig /= (1.f + kStringSubOctaveMix);

  const float kf       = std::pow(clampf(hz / 440.f, 0.25f, 4.f), 0.38f);
  const float basecut  = 520.f + kf * 2100.f;
  const float filtenv  = envout * 600.f * filterscale;
  const float cutoff   = clampf((basecut + filtenv) * (0.75f + filterscale * 0.5f),
                                400.f, g_engine.sample_rate * 0.33f);
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
  if(hpnorm > 0.497f)
  {
    hpnorm = 0.497f;
  }
  v.stringbowhp.SetFrequency(hpnorm);
  out += v.stringbowhp.Process(nois) * envout * kStringBowNoiseMix;

  return out;
}

void initvoice(ZssVoice& v, float sr)
{
  v.synthosc.Init(sr);
  v.synthmod.Init(sr);
  v.sparklemod.Init(sr);
  v.sparklecar.Init(sr);
  v.dootosc.Init(sr);
  for(int o = 0; o < 4; ++o)
  {
    v.algoops[o].Init(sr);
    v.algoenvs[o].Init(sr);
  }
  v.env.Init(sr);
  v.dootenv.Init(sr);
  v.dootenv.SetTime(ADSR_SEG_ATTACK, 0.001f);
  v.dootenv.SetTime(ADSR_SEG_DECAY, 0.4f);
  v.dootenv.SetSustainLevel(0.01f);
  v.dootenv.SetTime(ADSR_SEG_RELEASE, 1.4f);
  v.sparkleenv.Init(sr);
  v.sparkleenv.SetTime(ADSR_SEG_ATTACK, 0.001f);
  v.sparkleenv.SetTime(ADSR_SEG_DECAY, 1.4f);
  v.sparkleenv.SetSustainLevel(0.f);
  v.sparkleenv.SetTime(ADSR_SEG_RELEASE, 0.321f);
  v.algooutenv.Init(sr);
  v.modenv.Init(sr);
  v.modenv.SetTime(ADSR_SEG_ATTACK, 0.01f);
  v.modenv.SetTime(ADSR_SEG_DECAY, 0.01f);
  v.modenv.SetSustainLevel(1.f);
  v.modenv.SetTime(ADSR_SEG_RELEASE, 0.08f);
  v.noiserng = (0x6d2b79f5u + 7919u) >> 0;
  v.stringvoice.Init(sr);
  v.stringvoicepreset = -1;
  v.stringlp.Init(sr);
  v.stringbodylo.Init(sr);
  v.stringbodyhi.Init(sr);
  v.stringbowhp.Init();
  v.stringbowhp.SetFilterMode(OnePole::FILTER_MODE_HIGH_PASS);
  v.stringviblfo.Init(sr);
  v.stringpwmlfo.Init(sr);
  v.drip.Init(sr, 0.01f);
  v.modalvoice.Init(sr);
  v.modalvoice.SetStructure(0.5f);
  v.modalvoice.SetBrightness(0.5f);
  v.modalvoice.SetDamping(0.5f);
  v.modalvoice.SetAccent(0.8f);
}

void initdaisydrums(float sr)
{
  g_engine.tom_drum.Init(sr);
  g_engine.tom_drum.SetFreq(90.f);
  g_engine.tom_drum.SetDecay(0.35f);
  g_engine.tom_drum.SetTone(0.5f);
  g_engine.tom_drum.SetFmEnvelopeAmount(0.6f);
  g_engine.tom_drum.SetAccent(0.8f);

  g_engine.bass_drum.Init(sr);
  g_engine.bass_drum.SetFreq(50.f);
  g_engine.bass_drum.SetDecay(0.5f);
  g_engine.bass_drum.SetTone(0.4f);
  g_engine.bass_drum.SetAccent(0.9f);
}

void initengine(float sr)
{
  g_engine.sample_rate = sr;
  initnoisetables();
  for(int i = 0; i < kVoiceCount; ++i)
  {
    initvoice(g_engine.voices[i], sr);
  }
  g_engine.drum_whitenoise.Init();
  initdaisydrums(sr);
  initmasterchain(sr);
  initrazzlechain(sr);
  for(int d = 0; d < kDrumCount; ++d)
  {
    g_engine.drumoscA[d].Init(sr);
    g_engine.drumoscB[d].Init(sr);
    g_engine.drums[d].hp.Init();
    g_engine.drums[d].hp.SetFilterMode(OnePole::FILTER_MODE_HIGH_PASS);
  }
  for(int f = 0; f < kFxGroups; ++f)
  {
    ZssFxGroup& fx = g_engine.fx[f];
    fx.decimator.Init();
    fx.overdrive.Init();
    fx.autowah.Init(sr);
    fx.autofilter_svf.Init(sr);
    fx.autofilter_phasor.Init(sr);
    fx.echo_line.Init();
    fx.reverb.Init(sr);
    std::memset(fx.rev_predelay_buf, 0, sizeof(fx.rev_predelay_buf));
    refreshfxderived(f);
  }
  g_engine.fxvibratolfo.Init(sr);
  g_engine.master_dcblock.Init(sr);
  g_engine.ready = true;
}

float processvoice(int vi, float vstart[kVibratoGroups], float vend[kVibratoGroups],
                   float vpeak[kVibratoGroups], float vfreq[kVibratoGroups])
{
  const int base = off_voices() + vi * kVoiceStride;
  const int cfg  = off_voicecfg() + vi * kVoiceCfgStride;

  float freq   = readctrl(base + 0);
  bool  gate   = readctrl(base + 1) > 0.5f;
  int   type   = static_cast<int>(readctrl(base + 2));
  int   algo   = static_cast<int>(readctrl(base + 3));
  float detune = readctrl(base + 4);
  int   osctype = static_cast<int>(readctrl(base + 5));

  float atk = readctrl(cfg + 0), dec = readctrl(cfg + 1);
  float sus = readctrl(cfg + 2), rel = readctrl(cfg + 3);
  float port = readctrl(cfg + 4), vol_db = readctrl(cfg + 5);

  applyvoiceenv(g_engine.voices[vi], type, atk, dec, sus, rel);

  ZssVoice& v = g_engine.voices[vi];
  float     out = 0.f;

  if(type == kSynth)
  {
    if(gate && !v.synthgateprev)
    {
      v.voicephasestep = 0.f;
    }
    v.synthgateprev = gate;
    float hz     = glidefreq(v, vi, freq > 0.f ? freq : 440.f, kSynth, port);
    float envout = v.env.Process(gate);
    v.lastenv    = envout;
    out          = synthsource(v, vi, hz, gate, detune, osctype, vfreq) * envout;
  }
  else if(type >= kRetroNoise && type <= kMetallicNoise)
  {
    float envout = v.env.Process(gate);
    v.lastenv    = envout;
    out          = noisevoice(v, vi, type, freq, gate, envout);
  }
  else if(type == kHollowNoise || type == kWhiteNoise)
  {
    float envout = v.env.Process(gate);
    v.lastenv    = envout;
    out          = noisevoice(v, vi, type, freq, gate, envout);
  }
  else if(type == kBells)
  {
    float hz      = detunedhz(vi, freq, detune, vfreq);
    if(hz <= 0.f)
    {
      hz = 440.f;
    }
    bool trigger = gate && !v.bellgateprev;
    v.bellgateprev = gate;
    v.modalvoice.SetFreq(hz);
    v.modalvoice.SetSustain(gate);
    float body    = v.modalvoice.Process(trigger);
    float sparkhz = hz * 4.f;
    v.sparklemod.SetFreq(sparkhz * 5.1f);
    v.sparklemod.SetWaveform(Oscillator::WAVE_SIN);
    v.sparklemod.SetAmp(1.f);
    float sparkmod = v.sparklemod.Process() * 32.f;
    v.sparklecar.SetFreq(sparkhz + sparkmod * 0.002f);
    v.sparklecar.SetWaveform(Oscillator::WAVE_SIN);
    v.sparklecar.SetAmp(1.f);
    float sparkle = v.sparklecar.Process() * v.sparkleenv.Process(gate);
    out           = (body + sparkle * 0.15f) * 0.35f;
    v.lastenv     = std::fabs(out);
  }
  else if(type == kDoot)
  {
    out       = dootvoice(v, freq, gate);
    v.lastenv = std::fabs(out);
  }
  else if(type == kAlgoSynth)
  {
    out       = algovoice(v, vi, freq, gate, algo, vfreq);
    v.lastenv = std::fabs(out);
  }
  else if(type == kStringVoice)
  {
    float hz      = detunedhz(vi, freq > 0.f ? freq : 440.f, detune, vfreq);
    bool  trigger = gate && !v.stringgateprev;
    v.stringgateprev = gate;
    applystringvoicepreset(v, algo == 0 ? 0 : 1);
    if(algo == 0)
    {
      float envout = v.env.Process(gate);
      float detunecents, pwmdepth, vibcents, filterscale;
      applystringensembleparams(v, cfg, detunecents, pwmdepth, vibcents, filterscale);
      out = stringmachinevoice(v, hz, envout, detunecents, pwmdepth, vibcents,
                               filterscale)
            * envout;
      out *= dbtoamp(vol_db) * kStringMachineGain;
      v.lastenv = envout;
      return out;
    }
    applypluckparams(v, cfg);
    v.stringvoice.SetFreq(hz);
    v.stringvoice.SetSustain(false);
    if(trigger)
    {
      v.stringvoice.Reset();
    }
    out = v.stringvoice.Process(trigger);
    out *= dbtoamp(vol_db) * kStringPluckGain;
    v.lastenv = std::fabs(out);
    return out;
  }
  else if(type == kDripVoice)
  {
    bool trigger = gate && !v.dripgateprev;
    v.dripgateprev = gate;
    out            = v.drip.Process(trigger) * dbtoamp(vol_db);
    v.lastenv      = std::fabs(out);
    return out;
  }
  else
  {
    float envout = v.env.Process(gate);
    v.lastenv    = envout;
    out          = synthsource(v, vi, freq, gate, detune, osctype, vfreq) * envout;
  }

  return out * dbtoamp(vol_db);
}

} // namespace

extern "C" {

void zss_init(float sample_rate)
{
  std::memset(g_control, 0, sizeof(g_control));
  g_control[off_master()]     = 80.0;
  g_control[off_master() + 1] = 100.0;
  g_control[off_master() + 2] = 25.0;
  initengine(sample_rate > 0.f ? sample_rate : 44100.f);
  g_engine.cached_mastervol = readmastervolume();
  g_engine.cached_bggain    = readbgplayvolume();
  g_engine.cached_ttsgain   = readttsvolume();
  g_engine.cached_masterraw = 80.f;
  g_engine.cached_bgraw     = 100.f;
  g_engine.cached_ttsraw    = 25.f;
}

double* zss_control_ptr()
{
  return g_control;
}

int zss_control_len()
{
  return kControlLen;
}

/** 2 = manual delay-line razzle (post–DaisySP Chorus). */
float zss_razzle_tag()
{
  return 2.f;
}

void zss_process(float* out, int frames, const float* tts_in)
{
  if(!g_engine.ready)
  {
    std::memset(out, 0, frames * sizeof(float));
    return;
  }

  float vstart[kVibratoGroups], vend[kVibratoGroups], vpeak[kVibratoGroups],
        vfreq[kVibratoGroups];
  float epoch = 0.f;
  readvibratosab(&epoch, vstart, vend, vpeak, vfreq);

  float masterraw = readctrl(off_master());
  float bgraw     = readctrl(off_master() + 1);
  float ttsraw    = readctrl(off_master() + 2);
  if(masterraw != g_engine.cached_masterraw || bgraw != g_engine.cached_bgraw)
  {
    g_engine.cached_masterraw = masterraw;
    g_engine.cached_bgraw     = bgraw;
    g_engine.cached_mastervol = masterraw <= 0.001f ? 0.f : readmastervolume();
    g_engine.cached_bggain    = readbgplayvolume();
  }
  if(ttsraw != g_engine.cached_ttsraw)
  {
    g_engine.cached_ttsraw  = ttsraw;
    g_engine.cached_ttsgain = readttsvolume();
  }

  for(int f = 0; f < frames; ++f)
  {
    ++g_engine.sampleclock;
    updateplayvibratodepth(vstart, vend, vpeak);

    for(int d = 0; d < kDrumCount; ++d)
    {
      const uint32_t strike = static_cast<uint32_t>(readctrl(off_drums() + d));
      if(strike != g_engine.drums[d].prev_strike)
      {
        retriggerdrum(d, readctrl(off_drums() + kDrumCount + d));
        g_engine.drums[d].prev_strike = strike;
      }
    }

    float play0 = 0.f, play1 = 0.f, bg = 0.f;
    for(int vi = 0; vi < kVoiceCount; ++vi)
    {
      float sample = processvoice(vi, vstart, vend, vpeak, vfreq);
      if(vi < 2)
      {
        play0 += sample;
      }
      else if(vi < kPlayVoiceCount)
      {
        play1 += sample;
      }
      else
      {
        bg += sample;
      }
    }

    float drums = drumsout();
    float playfx = applyfxgroup(play0, 0) + applyfxgroup(play1, 1);
    float bgfx   = applyfxgroup(bg, 2);

    float ttssample = 0.f;
    if(tts_in != nullptr && g_engine.cached_ttsgain > 0.f)
    {
      ttssample = tts_in[f] * g_engine.cached_ttsgain;
    }

    float key = sidechainkey(bg * kVoiceOutGain * g_engine.cached_bggain, ttssample,
                             g_engine.drumsidechain);
    sidechainupdate(key);
    float duck = sidechaingain();

    float playbus = playfx * duck * kVoiceOutGain * kPlayBusGain;
    float bgbus   = bgfx * kVoiceOutGain * kPlayBusGain * g_engine.cached_bggain;
    float drumbus = drums * kDrumBusGain;
    float dry     = playbus + bgbus + drumbus + ttssample;

    float comp  = applymastercompressor(dry);
    float razz  = applyrazzle(comp);
    float final = g_engine.cached_mastervol > 0.f
                      ? g_engine.master_dcblock.Process(
                            clampf(razz * g_engine.cached_mastervol, -1.f, 1.f))
                      : 0.f;
    if(!std::isfinite(final))
    {
      final = 0.f;
    }
    out[f]      = clampf(final, -1.f, 1.f);
  }
}

} // extern "C"
