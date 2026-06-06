#ifndef ZSS_LANG_LEXER_HPP
#define ZSS_LANG_LEXER_HPP

#include <algorithm>
#include <cctype>
#include <string>
#include <utility>
#include <vector>

#include "zss_lang_types.hpp"
#include "zss_lang_util.hpp"

namespace zss_lang {

enum class TokenKind {
  END,
  NEWLINE,
  STAT,
  COMMAND,
  TEXT,
  COMMENT,
  LABEL,
  HYPERLINK,
  HYPERLINKTEXT,
  STRINGLITERAL,
  STRINGLITERALDOUBLE,
  NUMBERLITERAL,
  WORD,
  ISEQ,
  ISNOTEQ,
  ISLESSTHAN,
  ISGREATERTHAN,
  ISLESSTHANOREQUAL,
  ISGREATERTHANOREQUAL,
  OR,
  NOT,
  AND,
  PLUS,
  MINUS,
  POWER,
  MULTIPLY,
  DIVIDE,
  MODDIVIDE,
  FLOORDIVIDE,
  QUERY,
  LPAREN,
  RPAREN,
  STOP,
  COMMAND_IF,
  COMMAND_DO,
  COMMAND_DONE,
  COMMAND_ELSE,
  COMMAND_WHILE,
  COMMAND_REPEAT,
  COMMAND_WAITFOR,
  COMMAND_FOREACH,
  COMMAND_BREAK,
  COMMAND_CONTINUE,
  COMMAND_PLAY,
  COMMAND_TOAST,
  COMMAND_TICKER,
};

struct Token {
  TokenKind kind = TokenKind::END;
  std::string image;
  Location loc;
};

class Lexer {
 public:
  explicit Lexer(std::string source) : source_(std::move(source)) {}

  std::vector<Token> tokenize(std::vector<LangError>& errors) {
    errors.clear();
    tokens_.clear();
    pos_ = 0;
    line_ = 1;
    column_ = 1;
    ignore_newlines_ = false;
    paren_depth_ = 0;
    textmatchdepth_ = 1;

    if (source_.empty()) {
      source_ = " \n";
    }

    while (pos_ < source_.size()) {
      if (tryskipwhitespace()) {
        continue;
      }
      if (!scanat(pos_)) {
        errors.push_back({static_cast<int>(pos_), line_, column_, 1, "unexpected character"});
        ++pos_;
        ++column_;
      }
    }

    append_trailing_newline();
    return tokens_;
  }

 private:
  std::string source_;
  size_t pos_ = 0;
  int line_ = 1;
  int column_ = 1;
  bool ignore_newlines_ = false;
  int paren_depth_ = 0;
  int textmatchdepth_ = 0;
  std::vector<Token> tokens_;

  Location makeloc(size_t start, size_t end) const {
    return {static_cast<int>(start), static_cast<int>(end), line_, column_, line_, column_};
  }

  void emit(TokenKind kind, size_t start, size_t end, const std::string& image) {
    Token tok;
    tok.kind = kind;
    tok.image = image;
    tok.loc = {static_cast<int>(start), static_cast<int>(end), line_, column_, line_, column_};
    tokens_.push_back(std::move(tok));
    pos_ = end;
  }

  void advancepos(size_t end) {
    while (pos_ < end && pos_ < source_.size()) {
      if (source_[pos_] == '\n') {
        ++line_;
        column_ = 1;
      } else {
        ++column_;
      }
      ++pos_;
    }
  }

  bool tryskipwhitespace() {
    if (ignore_newlines_) {
      size_t start = pos_;
      while (pos_ < source_.size() && std::isspace(static_cast<unsigned char>(source_[pos_]))) {
        if (source_[pos_] == '\n') {
          ++line_;
          column_ = 1;
        } else {
          ++column_;
        }
        ++pos_;
      }
      return pos_ > start;
    }
    if (pos_ < source_.size() && source_[pos_] == ' ') {
      while (pos_ < source_.size() && source_[pos_] == ' ') {
        ++pos_;
        ++column_;
      }
      return true;
    }
    return false;
  }

