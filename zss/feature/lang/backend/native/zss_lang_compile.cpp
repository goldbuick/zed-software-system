#include <cstring>
#include <memory>
#include <string>
#include <vector>

#include "zss_lang_api.h"
#include "zss_lang_ast.hpp"
#include "zss_lang_lexer.hpp"
#include "zss_lang_parser.hpp"
#include "zss_lang_transformer.hpp"
#include "zss_lang_util.hpp"

namespace {

struct CompileStorage {
  std::string source;
  std::string source_map;
  std::string labels_json;
  std::vector<zss_lang::LangError> errors;
  std::vector<std::string> errmessages;
  std::vector<ZssLangError> errapi;
};

CompileStorage* g_last = nullptr;

char* dupstr(const std::string& s) {
  char* out = static_cast<char*>(std::malloc(s.size() + 1));
  if (out) {
    std::memcpy(out, s.data(), s.size());
    out[s.size()] = '\0';
  }
  return out;
}

ZssCompileResult* makeresult() {
  return new ZssCompileResult{};
}

}  // namespace

extern "C" {

ZssCompileResult* zss_compile(const char* name, const char* source) {
  (void)name;
  delete g_last;
  g_last = nullptr;

  auto storage = std::make_unique<CompileStorage>();
  ZssCompileResult* result = makeresult();
  result->errors = nullptr;
  result->error_count = 0;
  result->source = nullptr;
  result->source_map = nullptr;
  result->labels_json = nullptr;

  zss_lang::resetsids();
  std::string text = source ? source : "";
  if (!text.empty() && text.back() != '\n') {
    text.push_back('\n');
  }

  zss_lang::Lexer lexer(text);
  std::vector<zss_lang::LangError> lexerrors;
  auto tokens = lexer.tokenize(lexerrors);
  if (!lexerrors.empty()) {
    storage->errors = std::move(lexerrors);
    for (const auto& e : storage->errors) {
      storage->errmessages.push_back(e.message);
    }
    storage->errapi.resize(storage->errors.size());
    for (size_t i = 0; i < storage->errors.size(); ++i) {
      storage->errapi[i].offset = storage->errors[i].offset;
      storage->errapi[i].line = storage->errors[i].line;
      storage->errapi[i].column = storage->errors[i].column;
      storage->errapi[i].length = storage->errors[i].length;
      storage->errapi[i].message = storage->errmessages[i].c_str();
    }
    result->errors = storage->errapi.data();
    result->error_count = static_cast<int>(storage->errapi.size());
    g_last = storage.release();
    return result;
  }

  auto ast = zss_lang::parseast(tokens);
  if (!ast) {
    storage->errors.push_back({0, 0, 0, 0, "no ast output"});
    storage->errmessages.push_back(storage->errors.back().message);
    storage->errapi.push_back({0, 0, 0, 0, storage->errmessages.back().c_str()});
    result->errors = storage->errapi.data();
    result->error_count = 1;
    g_last = storage.release();
    return result;
  }

  auto out = zss_lang::transformast(ast.get());
  storage->source = out.source;
  storage->source_map = out.source_map_json;
  storage->labels_json = out.labels_json;

  result->source = dupstr(storage->source);
  result->source_map = dupstr(storage->source_map);
  result->labels_json = dupstr(storage->labels_json);
  return result;
}

void zss_compile_result_free(ZssCompileResult* result) {
  if (!result) {
    return;
  }
  std::free(const_cast<char*>(result->source));
  std::free(const_cast<char*>(result->source_map));
  std::free(const_cast<char*>(result->labels_json));
  delete result;
  delete g_last;
  g_last = nullptr;
}

}  // extern "C"

#ifdef ZSS_LANG_PARITY_MAIN

#include <fstream>
#include <iostream>
#include <sstream>

static std::string readfile(const std::string& path) {
  std::ifstream in(path);
  std::ostringstream ss;
  ss << in.rdbuf();
  return ss.str();
}

static std::string trimtrail(const std::string& s) {
  std::string out = s;
  while (!out.empty() && (out.back() == '\n' || out.back() == '\r')) {
    out.pop_back();
  }
  return out;
}

int main(int argc, char** argv) {
  if (argc < 2) {
    std::cerr << "usage: zss_lang_parity <fixture-dir>\n";
    return 1;
  }
  std::string dir = argv[1];
  static const char* fixtures[] = {
      "empty", "if_break", "while_break", "repeat_break", "short_go", "short_try", "divide",
      "paren_multiline", "pick", "comparison_chain", "label_goto", "stat_line", "text_line",
      "command", "foreach", nullptr};
  int pass = 0;
  int fail = 0;
  for (int i = 0; fixtures[i]; ++i) {
    std::string id = fixtures[i];
    std::string zss = readfile(dir + "/" + id + ".zss");
    std::string expjs = readfile(dir + "/" + id + ".js");
    std::string expmap = trimtrail(readfile(dir + "/" + id + ".map.json"));
    std::string explabels = readfile(dir + "/" + id + ".labels.json");
    ZssCompileResult* r = zss_compile(id.c_str(), zss.c_str());
    bool ok = true;
    if (r->error_count > 0) {
      std::cout << id << ": FAIL (errors)\n";
      ok = false;
    } else {
      std::string gotjs = r->source ? r->source : "";
      std::string gotmap = r->source_map ? r->source_map : "";
      std::string gotlabels = r->labels_json ? r->labels_json : "";
      if (gotjs != expjs) {
        std::cout << id << ": FAIL js\n";
        ok = false;
      }
      if (gotmap != expmap) {
        std::cout << id << ": FAIL map\n";
        ok = false;
      }
      if (gotlabels != explabels) {
        std::cout << id << ": FAIL labels\n";
        ok = false;
      }
    }
    if (ok) {
      std::cout << id << ": PASS\n";
      ++pass;
    } else {
      ++fail;
    }
    zss_compile_result_free(r);
  }
  std::cout << "pass=" << pass << " fail=" << fail << "\n";
  return fail > 0 ? 1 : 0;
}

#endif
