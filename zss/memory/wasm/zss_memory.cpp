#include "zss_memory_api.h"

#include "zss_memory_core.hpp"

using namespace zss_memory;

extern "C" {

void zss_memory_init(void) { reset(); }

void zss_memory_free(void) { reset(); }

int zss_memory_import_json(const char* jsonstr) {
  if (!jsonstr) {
    return 1;
  }
  json parsed = json::parse(jsonstr, nullptr, false);
  if (parsed.is_discarded()) {
    return 1;
  }
  if (parsed.contains("root")) {
    session().root = parsed.at("root");
  } else {
    session().root = parsed;
  }
  return 0;
}

char* zss_memory_export_json(void) {
  return dupstring(trimmemoryexport(session().root).dump());
}

char* zss_memory_export_wire_json(void) {
  return dupstring(exportwire(session().root).dump());
}

char* zss_memory_run_op(const char* op, const char* argsjson) {
  if (!op) {
    return nullptr;
  }
  json args = argsjson ? json::parse(argsjson, nullptr, false) : json::object();
  if (argsjson && args.is_discarded()) {
    return nullptr;
  }
  json result = runop(op, args);
  return dupstring(result.dump());
}

void zss_memory_free_string(char* s) { std::free(s); }

}  // extern "C"

#ifdef ZSS_MEMORY_PARITY_MAIN

#include <cmath>
#include <dirent.h>

#include <fstream>
#include <iostream>
#include <sstream>

static std::string readfile(const std::string& path) {
  std::ifstream in(path);
  std::ostringstream ss;
  ss << in.rdbuf();
  return ss.str();
}

static bool approxjsonmatches(const json& actual, const json& expected,
                              double epsilon) {
  if (!actual.is_object() || !expected.is_object()) {
    return false;
  }
  for (auto it = expected.begin(); it != expected.end(); ++it) {
    if (!actual.contains(it.key())) {
      return false;
    }
    const json& a = actual[it.key()];
    const json& e = it.value();
    if (a.is_number() && e.is_number()) {
      if (std::abs(a.get<double>() - e.get<double>()) > epsilon) {
        return false;
      }
      continue;
    }
    if (a != e) {
      return false;
    }
  }
  return true;
}

static bool jsonmatches(const json& actual, const json& expected,
                        const std::string& mode, double epsilon = 0.0) {
  if (mode == "approx_json") {
    return approxjsonmatches(actual, expected, epsilon);
  }
  if (mode == "string") {
    return actual.is_string() && expected.is_string() &&
           actual.get<std::string>() == expected.get<std::string>();
  }
  if (mode == "bool") {
    return actual.is_boolean() && expected.is_boolean() &&
           actual.get<bool>() == expected.get<bool>();
  }
  return actual == expected;
}

static bool runfixture(const std::string& path) {
  json fixture = json::parse(readfile(path), nullptr, false);
  if (fixture.is_discarded()) {
    std::cout << path << ": FAIL parse\n";
    return false;
  }
  zss_memory_init();
  if (fixture.contains("initial") && fixture["initial"].is_object()) {
    json initial = fixture["initial"];
    if (initial.contains("root")) {
      if (zss_memory_import_json(initial.dump().c_str()) != 0) {
        std::cout << fixture.value("name", path) << ": FAIL initial import\n";
        return false;
      }
    }
  }
  const json steps = fixture.value("steps", json::array());
  for (size_t i = 0; i < steps.size(); ++i) {
    const json& step = steps[i];
    const std::string op = step.value("op", "");
    json args = step.value("args", json::object());
    char* raw = zss_memory_run_op(op.c_str(), args.dump().c_str());
    if (!raw) {
      std::cout << fixture.value("name", path) << " step " << i << " (" << op
                << "): FAIL op error\n";
      return false;
    }
    json actual = json::parse(raw, nullptr, false);
    zss_memory_free_string(raw);
    if (actual.is_discarded()) {
      std::cout << fixture.value("name", path) << " step " << i << ": FAIL parse\n";
      return false;
    }
    const json expect = step.at("expect");
    const std::string mode = expect.value("mode", "json");
    const double epsilon = expect.value("epsilon", 0.01);
    json expected;
    if (mode == "string") {
      expected = expect.at("string");
    } else if (mode == "bool") {
      expected = expect.at("value");
    } else {
      expected = expect.at("json");
    }
    if (!jsonmatches(actual, expected, mode, epsilon)) {
      std::cout << fixture.value("name", path) << " step " << i << " (" << op
                << "): FAIL\n";
      if (actual.is_array() && actual.size() > 32) {
        std::cout << "  (large array output omitted)\n";
      } else {
        std::cout << "  expected: " << expected.dump() << "\n  actual: "
                  << actual.dump() << "\n";
      }
      return false;
    }
  }
  return true;
}

int main(int argc, char** argv) {
  if (argc < 2) {
    std::cerr << "usage: zss_memory_parity <fixture-dir>\n";
    return 1;
  }
  std::string dir = argv[1];
  if (dir.back() != '/') {
    dir += '/';
  }
  int pass = 0;
  int fail = 0;
  DIR* d = opendir(dir.c_str());
  if (!d) {
    std::cerr << "cannot open " << dir << "\n";
    return 1;
  }
  struct dirent* ent;
  while ((ent = readdir(d)) != nullptr) {
    std::string name = ent->d_name;
    if (name.size() < 6 || name.substr(name.size() - 5) != ".json") {
      continue;
    }
    const std::string full = dir + name;
    if (runfixture(full)) {
      std::cout << name << ": PASS\n";
      ++pass;
    } else {
      ++fail;
    }
  }
  closedir(d);
  std::cout << "pass=" << pass << " fail=" << fail << "\n";
  return fail > 0 ? 1 : 0;
}

#endif