  bool scanat(size_t at) {
    pos_ = at;
    if (!ignore_newlines_) {
      if (matchtext(at)) return true;
      if (matchstat(at)) return true;
      if (matchcommandplay(at)) return true;
      if (matchcommandtoast(at)) return true;
      if (matchcommandticker(at)) return true;
      if (matchcommand(at)) return true;
      if (matchcomment(at)) return true;
      if (matchlabel(at)) return true;
      if (matchhyperlink(at)) return true;
      if (matchhyperlinktext(at)) return true;
      if (matchnewline(at)) return true;
    }
    if (matchdirdown(at)) return true;
    if (!ignore_newlines_) {
      if (matchcommandbreak(at)) return true;
      if (matchcommandcontinue(at)) return true;
      if (matchcommanddone(at)) return true;
      if (matchcommanddo(at)) return true;
      if (matchcommandelse(at)) return true;
      if (matchcommandforeach(at)) return true;
      if (matchcommandif(at)) return true;
      if (matchcommandrepeat(at)) return true;
      if (matchcommandwaitfor(at)) return true;
      if (matchcommandwhile(at)) return true;
    }
    if (matchnumber(at)) return true;
    if (matchkeywords(at)) return true;
    if (matchstringdouble(at)) return true;
    if (matchstring(at)) return true;
    return false;
  }

  void synclinecol(size_t offset) {
    line_ = 1;
    column_ = 1;
    for (size_t i = 0; i < offset && i < source_.size(); ++i) {
      if (source_[i] == '\n') {
        ++line_;
        column_ = 1;
      } else {
        ++column_;
      }
    }
  }

  bool consume(TokenKind kind, size_t start, size_t end) {
    synclinecol(start);
    int startline = line_;
    int startcol = column_;
    synclinecol(end);
    Token tok;
    tok.kind = kind;
    tok.image = source_.substr(start, end - start);
    tok.loc.start_offset = static_cast<int>(start);
    tok.loc.end_offset = static_cast<int>(end);
    tok.loc.start_line = startline;
    tok.loc.start_column = startcol;
    tok.loc.end_line = line_;
    tok.loc.end_column = column_;
    tokens_.push_back(std::move(tok));
    pos_ = end;
    return true;
  }

  bool matchnewline(size_t at) {
    if (at >= source_.size()) return false;
    char c = source_[at];
    if (c == '\n') {
      consume(TokenKind::NEWLINE, at, at + 1);
      return true;
    }
    if (c == '\r') {
      size_t end = at + 1;
      if (end < source_.size() && source_[end] == '\n') ++end;
      consume(TokenKind::NEWLINE, at, end);
      return true;
    }
    return false;
  }

  bool matchstat(size_t at) {
    if (at >= source_.size() || source_[at] != '@') return false;
    size_t end = at + 1;
    while (end < source_.size() && source_[end] != '\n') ++end;
    return consume(TokenKind::STAT, at, end);
  }

  bool matchcommand(size_t at) {
    if (at >= source_.size() || source_[at] != '#') return false;
    return consume(TokenKind::COMMAND, at, at + 1);
  }

  bool matchcomment(size_t at) {
    if (at >= source_.size() || source_[at] != '\'') return false;
    size_t end = at + 1;
    while (end < source_.size() && source_[end] != '\n') ++end;
    return consume(TokenKind::COMMENT, at, end);
  }

  bool matchhyperlink(size_t at) {
    if (at >= source_.size() || source_[at] != '!') return false;
    size_t end = at + 1;
    while (end < source_.size() && source_[end] != ';' && source_[end] != '\n') ++end;
    return consume(TokenKind::HYPERLINK, at, end);
  }

  bool matchhyperlinktext(size_t at) {
    if (at >= source_.size() || source_[at] != ';') return false;
    size_t end = at + 1;
    while (end < source_.size() && source_[end] != ';' && source_[end] != '\n') ++end;
    return consume(TokenKind::HYPERLINKTEXT, at, end);
  }

