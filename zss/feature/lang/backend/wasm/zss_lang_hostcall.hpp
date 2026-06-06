#ifndef ZSS_LANG_HOSTCALL_HPP
#define ZSS_LANG_HOSTCALL_HPP

namespace zss_lang {

enum HostIndex : int {
  HOST_SY = 0,
  HOST_GETCASE = 1,
  HOST_NEXTCASE = 2,
  HOST_JUMP = 3,
  HOST_IF = 4,
  HOST_COMMAND = 5,
  HOST_TEXT = 6,
  HOST_STAT = 7,
  HOST_HYPERLINK = 8,
  HOST_OR = 9,
  HOST_AND = 10,
  HOST_NOT = 11,
  HOST_EXPR = 12,
  HOST_IS_EQ = 13,
  HOST_IS_NOT_EQ = 14,
  HOST_IS_LESS_THAN = 15,
  HOST_IS_GREATER_THAN = 16,
  HOST_IS_LESS_THAN_OR_EQ = 17,
  HOST_IS_GREATER_THAN_OR_EQ = 18,
  HOST_OP_PLUS = 19,
  HOST_OP_MINUS = 20,
  HOST_OP_POWER = 21,
  HOST_OP_MULTIPLY = 22,
  HOST_OP_DIVIDE = 23,
  HOST_OP_MOD_DIVIDE = 24,
  HOST_OP_FLOOR_DIVIDE = 25,
  HOST_OP_UNI_PLUS = 26,
  HOST_OP_UNI_MINUS = 27,
  HOST_PRINT = 28,
  HOST_TRY = 29,
  HOST_TAKE = 30,
  HOST_GIVE = 31,
  HOST_DUPLICATE = 32,
  HOST_REPEATSTART = 33,
  HOST_REPEAT = 34,
  HOST_FOREACHSTART = 35,
  HOST_FOREACH = 36,
  HOST_WAITFOR = 37,
  HOST_API = 38,
  HOST_COUNT = 39
};

inline const char* hostmethodname(int index) {
  static const char* names[] = {
      "sy",           "getcase",      "nextcase",     "jump",          "if",
      "command",      "text",         "stat",         "hyperlink",     "or",
      "and",          "not",          "expr",         "isEq",          "isNotEq",
      "isLessThan",   "isGreaterThan","isLessThanOrEq","isGreaterThanOrEq",
      "opPlus",       "opMinus",      "opPower",      "opMultiply",    "opDivide",
      "opModDivide",  "opFloorDivide","opUniPlus",    "opUniMinus",    "print",
      "try",          "take",         "give",         "duplicate",     "repeatstart",
      "repeat",       "foreachstart", "foreach",      "waitfor",       "api"};
  if (index < 0 || index >= HOST_COUNT) return "unknown";
  return names[index];
}

}  // namespace zss_lang

#endif
