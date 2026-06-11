#ifndef ZSS_LANG_TRANSFORMER_HPP
#define ZSS_LANG_TRANSFORMER_HPP

#include <map>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

#include "zss_lang_ast.hpp"
#include "zss_lang_sourcemap.hpp"
#include "zss_lang_textformat.hpp"
#include "zss_lang_util.hpp"

namespace zss_lang {

struct GenContext {
  std::vector<std::pair<std::string, std::vector<int>>> labelorder;
  std::map<std::string, std::vector<int>> labels;
  int internal = 0;
  int lineindex = 0;
  std::map<std::string, int> linelookup;
  bool isfirststat = true;
};

struct CompileOutput {
  std::string source;
  std::string source_map_json;
  std::string labels_json;
  GenContext context;
};

static GenContext g_context;

class Transformer {
public:
  explicit Transformer(GenContext& ctx) : ctx_(ctx) {}

  CompileOutput transform(CodeNode* ast) {
    ctx_.labels.clear();
    ctx_.labelorder.clear();
    ctx_.internal = 1;
    ctx_.lineindex = 0;
    ctx_.isfirststat = true;
    ctx_.linelookup.clear();
    indexnode(ast);
    SourceNode root = transformnode(ast);
    SourceOutput out = root.to_string_with_source_map();
    CompileOutput result;
    result.source = out.code;
    result.source_map_json = out.source_map_json;
    result.context = ctx_;
    result.labels_json = labelstojson(ctx_.labelorder);
    return result;
  }

private:
  GenContext& ctx_;

  static int nodeline(const CodeNode* ast) {
    return ast && ast->loc.start_line > 0 ? ast->loc.start_line : 1;
  }

  static int nodecol(const CodeNode* ast) {
    return ast && ast->loc.start_column > 0 ? ast->loc.start_column : 1;
  }