  bool matchlabel(size_t at) {
    if (at >= source_.size() || source_[at] != ':') return false;
    bool atlinestart = at == 0 || source_[at - 1] == '\n';
    size_t end = at + 1;
    if (atlinestart) {
      while (end < source_.size() && source_[end] != '\n') ++end;
    } else {
      while (end < source_.size() && source_[end] != ' ' && source_[end] != '\n') ++end;
    }
    return consume(TokenKind::LABEL, at, end);
  }

  bool matchcommandplay(size_t at) {
    static const char* cmds[] = {
        "bgplayon1n", "bgplayon2n", "bgplayon4n", "bgplayon8n", "bgplayon16n",
        "bgplayon32n", "bgplayon64n", "bgplay", "play", nullptr};
    for (int i = 0; cmds[i]; ++i) {
      if (matchwordline(at, cmds[i])) {
        size_t end = at;
        while (end < source_.size() && source_[end] != '\n') ++end;
        return consume(TokenKind::COMMAND_PLAY, at, end);
      }
    }
    return false;
  }

  bool matchcommandtoast(size_t at) {
    if (!matchwordline(at, "toast")) return false;
    size_t end = at;
    while (end < source_.size() && source_[end] != '\n') ++end;
    return consume(TokenKind::COMMAND_TOAST, at, end);
  }

  bool matchcommandticker(size_t at) {
    if (!matchwordline(at, "ticker")) return false;
    size_t end = at;
    while (end < source_.size() && source_[end] != '\n') ++end;
    return consume(TokenKind::COMMAND_TICKER, at, end);
  }

  bool matchwordline(size_t at, const char* word) {
    size_t wlen = 0;
    while (word[wlen]) ++wlen;
    if (at + wlen > source_.size()) return false;
    if (!imatchword(source_.data() + at, wlen, word)) return false;
    if (at + wlen < source_.size()) {
      char next = source_[at + wlen];
      if (next != ' ' && next != '\n' && next != '\r' && next != '\t') return false;
    }
    return true;
  }

  bool matchword(size_t at, const char* word) {
    size_t wlen = 0;
    while (word[wlen]) ++wlen;
    if (at + wlen > source_.size()) return false;
    if (!imatchword(source_.data() + at, wlen, word)) return false;
    if (at + wlen < source_.size()) {
      char next = source_[at + wlen];
      if (std::isalnum(static_cast<unsigned char>(next)) || next == '_') return false;
    }
    return true;
  }

  bool matchcommandbreak(size_t at) { return matchword(at, "break") && consume(TokenKind::COMMAND_BREAK, at, wordend(at, "break")); }
  bool matchcommandcontinue(size_t at) { return matchword(at, "continue") && consume(TokenKind::COMMAND_CONTINUE, at, wordend(at, "continue")); }
  bool matchcommanddone(size_t at) { return matchword(at, "done") && consume(TokenKind::COMMAND_DONE, at, wordend(at, "done")); }
  bool matchcommandelse(size_t at) { return matchword(at, "else") && consume(TokenKind::COMMAND_ELSE, at, wordend(at, "else")); }
  bool matchcommandrepeat(size_t at) { return matchword(at, "repeat") && consume(TokenKind::COMMAND_REPEAT, at, wordend(at, "repeat")); }
  bool matchcommandwaitfor(size_t at) { return matchword(at, "waitfor") && consume(TokenKind::COMMAND_WAITFOR, at, wordend(at, "waitfor")); }
  bool matchcommandwhile(size_t at) { return matchword(at, "while") && consume(TokenKind::COMMAND_WHILE, at, wordend(at, "while")); }

  size_t wordend(size_t at, const char* word) {
    size_t wlen = 0;
    while (word[wlen]) ++wlen;
    return at + wlen;
  }

  bool matchcommandforeach(size_t at) {
    if (matchword(at, "foreach")) return consume(TokenKind::COMMAND_FOREACH, at, wordend(at, "foreach"));
    if (matchword(at, "for")) return consume(TokenKind::COMMAND_FOREACH, at, wordend(at, "for"));
    return false;
  }

