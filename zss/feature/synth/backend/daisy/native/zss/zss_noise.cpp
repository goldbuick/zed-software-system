/**
 * ZSS DaisySP synth — see zss/README.md for module map.
 */
#ifdef __arm__
#undef __arm__
#endif

#include "zss_internal.h"

namespace zss_daisy {

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
} // namespace zss_daisy
