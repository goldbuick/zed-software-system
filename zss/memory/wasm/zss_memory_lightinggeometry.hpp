#pragma once

#include <algorithm>
#include <cmath>
#include <vector>

#include "third_party/json.hpp"
#include "zss_memory_constants.hpp"

namespace zss_memory {

using json = nlohmann::json;

inline double lightingdegmod360(double d) {
  double x = std::fmod(d, 360.0);
  if (x < 0) {
    x += 360.0;
  }
  return x;
}

inline std::pair<double, double> lightingmixmaxrangefrom360arc(double lo360,
                                                               double hi360,
                                                               bool wrapped) {
  const double lo = lightingdegmod360(lo360);
  const double hi = lightingdegmod360(hi360);
  if (!wrapped) {
    if (lo <= 180 && hi <= 180) {
      return {lo, hi};
    }
    if (lo > 180 && hi > 180) {
      return {lo - 360, hi - 360};
    }
    if (lo > 180 && hi <= 180) {
      return {lo - 360, hi};
    }
    return {lo, hi - 360};
  }
  if (lo <= 180 && hi <= 180) {
    return {lo, hi};
  }
  if (lo > 180 && hi > 180) {
    return {lo, hi};
  }
  if (lo > 180 && hi <= 180) {
    return {lo, hi};
  }
  return {lo, hi - 360};
}

inline std::pair<double, double> lightingmixmaxrange(
    double fromx,
    double fromy,
    double destx,
    double desty,
    const std::string& kind = "terrain") {
  const double frompx = (fromx + 0.5) * CHAR_WIDTH;
  const double frompy = (fromy + 0.5) * CHAR_HEIGHT;

  double destleft;
  double desttop;
  double occw;
  double occh;
  double margin;

  if (kind == "object") {
    constexpr double frac = 0.5;
    occw = CHAR_WIDTH * frac;
    occh = CHAR_HEIGHT * frac;
    const double destcx = destx * CHAR_WIDTH + CHAR_WIDTH * 0.5;
    const double destcy = desty * CHAR_HEIGHT + CHAR_HEIGHT * 0.5;
    destleft = destcx - occw * 0.5;
    desttop = destcy - occh * 0.5;
    margin = std::max(1.0, std::round(CHAR_RAY_MARGIN * frac));
  } else {
    destleft = destx * CHAR_WIDTH;
    desttop = desty * CHAR_HEIGHT;
    occw = CHAR_WIDTH;
    occh = CHAR_HEIGHT;
    margin = CHAR_RAY_MARGIN;
  }

  const double dx = destleft - frompx;
  const double dy = desttop - frompy;

  const double angles[4] = {
      std::atan2(dy - margin, dx - margin),
      std::atan2(dy - margin, dx + occw + margin),
      std::atan2(dy + occh + margin, dx - margin),
      std::atan2(dy + occh + margin, dx + occw + margin),
  };

  double degs[4];
  for (int i = 0; i < 4; ++i) {
    degs[i] = angles[i] * 180.0 / M_PI;
  }
  const double minfloat = *std::min_element(degs, degs + 4);
  const double maxfloat = *std::max_element(degs, degs + 4);
  const double spandeg = maxfloat - minfloat;
  constexpr double pad = 1.0;

  if (spandeg <= 180) {
    return {std::floor(minfloat) - pad, std::ceil(maxfloat) + pad};
  }

  double t[4];
  for (int i = 0; i < 4; ++i) {
    t[i] = lightingdegmod360(degs[i]);
  }
  const double minc = *std::min_element(t, t + 4);
  const double maxc = *std::max_element(t, t + 4);
  const double span360 = maxc - minc;

  if (span360 <= 180) {
    return lightingmixmaxrangefrom360arc(minc - pad, maxc + pad, false);
  }
  return lightingmixmaxrangefrom360arc(maxc - pad, minc + pad, true);
}

inline bool lightinganglematchesblocked(double d, double lo, double hi) {
  const double ds = d > 180 ? d - 360 : d;
  if (lo <= hi && hi - lo >= 359) {
    return true;
  }
  if (lo > hi) {
    return ds >= lo || ds <= hi;
  }
  return ds >= lo && ds <= hi;
}

inline void lightingorrangeintohit(std::vector<int>& hit, double lo, double hi) {
  for (int d = 0; d < 360; ++d) {
    if (lightinganglematchesblocked(static_cast<double>(d), lo, hi)) {
      hit[d] = 1;
    }
  }
}

inline bool lightinghitoverlapsrange(const std::vector<int>& hit, double lo,
                                     double hi) {
  for (int d = 0; d < 360; ++d) {
    if (hit[d] && lightinganglematchesblocked(static_cast<double>(d), lo, hi)) {
      return true;
    }
  }
  return false;
}

inline std::vector<std::pair<int, int>> lightingcompresscircularhit(
    const std::vector<int>& hit) {
  int sum = 0;
  for (int d = 0; d < 360; ++d) {
    sum += hit[d];
  }
  if (sum == 0) {
    return {};
  }
  if (sum == 360) {
    return {{0, 359}};
  }
  std::vector<int> dbl(720);
  for (int i = 0; i < 360; ++i) {
    dbl[i] = hit[i];
    dbl[i + 360] = hit[i];
  }
  std::vector<std::pair<int, int>> out;
  int i = 0;
  while (i < 720) {
    while (i < 720 && !dbl[i]) {
      ++i;
    }
    if (i == 720) {
      break;
    }
    const int s = i;
    while (i < 720 && dbl[i]) {
      ++i;
    }
    const int e = i - 1;
    if (e - s + 1 >= 360) {
      return {{0, 359}};
    }
    out.push_back({s % 360, e % 360});
  }
  std::vector<std::pair<int, int>> uniq;
  for (const auto& p : out) {
    bool found = false;
    for (const auto& u : uniq) {
      if (u.first == p.first && u.second == p.second) {
        found = true;
        break;
      }
    }
    if (!found) {
      uniq.push_back(p);
    }
  }
  return uniq;
}

inline void memorylightingaddrangetoblocked(
    std::vector<std::array<double, 3>>& blocked,
    const std::array<double, 3>& range) {
  if (range[2] < 1) {
    blocked.push_back(range);
    return;
  }
  std::vector<int> hit(360, 0);
  lightingorrangeintohit(hit, range[0], range[1]);

  bool mergedthispass = true;
  while (mergedthispass) {
    mergedthispass = false;
    for (int b = static_cast<int>(blocked.size()) - 1; b >= 0; --b) {
      const auto& bl = blocked[b];
      if (bl[2] < 1) {
        continue;
      }
      if (!lightinghitoverlapsrange(hit, bl[0], bl[1])) {
        continue;
      }
      lightingorrangeintohit(hit, bl[0], bl[1]);
      blocked.erase(blocked.begin() + b);
      mergedthispass = true;
    }
  }

  const auto parts = lightingcompresscircularhit(hit);
  for (const auto& p : parts) {
    blocked.push_back({static_cast<double>(p.first), static_cast<double>(p.second),
                       1.0});
  }
}

}  // namespace zss_memory