  bool matchcommandif(size_t at) {
    static const char* words[] = {"if", "try", "take", "give", "duplicate", nullptr};
    for (int i = 0; words[i]; ++i) {
      if (matchword(at, words[i])) return consume(TokenKind::COMMAND_IF, at, wordend(at, words[i]));
    }
    return false;
  }

  bool matchcommanddo(size_t at) {
    if (!matchword(at, "do")) return false;
    if (at > 0) {
      std::string prefix = source_.substr(0, at);
      if (prefix.size() >= 4) {
        std::string tail = prefix.substr(prefix.size() - 4);
        if (iequals(tail, "zap ") || (prefix.size() >= 5 && iequals(prefix.substr(prefix.size() - 5), "send ")) ||
            (prefix.size() >= 8 && iequals(prefix.substr(prefix.size() - 8), "restore "))) {
          return false;
        }
      }
      char prev = source_[at - 1];
      if (prev != ' ' && prev != '\n' && prev != '\t') return false;
    }
    return consume(TokenKind::COMMAND_DO, at, wordend(at, "do"));
  }

  bool matchdirdown(size_t at) {
    return matchword(at, "down") && consume(TokenKind::WORD, at, wordend(at, "down"));
  }

  bool matchtext(size_t at) {
    if (textmatchdepth_ <= 0) return false;
    if (at > 0) {
      char prev = source_[at - 1];
      if (prev != ' ' && prev != '\n') return false;
    }
    size_t cursor = at;
    if (cursor < source_.size() && source_[cursor] == ' ') {
      while (cursor < source_.size() && source_[cursor] == ' ') ++cursor;
      if (cursor < source_.size() && std::string("@#/?':!\n").find(source_[cursor]) != std::string::npos) return false;
    }
    cursor = at;
    while (cursor > 0 && std::string("$\"@#':!/?\n").find(source_[cursor]) == std::string::npos) {
      --cursor;
    }
    char marker = cursor < source_.size() ? source_[cursor] : '\0';
    if (marker == '?' || marker == '/') {
      std::string prefix = source_.substr(cursor + 1, at - cursor);
      std::string lprefix = prefix;
      for (char& c : lprefix) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
      size_t sp = lprefix.find(' ');
      if (sp == std::string::npos || sp < 1) return false;
      static const char* complex[] = {"by", "at", "away", "toward", "find", "flee", "to", "cw", "ccw", "opp", "rndp", nullptr};
      for (int i = 0; complex[i]; ++i) {
        if (istartswith(lprefix, complex[i])) return false;
      }
    } else if (marker == '#' || marker == '@' || marker == '\'' || marker == ':' || marker == '!') {
      return false;
    } else if (marker == '"') {
      size_t bc = cursor;
      if (bc > 0) --bc;
      while (bc > 0 && source_[bc] == ' ') --bc;
      if (bc >= 1 && source_[bc] != '\n') return false;
    }
    size_t i = at;
    if (i < source_.size() && source_[i] == '"') ++i;
    while (i < source_.size() && source_[i] != '\n') ++i;
    std::string match = source_.substr(at, i - at);
    if (trim(match).empty()) return false;
    if (iequals(trim(match), "do")) return false;
    return consume(TokenKind::TEXT, at, i);
  }

  bool isstringchar(char c) {
    return c != '-' && !std::isdigit(static_cast<unsigned char>(c)) && c != '"' && c != '!' && c != ':' &&
           c != ';' && c != '@' && c != '#' && c != '/' && c != '?' && c != '(' && c != ')' && !std::isspace(c);
  }

  bool matchstringdouble(size_t at) {
    if (at >= source_.size() || source_[at] != '"') return false;
    size_t i = at + 1;
    while (i < source_.size()) {
      if (source_[i] == '"') {
        return consume(TokenKind::STRINGLITERALDOUBLE, at, i + 1);
      }
      if (source_[i] == '\\') {
        i += 2;
        continue;
      }
      ++i;
    }
    return false;
  }

