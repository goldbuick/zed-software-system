#pragma once

#include <algorithm>
#include <cmath>
#include <string>
#include <vector>

#include "third_party/json.hpp"
#include "zss_memory_constants.hpp"
#include "zss_memory_lightinggeometry.hpp"

namespace zss_memory {

using json = nlohmann::json;

inline int lightingboardindex(const json& board, int x, int y) {
  if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) {
    return -1;
  }
  return x + y * BOARD_WIDTH;
}

inline std::string lightingcollisionlabel(const json& terr) {
  if (!terr.is_object() || !terr.contains("collision")) {
    return "ISWALK";
  }
  const json& c = terr["collision"];
  if (c.is_string()) {
    return c.get<std::string>();
  }
  if (c.is_number_integer()) {
    switch (c.get<int>()) {
      case 0:
        return "ISWALK";
      case 1:
        return "ISSOLID";
      case 2:
        return "ISSWIM";
      case 3:
        return "ISBULLET";
      case 4:
        return "ISGHOST";
      default:
        return "ISWALK";
    }
  }
  return "ISWALK";
}

inline bool lightingcheckcollision(const std::string& source,
                                   const std::string& dest) {
  if (source == "ISGHOST" || dest == "ISGHOST") {
    return false;
  }
  if (source == "ISWALK") {
    return dest != "ISWALK";
  }
  if (source == "ISSWIM") {
    return dest != "ISSWIM";
  }
  if (source == "ISSOLID") {
    return true;
  }
  if (source == "ISBULLET") {
    return dest != "ISWALK" && dest != "ISSWIM";
  }
  return false;
}

inline void lightingmarkplayer(const json& board, std::vector<double>& alphas,
                               int sx, int sy) {
  for (int y = sy - 1; y <= sy + 1; ++y) {
    for (int x = sx - 1; x <= sx + 1; ++x) {
      const int index = lightingboardindex(board, x, y);
      if (index >= 0 && index < static_cast<int>(alphas.size())) {
        const bool iscenter = x == sx && y == sy;
        const bool isaligned = x == sx || y == sy;
        const double lit = iscenter ? 0.0 : isaligned ? 0.7 : 0.9;
        alphas[index] = std::min(alphas[index], lit);
      }
    }
  }
}

inline void lightingapplyobject(const json& args, std::vector<double>& alphas) {
  const json& board = args["board"];
  const int sx = args["sprite"]["x"].get<int>();
  const int sy = args["sprite"]["y"].get<int>();
  const int light = std::max(1, std::min(BOARD_HEIGHT, args.value("light", 1)));
  const int center = lightingboardindex(board, sx, sy);
  if (center >= 0 && center < static_cast<int>(alphas.size())) {
    alphas[center] = 0.0;
  }
  if (light <= 1) {
    return;
  }

  const json& lookup = args.value("lookup", json::array());
  const json& terrain = board.value("terrain", json::array());
  const json& objects = board.value("objects", json::object());
  const double radius = static_cast<double>(light);
  const double step = 1.0 / (radius * 0.5);
  std::vector<std::array<double, 3>> blocked;

  for (int r = 1; r <= light; ++r) {
    struct Occ {
      int x;
      int y;
      std::array<double, 3> range;
    };
    std::vector<Occ> ringocclusions;
    for (int dx = -r; dx <= r; ++dx) {
      const int ytop = sy - r;
      const int ybot = sy + r;
      const int xleft = sx - r;
      const int xright = sx + r;
      const int pts[][2] = {{sx + dx, ytop}, {xright, sy + dx}, {sx + dx, ybot},
                            {xleft, sy - dx}};
      for (const auto& pt : pts) {
        const int x = pt[0];
        const int y = pt[1];
        const int idx = lightingboardindex(board, x, y);
        if (idx < 0) {
          continue;
        }
        const double rayx = x - sx;
        const double rayy = (y - sy) * LIGHTING_RAY_TILE_YSCALE;
        if (std::hypot(rayx, rayy) > radius) {
          continue;
        }
        std::string objid;
        if (lookup.is_array() && idx < static_cast<int>(lookup.size()) &&
            lookup[idx].is_string()) {
          objid = lookup[idx].get<std::string>();
        }
        if (!objid.empty() && objects.contains(objid)) {
          auto mm = lightingmixmaxrange(sx, sy, x, y, "object");
          ringocclusions.push_back(
              {x, y, {mm.first, mm.second, 0.27}});
          continue;
        }
        json terr;
        if (terrain.is_array() && idx < static_cast<int>(terrain.size())) {
          terr = terrain[idx];
        }
        std::string collision = lightingcollisionlabel(terr);
        if (lightingcheckcollision("ISBULLET", collision)) {
          auto mm = lightingmixmaxrange(sx, sy, x, y, "terrain");
          ringocclusions.push_back(
              {x, y, {mm.first, mm.second, 0.11}});
        }
      }
    }

    for (int dx = -r; dx <= r; ++dx) {
      const int ytop = sy - r;
      const int ybot = sy + r;
      const int xleft = sx - r;
      const int xright = sx + r;
      const int pts[][2] = {{sx + dx, ytop}, {xright, sy + dx}, {sx + dx, ybot},
                            {xleft, sy - dx}};
      for (const auto& pt : pts) {
        const int x = pt[0];
        const int y = pt[1];
        const int idx = lightingboardindex(board, x, y);
        if (idx < 0 || idx >= static_cast<int>(alphas.size())) {
          continue;
        }
        const double rayx = x - sx;
        const double rayy = (y - sy) * LIGHTING_RAY_TILE_YSCALE;
        const double raydist = std::hypot(rayx, rayy);
        if (raydist > radius) {
          continue;
        }
        const double angle =
            std::round(std::atan2(rayy, rayx) * 180.0 / M_PI);
        double current = 0.0;
        for (const auto& bl : blocked) {
          if (lightinganglematchesblocked(angle, bl[0], bl[1])) {
            current += bl[2];
          }
        }
        for (const auto& oc : ringocclusions) {
          if (oc.x == x && oc.y == y) {
            continue;
          }
          if (lightinganglematchesblocked(angle, oc.range[0], oc.range[1])) {
            current += oc.range[2];
          }
        }
        const double hradius = radius * 0.5;
        const double falloffterm =
            raydist < hradius ? 0.0 : (raydist - hradius) * step;
        alphas[idx] = std::min(alphas[idx], std::min(1.0, current + falloffterm));
        alphas[idx] = std::max(0.0, std::min(1.0, alphas[idx]));
      }
    }
    for (const auto& oc : ringocclusions) {
      memorylightingaddrangetoblocked(blocked, oc.range);
    }
  }
}

