/**
 * ZSS DaisySP synth — see zss/README.md for module map.
 */
#ifdef __arm__
#undef __arm__
#endif

#include "zss_internal.h"

namespace zss_daisy {

// --- Drums: Maxi-style voices + Daisy AnalogBassDrum / SyntheticBassDrum ---

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
      0.001f + 0.08f + 2.4f,
      0.001f + 0.06f + 3.2f,
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

float drumcymbalmodal(int idx, int age, int len, const float ratios[6],
                        const float decays[6])
{
  float sr = g_engine.sample_rate;
  float t    = static_cast<float>(age) / std::max(1, len);
  float env  = std::pow(0.001f, t);
  float burst = drumadsr(age, drumsamp(0.001f), drumsamp(0.04f), 0.001f,
                         drumsamp(0.06f));
  float n = drumnoise() * burst * 0.85f;
  float sig = n;
  for(int m = 0; m < 6; ++m)
  {
    static BiquadCoef modes[12][6];
    static bool       init = false;
    if(!init)
    {
      for(int d = 0; d < 12; ++d)
      {
        float base = d == 10 ? 420.f : 380.f;
        for(int k = 0; k < 6; ++k)
        {
          float hz = base * ratios[k];
          modes[d][k] = biquadcoef("bandpass", hz, 8.f + k * 1.5f, 0.f, sr);
        }
      }
      init = true;
    }
    float modeenv = env * decays[m];
    sig += drumbandpass(idx, n * modeenv, modes[idx][m]) * (0.18f + m * 0.04f);
  }
  return sig;
}

float drumcrash()
{
  int age = drumadvance(10);
  if(age < 0)
  {
    return 0.f;
  }
  int   len = drumlength(10, readctrl(off_drums() + kDrumCount + 10));
  const float ratios[] = {1.f, 1.37f, 1.71f, 2.13f, 2.67f, 3.31f};
  const float decays[] = {1.f, 0.92f, 0.84f, 0.76f, 0.68f, 0.6f};
  return drumcymbalmodal(10, age, len, ratios, decays) * kDrumGains[10];
}

float drumride()
{
  int age = drumadvance(11);
  if(age < 0)
  {
    return 0.f;
  }
  int   len = drumlength(11, readctrl(off_drums() + kDrumCount + 11));
  const float ratios[] = {1.f, 1.29f, 1.58f, 1.91f, 2.24f, 2.58f};
  const float decays[] = {1.f, 0.95f, 0.9f, 0.85f, 0.8f, 0.75f};
  float sig = drumcymbalmodal(11, age, len, ratios, decays);
  if(age < drumsamp(0.12f))
  {
    float ping = drumoscwave(g_engine.drumoscA[11], 1, 520.f)
                 * drumadsr(age, drumsamp(0.001f), drumsamp(0.08f), 0.001f,
                            drumsamp(0.04f));
    sig += ping * 0.35f;
  }
  return sig * kDrumGains[11];
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
  sum += drumcrash();
  sum += drumride();
  g_engine.drumsidechain = sc;
  return sum;
}
} // namespace zss_daisy
