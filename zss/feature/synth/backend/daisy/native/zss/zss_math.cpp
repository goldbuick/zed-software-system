/**
 * ZSS DaisySP synth — see zss/README.md for module map.
 */
#ifdef __arm__
#undef __arm__
#endif

#include "zss_internal.h"

namespace zss_daisy {

float dbtoamp(float db) { return std::pow(10.f, db / 20.f); }

float clampf(float x, float lo, float hi) {
  return std::max(lo, std::min(hi, x));
}

void biquadreset(BiquadState& st) { st.x1 = st.x2 = st.y1 = st.y2 = 0.f; }

float biquadrun(BiquadState& st, const BiquadCoef& c, float x) {
  float y =
      c.b0 * x + c.b1 * st.x1 + c.b2 * st.x2 - c.a1 * st.y1 - c.a2 * st.y2;
  st.x2 = st.x1;
  st.x1 = x;
  st.y2 = st.y1;
  st.y1 = y;
  return y;
}

BiquadCoef biquadcoef(const char* type, float freq, float q, float gaindb,
                      float sr) {
  BiquadCoef c;
  float w0 = kTwoPi * freq / sr;
  float cosw0 = std::cos(w0);
  float sinw0 = std::sin(w0);
  float alpha = sinw0 / (2.f * q);
  float b0 = 0, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

  if (std::strcmp(type, "lowshelf") == 0) {
    float al = std::pow(10.f, gaindb / 40.f);
    float sq = 2.f * std::sqrt(al) * alpha;
    float ap1 = al + 1.f, am1 = al - 1.f;
    b0 = al * (ap1 - am1 * cosw0 + sq);
    b1 = 2.f * al * (am1 - ap1 * cosw0);
    b2 = al * (ap1 - am1 * cosw0 - sq);
    a0 = ap1 + am1 * cosw0 + sq;
    a1 = -2.f * (am1 + ap1 * cosw0);
    a2 = ap1 + am1 * cosw0 - sq;
  } else if (std::strcmp(type, "highshelf") == 0) {
    float ah = std::pow(10.f, gaindb / 40.f);
    float sq = 2.f * std::sqrt(ah) * alpha;
    float hp1 = ah + 1.f, hm1 = ah - 1.f;
    b0 = ah * (hp1 + hm1 * cosw0 + sq);
    b1 = -2.f * ah * (hm1 + hp1 * cosw0);
    b2 = ah * (hp1 + hm1 * cosw0 - sq);
    a0 = hp1 - hm1 * cosw0 + sq;
    a1 = 2.f * (hm1 - hp1 * cosw0);
    a2 = hp1 - hm1 * cosw0 - sq;
  } else if (std::strcmp(type, "peaking") == 0) {
    float ap = std::pow(10.f, gaindb / 40.f);
    b0 = 1.f + alpha * ap;
    b1 = -2.f * cosw0;
    b2 = 1.f - alpha * ap;
    a0 = 1.f + alpha / ap;
    a1 = -2.f * cosw0;
    a2 = 1.f - alpha / ap;
  } else if (std::strcmp(type, "bandpass") == 0) {
    b0 = alpha;
    b1 = 0.f;
    b2 = -alpha;
    a0 = 1.f + alpha;
    a1 = -2.f * cosw0;
    a2 = 1.f - alpha;
  } else if (std::strcmp(type, "lowpass") == 0) {
    b0 = (1.f - cosw0) * 0.5f;
    b1 = 1.f - cosw0;
    b2 = (1.f - cosw0) * 0.5f;
    a0 = 1.f + alpha;
    a1 = -2.f * cosw0;
    a2 = 1.f - alpha;
  } else if (std::strcmp(type, "highpass") == 0) {
    b0 = (1.f + cosw0) * 0.5f;
    b1 = -(1.f + cosw0);
    b2 = (1.f + cosw0) * 0.5f;
    a0 = 1.f + alpha;
    a1 = -2.f * cosw0;
    a2 = 1.f - alpha;
  }

  float inv = 1.f / a0;
  c.b0 = b0 * inv;
  c.b1 = b1 * inv;
  c.b2 = b2 * inv;
  c.a1 = a1 * inv;
  c.a2 = a2 * inv;
  return c;
}
} // namespace zss_daisy
