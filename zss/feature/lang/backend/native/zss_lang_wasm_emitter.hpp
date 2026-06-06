#ifndef ZSS_LANG_WASM_EMITTER_HPP
#define ZSS_LANG_WASM_EMITTER_HPP

#include <algorithm>
#include <map>
#include <set>
#include <sstream>
#include <string>
#include <vector>

#include "zss_lang_ast.hpp"
#include "zss_lang_hostcall.hpp"
#include "zss_lang_textformat.hpp"
#include "zss_lang_transformer.hpp"
#include "zss_lang_util.hpp"
#include "zss_lang_wasm_writer.hpp"

namespace zss_lang {

struct WasmCompileOutput {
  std::vector<uint8_t> wasm_bytes;
  std::string labels_json;
  std::string debug_map;
  std::string import_manifest;
  GenContext context;
};

class WasmEmitter {
 public:
  WasmEmitter() : mod_(), emit_(), ctx_(g_context) {}

  WasmCompileOutput transform(CodeNode* ast) {
    ctx_.labels.clear();
    ctx_.labelorder.clear();
    ctx_.internal = 1;
    ctx_.lineindex = 0;
    ctx_.isfirststat = true;
    ctx_.linelookup.clear();
    hostsused_.clear();
    caselines_.clear();
    indexnode(ast);
    emitwasmnode(ast);
    WasmCompileOutput out;
    out.wasm_bytes = mod_.finish(emit_);
    out.context = ctx_;
    out.labels_json = labelstojson(ctx_.labelorder);
    out.debug_map = debugmapjson();
    out.import_manifest = importmanifestjson();
    return out;
  }

 private:
  WasmModuleBuilder mod_;
  WasmInstrEmitter emit_;
  GenContext& ctx_;
  std::set<int> hostsused_;
  std::map<int, std::pair<int, int>> caselines_;
  int nestdepth_ = 0;

  static const int LOCAL_CASE = 0;

  void trackhost(int index) { hostsused_.insert(index); }

  std::string labelstojson(const std::vector<std::pair<std::string, std::vector<int>>>& labelorder) {
    std::ostringstream oss;
    oss << "{\n";
    for (size_t i = 0; i < labelorder.size(); ++i) {
      if (i > 0) oss << ",\n";
      const auto& kv = labelorder[i];
      oss << "  \"" << kv.first << "\": [\n";
      for (size_t j = 0; j < kv.second.size(); ++j) {
        if (j > 0) oss << ",\n";
        oss << "    " << kv.second[j];
      }
      oss << "\n  ]";
    }
    oss << "\n}\n";
    return oss.str();
  }

  std::string debugmapjson() {
    std::ostringstream oss;
    oss << "{\"cases\":{";
    bool first = true;
    for (const auto& kv : caselines_) {
      if (!first) oss << ",";
      first = false;
      oss << "\"" << kv.first << "\":{\"line\":" << kv.second.first
          << ",\"column\":" << kv.second.second << "}";
    }
    oss << "}}";
    return oss.str();
  }

  std::string importmanifestjson() {
    std::ostringstream oss;
    oss << "{\"hosts\":[";
    bool first = true;
    for (int h : hostsused_) {
      if (!first) oss << ",";
      first = false;
      oss << h;
    }
    oss << "]}";
    return oss.str();
  }

  int readlookup(const std::string& id) const {
    auto it = ctx_.linelookup.find(id);
    return it == ctx_.linelookup.end() ? -1 : it->second;
  }

  void updatelookup(const std::string& id, int value) { ctx_.linelookup[id] = value; }

  void addlabel(const std::string& name, int index) {
    auto it = ctx_.labels.find(name);
    if (it == ctx_.labels.end()) {
      ctx_.labelorder.push_back({name, {index}});
      ctx_.labels[name] = {index};
    } else {
      it->second.push_back(index);
      for (auto& pair : ctx_.labelorder) {
        if (pair.first == name) {
          pair.second.push_back(index);
          break;
        }
      }
    }
  }

