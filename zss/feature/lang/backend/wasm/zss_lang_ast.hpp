#ifndef ZSS_LANG_AST_HPP
#define ZSS_LANG_AST_HPP

#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "zss_lang_types.hpp"

namespace zss_lang {

struct CodeNode {
  NODE type = NODE::PROGRAM;
  Location loc;
  int lineindex = 0;

  std::vector<std::unique_ptr<CodeNode>> lines;
  std::vector<std::unique_ptr<CodeNode>> stmts;
  std::vector<std::unique_ptr<CodeNode>> words;
  std::vector<std::unique_ptr<CodeNode>> items;
  std::vector<std::unique_ptr<CodeNode>> altlines;

  std::unique_ptr<CodeNode> lhs;
  std::unique_ptr<CodeNode> rhs;
  std::unique_ptr<CodeNode> check;
  std::unique_ptr<CodeNode> block;
  std::unique_ptr<CodeNode> compare;

  std::string method;
  std::string id;
  std::string comment;
  std::string name;
  std::string value;
  std::string link;
  std::string text;
  std::string skip;
  std::string done;
  std::string loop;

  bool active = false;
  bool wait = false;
  int goto_line = 0;
  int index = 0;

  COMPARE compare_method = COMPARE::IS_EQ;
  OPERATOR operator_kind = OPERATOR::EMPTY;
  LITERAL literal_kind = LITERAL::STRING;
  double number_value = 0.0;
};

inline std::unique_ptr<CodeNode> make_node(NODE type,
                                           Location loc = Location()) {
  auto node = std::make_unique<CodeNode>();
  node->type = type;
  node->loc = std::move(loc);
  return node;
}

} // namespace zss_lang

#endif
