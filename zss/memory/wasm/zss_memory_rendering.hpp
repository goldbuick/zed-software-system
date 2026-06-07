#pragma once

#include <algorithm>
#include <cctype>
#include <string>

#include "third_party/json.hpp"

namespace zss_memory {

using json = nlohmann::json;

inline std::string nametolower(const std::string& s) {
  std::string out = s;
  for (char& c : out) {
    c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
  }
  return out;
}

inline json trimformatobject(const json& value) {
  if (value.is_array()) {
    json out = json::array();
    for (size_t i = 0; i + 1 < value.size(); i += 2) {
      json trimmed = trimformatobject(value[i + 1]);
      if (trimmed.is_null()) {
        continue;
      }
      if (trimmed.is_object() && trimmed.empty()) {
        continue;
      }
      out.push_back(value[i]);
      out.push_back(trimmed);
    }
    if (out.empty()) {
      return json();
    }
    return out;
  }
  if (value.is_object()) {
    json out = json::object();
    for (auto it = value.begin(); it != value.end(); ++it) {
      json trimmed = trimformatobject(it.value());
      if (trimmed.is_null() || (trimmed.is_object() && trimmed.empty())) {
        continue;
      }
      out[it.key()] = trimmed;
    }
    if (out.empty()) {
      return json();
    }
    return out;
  }
  if (value.is_null()) {
    return json();
  }
  return value;
}

inline json elementtickerprefix(const json& args) {
  const json& element = args["element"];
  if (!element.contains("id") || element["id"].is_null()) {
    return "";
  }
  const json& flags = args.value("flags", json::object());
  std::string withname;
  if (element.value("kind", "") == "player") {
    if (flags.contains("user") && flags["user"].is_string()) {
      withname = flags["user"].get<std::string>();
    } else {
      withname = "player";
    }
  } else {
    const json& kind = args.value("kinddata", json::object());
    std::string fromdisplay;
    if (element.contains("displayname") && element["displayname"].is_string()) {
      fromdisplay = element["displayname"].get<std::string>();
    } else if (kind.contains("displayname") && kind["displayname"].is_string()) {
      fromdisplay = kind["displayname"].get<std::string>();
    }
    if (!fromdisplay.empty()) {
      withname = nametolower(fromdisplay);
    } else {
      withname = nametolower(element.value("name", "object"));
    }
  }
  const std::string displayprefix = args.value("displayprefix", "");
  return displayprefix + "$ONCLEAR$CYAN " + withname + ":$WHITE ";
}

inline json elementlogprefix(const json& args) {
  const json& element = args["element"];
  if (!element.contains("id") || element["id"].is_null()) {
    return "";
  }
  const json& flags = args.value("flags", json::object());
  std::string withname;
  if (element.value("kind", "") == "player") {
    if (flags.contains("user") && flags["user"].is_string()) {
      withname = flags["user"].get<std::string>();
    } else {
      withname = "player";
    }
  } else {
    withname = nametolower(element.value("name", "object"));
  }
  const std::string displayprefix = args.value("displayprefix", "");
  return displayprefix + "$ONCLEAR$CYAN " + withname + ":$WHITE ";
}

}  // namespace zss_memory
