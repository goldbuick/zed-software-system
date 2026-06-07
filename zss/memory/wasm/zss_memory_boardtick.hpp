#pragma once

#include <algorithm>
#include <set>
#include <string>
#include <vector>

#include "third_party/json.hpp"
#include "zss_memory_constants.hpp"

namespace zss_memory {

using json = nlohmann::json;

inline bool ispid(const std::string& id) {
  return id.size() > 4 && id.compare(0, 4, "pid_") == 0;
}

inline int boardindex(int x, int y) {
  if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) {
    return -1;
  }
  return x + y * BOARD_WIDTH;
}

inline json tickboard(const json& args) {
  const json& board = args["board"];
  const int timestamp = args.value("timestamp", 0);
  const bool includedraw = args.value("includedraw", true);
  std::set<std::string> drawallow;
  if (args.contains("drawallowids") && args["drawallowids"].is_array()) {
    for (const auto& id : args["drawallowids"]) {
      drawallow.insert(id.get<std::string>());
    }
  }
  const json& specs = args["elements"];
  json run = json::array();

  auto addelement = [&](const json& spec, const std::string& type,
                        const std::string& pass) {
    if (pass == "draw" && !includedraw) {
      return;
    }
    if (!spec.value("has_draw", false) && pass == "draw") {
      return;
    }
    const std::string readid = spec.value("readid", "");
    if (pass == "draw" && !drawallow.empty() && drawallow.count(readid) == 0) {
      return;
    }
    int typecode = 3;
    if (type == "terrain") {
      typecode = 4;
    }
    json entry = json{{"id", pass == "draw" ? "draw_" + std::to_string(typecode) + "_" + readid : readid},
                      {"type", type},
                      {"pass", pass},
                      {"label", pass == "draw" ? "drawdisplay" : ""},
                      {"object_id", spec.value("object_id", "")}};
    run.push_back(entry);
  };

  for (const auto& spec : specs) {
    const std::string pass = spec.value("pass", "tick");
    const std::string type = spec.value("type", "object");
    if (pass == "draw") {
      addelement(spec, type, "draw");
    }
  }

  std::vector<json> bulletwater;
  std::vector<json> players;
  std::vector<json> others;
  std::vector<json> ghosts;
  for (const auto& spec : specs) {
    if (spec.value("pass", "") != "tick") {
      continue;
    }
    const std::string collision = spec.value("collision", "ISWALK");
    const std::string readid = spec.value("readid", "");
    if (ispid(readid)) {
      players.push_back(spec);
    } else if (collision == "ISBULLET" || collision == "ISSWIM") {
      bulletwater.push_back(spec);
    } else if (collision == "ISGHOST") {
      ghosts.push_back(spec);
    } else {
      others.push_back(spec);
    }
  }

  auto processtick = [&](const std::vector<json>& list) {
    for (const auto& spec : list) {
      addelement(spec, "object", "tick");
    }
  };
  processtick(bulletwater);
  processtick(players);
  processtick(others);
  processtick(ghosts);

  return run;
}

inline json updatedrawdirty(const json& args) {
  const json& board = args["board"];
  const int timestamp = args.value("timestamp", 0);
  json runtime = args.value("runtime", json::object());
  json oldfp = runtime.value("drawlastfp", json::object());
  json oldxy = runtime.value("drawlastxy", json::object());
  json nextfp = json::object();
  json nextxy = json::object();
  std::set<int> seedcells;
  std::set<std::string> allowids;

  if (board.contains("objects") && board["objects"].is_object()) {
    for (auto it = board["objects"].begin(); it != board["objects"].end(); ++it) {
      const json& obj = it.value();
      if (!obj.is_object()) {
        continue;
      }
      const std::string readid = obj.value("id", it.key());
      const int ox = obj.value("x", 0);
      const int oy = obj.value("y", 0);
      const std::string fp =
          std::to_string(ox) + "|" + std::to_string(oy) + "|" +
          obj.value("code", json("")).get<std::string>();
      nextfp[readid] = fp;
      nextxy[readid] = json{{"x", ox}, {"y", oy}};
      if (oldfp.contains(readid) && oldfp[readid].get<std::string>() != fp) {
        seedcells.insert(boardindex(ox, oy));
        if (oldxy.contains(readid)) {
          const int px = oldxy[readid]["x"].get<int>();
          const int py = oldxy[readid]["y"].get<int>();
          if (px != ox || py != oy) {
            seedcells.insert(boardindex(px, py));
          }
        }
      }
      if (obj.value("has_draw", false)) {
        allowids.insert(readid);
      }
    }
  }

  for (auto it = oldxy.begin(); it != oldxy.end(); ++it) {
    if (!nextxy.contains(it.key())) {
      seedcells.insert(
          boardindex(it.value()["x"].get<int>(), it.value()["y"].get<int>()));
    }
  }

  std::set<int> expanded = seedcells;
  for (const int idx : seedcells) {
    const int x = idx % BOARD_WIDTH;
    const int y = idx / BOARD_WIDTH;
    for (int dy = -1; dy <= 1; ++dy) {
      for (int dx = -1; dx <= 1; ++dx) {
        if (dx == 0 && dy == 0) {
          continue;
        }
        const int ni = boardindex(x + dx, y + dy);
        if (ni >= 0) {
          expanded.insert(ni);
        }
      }
    }
  }

  json allowarr = json::array();
  for (const auto& id : allowids) {
    allowarr.push_back(id);
  }
  for (const int idx : expanded) {
    allowarr.push_back(std::to_string(idx));
  }
  std::vector<std::string> sortable;
  for (const auto& item : allowarr) {
    sortable.push_back(item.get<std::string>());
  }
  std::sort(sortable.begin(), sortable.end());
  json sorted = json::array();
  for (const auto& item : sortable) {
    sorted.push_back(item);
  }

  return json{{"drawallowids", sorted},
              {"drawlastfp", nextfp},
              {"drawlastxy", nextxy},
              {"seed_count", static_cast<int>(seedcells.size())}};
}

}  // namespace zss_memory
