/**
 * Biquad filters and scalar DSP helpers.
 */
#pragma once

#include <cstring>

#include "zss_config.h"

namespace zss_daisy {

float dbtoamp(float db);
float clampf(float x, float lo, float hi);

struct BiquadCoef {
  float b0 = 1.f, b1 = 0.f, b2 = 0.f, a1 = 0.f, a2 = 0.f;
};

struct BiquadState {
  float x1 = 0.f, x2 = 0.f, y1 = 0.f, y2 = 0.f;
};

void biquadreset(BiquadState& st);
float biquadrun(BiquadState& st, const BiquadCoef& c, float x);
BiquadCoef biquadcoef(const char* type, float freq, float q, float gaindb,
                      float sr);

} // namespace zss_daisy
