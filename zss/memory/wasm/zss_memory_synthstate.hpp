#pragma once

#include <string>

#include "third_party/json.hpp"

namespace zss_memory {

using json = nlohmann::json;

inline std::string createsynthid(const std::string& board) {
  return board + "_synth";
}

inline json synthdefaultvoices() {
  return json{{"0", json{{"square", ""}}},
              {"1", json{{"square", ""}}},
              {"2", json{{"square", ""}}},
              {"3", json{{"square", ""}}}};
}

inline json& synthflagstore(json& book, const std::string& owner) {
  if (!book.contains("flags")) {
    book["flags"] = json::object();
  }
  if (!book["flags"].contains(owner)) {
    book["flags"][owner] = owner;
  }
  return book;
}

inline json synthreadflags(json& session, const std::string& boardid) {
  const std::string owner = createsynthid(boardid);
  if (!session.contains("mainbook")) {
    return json::object();
  }
  json& book = session["mainbook"];
  synthflagstore(book, owner);
  if (!session.contains("synthflags")) {
    session["synthflags"] = json::object();
  }
  if (!session["synthflags"].contains(owner)) {
    session["synthflags"][owner] = json{{"voices", synthdefaultvoices()},
                                        {"voicefx", json::object()},
                                        {"playqueue", json::array()}};
  }
  return session["synthflags"][owner];
}

inline json synthreadvoices(json& session, const std::string& boardid) {
  return synthreadflags(session, boardid).value("voices", synthdefaultvoices());
}

inline json synthmergevoice(json& session, const std::string& boardid, int idx,
                            const std::string& config,
                            const json& value) {
  json flags = synthreadflags(session, boardid);
  if (config == "restart") {
    flags["voices"] = synthdefaultvoices();
    flags["voicefx"] = json::object();
    session["synthflags"][createsynthid(boardid)] = flags;
    return true;
  }
  const std::string key = std::to_string(idx);
  if (!flags["voices"].contains(key)) {
    flags["voices"][key] = json::object();
  }
  flags["voices"][key][config] = value;
  session["synthflags"][createsynthid(boardid)] = flags;
  return true;
}

inline json synthreadplayqueue(json& session, const std::string& boardid) {
  return synthreadflags(session, boardid).value("playqueue", json::array());
}

inline json synthqueueplay(json& session, const std::string& boardid,
                           const std::string& play) {
  json result = json{{"queued", false}, {"synthplay_fired", false}, {"play", play}};
  if (boardid.empty()) {
    result["synthplay_fired"] = true;
    return result;
  }
  if (play.empty()) {
    json flags = synthreadflags(session, boardid);
    flags["playqueue"] = json::array();
    session["synthflags"][createsynthid(boardid)] = flags;
    result["synthplay_fired"] = true;
    return result;
  }
  json flags = synthreadflags(session, boardid);
  flags["playqueue"].push_back(json::array({play, 4}));
  session["synthflags"][createsynthid(boardid)] = flags;
  result["queued"] = true;
  return result;
}

}  // namespace zss_memory