inline json lightingrunop(const std::string& op, const json& args) {
  if (op == "lighting_yscale") {
    return LIGHTING_RAY_TILE_YSCALE;
  }
  if (op == "lighting_mixmaxrange") {
    const json& from = args["from"];
    const json& dest = args["dest"];
    const std::string kind = args.value("kind", "terrain");
    auto mm = lightingmixmaxrange(from["x"].get<double>(), from["y"].get<double>(),
                                  dest["x"].get<double>(), dest["y"].get<double>(),
                                  kind);
    return json::array({mm.first, mm.second});
  }
  if (op == "lighting_addrange_blocked") {
    std::vector<std::array<double, 3>> blocked;
    if (args.contains("initial") && args["initial"].is_array()) {
      for (const auto& e : args["initial"]) {
        blocked.push_back(
            {e[0].get<double>(), e[1].get<double>(), e[2].get<double>()});
      }
    }
    const json& range = args["range"];
    memorylightingaddrangetoblocked(
        blocked,
        {range[0].get<double>(), range[1].get<double>(), range[2].get<double>()});
    json out = json::array();
    for (const auto& b : blocked) {
      out.push_back(json::array({b[0], b[1], b[2]}));
    }
    return out;
  }
  if (op == "lighting_mark_player") {
    const json& board = args["board"];
    std::vector<double> alphas(BOARD_SIZE, 1.0);
    if (args.contains("alphas") && args["alphas"].is_array()) {
      for (size_t i = 0; i < args["alphas"].size() && i < alphas.size(); ++i) {
        alphas[i] = args["alphas"][i].get<double>();
      }
    }
    lightingmarkplayer(board, alphas, args["sprite"]["x"].get<int>(),
                       args["sprite"]["y"].get<int>());
    if (args.contains("snapshot_indices") && args["snapshot_indices"].is_array()) {
      json snap = json::object();
      for (const auto& idx : args["snapshot_indices"]) {
        const int i = idx.get<int>();
        if (i >= 0 && i < static_cast<int>(alphas.size())) {
          snap[std::to_string(i)] = alphas[i];
        }
      }
      return snap;
    }
    return alphas;
  }
  if (op == "lighting_apply_object") {
    std::vector<double> alphas(BOARD_SIZE, args.value("fill", 1.0));
    if (args.contains("alphas") && args["alphas"].is_array()) {
      for (size_t i = 0; i < args["alphas"].size() && i < alphas.size(); ++i) {
        alphas[i] = args["alphas"][i].get<double>();
      }
    }
    lightingapplyobject(args, alphas);
    if (args.contains("snapshot_indices") && args["snapshot_indices"].is_array()) {
      json snap = json::object();
      for (const auto& idx : args["snapshot_indices"]) {
        const int i = idx.get<int>();
        if (i >= 0 && i < static_cast<int>(alphas.size())) {
          snap[std::to_string(i)] = alphas[i];
        }
      }
      return snap;
    }
    return alphas;
  }
  if (op == "lighting_compare_gte") {
    return args["a"].get<double>() >= args["b"].get<double>();
  }
  if (op == "lighting_compare_lt") {
    return args["a"].get<double>() < args["b"].get<double>();
  }
  if (op == "lighting_alpha_at") {
    const json& alphas = args["alphas"];
    const int idx = args["index"].get<int>();
    if (idx >= 0 && idx < static_cast<int>(alphas.size())) {
      return alphas[idx];
    }
    return json();
  }
  return json();
}

}  // namespace zss_memory
