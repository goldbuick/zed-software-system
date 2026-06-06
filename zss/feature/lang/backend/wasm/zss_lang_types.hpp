#ifndef ZSS_LANG_TYPES_HPP
#define ZSS_LANG_TYPES_HPP

#include <string>

namespace zss_lang {

enum class NODE {
  PROGRAM,
  API,
  LINE,
  MARK,
  GOTO,
  COUNT,
  TEXT,
  LABEL,
  HYPERLINK,
  STAT,
  MOVE,
  COMMAND,
  LITERAL,
  IF,
  IF_CHECK,
  IF_BLOCK,
  ELSE_IF,
  ELSE,
  WHILE,
  BREAK,
  CONTINUE,
  REPEAT,
  WAITFOR,
  FOREACH,
  OR,
  AND,
  NOT,
  COMPARE,
  COMPARE_ITEM,
  OPERATOR,
  OPERATOR_ITEM,
  EXPR,
};

enum class COMPARE {
  IS_EQ,
  IS_NOT_EQ,
  IS_LESS_THAN,
  IS_GREATER_THAN,
  IS_LESS_THAN_OR_EQ,
  IS_GREATER_THAN_OR_EQ,
};

enum class OPERATOR {
  EMPTY,
  PLUS,
  MINUS,
  POWER,
  MULTIPLY,
  DIVIDE,
  MOD_DIVIDE,
  FLOOR_DIVIDE,
  UNI_PLUS,
  UNI_MINUS,
};

enum class LITERAL {
  NUMBER,
  STRING,
  TEMPLATE,
};

struct Location {
  int start_offset = 0;
  int end_offset = 0;
  int start_line = 1;
  int start_column = 1;
  int end_line = 1;
  int end_column = 1;
};

struct LangError {
  int offset = 0;
  int line = 0;
  int column = 0;
  int length = 0;
  std::string message;
};

}  // namespace zss_lang

#endif
