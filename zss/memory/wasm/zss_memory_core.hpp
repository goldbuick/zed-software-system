#pragma once

#include <algorithm>
#include <cctype>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <map>
#include <set>
#include <sstream>
#include <string>
#include <vector>

#include "third_party/json.hpp"
#include "zss_memory_boardlighting.hpp"
#include "zss_memory_boardtick.hpp"
#include "zss_memory_cornerexits.hpp"
#include "zss_memory_permissions.hpp"
#include "zss_memory_rendering.hpp"
#include "zss_memory_synthstate.hpp"

namespace zss_memory {

using json = nlohmann::json;

struct Session {
  json root;
  json boundaries = json::object();
  json activebook;
  json elementsrc;
  json elementdest;
  std::string elementsrcruntime;
  std::string elementdestruntime;
  std::string boardrunner;
  std::string assignedboard;
  json synthsession = json::object();
  int sidcounter = 0;
};

inline Session& session() {
  static Session s;
  return s;
}

inline void reset() {
  permissionreset();
  session() = Session{};
  session().root = json{
      {"halt", false},
      {"frozen", false},
      {"topic", ""},
      {"operator", ""},
      {"session", "sess"},
      {"software", {{"main", ""}, {"temp", ""}}},
      {"books", json::object()},
      {"loaders", json::object()},
  };
}

inline std::string newsid() {
  auto& s = session();
  std::ostringstream oss;
  oss << "sid_cpp_" << ++s.sidcounter;
  return oss.str();
}

inline bool isplainobjectempty(const json& value) {
  return value.is_object() && value.empty();
}

inline json trimexportvalue(const json& value);

inline json trimmemoryexport(const json& value) {
  if (value.is_null()) {
    return json();
  }
  if (!value.is_object()) {
    return trimexportvalue(value);
  }
  json out = json::object();
  for (auto it = value.begin(); it != value.end(); ++it) {
    json trimmed = trimexportvalue(it.value());
    if (trimmed.is_null() || isplainobjectempty(trimmed)) {
      continue;
    }
    out[it.key()] = trimmed;
  }
  if (out.empty()) {
    return json();
  }
  return out;
}

inline json trimexportvalue(const json& value) {
  if (value.is_null()) {
    return json();
  }
  if (value.is_array()) {
    json out = json::array();
    for (const auto& item : value) {
      out.push_back(trimexportvalue(item));
    }
    return out;
  }
  if (value.is_object()) {
    return trimmemoryexport(value);
  }
  return value;
}

inline bool pathendswith(const std::string& path, const std::string& suffix) {
  if (path.size() < suffix.size()) {
    return false;
  }
  return path.compare(path.size() - suffix.size(), suffix.size(), suffix) == 0;
}

inline bool pathshouldemit(const std::string& path) {
  if (path.find("/stats") != std::string::npos ||
      path.find("/loaders") != std::string::npos ||
      path.find("/timestamp") != std::string::npos) {
    return false;
  }
  if (path.find("/terrain") != std::string::npos) {
    const char* skip[] = {"/id", "/x", "/y", "/lx", "/ly", "/code", nullptr};
    for (int i = 0; skip[i]; ++i) {
      const std::string suffix = skip[i];
      if (pathendswith(path, suffix)) {
        return false;
      }
      const std::string mid = std::string("/terrain") + suffix;
      if (path.find(mid) != std::string::npos) {
        return false;
      }
    }
    if (path == "/terrain/id") {
      return false;
    }
  }
  return true;
}

inline json filterwire(const json& value, const std::string& basepath) {
  if (value.is_object()) {
    json out = json::object();
    for (auto it = value.begin(); it != value.end(); ++it) {
      const std::string childpath =
          basepath + "/" + it.key();
      if (!pathshouldemit(childpath)) {
        continue;
      }
      out[it.key()] = filterwire(it.value(), childpath);
    }
    return out;
  }
  if (value.is_array()) {
    json out = json::array();
    for (size_t i = 0; i < value.size(); ++i) {
      out.push_back(filterwire(value[i], basepath + "/" + std::to_string(i)));
    }
    return out;
  }
  return value;
}

inline json exportwire(const json& root) {
  return trimmemoryexport(filterwire(root, ""));
}

inline json keynametoint(const std::string& name, const json& keymap) {
  for (auto it = keymap.begin(); it != keymap.end(); ++it) {
    if (it.key() == name) {
      return it.value();
    }
  }
  return json();
}

inline json unformatobject(const json& formatted, const json& keymap) {
  if (!formatted.is_array()) {
    return json();
  }
  json obj = json::object();
  for (size_t i = 0; i + 1 < formatted.size(); i += 2) {
    json key = formatted[i];
    json value = formatted[i + 1];
    std::string name;
    if (key.is_string()) {
      name = key.get<std::string>();
    } else if (key.is_number_integer()) {
      for (auto it = keymap.begin(); it != keymap.end(); ++it) {
        if (it.value().get<int>() == key.get<int>()) {
          name = it.key();
          break;
        }
      }
    }
    if (name.empty()) {
      continue;
    }
    obj[name] = value;
  }
  return obj;
}

inline const json& bookkeys() {
  static const json k = {{"id", 0},
                       {"name", 1},
                       {"timestamp", 2},
                       {"activelist", 3},
                       {"pages", 4},
                       {"flags", 5},
                       {"token", 6}};
  return k;
}

inline const json& codepagekeys() {
  static const json k = {{"id", 0},
                         {"code", 1},
                         {"board", 2},
                         {"object", 3},
                         {"terrain", 4},
                         {"charset", 5},
                         {"palette", 6}};
  return k;
}

inline const json& boardkeys() {
  static const json k = {{"terrain", 0},
                         {"objects", 1},
                         {"isdark", 2},
                         {"over", 3},
                         {"under", 4},
                         {"exitnorth", 5},
                         {"exitsouth", 6},
                         {"exitwest", 7},
                         {"exiteast", 8},
                         {"timelimit", 9},
                         {"restartonzap", 10},
                         {"maxplayershots", 11},
                         {"camera", 12},
                         {"graphics", 13},
                         {"b1", 14},
                         {"b2", 15},
                         {"b3", 16},
                         {"b4", 17},
                         {"b5", 18},
                         {"b6", 19},
                         {"b7", 20},
                         {"b8", 21},
                         {"b9", 22},
                         {"b10", 23},
                         {"charset", 24},
                         {"palette", 25}};
  return k;
}

inline json importboardfromformat(const json& boardfmt) {
  json flat = unformatobject(boardfmt, boardkeys());
  json objects = json::object();
  if (flat.contains("objects") && flat["objects"].is_array()) {
    for (const auto& obj : flat["objects"]) {
      if (obj.is_object() && obj.contains("id")) {
        objects[obj["id"].get<std::string>()] = obj;
      }
    }
    flat["objects"] = objects;
  }
  if (!flat.contains("terrain")) {
    flat["terrain"] = json::array();
  }
  return flat;
}

inline json importcodepagefromwire(const json& pagefmt) {
  json flat = unformatobject(pagefmt, codepagekeys());
  if (!flat.contains("id")) {
    return json();
  }
  json runtime = json::object();
  if (flat.contains("board")) {
    runtime["board"] = importboardfromformat(flat["board"]);
    flat.erase("board");
  }
  if (flat.contains("object")) {
    runtime["object"] = flat["object"];
    flat.erase("object");
  }
  if (flat.contains("terrain")) {
    runtime["terrain"] = flat["terrain"];
    flat.erase("terrain");
  }
  if (flat.contains("charset")) {
    runtime["charset"] = flat["charset"];
    flat.erase("charset");
  }
  if (flat.contains("palette")) {
    runtime["palette"] = flat["palette"];
    flat.erase("palette");
  }
  session().boundaries[flat["id"].get<std::string>()] = runtime;
  return json{{"id", flat["id"]}, {"code", flat.value("code", "")}};
}

inline json importbookfromwire(const json& wire) {
  json flat;
  if (wire.is_array()) {
    flat = unformatobject(wire, bookkeys());
  } else {
    flat = wire;
  }
  json flags = json::object();
  if (flat.contains("flags") && flat["flags"].is_object()) {
    for (auto it = flat["flags"].begin(); it != flat["flags"].end(); ++it) {
      flags[it.key()] = it.key();
      session().boundaries[it.key()] = it.value();
    }
  }
  json pages = json::array();
  if (flat.contains("pages") && flat["pages"].is_array()) {
    for (const auto& pagefmt : flat["pages"]) {
      pages.push_back(importcodepagefromwire(pagefmt));
    }
  }
  json book = json{{"id", flat.value("id", "")},
                   {"name", flat.value("name", "")},
                   {"timestamp", flat.value("timestamp", 0)},
                   {"activelist", flat.value("activelist", json::array())},
                   {"pages", pages},
                   {"flags", flags}};
  if (flat.contains("token")) {
    book["token"] = flat["token"];
  }
  return book;
}

inline json exportboardasjson(const json& board) {
  if (board.is_null()) {
    return json();
  }
  json out = json::object();
  out["terrain"] = board.value("terrain", json::array());
  out["objects"] = board.value("objects", json::object());
  const char* keys[] = {"isdark",      "startx",      "starty",     "over",
                        "under",       "camera",      "graphics",   "facing",
                        "charset",     "palette",     "exitnorth",  "exitsouth",
                        "exitwest",    "exiteast",    "timelimit",  "restartonzap",
                        "maxplayershots", "b1",       "b2",         "b3",
                        "b4",          "b5",          "b6",         "b7",
                        "b8",          "b9",          "b10",        nullptr};
  for (int i = 0; keys[i]; ++i) {
    if (board.contains(keys[i]) && !board[keys[i]].is_null()) {
      out[keys[i]] = board[keys[i]];
    }
  }
  return out;
}

inline json exportcodepageasjson(const json& page) {
  json out = json{{"id", page.value("id", "")}, {"code", page.value("code", "")}};
  const std::string pageid = page.value("id", "");
  if (session().boundaries.contains(pageid)) {
    json runtime = session().boundaries[pageid];
    if (runtime.contains("board")) {
      out["board"] = exportboardasjson(runtime["board"]);
    }
    if (runtime.contains("object")) {
      out["object"] = runtime["object"];
    }
    if (runtime.contains("terrain")) {
      out["terrain"] = runtime["terrain"];
    }
    if (runtime.contains("charset")) {
      out["charset"] = runtime["charset"];
    }
    if (runtime.contains("palette")) {
      out["palette"] = runtime["palette"];
    }
  }
  return out;
}

inline json exportbookasjson(const json& book) {
  json out = json{{"id", book.value("id", "")},
                  {"name", book.value("name", "")},
                  {"timestamp", book.value("timestamp", 0)},
                  {"activelist", book.value("activelist", json::array())}};
  json pages = json::array();
  if (book.contains("pages") && book["pages"].is_array()) {
    for (const auto& page : book["pages"]) {
      pages.push_back(exportcodepageasjson(page));
    }
  }
  out["pages"] = pages;
  json flags = json::object();
  if (book.contains("flags") && book["flags"].is_object()) {
    for (auto it = book["flags"].begin(); it != book["flags"].end(); ++it) {
      const std::string owner = it.key();
      if (session().boundaries.contains(owner)) {
        flags[owner] = session().boundaries[owner];
      }
    }
  }
  out["flags"] = flags;
  if (book.contains("token")) {
    out["token"] = book["token"];
  }
  return out;
}

inline json applypatch(const json& doc, const json& patch) {
  json out = doc;
  for (const auto& op : patch) {
    if (!op.is_object() || op.value("op", "") != "replace") {
      continue;
    }
    const std::string path = op.value("path", "");
    if (path.size() > 1 && path[0] == '/') {
      const std::string key = path.substr(1);
      out[key] = op["value"];
    }
  }
  return out;
}

inline json jsonpieroundtrip(const json& base, const json& patch) {
  json replica = base;
  json applied = applypatch(replica, patch);
  return applied;
}

inline bool wiredequal(const json& a, const json& b) {
  return exportwire(a) == exportwire(b);
}

inline json runop(const std::string& op, const json& args) {
  auto& s = session();
  if (op == "boundaries_clear") {
    s.boundaries = json::object();
    return true;
  }
  if (op == "boundary_alloc") {
    json value = args.value("value", json::object());
    std::string id = args.value("id", "");
    if (id.empty()) {
      id = newsid();
    }
    s.boundaries[id] = value;
    return id;
  }
  if (op == "boundary_get") {
    const std::string id = args.value("id", "");
    if (s.boundaries.contains(id)) {
      return s.boundaries[id];
    }
    return json::object();
  }
  if (op == "boundary_alloc_and_get") {
    json value = args.value("value", json::object());
    std::string id = args.value("id", "");
    if (id.empty()) {
      id = newsid();
    }
    s.boundaries[id] = value;
    return json{{"id_nonempty", !id.empty()}, {"value", value}};
  }
  if (op == "trim_export") {
    return trimmemoryexport(args["json"]);
  }
  if (op == "path_should_emit") {
    return pathshouldemit(args["path"].get<std::string>());
  }
  if (op == "root_import") {
    return true;
  }
  if (op == "root_replace") {
    s.root = args["root"];
    return true;
  }
  if (op == "export_root") {
    const std::string mode = args.value("mode", "root_full");
    if (mode == "root_wire") {
      return exportwire(s.root);
    }
    return trimmemoryexport(s.root);
  }
  if (op == "root_wire_diff_empty") {
    json other = args["root"];
    return wiredequal(s.root, other);
  }
  if (op == "book_import_wire") {
    s.activebook = importbookfromwire(args["json"]);
    return true;
  }
  if (op == "book_export_trimmed_json") {
    return trimmemoryexport(exportbookasjson(s.activebook));
  }
  if (op == "book_read_flags") {
    const std::string owner = args["owner"].get<std::string>();
    if (s.boundaries.contains(owner)) {
      return s.boundaries[owner];
    }
    return json::object();
  }
  if (op == "codepage_runtime_field") {
    const std::string pageid = args["pageid"].get<std::string>();
    const std::string field = args["field"].get<std::string>();
    if (!s.boundaries.contains(pageid)) {
      return json();
    }
    json runtime = s.boundaries[pageid];
    if (runtime.contains("board") && runtime["board"].contains(field)) {
      return runtime["board"][field];
    }
    return json();
  }
  if (op == "jsonpipe_roundtrip") {
    return jsonpieroundtrip(args["base"], args["patch"]);
  }
  if (op == "collect_boundary_ids") {
    json book = args["book"];
    json board = args["board"];
    std::set<std::string> idset;
    if (board.contains("id")) {
      idset.insert(board["id"].get<std::string>());
    }
    const std::string boardid = board.value("id", "");
    const char* suffixes[] = {"_synth", "_layers", "_tracking", nullptr};
    auto maybeaddflag = [&](const std::string& key) {
      if (book.contains("flags") && book["flags"].is_object() &&
          book["flags"].contains(key)) {
        idset.insert(book["flags"][key].get<std::string>());
      }
    };
    for (int i = 0; suffixes[i]; ++i) {
      maybeaddflag(boardid + suffixes[i]);
    }
    if (board.contains("objects") && board["objects"].is_object()) {
      for (auto it = board["objects"].begin(); it != board["objects"].end(); ++it) {
        const json& element = it.value();
        if (!element.is_object()) {
          continue;
        }
        if (!element.contains("id") || element.value("removed", false)) {
          continue;
        }
        const std::string eid = element["id"].get<std::string>();
        maybeaddflag(eid + "_chip");
        if (eid.size() > 4 && eid.compare(0, 4, "pid_") == 0) {
          maybeaddflag(eid);
          maybeaddflag(eid + "_gadget");
        }
      }
    }
    json out = json::array();
    for (const auto& id : idset) {
      out.push_back(id);
    }
    std::sort(out.begin(), out.end(),
              [](const json& a, const json& b) {
                return a.get<std::string>() < b.get<std::string>();
              });
    return out;
  }
  if (op == "session_frozen_get") {
    return s.root.value("frozen", false);
  }
  if (op == "session_frozen_set") {
    s.root["frozen"] = args["value"];
    return true;
  }
  if (op == "session_boardrunner_get") {
    return s.boardrunner;
  }
  if (op == "session_boardrunner_set") {
    s.boardrunner = args["value"].get<std::string>();
    return true;
  }
  if (op == "session_assignedboard_get") {
    return s.assignedboard;
  }
  if (op == "session_assignedboard_set") {
    s.assignedboard = args["value"].get<std::string>();
    return true;
  }
  if (op == "board_runtime_hydrated") {
    const std::string id = args["board_id"].get<std::string>();
    if (!s.boundaries.contains(id)) {
      return false;
    }
    const json& rt = s.boundaries[id];
    return rt.contains("board") && rt["board"].is_object();
  }
  if (op == "collect_tick_boundaries") {
    json book = args["book"];
    json boards = args["boards"];
    std::set<std::string> out;
    if (!boards.is_array()) {
      return json::array();
    }
    for (const auto& bid : boards) {
      const std::string id = bid.get<std::string>();
      if (!s.boundaries.contains(id)) {
        continue;
      }
      const json& rt = s.boundaries[id];
      if (!rt.contains("board") || !rt["board"].is_object()) {
        continue;
      }
      json subargs = json{{"book", book}, {"board", rt["board"]}};
      json ids = runop("collect_boundary_ids", subargs);
      if (ids.is_array()) {
        for (const auto& x : ids) {
          out.insert(x.get<std::string>());
        }
      }
    }
    json arr = json::array();
    for (const auto& id : out) {
      arr.push_back(id);
    }
    return arr;
  }
  if (op == "free_book") {
    json book = args["book"];
    if (book.contains("pages") && book["pages"].is_array()) {
      for (const auto& page : book["pages"]) {
        if (page.contains("id")) {
          s.boundaries.erase(page["id"].get<std::string>());
        }
      }
    }
    if (book.contains("flags") && book["flags"].is_object()) {
      for (auto it = book["flags"].begin(); it != book["flags"].end(); ++it) {
        s.boundaries.erase(it.value().get<std::string>());
      }
    }
    if (args.contains("runtime_ids") && args["runtime_ids"].is_array()) {
      for (const auto& rid : args["runtime_ids"]) {
        s.boundaries.erase(rid.get<std::string>());
      }
    }
    return true;
  }
  if (op == "clear_codepage") {
    const std::string pageid = args["pageid"].get<std::string>();
    s.boundaries.erase(pageid);
    if (args.contains("runtime_ids") && args["runtime_ids"].is_array()) {
      for (const auto& rid : args["runtime_ids"]) {
        s.boundaries.erase(rid.get<std::string>());
      }
    }
    return true;
  }
  if (op == "trim_format_object") {
    return trimformatobject(args["json"]);
  }
  if (op == "corner_exit_resolve") {
    return cornerexitresolve(args);
  }
  if (op == "permission_reset") {
    permissionreset();
    return true;
  }
  if (op == "permission_set_operator") {
    permissionstate().operatorid = args["operator"].get<std::string>();
    return true;
  }
  if (op == "permission_map_command") {
    return permissionmapcommand(args["command"].get<std::string>());
  }
  if (op == "permission_is_controlled") {
    return permissioniscontrolled(args["command"].get<std::string>());
  }
  if (op == "permission_can_run") {
    return permissioncanruncommand(args);
  }
  if (op == "permission_set_player_token") {
    permissionstate().playertotoken[args["player"].get<std::string>()] =
        args["token"];
    return true;
  }
  if (op == "permission_set_role_for_token") {
    permissionstate().rolebytoken[args["token"].get<std::string>()] =
        args["role"];
    return true;
  }
  if (op == "permission_apply_config") {
    permissionapplyconfig(args["config"].get<std::string>());
    return true;
  }
  if (op == "permission_set_command_permissions") {
    permissionsetcommandpermissions(args);
    return true;
  }
  if (op == "permission_allow_command") {
    return permissionallowcommand(args);
  }
  if (op == "permission_revoke_command") {
    return permissionrevokecommand(args);
  }
  if (op == "permission_read_allowlist") {
    return permissionreadallowlistbyrole();
  }
  if (op == "permission_read_config") {
    return permissionstate().permissionconfig;
  }
  if (op == "permission_role_has_family") {
    return permissionrolehasfamily(args);
  }
  if (op == "permission_serialize") {
    return permissionserialize();
  }
  if (op == "permission_read_breakdown") {
    return permissionreadbreakdown();
  }
  if (op == "synth_setup_session") {
    s.synthsession = args.value("session", json::object());
    return true;
  }
  if (op == "synth_read_voices") {
    return synthreadvoices(s.synthsession, args["boardid"].get<std::string>());
  }
  if (op == "synth_merge_voice") {
    return synthmergevoice(s.synthsession, args["boardid"].get<std::string>(),
                           args["idx"].get<int>(), args["config"].get<std::string>(),
                           args["value"]);
  }
  if (op == "synth_read_playqueue") {
    return synthreadplayqueue(s.synthsession, args["boardid"].get<std::string>());
  }
  if (op == "synth_queue_play") {
    return synthqueueplay(s.synthsession, args["boardid"].get<std::string>(),
                            args["play"].get<std::string>());
  }
  if (op == "tick_board") {
    return tickboard(args);
  }
  if (op == "update_draw_dirty") {
    return updatedrawdirty(args);
  }
  if (op == "element_ticker_prefix") {
    return elementtickerprefix(args);
  }
  if (op == "element_log_prefix") {
    return elementlogprefix(args);
  }
  if (op == "root_jsonpipe_chain") {
    json replica = args["base"];
    if (args.contains("patches") && args["patches"].is_array()) {
      for (const auto& patch : args["patches"]) {
        replica = jsonpieroundtrip(replica, patch);
      }
    }
    return replica;
  }
  {
    json lighting = lightingrunop(op, args);
    if (!lighting.is_null()) {
      return lighting;
    }
  }
  if (op == "element_runtime_setup") {
    s.elementsrc = args["src"];
    s.elementdest = args["dest"];
    json runtime = args["runtime"];
    s.elementsrcruntime = newsid();
    s.elementdestruntime = newsid();
    s.boundaries[s.elementsrcruntime] = runtime;
    s.boundaries[s.elementdestruntime] = json::object();
    s.elementsrc["runtime"] = s.elementsrcruntime;
    s.elementdest["runtime"] = s.elementdestruntime;
    return true;
  }
  if (op == "copy_element_runtime") {
    json srcruntime = s.boundaries[s.elementsrcruntime];
    s.elementdestruntime = newsid();
    s.boundaries[s.elementdestruntime] = srcruntime;
    s.elementdest["runtime"] = s.elementdestruntime;
    json srccat = s.boundaries[s.elementsrcruntime].value("category", json());
    json destcat =
        s.boundaries[s.elementdestruntime].value("category", json());
    json kinddata =
        s.boundaries[s.elementdestruntime].value("kinddata", json::object());
    return json{{"dest_runtime_not_src",
                 s.elementdestruntime != s.elementsrcruntime},
                {"dest_category", destcat},
                {"dest_kinddata_name", kinddata.value("name", "")},
                {"src_category", srccat}};
  }
  return json();
}

inline char* dupstring(const std::string& s) {
  char* out = static_cast<char*>(std::malloc(s.size() + 1));
  if (!out) {
    return nullptr;
  }
  std::memcpy(out, s.c_str(), s.size() + 1);
  return out;
}

}  // namespace zss_memory