  std::vector<CodeNode*> ptrs(const std::vector<std::unique_ptr<CodeNode>>& nodes) {
    std::vector<CodeNode*> out;
    for (const auto& n : nodes) out.push_back(n.get());
    return out;
  }

  void writelookup(std::vector<CodeNode*> nodes, NODE type, const std::string& value) {
    for (auto* node : nodes) {
      if (!node) continue;
      switch (node->type) {
        case NODE::WHILE:
        case NODE::REPEAT:
        case NODE::FOREACH:
        case NODE::ELSE_IF:
          if (node->type == type) node->done = value;
          break;
        case NODE::IF_BLOCK:
        case NODE::IF_CHECK:
          if (node->type == type) node->skip = value;
          break;
        case NODE::LINE:
          writelookup(ptrs(node->stmts), type, value);
          break;
        default:
          break;
      }
    }
  }

  void writelookupline(std::vector<CodeNode*> nodes, NODE type, int line) {
    for (auto* node : nodes) {
      if (!node) continue;
      switch (node->type) {
        case NODE::WHILE:
        case NODE::REPEAT:
        case NODE::FOREACH:
        case NODE::ELSE_IF:
          if (node->type == type) updatelookup(node->done, line);
          break;
        case NODE::IF_BLOCK:
        case NODE::IF_CHECK:
          if (node->type == type) updatelookup(node->skip, line);
          break;
        case NODE::LINE:
          writelookupline(ptrs(node->stmts), type, line);
          break;
        default:
          break;
      }
    }
  }

  void indexnode(CodeNode* ast) {
    if (!ast) return;
    if (ast->type == NODE::LINE) ++ctx_.lineindex;
    ast->lineindex = ctx_.lineindex;
    switch (ast->type) {
      case NODE::PROGRAM:
        for (auto& l : ast->lines) indexnode(l.get());
        break;
      case NODE::LINE:
        caselines_[ast->lineindex] = {ast->loc.start_line, ast->loc.start_column};
        for (auto& s : ast->stmts) indexnode(s.get());
        break;
      case NODE::MARK:
        updatelookup(ast->id, ast->lineindex);
        break;
      case NODE::IF:
        indexnode(ast->check.get());
        indexnode(ast->block.get());
        break;
      case NODE::IF_BLOCK:
        for (auto& l : ast->lines) indexnode(l.get());
        for (auto& l : ast->altlines) indexnode(l.get());
        break;
      case NODE::ELSE_IF:
        for (auto& l : ast->lines) indexnode(l.get());
        break;
      case NODE::ELSE:
      case NODE::WHILE:
      case NODE::REPEAT:
      case NODE::FOREACH:
      case NODE::WAITFOR:
        for (auto& l : ast->lines) indexnode(l.get());
        break;
      case NODE::MOVE:
      case NODE::COMMAND:
      case NODE::IF_CHECK:
        for (auto& w : ast->words) indexnode(w.get());
        break;
      default:
        break;
    }
  }

  void emitcontinue() { emit_.emit_br(static_cast<uint32_t>(nestdepth_)); }

  void emitifopen() {
    emit_.emit_if(0x40);
    ++nestdepth_;
  }

  void emitifclose() {
    emit_.emit_end();
    --nestdepth_;
  }

  void emitjump(int line) {
    trackhost(HOST_JUMP);
    emit_.emit_push_i32(WasmModuleBuilder::IMPORT_PUSH_I32, line);
    emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_JUMP);
    emit_.emit_drop();
    emitcontinue();
  }

