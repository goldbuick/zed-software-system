#pragma once

#include <algorithm>
#include <map>
#include <set>
#include <string>
#include <vector>

#include "third_party/json.hpp"

namespace zss_memory {

using json = nlohmann::json;

struct PermissionState {
  json playertotoken = json::object();
  json rolebytoken = json::object();
  std::set<std::string> bannedtokens;
  std::string permissionconfig = "creative";
  std::map<std::string, std::set<std::string>> overrideadd;
  std::map<std::string, std::set<std::string>> overrideremove;
  std::map<std::string, std::set<std::string>> allowlistbyrole;
  std::string operatorid = "operator";
};

inline PermissionState& permissionstate() {
  static PermissionState s;
  return s;
}

inline const std::map<std::string, std::string>& permissioncommandmap() {
  static const std::map<std::string, std::string> k = {
      {"access", "risk"},       {"pageexport", "risk"},   {"synth1", "speaker"},
      {"run", "coder"},         {"build", "build"},       {"toast", "speaker"},
      {"allow", "roles"},       {"nuke", "risk"},         {"bridge", "bridge"},
      {"put", "build"},         {"play", "speaker"},      {"ban", "moderation"},
  };
  return k;
}

inline const std::vector<std::string>& permissionroles() {
  static const std::vector<std::string> k = {"admin", "mod", "player"};
  return k;
}

inline const std::vector<std::string>& permissionallgroups() {
  static const std::vector<std::string> k = {
      "bridge", "build", "coder", "explore", "moderation",
      "persist", "risk", "roles", "speaker",
  };
  return k;
}

inline std::set<std::string> presetrolefamilies(const std::string& base,
                                                const std::string& role) {
  static const std::map<std::string, std::map<std::string, std::vector<std::string>>>
      presets = {
          {"lockdown",
           {{"admin",
             {"bridge", "build", "coder", "explore", "moderation", "persist",
              "roles", "speaker"}},
            {"mod", {"moderation", "bridge", "explore", "coder", "speaker", "persist"}},
            {"player", {}}}},
          {"creative",
           {{"admin",
             {"bridge", "build", "coder", "explore", "moderation", "persist",
              "roles", "speaker"}},
            {"mod",
             {"moderation", "bridge", "explore", "coder", "build", "persist",
              "speaker"}},
            {"player", {"explore", "coder", "build", "persist", "speaker"}}}},
      };
  std::set<std::string> out;
  auto bit = presets.find(base);
  if (bit == presets.end()) {
    return out;
  }
  auto rit = bit->second.find(role);
  if (rit == bit->second.end()) {
    return out;
  }
  for (const auto& f : rit->second) {
    out.insert(f);
  }
  return out;
}

inline void permissionrecompute();

inline void permissionapplyconfig(const std::string& name) {
  auto& s = permissionstate();
  if (name == "lockdown" || name == "creative") {
    s.permissionconfig = name;
  }
  permissionrecompute();
}

inline void permissionrecompute() {
  auto& s = permissionstate();
  for (const auto& role : permissionroles()) {
    std::set<std::string> eff = presetrolefamilies(s.permissionconfig, role);
    const auto& add = s.overrideadd[role];
    const auto& remove = s.overrideremove[role];
    for (const auto& f : remove) {
      eff.erase(f);
    }
    for (const auto& f : add) {
      eff.insert(f);
    }
    s.allowlistbyrole[role] = eff;
  }
}

inline void permissionreset() {
  permissionstate() = PermissionState{};
  permissionapplyconfig("creative");
}

inline std::string permissionmapcommand(const std::string& command) {
  const auto& m = permissioncommandmap();
  auto it = m.find(command);
  if (it != m.end()) {
    return it->second;
  }
  return command;
}

inline bool permissioniscontrolled(const std::string& command) {
  return permissioncommandmap().count(command) > 0;
}

inline json permissionserialize() {
  const auto& s = permissionstate();
  json allow = json::object();
  json add = json::object();
  json remove = json::object();
  for (const auto& role : permissionroles()) {
    std::vector<std::string> arr;
    auto allowit = s.allowlistbyrole.find(role);
    if (allowit != s.allowlistbyrole.end()) {
      for (const auto& f : allowit->second) {
        arr.push_back(f);
      }
    }
    std::sort(arr.begin(), arr.end());
    allow[role] = arr;
    std::vector<std::string> addarr;
    auto addit = s.overrideadd.find(role);
    if (addit != s.overrideadd.end()) {
      for (const auto& f : addit->second) {
        addarr.push_back(f);
      }
    }
    std::sort(addarr.begin(), addarr.end());
    add[role] = addarr;
    std::vector<std::string> remarr;
    auto remit = s.overrideremove.find(role);
    if (remit != s.overrideremove.end()) {
      for (const auto& f : remit->second) {
        remarr.push_back(f);
      }
    }
    std::sort(remarr.begin(), remarr.end());
    remove[role] = remarr;
  }
  std::vector<std::string> banned(s.bannedtokens.begin(), s.bannedtokens.end());
  std::sort(banned.begin(), banned.end());
  return json{{"rolebytoken", s.rolebytoken},
              {"bannedtokens", banned},
              {"permissionconfig", s.permissionconfig},
              {"allowlistbyrole", allow},
              {"allowlistbyrolecustom", json::object()},
              {"permissionoverrideaddbyrole", add},
              {"permissionoverrideremovebyrole", remove}};
}

inline void permissionsetcommandpermissions(const json& args) {
  auto& s = permissionstate();
  s.bannedtokens.clear();
  if (args.contains("bannedtokens") && args["bannedtokens"].is_array()) {
    for (const auto& t : args["bannedtokens"]) {
      s.bannedtokens.insert(t.get<std::string>());
    }
  }
  s.rolebytoken = args.value("rolebytoken", json::object());
  const std::string raw = args.value("permissionconfig", "creative");
  s.permissionconfig = (raw == "lockdown" || raw == "custom") ? "lockdown" : "creative";
  s.overrideadd.clear();
  s.overrideremove.clear();
  for (const auto& role : permissionroles()) {
    s.overrideadd[role] = {};
    s.overrideremove[role] = {};
  }
  if (args.contains("permissionoverrideaddbyrole")) {
    for (auto it = args["permissionoverrideaddbyrole"].begin();
         it != args["permissionoverrideaddbyrole"].end(); ++it) {
      if (it.value().is_array()) {
        for (const auto& f : it.value()) {
          s.overrideadd[it.key()].insert(f.get<std::string>());
        }
      }
    }
  }
  if (args.contains("permissionoverrideremovebyrole")) {
    for (auto it = args["permissionoverrideremovebyrole"].begin();
         it != args["permissionoverrideremovebyrole"].end(); ++it) {
      if (it.value().is_array()) {
        for (const auto& f : it.value()) {
          s.overrideremove[it.key()].insert(f.get<std::string>());
        }
      }
    }
  } else if (raw == "custom") {
    json effsource = args.value("allowlistbyrole", json::object());
    bool meaningful = false;
    if (effsource.is_object()) {
      for (auto it = effsource.begin(); it != effsource.end(); ++it) {
        if (it.value().is_array() && !it.value().empty()) {
          meaningful = true;
          break;
        }
      }
    }
    if (!meaningful) {
      effsource = args.value("allowlistbyrolecustom", json::object());
    }
    s.permissionconfig = "lockdown";
    for (const auto& role : permissionroles()) {
      std::set<std::string> eff;
      if (effsource.contains(role) && effsource[role].is_array()) {
        for (const auto& f : effsource[role]) {
          eff.insert(f.get<std::string>());
        }
      }
      const auto preset = presetrolefamilies("lockdown", role);
      for (const auto& f : eff) {
        if (!preset.count(f)) {
          s.overrideadd[role].insert(f);
        }
      }
      for (const auto& f : preset) {
        if (!eff.count(f)) {
          s.overrideremove[role].insert(f);
        }
      }
    }
  } else if (raw != "lockdown" && raw != "creative") {
    s.permissionconfig = "creative";
  }
  permissionrecompute();
}

inline json permissioncanruncommand(const json& args) {
  const std::string player = args["player"].get<std::string>();
  const std::string command = args["command"].get<std::string>();
  const auto& s = permissionstate();
  if (player == s.operatorid) {
    return json{{"allowed", true}, {"deny_reason", ""}};
  }
  if (!permissioniscontrolled(command)) {
    return json{{"allowed", true}, {"deny_reason", ""}};
  }
  const std::string family = permissionmapcommand(command);
  if (!s.playertotoken.contains(player)) {
    return json{{"allowed", false}, {"deny_reason", "no token (deny)"}};
  }
  const std::string token = s.playertotoken[player].get<std::string>();
  const std::string role =
      s.rolebytoken.contains(token) ? s.rolebytoken[token].get<std::string>()
                                    : "player";
  auto allowit = s.allowlistbyrole.find(role);
  const bool allowed =
      allowit != s.allowlistbyrole.end() && allowit->second.count(family) > 0;
  if (!allowed) {
    return json{{"allowed", false}, {"deny_reason", "(deny)"}};
  }
  return json{{"allowed", true}, {"deny_reason", ""}};
}

inline json permissionallowcommand(const json& args) {
  const std::string role = args["role"].get<std::string>();
  const std::string command = args["command"].get<std::string>();
  auto& s = permissionstate();
  if (std::find(permissionroles().begin(), permissionroles().end(), role) ==
      permissionroles().end()) {
    return false;
  }
  const std::string family = permissionmapcommand(command);
  const auto pr = presetrolefamilies(s.permissionconfig, role);
  auto& add = s.overrideadd[role];
  auto& remove = s.overrideremove[role];
  if (remove.count(family)) {
    remove.erase(family);
  } else if (!pr.count(family)) {
    add.insert(family);
  }
  permissionrecompute();
  return true;
}

inline json permissionrevokecommand(const json& args) {
  const std::string role = args["role"].get<std::string>();
  const std::string command = args["command"].get<std::string>();
  auto& s = permissionstate();
  if (std::find(permissionroles().begin(), permissionroles().end(), role) ==
      permissionroles().end()) {
    return false;
  }
  const std::string family = permissionmapcommand(command);
  const auto pr = presetrolefamilies(s.permissionconfig, role);
  auto& add = s.overrideadd[role];
  auto& remove = s.overrideremove[role];
  if (add.count(family)) {
    add.erase(family);
  } else if (pr.count(family)) {
    remove.insert(family);
  }
  permissionrecompute();
  return true;
}

inline json permissionreadallowlistbyrole() {
  json out = json::object();
  for (const auto& role : permissionroles()) {
    std::vector<std::string> arr;
    auto it = permissionstate().allowlistbyrole.find(role);
    if (it != permissionstate().allowlistbyrole.end()) {
      for (const auto& f : it->second) {
        arr.push_back(f);
      }
    }
    std::sort(arr.begin(), arr.end());
    json jarr = json::array();
    for (const auto& f : arr) {
      jarr.push_back(f);
    }
    out[role] = jarr;
  }
  return out;
}

inline json permissionreadbreakdown() {
  const auto& s = permissionstate();
  json out = json::object();
  for (const auto& role : permissionroles()) {
    const auto preset = presetrolefamilies(s.permissionconfig, role);
    auto addit = s.overrideadd.find(role);
    auto remit = s.overrideremove.find(role);
    auto effit = s.allowlistbyrole.find(role);
    const std::set<std::string> add =
        addit != s.overrideadd.end() ? addit->second : std::set<std::string>{};
    const std::set<std::string> remove =
        remit != s.overrideremove.end() ? remit->second
                                        : std::set<std::string>{};
    const std::set<std::string> eff =
        effit != s.allowlistbyrole.end() ? effit->second : std::set<std::string>{};
    json effective = json::array();
    json frombase = json::array();
    json overridegrant = json::array();
    json overridedeny = json::array();
    for (const auto& f : eff) {
      effective.push_back(f);
      if (add.count(f)) {
        overridegrant.push_back(f);
      } else if (preset.count(f) && !remove.count(f)) {
        frombase.push_back(f);
      } else if (!preset.count(f)) {
        overridegrant.push_back(f);
      }
    }
    for (const auto& f : remove) {
      overridedeny.push_back(f);
    }
    out[role] = json{{"effective", effective},
                     {"frombase", frombase},
                     {"overridegrant", overridegrant},
                     {"overridedeny", overridedeny}};
  }
  return out;
}

inline json permissionrolehasfamily(const json& args) {
  const std::string role = args["role"].get<std::string>();
  const std::string family = args["family"].get<std::string>();
  auto it = permissionstate().allowlistbyrole.find(role);
  if (it == permissionstate().allowlistbyrole.end()) {
    return false;
  }
  return it->second.count(family) > 0;
}

}  // namespace zss_memory