  bool matchstring(size_t at) {
    if (at >= source_.size() || !isstringchar(source_[at])) return false;
    size_t i = at + 1;
    while (i < source_.size() && (isstringchar(source_[i]) || source_[i] == '-')) ++i;
    if (i == at + 1 && at + 1 <= source_.size()) {
      return consume(TokenKind::STRINGLITERAL, at, i);
    }
    if (i == at + 1) return false;
    return consume(TokenKind::STRINGLITERAL, at, i);
  }

  bool matchnumber(size_t at) {
    if (at >= source_.size()) return false;
    size_t i = at;
    if (source_[i] == '-') ++i;
    bool hasdot = false;
    while (i < source_.size() && std::isdigit(static_cast<unsigned char>(source_[i]))) ++i;
    if (i < source_.size() && source_[i] == '.') {
      hasdot = true;
      ++i;
      while (i < source_.size() && std::isdigit(static_cast<unsigned char>(source_[i]))) ++i;
    }
    if (i == at || (i == at + 1 && source_[at] == '-')) {
      if (!hasdot) return false;
    }
    if (i < source_.size() && (source_[i] == 'e' || source_[i] == 'E')) {
      ++i;
      if (i < source_.size() && (source_[i] == '+' || source_[i] == '-')) ++i;
      while (i < source_.size() && std::isdigit(static_cast<unsigned char>(source_[i]))) ++i;
    }
    if (i < source_.size() && (source_[i] == 'j' || source_[i] == 'J' || source_[i] == 'l' || source_[i] == 'L')) ++i;
    if (i <= at + (source_[at] == '-' ? 1u : 0u)) return false;
    return consume(TokenKind::NUMBERLITERAL, at, i);
  }

  bool matchcompare(size_t at, const char* pat, TokenKind kind) {
    size_t len = 0;
    while (pat[len]) ++len;
    if (at + len > source_.size()) return false;
    for (size_t i = 0; i < len; ++i) {
      char a = source_[at + i];
      char b = pat[i];
      if (std::tolower(static_cast<unsigned char>(a)) != std::tolower(static_cast<unsigned char>(b))) return false;
    }
    return consume(kind, at, at + len);
  }

  struct WordRule {
    const char* word;
    TokenKind kind;
  };