  void emitpushword(CodeNode* ast) {
    if (!ast) {
      emit_.emit_push_i32(WasmModuleBuilder::IMPORT_PUSH_I32, 0);
      return;
    }
    switch (ast->type) {
      case NODE::COUNT:
        emit_.emit_push_i32(WasmModuleBuilder::IMPORT_PUSH_I32, ast->index);
        break;
      case NODE::LITERAL:
        if (ast->literal_kind == LITERAL::NUMBER) {
          if (ast->number_value == static_cast<int>(ast->number_value)) {
            emit_.emit_push_i32(WasmModuleBuilder::IMPORT_PUSH_I32,
                                static_cast<int32_t>(ast->number_value));
          } else {
            emit_.emit_push_f64(WasmModuleBuilder::IMPORT_PUSH_F64, ast->number_value);
          }
        } else {
          emitstring(ast->value);
        }
        break;
      default:
        emitexpr(ast);
        break;
    }
  }

  void emitstring(const std::string& value) {
    uint32_t ptr = mod_.addstring(value);
    emit_.emit_push_str(WasmModuleBuilder::IMPORT_PUSH_STR, static_cast<int32_t>(ptr),
                        static_cast<int32_t>(value.size()));
  }

  int methodhost(const std::string& method) {
    if (method == "if") return HOST_IF;
    if (method == "try") return HOST_TRY;
    if (method == "take") return HOST_TAKE;
    if (method == "give") return HOST_GIVE;
    if (method == "duplicate") return HOST_DUPLICATE;
    if (method == "command") return HOST_COMMAND;
    if (method == "waitfor") return HOST_WAITFOR;
    return HOST_API;
  }

