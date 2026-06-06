#include <cstring>
#include <memory>
#include <string>
#include <vector>

#include "zss_lang_api.h"
#include "zss_lang_ast.hpp"
#include "zss_lang_lexer.hpp"
#include "zss_lang_parser.hpp"
#include "zss_lang_util.hpp"
#include "zss_lang_wasm_emitter.hpp"

namespace {

struct CompileStorage {
  std::string source;
  std::string source_map;
  std::string labels_json;
  std::string debug_map;
  std::string import_manifest;
  std::vector<uint8_t> wasm_bytes;
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

uint8_t* dupbytes(const std::vector<uint8_t>& bytes) {
  if (bytes.empty()) {
    return nullptr;
  }
  uint8_t* out = static_cast<uint8_t*>(std::malloc(bytes.size()));
  if (out) {
    std::memcpy(out, bytes.data(), bytes.size());
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
  result->wasm_bytes = nullptr;
  result->wasm_bytes_len = 0;
  result->debug_map = nullptr;
  result->import_manifest = nullptr;

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

  auto wasmout = zss_lang::transformastwasm(ast.get());
  storage->wasm_bytes = std::move(wasmout.wasm_bytes);
  storage->labels_json = wasmout.labels_json;
  storage->debug_map = wasmout.debug_map;
  storage->import_manifest = wasmout.import_manifest;

  result->wasm_bytes = dupbytes(storage->wasm_bytes);
  result->wasm_bytes_len = storage->wasm_bytes.size();
  result->labels_json = dupstr(storage->labels_json);
  result->debug_map = dupstr(storage->debug_map);
  result->import_manifest = dupstr(storage->import_manifest);

  g_last = storage.release();
  return result;
}

void zss_compile_result_free(ZssCompileResult* result) {
  if (!result) {
    return;
  }
  std::free(const_cast<char*>(result->source));
  std::free(const_cast<char*>(result->source_map));
  std::free(const_cast<char*>(result->labels_json));
  std::free(const_cast<uint8_t*>(result->wasm_bytes));
  std::free(const_cast<char*>(result->debug_map));
  std::free(const_cast<char*>(result->import_manifest));
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

int main(int argc, char** argv) {
  if (argc < 2) {
    std::cerr << "usage: zss_lang_parity <fixture-dir>\n";
    return 1;
  }
  std::string dir = argv[1];
  static const char* fixtures[] = {
      "empty",           "if_break",        "while_break",     "repeat_break",
      "short_go",        "short_try",       "divide",          "paren_multiline",
      "pick",            "comparison_chain","label_goto",      "stat_line",
      "text_line",       "command",         "foreach",         "while_push_by",
      "duplicate_fork",  "send_dir_label",  "paren_intround",  nullptr};
  int pass = 0;
  int fail = 0;
  for (int i = 0; fixtures[i]; ++i) {
    std::string id = fixtures[i];
    std::string zss = readfile(dir + "/" + id + ".zss");
    ZssCompileResult* r = zss_compile(id.c_str(), zss.c_str());
    bool ok = true;
    if (r->error_count > 0) {
      std::cout << id << ": FAIL (errors)\n";
      ok = false;
    } else if (!r->wasm_bytes || r->wasm_bytes_len < 8) {
      std::cout << id << ": FAIL wasm_bytes\n";
      ok = false;
    } else if (r->wasm_bytes[0] != 0x00 || r->wasm_bytes[1] != 0x61 ||
               r->wasm_bytes[2] != 0x73 || r->wasm_bytes[3] != 0x6d) {
      std::cout << id << ": FAIL wasm magic\n";
      ok = false;
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

#ifdef ZSS_LANG_WASM_CLI

#include <iostream>

int main() {
  std::ostringstream ss;
  ss << std::cin.rdbuf();
  ZssCompileResult* r = zss_compile("cli", ss.str().c_str());
  if (r->error_count > 0 || !r->wasm_bytes || r->wasm_bytes_len == 0) {
    zss_compile_result_free(r);
    return 1;
  }
  std::fwrite(r->wasm_bytes, 1, r->wasm_bytes_len, stdout);
  zss_compile_result_free(r);
  return 0;
}

#endif