  SourceNode blanknode(const CodeNode* ast) {
    return SourceNode(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
  }

  SourceNode write(const CodeNode* ast, const std::string& text) {
    SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
    node.add(text);
    return node;
  }

  void writeadd(SourceNode& node, const std::string& text) { node.add(text); }

  void writeadd(SourceNode& node, SourceNode child) {
    node.add(std::move(child));
  }

  SourceNode write(const CodeNode* ast,
                   std::initializer_list<SourceNode> children) {
    SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
    for (auto& c : children)
      node.add(std::move(c));
    return node;
  }

  std::string labelstojson(
      const std::vector<std::pair<std::string, std::vector<int>>>& labelorder) {
    std::ostringstream oss;
    oss << "{\n";
    for (size_t i = 0; i < labelorder.size(); ++i) {
      if (i > 0)
        oss << ",\n";
      const auto& kv = labelorder[i];
      oss << "  \"" << kv.first << "\": [\n";
      for (size_t j = 0; j < kv.second.size(); ++j) {
        if (j > 0)
          oss << ",\n";
        oss << "    " << kv.second[j];
      }
      oss << "\n  ]";
    }
    oss << "\n}\n";
    return oss.str();
  }

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

  int readlookup(const std::string& id) const {
    auto it = ctx_.linelookup.find(id);
    return it == ctx_.linelookup.end() ? -1 : it->second;
  }

  void updatelookup(const std::string& id, int value) {
    ctx_.linelookup[id] = value;
  }

  std::vector<CodeNode*>
  ptrs(const std::vector<std::unique_ptr<CodeNode>>& nodes) {
    std::vector<CodeNode*> out;
    for (const auto& n : nodes)
      out.push_back(n.get());
    return out;
  }

  void writelookup(std::vector<CodeNode*> nodes, NODE type,
                   const std::string& value) {
    for (auto* node : nodes) {
      if (!node)
        continue;
      switch (node->type) {
      case NODE::WHILE:
      case NODE::REPEAT:
      case NODE::FOREACH:
      case NODE::ELSE_IF:
        if (node->type == type)
          node->done = value;
        break;
      case NODE::IF_BLOCK:
      case NODE::IF_CHECK:
        if (node->type == type)
          node->skip = value;
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
      if (!node)
        continue;
      switch (node->type) {
      case NODE::WHILE:
      case NODE::REPEAT:
      case NODE::FOREACH:
      case NODE::ELSE_IF:
        if (node->type == type)
          updatelookup(node->done, line);
        break;
      case NODE::IF_BLOCK:
      case NODE::IF_CHECK:
        if (node->type == type)
          updatelookup(node->skip, line);
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
    if (!ast)
      return;
    if (ast->type == NODE::LINE)
      ++ctx_.lineindex;
    ast->lineindex = ctx_.lineindex;
    switch (ast->type) {
    case NODE::PROGRAM:
      for (auto& l : ast->lines)
        indexnode(l.get());
      break;
    case NODE::LINE:
      for (auto& s : ast->stmts)
        indexnode(s.get());
      break;
    case NODE::MARK:
      updatelookup(ast->id, ast->lineindex);
      break;
    case NODE::IF:
      indexnode(ast->check.get());
      indexnode(ast->block.get());
      break;
    case NODE::IF_BLOCK:
      for (auto& l : ast->lines)
        indexnode(l.get());
      for (auto& l : ast->altlines)
        indexnode(l.get());
      break;
    case NODE::ELSE_IF:
      for (auto& l : ast->lines)
        indexnode(l.get());
      break;
    case NODE::ELSE:
    case NODE::WHILE:
    case NODE::REPEAT:
    case NODE::FOREACH:
    case NODE::WAITFOR:
      for (auto& l : ast->lines)
        indexnode(l.get());
      break;
    case NODE::MOVE:
    case NODE::COMMAND:
    case NODE::IF_CHECK:
      for (auto& w : ast->words)
        indexnode(w.get());
      break;
    default:
      break;
    }
  }

  std::string literaltext(const CodeNode* ast) {
    if (!ast)
      return "''";
    switch (ast->literal_kind) {
    case LITERAL::NUMBER: {
      std::ostringstream oss;
      oss << ast->number_value;
      return oss.str();
    }
    case LITERAL::STRING:
      return writestring(ast->value);
    case LITERAL::TEMPLATE:
      return writetemplatestring(ast->value);
    default:
      return "''";
    }
  }

  SourceNode writeapi(const CodeNode* ast, const std::string& method,
                      const std::vector<SourceNode>& params) {
    SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
    node.add("api." + method + "(");
    for (size_t i = 0; i < params.size(); ++i) {
      if (i > 0)
        node.add(", ");
      node.add(params[i]);
    }
    node.add(")");
    return node;
  }

  std::vector<SourceNode>
  transformnodeslist(const std::vector<std::unique_ptr<CodeNode>>& nodes) {
    std::vector<SourceNode> out;
    for (const auto& n : nodes) {
      if (n)
        out.push_back(transformnode(n.get()));
    }
    return out;
  }

  SourceNode writegoto(const CodeNode* ast, int line) {
    SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
    node.add(writeapi(ast, "jump", {write(ast, std::to_string(line))}));
    node.add("; continue;");
    return node;
  }

  SourceNode transformcompare(const CodeNode* ast) {
    if (!ast || ast->type != NODE::COMPARE || !ast->compare)
      return blanknode(ast);
    const char* method = nullptr;
    switch (ast->compare->compare_method) {
    case COMPARE::IS_EQ:
      method = "isEq";
      break;
    case COMPARE::IS_NOT_EQ:
      method = "isNotEq";
      break;
    case COMPARE::IS_LESS_THAN:
      method = "isLessThan";
      break;
    case COMPARE::IS_GREATER_THAN:
      method = "isGreaterThan";
      break;
    case COMPARE::IS_LESS_THAN_OR_EQ:
      method = "isLessThanOrEq";
      break;
    case COMPARE::IS_GREATER_THAN_OR_EQ:
      method = "isGreaterThanOrEq";
      break;
    }
    if (!method)
      return blanknode(ast);
    return writeapi(
        ast, method,
        {transformnode(ast->lhs.get()), transformnode(ast->rhs.get())});
  }

  void prefixapi(SourceNode& operation, const char* method, CodeNode* rhs) {
    operation.prepend(std::string("api.") + method + "(");
    operation.add(", ");
    operation.add(transformnode(rhs));
    operation.add(")");
  }

  void prefixuniapi(SourceNode& operation, const char* method, CodeNode* rhs) {
    operation.prepend(std::string("api.") + method + "(");
    operation.add(transformnode(rhs));
    operation.add(")");
  }

  void transformoperatoritem(const CodeNode* item, SourceNode& operation) {
    if (!item || item->type != NODE::OPERATOR_ITEM)
      return;
    switch (item->operator_kind) {
    case OPERATOR::PLUS:
      prefixapi(operation, "opPlus", item->rhs.get());
      break;
    case OPERATOR::MINUS:
      prefixapi(operation, "opMinus", item->rhs.get());
      break;
    case OPERATOR::POWER:
      prefixapi(operation, "opPower", item->rhs.get());
      break;
    case OPERATOR::MULTIPLY:
      prefixapi(operation, "opMultiply", item->rhs.get());
      break;
    case OPERATOR::DIVIDE:
      prefixapi(operation, "opDivide", item->rhs.get());
      break;
    case OPERATOR::MOD_DIVIDE:
      prefixapi(operation, "opModDivide", item->rhs.get());
      break;
    case OPERATOR::FLOOR_DIVIDE:
      prefixapi(operation, "opFloorDivide", item->rhs.get());
      break;
    case OPERATOR::UNI_PLUS:
      prefixuniapi(operation, "opUniPlus", item->rhs.get());
      break;
    case OPERATOR::UNI_MINUS:
      prefixuniapi(operation, "opUniMinus", item->rhs.get());
      break;
    default:
      break;
    }
  }

  SourceNode transformoperator(CodeNode* ast) {
    if (!ast || ast->type != NODE::OPERATOR)
      return blanknode(ast);
    SourceNode operation =
        ast->lhs ? transformnode(ast->lhs.get()) : write(ast, "");
    for (auto& item : ast->items) {
      if (item)
        transformoperatoritem(item.get(), operation);
    }
    return operation;
  }

  void applyloopbreakcontinue(std::vector<std::unique_ptr<CodeNode>>& lines,
                              int done, int loop, SourceNode& source) {
    for (auto& item : lines) {
      if (!item)
        continue;
      if (item->type == NODE::BREAK) {
        item->goto_line = done;
      } else if (item->type == NODE::CONTINUE) {
        item->goto_line = loop;
      }
      source.add(transformnode(item.get()));
    }
  }

  SourceNode transformnode(CodeNode* ast) {
    if (!ast)
      return SourceNode(0, 0, "");
    switch (ast->type) {
    case NODE::PROGRAM: {
      SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      node.add("try { // first-line\n");
      node.add("while (true) {\n");
      node.add("if (api.sy()) { return 1; }\n");
      node.add("switch (api.getcase()) {\n");
      for (auto& l : ast->lines)
        node.add(transformnode(l.get()));
      node.add("default:\n");
      node.add("  return 0;\n");
      node.add("}\n");
      node.add("api.nextcase();\n");
      node.add("} // end of logic\n");
      node.add("} catch (e) {\n");
      node.add("console.error(e);\n");
      node.add("const source = api.stacktrace(e);\n");
      node.add("const err = new Error(e.message);\n");
      node.add("err.name = 'GameError';\n");
      node.add("err.meta = { line: source.line, column: source.column };\n");
      node.add("throw err;\n");
      node.add("}\n");
      node.add("//# sourceURL=zss.js");
      return node;
    }
    case NODE::API: {
      SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      node.add("  ");
      node.add(writeapi(ast, ast->method, transformnodeslist(ast->words)));
      node.add(";\n");
      return node;
    }
    case NODE::LINE: {
      SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      node.add("case " + std::to_string(ast->lineindex) + ":\n");
      for (auto& s : ast->stmts)
        node.add(transformnode(s.get()));
      node.add("  break;\n");
      return node;
    }
    case NODE::MARK:
      return write(ast, "  // " + ast->comment + "\n");
    case NODE::GOTO: {
      SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      node.add("  ");
      node.add(writegoto(ast, readlookup(ast->id)));
      node.add("\n");
      return node;
    }
    case NODE::COUNT:
      return write(ast, std::to_string(ast->index));
    case NODE::LITERAL:
      return write(ast, literaltext(ast));
    case NODE::TEXT: {
      SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      node.add("  ");
      node.add(
          writeapi(ast, "text", {write(ast, writetemplatestring(ast->value))}));
      node.add(";\n");
      return node;
    }
    case NODE::STAT:
      if (ctx_.isfirststat) {
        ctx_.isfirststat = false;
        SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
        node.add("  api.stat(");
        std::istringstream iss(ast->value);
        std::string word;
        bool first = true;
        while (iss >> word) {
          if (!first)
            node.add(", ");
          first = false;
          node.add(writestring(word));
        }
        node.add(");\n");
        return node;
      }
      return write(ast, "  // skipped " + ast->value + "\n");
    case NODE::LABEL: {
      std::string llabel = namestr(ast->name);
      addlabel(llabel, (ast->active ? 1 : -1) * ast->lineindex);
      return write(ast,
                   "  // " +
                       std::to_string((ast->active ? 1 : -1) * ast->lineindex) +
                       " '" + llabel + "' " +
                       (ast->active ? "label" : "comment") + "\n");
    }
    case NODE::HYPERLINK: {
      SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      node.add("  api.hyperlink(" + writetemplatestring(ast->text));
      std::istringstream iss(ast->link);
      std::string part;
      while (iss >> part)
        node.add(", " + writestring(part));
      node.add(");\n");
      return node;
    }
    case NODE::MOVE: {
      SourceNode movecmd(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      movecmd.add("api.command(" + writestring("go"));
      for (const auto& w : ast->words) {
        movecmd.add(", ");
        movecmd.add(transformnode(w.get()));
      }
      movecmd.add(")");
      SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      node.add("  ");
      if (ast->wait) {
        node.add("if (");
        node.add(std::move(movecmd));
        node.add(") { continue; };\n");
      } else {
        node.add(std::move(movecmd));
        node.add(";\n");
      }
      return node;
    }
    case NODE::COMMAND: {
      SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      node.add("  if (");
      node.add(writeapi(ast, "command", transformnodeslist(ast->words)));
      node.add(") { continue; };\n");
      return node;
    }
    case NODE::IF: {
      CodeNode* block = ast->block.get();
      if (block && block->type == NODE::IF_BLOCK) {
        writelookup({ast->check.get()}, NODE::IF_CHECK, block->skip);
        SourceNode source = transformnode(ast->check.get());
        for (auto& l : block->lines)
          source.add(transformnode(l.get()));
        writelookupline(ptrs(block->altlines), NODE::ELSE_IF,
                        readlookup(block->done));
        for (auto& l : block->altlines)
          source.add(transformnode(l.get()));
        return source;
      }
      return write(ast, {transformnode(ast->check.get())});
    }
    case NODE::IF_CHECK: {
      int skip = readlookup(ast->skip);
      SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      if (skip == -1) {
        node.add("  ");
        node.add(writeapi(ast, ast->method, transformnodeslist(ast->words)));
        node.add(";\n");
      } else {
        node.add("  if (!");
        node.add(writeapi(ast, ast->method, transformnodeslist(ast->words)));
        node.add(") { ");
        node.add(writegoto(ast, skip));
        node.add(" }\n");
      }
      return node;
    }
    case NODE::ELSE_IF:
    case NODE::ELSE: {
      SourceNode source(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      for (auto& l : ast->lines)
        source.add(transformnode(l.get()));
      return source;
    }
    case NODE::WHILE: {
      int loop = readlookup(ast->loop);
      int done = readlookup(ast->done);
      SourceNode source(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      writelookup(ptrs(ast->lines), NODE::IF_CHECK, ast->done);
      applyloopbreakcontinue(ast->lines, done, loop, source);
      return source;
    }
    case NODE::REPEAT: {
      int loop = readlookup(ast->loop);
      int done = readlookup(ast->done);
      SourceNode source(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      writelookup(ptrs(ast->lines), NODE::IF_CHECK, ast->done);
      applyloopbreakcontinue(ast->lines, done, loop, source);
      return source;
    }
    case NODE::WAITFOR: {
      SourceNode source(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      writelookup(ptrs(ast->lines), NODE::IF_CHECK, ast->loop);
      for (auto& l : ast->lines)
        source.add(transformnode(l.get()));
      return source;
    }
    case NODE::FOREACH: {
      int loop = readlookup(ast->loop);
      int done = readlookup(ast->done);
      SourceNode source(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      writelookup(ptrs(ast->lines), NODE::IF_CHECK, ast->done);
      applyloopbreakcontinue(ast->lines, done, loop, source);
      return source;
    }
    case NODE::BREAK: {
      SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      node.add("  ");
      node.add(writegoto(ast, ast->goto_line));
      node.add("\n");
      return node;
    }
    case NODE::CONTINUE: {
      SourceNode node(nodeline(ast), nodecol(ast), GENERATED_FILENAME);
      node.add("  ");
      node.add(writegoto(ast, ast->goto_line));
      node.add("\n");
      return node;
    }
    case NODE::OR:
      return writeapi(ast, "or", transformnodeslist(ast->items));
    case NODE::AND:
      return writeapi(ast, "and", transformnodeslist(ast->items));
    case NODE::NOT:
      return writeapi(ast, "not", transformnodeslist(ast->items));
    case NODE::COMPARE:
      return transformcompare(ast);
    case NODE::OPERATOR:
      return transformoperator(ast);
    case NODE::EXPR:
      return writeapi(ast, "expr", transformnodeslist(ast->words));
    default:
      return blanknode(ast);
    }
  }
};

inline CompileOutput transformast(CodeNode* ast) {
  Transformer tx(g_context);
  return tx.transform(ast);
}

} // namespace zss_lang

#endif