  void emitapiwords(int hostindex, const std::vector<std::unique_ptr<CodeNode>>& words) {
    trackhost(hostindex);
    for (const auto& w : words) emitpushword(w.get());
    emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, hostindex);
  }

  void emitapiwords(const std::string& method, const std::vector<std::unique_ptr<CodeNode>>& words) {
    int host = methodhost(method);
    if (host == HOST_API) {
      trackhost(HOST_API);
      emitstring(method);
      for (const auto& w : words) emitpushword(w.get());
      emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_API);
      return;
    }
    emitapiwords(host, words);
  }

  void emitexpr(CodeNode* ast) {
    if (!ast) return;
    switch (ast->type) {
      case NODE::OR:
        trackhost(HOST_OR);
        for (const auto& item : ast->items) emitpushword(item.get());
        emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_OR);
        break;
      case NODE::AND:
        trackhost(HOST_AND);
        for (const auto& item : ast->items) emitpushword(item.get());
        emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_AND);
        break;
      case NODE::NOT:
        trackhost(HOST_NOT);
        for (const auto& item : ast->items) emitpushword(item.get());
        emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_NOT);
        break;
      case NODE::COMPARE:
        emitcompare(ast);
        break;
      case NODE::OPERATOR:
        emitoperator(ast);
        break;
      case NODE::EXPR:
        trackhost(HOST_EXPR);
        for (const auto& w : ast->words) emitpushword(w.get());
        emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_EXPR);
        break;
      case NODE::API:
        emitapiwords(ast->method, ast->words);
        break;
      default:
        emitpushword(ast);
        break;
    }
  }

  void emitcompare(CodeNode* ast) {
    if (!ast || ast->type != NODE::COMPARE || !ast->compare) return;
    int host = HOST_IS_EQ;
    switch (ast->compare->compare_method) {
      case COMPARE::IS_EQ: host = HOST_IS_EQ; break;
      case COMPARE::IS_NOT_EQ: host = HOST_IS_NOT_EQ; break;
      case COMPARE::IS_LESS_THAN: host = HOST_IS_LESS_THAN; break;
      case COMPARE::IS_GREATER_THAN: host = HOST_IS_GREATER_THAN; break;
      case COMPARE::IS_LESS_THAN_OR_EQ: host = HOST_IS_LESS_THAN_OR_EQ; break;
      case COMPARE::IS_GREATER_THAN_OR_EQ: host = HOST_IS_GREATER_THAN_OR_EQ; break;
    }
    trackhost(host);
    emitpushword(ast->lhs.get());
    emitpushword(ast->rhs.get());
    emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, host);
  }

  void emitoperator(CodeNode* ast) {
    if (!ast || ast->type != NODE::OPERATOR) return;
    if (ast->lhs) emitpushword(ast->lhs.get());
    for (auto& item : ast->items) {
      if (!item || item->type != NODE::OPERATOR_ITEM) continue;
      int host = HOST_OP_PLUS;
      switch (item->operator_kind) {
        case OPERATOR::PLUS: host = HOST_OP_PLUS; break;
        case OPERATOR::MINUS: host = HOST_OP_MINUS; break;
        case OPERATOR::POWER: host = HOST_OP_POWER; break;
        case OPERATOR::MULTIPLY: host = HOST_OP_MULTIPLY; break;
        case OPERATOR::DIVIDE: host = HOST_OP_DIVIDE; break;
        case OPERATOR::MOD_DIVIDE: host = HOST_OP_MOD_DIVIDE; break;
        case OPERATOR::FLOOR_DIVIDE: host = HOST_OP_FLOOR_DIVIDE; break;
        case OPERATOR::UNI_PLUS: host = HOST_OP_UNI_PLUS; break;
        case OPERATOR::UNI_MINUS: host = HOST_OP_UNI_MINUS; break;
        default: continue;
      }
      trackhost(host);
      emitpushword(item->rhs.get());
      emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, host);
    }
  }

  void emitgotoline(CodeNode* ast, int line) { emitjump(line); }

  void applyloopbreakcontinue(std::vector<std::unique_ptr<CodeNode>>& lines, int done, int loop) {
    for (auto& item : lines) {
      if (!item) continue;
      if (item->type == NODE::BREAK) item->goto_line = done;
      if (item->type == NODE::CONTINUE) item->goto_line = loop;
      emitwasmnode(item.get());
    }
  }

  void emitwasmnode(CodeNode* ast) {
    if (!ast) return;
    switch (ast->type) {
      case NODE::PROGRAM: {
        emit_.local_i32 = 1;
        emit_.emit_block(0x7f);
        emit_.emit_loop();
        trackhost(HOST_SY);
        emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_SY);
        emitifopen();
        emit_.emit_i32_const(1);
        emit_.emit_return();
        emitifclose();
        trackhost(HOST_GETCASE);
        emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_GETCASE);
        emit_.emit_local_set(LOCAL_CASE);
        emit_.emit_block();
        ++nestdepth_;
        for (auto& line : ast->lines) emitwasmnode(line.get());
        emit_.emit_i32_const(0);
        emit_.emit_return();
        emit_.emit_end();
        --nestdepth_;
        trackhost(HOST_NEXTCASE);
        emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_NEXTCASE);
        emit_.emit_drop();
        emit_.emit_br(0);
        emit_.emit_end();
        emit_.emit_i32_const(0);
        emit_.emit_end();
        break;
      }
      case NODE::LINE: {
        emit_.emit_local_get(LOCAL_CASE);
        emit_.emit_i32_const(ast->lineindex);
        emit_.emit_i32_eq();
        emitifopen();
        for (auto& s : ast->stmts) emitwasmnode(s.get());
        emitifclose();
        break;
      }
      case NODE::API: {
        trackhost(methodhost(ast->method));
        emitapiwords(ast->method, ast->words);
        emit_.emit_drop();
        break;
      }
      case NODE::GOTO:
        emitgotoline(ast, readlookup(ast->id));
        break;
      case NODE::TEXT: {
        trackhost(HOST_TEXT);
        emitstring(ast->value);
        emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_TEXT);
        emit_.emit_drop();
        break;
      }
      case NODE::STAT:
        if (ctx_.isfirststat) {
          ctx_.isfirststat = false;
          trackhost(HOST_STAT);
          std::istringstream iss(ast->value);
          std::string word;
          while (iss >> word) emitstring(word);
          emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_STAT);
          emit_.emit_drop();
        }
        break;
      case NODE::LABEL: {
        std::string llabel = namestr(ast->name);
        addlabel(llabel, (ast->active ? 1 : -1) * ast->lineindex);
        break;
      }
      case NODE::HYPERLINK: {
        trackhost(HOST_HYPERLINK);
        emitstring(ast->text);
        std::istringstream iss(ast->link);
        std::string part;
        while (iss >> part) emitstring(part);
        emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_HYPERLINK);
        emit_.emit_drop();
        break;
      }
      case NODE::MOVE: {
        trackhost(HOST_COMMAND);
        emitstring("go");
        for (const auto& w : ast->words) emitpushword(w.get());
        emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_COMMAND);
        if (ast->wait) {
          emit_.emit_i32_eqz();
          emitifopen();
          emitcontinue();
          emitifclose();
        } else {
          emit_.emit_drop();
        }
        break;
      }
      case NODE::COMMAND: {
        trackhost(HOST_COMMAND);
        for (const auto& w : ast->words) emitpushword(w.get());
        emit_.emit_hostcall(WasmModuleBuilder::IMPORT_CALL, HOST_COMMAND);
        emit_.emit_i32_eqz();
        emitifopen();
        emitcontinue();
        emitifclose();
        break;
      }
      case NODE::IF: {
        CodeNode* block = ast->block.get();
        if (block && block->type == NODE::IF_BLOCK) {
          writelookup({ast->check.get()}, NODE::IF_CHECK, block->skip);
          emitwasmnode(ast->check.get());
          for (auto& l : block->lines) emitwasmnode(l.get());
          writelookupline(ptrs(block->altlines), NODE::ELSE_IF, readlookup(block->done));
          for (auto& l : block->altlines) emitwasmnode(l.get());
        } else {
          emitwasmnode(ast->check.get());
        }
        break;
      }
      case NODE::IF_CHECK: {
        int skip = readlookup(ast->skip);
        emitapiwords(ast->method, ast->words);
        if (skip != -1) {
          emit_.emit_i32_eqz();
          emitifopen();
          emitjump(skip);
          emitifclose();
        } else {
          emit_.emit_drop();
        }
        break;
      }
      case NODE::ELSE_IF:
      case NODE::ELSE:
        for (auto& l : ast->lines) emitwasmnode(l.get());
        break;
      case NODE::WHILE: {
        int loop = readlookup(ast->loop);
        int done = readlookup(ast->done);
        writelookup(ptrs(ast->lines), NODE::IF_CHECK, ast->done);
        applyloopbreakcontinue(ast->lines, done, loop);
        break;
      }
      case NODE::REPEAT: {
        int loop = readlookup(ast->loop);
        int done = readlookup(ast->done);
        writelookup(ptrs(ast->lines), NODE::IF_CHECK, ast->done);
        applyloopbreakcontinue(ast->lines, done, loop);
        break;
      }
      case NODE::WAITFOR: {
        writelookup(ptrs(ast->lines), NODE::IF_CHECK, ast->loop);
        for (auto& l : ast->lines) emitwasmnode(l.get());
        break;
      }
      case NODE::FOREACH: {
        int loop = readlookup(ast->loop);
        int done = readlookup(ast->done);
        writelookup(ptrs(ast->lines), NODE::IF_CHECK, ast->done);
        applyloopbreakcontinue(ast->lines, done, loop);
        break;
      }
      case NODE::BREAK:
      case NODE::CONTINUE:
        emitgotoline(ast, ast->goto_line);
        break;
      default:
        break;
    }
  }
};

inline WasmCompileOutput transformastwasm(CodeNode* ast) {
  WasmEmitter emitter;
  return emitter.transform(ast);
}

}  // namespace zss_lang

#endif
