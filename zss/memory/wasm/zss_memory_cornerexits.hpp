#pragma once

#include <string>

#include "third_party/json.hpp"
#include "zss_memory_constants.hpp"

namespace zss_memory {

using json = nlohmann::json;

inline std::string boardidfromaddr(const json& addrmap, const std::string& addr) {
  if (!addrmap.contains(addr)) {
    return "";
  }
  const json& b = addrmap[addr];
  if (b.is_object() && b.contains("id")) {
    return b["id"].get<std::string>();
  }
  return "";
}

inline std::string cornerfrom(const json& addrmap, const json& board,
                              const std::string& first,
                              const std::string& second) {
  if (!board.contains(first)) {
    return "";
  }
  const std::string firstaddr = board[first].get<std::string>();
  if (!addrmap.contains(firstaddr)) {
    return "";
  }
  const json& mid = addrmap[firstaddr];
  if (!mid.is_object() || !mid.contains(second)) {
    return "";
  }
  return boardidfromaddr(addrmap, mid[second].get<std::string>());
}

inline std::string reconcilecorner(const std::string& ida, const std::string& idb) {
  if (ida.empty() && idb.empty()) {
    return "";
  }
  if (!ida.empty() && idb.empty()) {
    return ida;
  }
  if (ida.empty() && !idb.empty()) {
    return idb;
  }
  if (ida == idb) {
    return ida;
  }
  return CORNER_EXIT_DISPUTED;
}

inline json cornerexitresolve(const json& args) {
  const json& board = args["board"];
  const json& addrmap = args["addrmap"];
  return json{
      {"exitne", reconcilecorner(cornerfrom(addrmap, board, "exitnorth", "exiteast"),
                                 cornerfrom(addrmap, board, "exiteast", "exitnorth"))},
      {"exitnw", reconcilecorner(cornerfrom(addrmap, board, "exitnorth", "exitwest"),
                                 cornerfrom(addrmap, board, "exitwest", "exitnorth"))},
      {"exitse", reconcilecorner(cornerfrom(addrmap, board, "exitsouth", "exiteast"),
                                 cornerfrom(addrmap, board, "exiteast", "exitsouth"))},
      {"exitsw", reconcilecorner(cornerfrom(addrmap, board, "exitsouth", "exitwest"),
                                 cornerfrom(addrmap, board, "exitwest", "exitsouth"))},
  };
}

}  // namespace zss_memory