  bool matchkeywords(size_t at) {
    if (at >= source_.size()) return false;

    if (source_[at] == '|') return consume(TokenKind::STOP, at, at + 1);
    if (source_[at] == '+') return consume(TokenKind::PLUS, at, at + 1);
    if (source_[at] == '*') {
      if (at + 1 < source_.size() && source_[at + 1] == '*') return consume(TokenKind::POWER, at, at + 2);
      return consume(TokenKind::MULTIPLY, at, at + 1);
    }
    if (source_[at] == '%') {
      if (at + 1 < source_.size() && source_[at + 1] == '%') return consume(TokenKind::FLOORDIVIDE, at, at + 2);
      return consume(TokenKind::MODDIVIDE, at, at + 1);
    }
    if (source_[at] == '/') return consume(TokenKind::DIVIDE, at, at + 1);
    if (source_[at] == '?') return consume(TokenKind::QUERY, at, at + 1);
    if (source_[at] == '(') {
      ignore_newlines_ = true;
      return consume(TokenKind::LPAREN, at, at + 1);
    }
    if (source_[at] == ')') {
      ignore_newlines_ = false;
      return consume(TokenKind::RPAREN, at, at + 1);
    }
    if (source_[at] == '-') return consume(TokenKind::MINUS, at, at + 1);

    if (source_[at] == '=') return consume(TokenKind::ISEQ, at, at + 1);
    if (source_[at] == '<') {
      if (at + 1 < source_.size() && source_[at + 1] == '=') return consume(TokenKind::ISLESSTHANOREQUAL, at, at + 2);
      return consume(TokenKind::ISLESSTHAN, at, at + 1);
    }
    if (source_[at] == '>') {
      if (at + 1 < source_.size() && source_[at + 1] == '=') return consume(TokenKind::ISGREATERTHANOREQUAL, at, at + 2);
      return consume(TokenKind::ISGREATERTHAN, at, at + 1);
    }
    if (source_[at] == '!') {
      if (at + 1 < source_.size() && source_[at + 1] == '=') return consume(TokenKind::ISNOTEQ, at, at + 2);
    }

    static const WordRule rules[] = {
        {"isterrain", TokenKind::WORD}, {"isobject", TokenKind::WORD},
        {"issolid", TokenKind::WORD}, {"iswalkable", TokenKind::WORD}, {"iswalking", TokenKind::WORD},
        {"iswalk", TokenKind::WORD}, {"isswimmable", TokenKind::WORD}, {"isswimming", TokenKind::WORD},
        {"isswim", TokenKind::WORD}, {"isbullet", TokenKind::WORD}, {"isghost", TokenKind::WORD},
        {"black", TokenKind::WORD}, {"dkblue", TokenKind::WORD}, {"dkgreen", TokenKind::WORD},
        {"dkcyan", TokenKind::WORD}, {"dkred", TokenKind::WORD}, {"dkpurple", TokenKind::WORD},
        {"dkyellow", TokenKind::WORD}, {"ltgray", TokenKind::WORD}, {"dkgray", TokenKind::WORD},
        {"blue", TokenKind::WORD}, {"green", TokenKind::WORD}, {"cyan", TokenKind::WORD},
        {"red", TokenKind::WORD}, {"purple", TokenKind::WORD}, {"yellow", TokenKind::WORD},
        {"white", TokenKind::WORD}, {"brown", TokenKind::WORD}, {"dkwhite", TokenKind::WORD},
        {"ltgrey", TokenKind::WORD}, {"gray", TokenKind::WORD}, {"grey", TokenKind::WORD},
        {"dkgrey", TokenKind::WORD}, {"ltblack", TokenKind::WORD},
        {"onblack", TokenKind::WORD}, {"ondkblue", TokenKind::WORD}, {"ondkgreen", TokenKind::WORD},
        {"ondkcyan", TokenKind::WORD}, {"ondkred", TokenKind::WORD}, {"ondkpurple", TokenKind::WORD},
        {"ondkyellow", TokenKind::WORD}, {"onltgray", TokenKind::WORD}, {"ondkgray", TokenKind::WORD},
        {"onblue", TokenKind::WORD}, {"ongreen", TokenKind::WORD}, {"oncyan", TokenKind::WORD},
        {"onred", TokenKind::WORD}, {"onpurple", TokenKind::WORD}, {"onyellow", TokenKind::WORD},
        {"onwhite", TokenKind::WORD}, {"onbrown", TokenKind::WORD}, {"ondkwhite", TokenKind::WORD},
        {"onltgrey", TokenKind::WORD}, {"ongray", TokenKind::WORD}, {"ongrey", TokenKind::WORD},
        {"ondkgrey", TokenKind::WORD}, {"onltblack", TokenKind::WORD}, {"onclear", TokenKind::WORD},
        {"blblack", TokenKind::WORD}, {"bldkblue", TokenKind::WORD}, {"bldkgreen", TokenKind::WORD},
        {"bldkcyan", TokenKind::WORD}, {"bldkred", TokenKind::WORD}, {"bldkpurple", TokenKind::WORD},
        {"bldkyellow", TokenKind::WORD}, {"blltgray", TokenKind::WORD}, {"bldkgray", TokenKind::WORD},
        {"blblue", TokenKind::WORD}, {"blgreen", TokenKind::WORD}, {"blcyan", TokenKind::WORD},
        {"blred", TokenKind::WORD}, {"blpurple", TokenKind::WORD}, {"blyellow", TokenKind::WORD},
        {"blwhite", TokenKind::WORD}, {"blbrown", TokenKind::WORD}, {"bldkwhite", TokenKind::WORD},
        {"blltgrey", TokenKind::WORD}, {"blgray", TokenKind::WORD}, {"blgrey", TokenKind::WORD},
        {"bldkgrey", TokenKind::WORD}, {"blltblack", TokenKind::WORD},
        {"idle", TokenKind::WORD}, {"up", TokenKind::WORD}, {"left", TokenKind::WORD}, {"right", TokenKind::WORD},
        {"by", TokenKind::WORD}, {"at", TokenKind::WORD}, {"flow", TokenKind::WORD}, {"seek", TokenKind::WORD},
        {"rndp", TokenKind::WORD}, {"rndns", TokenKind::WORD}, {"rndne", TokenKind::WORD}, {"rnd", TokenKind::WORD},
        {"cw", TokenKind::WORD}, {"ccw", TokenKind::WORD}, {"opp", TokenKind::WORD},
        {"within", TokenKind::WORD}, {"awayby", TokenKind::WORD}, {"elements", TokenKind::WORD},
        {"select", TokenKind::WORD}, {"flood", TokenKind::WORD}, {"beam", TokenKind::WORD},
        {"away", TokenKind::WORD}, {"toward", TokenKind::WORD}, {"find", TokenKind::WORD}, {"flee", TokenKind::WORD},
        {"to", TokenKind::WORD}, {"north", TokenKind::WORD}, {"south", TokenKind::WORD},
        {"west", TokenKind::WORD}, {"east", TokenKind::WORD}, {"over", TokenKind::WORD},
        {"under", TokenKind::WORD}, {"ground", TokenKind::WORD},
        {"aligned", TokenKind::WORD}, {"alligned", TokenKind::WORD}, {"contact", TokenKind::WORD},
        {"blocked", TokenKind::WORD}, {"any", TokenKind::WORD}, {"countof", TokenKind::WORD},
        {"abs", TokenKind::WORD}, {"intceil", TokenKind::WORD}, {"intfloor", TokenKind::WORD},
        {"intround", TokenKind::WORD}, {"clamp", TokenKind::WORD}, {"min", TokenKind::WORD}, {"max", TokenKind::WORD},
        {"pickwith", TokenKind::WORD}, {"pick", TokenKind::WORD}, {"randomwith", TokenKind::WORD},
        {"random", TokenKind::WORD}, {"runwith", TokenKind::WORD}, {"run", TokenKind::WORD},
        {"not eq", TokenKind::ISNOTEQ}, {"noteq", TokenKind::ISNOTEQ}, {"notequal", TokenKind::ISNOTEQ},
        {"not equal", TokenKind::ISNOTEQ},
        {"below or eq", TokenKind::ISLESSTHANOREQUAL}, {"below or equal", TokenKind::ISLESSTHANOREQUAL},
        {"beloworeq", TokenKind::ISLESSTHANOREQUAL}, {"below", TokenKind::ISLESSTHAN},
        {"above or eq", TokenKind::ISGREATERTHANOREQUAL}, {"above or equal", TokenKind::ISGREATERTHANOREQUAL},
        {"aboveoreq", TokenKind::ISGREATERTHANOREQUAL}, {"above", TokenKind::ISGREATERTHAN},
        {"equal", TokenKind::ISEQ}, {"eq", TokenKind::ISEQ}, {"is", TokenKind::ISEQ},
        {"or", TokenKind::OR}, {"not", TokenKind::NOT}, {"and", TokenKind::AND},
        {"i", TokenKind::WORD}, {"u", TokenKind::WORD}, {"n", TokenKind::WORD}, {"d", TokenKind::WORD},
        {"s", TokenKind::WORD}, {"l", TokenKind::WORD}, {"w", TokenKind::WORD}, {"r", TokenKind::WORD},
        {"e", TokenKind::WORD},
        {nullptr, TokenKind::WORD},
    };

    for (const WordRule* rule = rules; rule->word; ++rule) {
      if (matchword(at, rule->word)) {
        return consume(rule->kind, at, wordend(at, rule->word));
      }
    }
    return false;
  }

  void append_trailing_newline() {
    if (tokens_.empty() || tokens_.back().kind != TokenKind::NEWLINE) {
      Token tok;
      tok.kind = TokenKind::NEWLINE;
      tok.image = "\n";
      tokens_.push_back(std::move(tok));
    }
  }
};

}  // namespace zss_lang

#endif
