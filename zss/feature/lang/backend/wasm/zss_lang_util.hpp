#ifndef ZSS_LANG_UTIL_HPP
#define ZSS_LANG_UTIL_HPP

#include <cctype>
#include <cstdint>
#include <sstream>
#include <string>

namespace zss_lang {

static int sid_counter = 0;

inline std::string createsid() {
  std::ostringstream oss;
  oss << "sid_" << (sid_counter++);
  return oss.str();
}

inline void resetsids() { sid_counter = 0; }

inline std::string namestr(const std::string& name) {
  std::string out;
  out.reserve(name.size());
  for (unsigned char c : name) {
    out.push_back(static_cast<char>(std::tolower(c)));
  }
  size_t start = 0;
  while (start < out.size() &&
         std::isspace(static_cast<unsigned char>(out[start]))) {
    ++start;
  }
  size_t end = out.size();
  while (end > start &&
         std::isspace(static_cast<unsigned char>(out[end - 1]))) {
    --end;
  }
  return out.substr(start, end - start);
}

inline std::string escapestring(const std::string& value) {
  std::string out;
  out.reserve(value.size());
  for (char c : value) {
    if (c == '\\') {
      out += "\\\\";
    } else if (c == '\'') {
      out += "\\'";
    } else {
      out += c;
    }
  }
  return out;
}

inline std::string writestring(const std::string& value) {
  return "'" + escapestring(value) + "'";
}

inline bool iequals(const std::string& a, const std::string& b) {
  if (a.size() != b.size()) {
    return false;
  }
  for (size_t i = 0; i < a.size(); ++i) {
    if (std::tolower(static_cast<unsigned char>(a[i])) !=
        std::tolower(static_cast<unsigned char>(b[i]))) {
      return false;
    }
  }
  return true;
}

inline bool istartswith(const std::string& hay, const std::string& needle) {
  if (hay.size() < needle.size()) {
    return false;
  }
  for (size_t i = 0; i < needle.size(); ++i) {
    if (std::tolower(static_cast<unsigned char>(hay[i])) !=
        std::tolower(static_cast<unsigned char>(needle[i]))) {
      return false;
    }
  }
  return true;
}

inline bool imatchword(const char* text, size_t len, const char* word) {
  size_t wlen = 0;
  while (word[wlen]) {
    ++wlen;
  }
  if (len != wlen) {
    return false;
  }
  for (size_t i = 0; i < len; ++i) {
    if (std::tolower(static_cast<unsigned char>(text[i])) !=
        std::tolower(static_cast<unsigned char>(word[i]))) {
      return false;
    }
  }
  return true;
}

inline std::string trimstart(const std::string& s) {
  size_t i = 0;
  while (i < s.size() && std::isspace(static_cast<unsigned char>(s[i]))) {
    ++i;
  }
  return s.substr(i);
}

inline std::string trim(const std::string& s) {
  size_t start = 0;
  while (start < s.size() &&
         std::isspace(static_cast<unsigned char>(s[start]))) {
    ++start;
  }
  size_t end = s.size();
  while (end > start && std::isspace(static_cast<unsigned char>(s[end - 1]))) {
    --end;
  }
  return s.substr(start, end - start);
}

inline std::string striptextlinequotes(const std::string& s) {
  std::string out = trimstart(s);
  while (!out.empty() && out.front() == '"') {
    out.erase(out.begin());
  }
  while (!out.empty() && out.back() == '"') {
    out.pop_back();
  }
  return out;
}

} // namespace zss_lang

#endif
