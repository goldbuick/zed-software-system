#ifndef ZSS_LANG_PARSER_HPP
#define ZSS_LANG_PARSER_HPP

#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "zss_lang_ast.hpp"
#include "zss_lang_lexer.hpp"
#include "zss_lang_util.hpp"

namespace zss_lang {

class Parser {
 public:
  explicit Parser(std::vector<Token> tokens) : tokens_(std::move(tokens)) {}

  std::unique_ptr<CodeNode> parseprogram() {
    unique_ = 0;
    auto program = make_node(NODE::PROGRAM);
    auto restartlabel = makelabelnode("restart", true);
    auto restartline = makelinenode(std::vector<std::unique_ptr<CodeNode>>());
    restartline->stmts.push_back(std::move(restartlabel));
    program->lines.push_back(std::move(restartline));
    while (!atend() && !check(TokenKind::END)) {
      auto lines = parseline();
      for (auto& ln : lines) {
        if (program->lines.size() == 1 && hasfirststmtloc_) {
          program->loc = firststmtloc_;
        }
        program->lines.push_back(std::move(ln));
      }
    }
    return program;
  }

 private:
  std::vector<Token> tokens_;
  size_t index_ = 0;
  int unique_ = 0;
  Location firststmtloc_;
  bool hasfirststmtloc_ = false;
  bool hasscopedloc_ = false;
  Location scopedloc_;
  std::vector<Location> scopedlocstack_;

  void pushscopedloc(const Location& loc) {
    if (hasscopedloc_) scopedlocstack_.push_back(scopedloc_);
    scopedloc_ = loc;
    hasscopedloc_ = true;
  }

  void popscopedloc() {
    if (scopedlocstack_.empty()) {
      hasscopedloc_ = false;
      return;
    }
    scopedloc_ = scopedlocstack_.back();
    scopedlocstack_.pop_back();
  }

  void applyruleloc(CodeNode* node) const {
    if (!node || !hasscopedloc_) return;
    node->loc = scopedloc_;
  }

  const Token& peek(int offset = 0) const {
    size_t i = index_ + static_cast<size_t>(offset);
    if (i >= tokens_.size()) {
      static Token endtok;
      endtok.kind = TokenKind::END;
      return endtok;
    }
    return tokens_[i];
  }

  bool atend() const { return index_ >= tokens_.size(); }

  bool check(TokenKind kind) const { return peek().kind == kind; }

  Token lasttoken_;

  void setloc(CodeNode* node) {
    if (!node) return;
    node->loc = lasttoken_.loc;
  }

  Token advance() {
    if (atend()) return peek();
    lasttoken_ = tokens_[index_++];
    return lasttoken_;
  }

  bool match(TokenKind kind) {
    if (check(kind)) {
      advance();
      return true;
    }
    return false;
  }

  Location curloc() const {
    const Token& t = peek();
    return t.loc;
  }

  std::string tokenstr(const Token& t) {
    std::string s = trimstart(t.image);
    if (s.size() >= 2 && s.front() == '"' && s.back() == '"') {
      return s.substr(1, s.size() - 2);
    }
    return s;
  }

  std::unique_ptr<CodeNode> makelabelnode(const std::string& name, bool active) {
    auto node = make_node(NODE::LABEL);
    node->name = name;
    node->active = active;
    return node;
  }

  std::unique_ptr<CodeNode> makelinenode(std::vector<std::unique_ptr<CodeNode>> stmts,
                                         const Location* loc = nullptr) {
    auto line = make_node(NODE::LINE);
    line->stmts = std::move(stmts);
    if (loc) {
      line->loc = *loc;
    } else {
      setloc(line.get());
    }
    return line;
  }

  std::unique_ptr<CodeNode> makelinenode1(std::unique_ptr<CodeNode> stmt, const Location* loc = nullptr) {
    std::vector<std::unique_ptr<CodeNode>> stmts;
    stmts.push_back(std::move(stmt));
    return makelinenode(std::move(stmts), loc);
  }

  std::unique_ptr<CodeNode> makeapinode(const Location& loc, const std::string& method,
                                        std::vector<std::unique_ptr<CodeNode>> words) {
    auto api = make_node(NODE::API);
    api->method = method;
    api->words = std::move(words);
    api->loc = loc;
    return makelinenode1(std::move(api), &loc);
  }

  std::unique_ptr<CodeNode> makelogicnode(const std::string& method, const std::string& skip,
                                          std::vector<std::unique_ptr<CodeNode>> words,
                                          const Location* loc = nullptr) {
    auto node = make_node(NODE::IF_CHECK);
    node->method = method;
    node->skip = skip;
    node->words = std::move(words);
    if (loc) {
      node->loc = *loc;
    } else {
      applyruleloc(node.get());
    }
    const Location* useloc = loc ? loc : (hasscopedloc_ ? &scopedloc_ : nullptr);
    return makelinenode1(std::move(node), useloc);
  }

  std::unique_ptr<CodeNode> createmarknode(const Location& loc, const std::string& id, const std::string& comment) {
    auto node = make_node(NODE::MARK);
    node->id = id;
    node->comment = comment;
    node->loc = loc;
    return makelinenode1(std::move(node), &loc);
  }

  std::unique_ptr<CodeNode> creategotonode(const Location& loc, const std::string& id, const std::string& comment) {
    auto node = make_node(NODE::GOTO);
    node->id = id;
    node->comment = comment;
    node->loc = loc;
    return makelinenode1(std::move(node), &loc);
  }

  std::unique_ptr<CodeNode> createcountnode(const Location& loc) {
    auto node = make_node(NODE::COUNT);
    node->index = unique_++;
    node->loc = loc;
    return node;
  }

  std::unique_ptr<CodeNode> createstringnode(const std::string& value) {
    auto node = make_node(NODE::LITERAL);
    node->literal_kind = LITERAL::STRING;
    node->value = value;
    setloc(node.get());
    return node;
  }

  std::unique_ptr<CodeNode> createtemplatenode(const std::string& value) {
    auto node = make_node(NODE::LITERAL);
    node->literal_kind = LITERAL::TEMPLATE;
    node->value = value;
    return node;
  }

  std::unique_ptr<CodeNode> createnumbernode(double value) {
    auto node = make_node(NODE::LITERAL);
    node->literal_kind = LITERAL::NUMBER;
    node->number_value = value;
    setloc(node.get());
    return node;
  }

  std::unique_ptr<CodeNode> createexprondemand(std::vector<std::unique_ptr<CodeNode>> nodes) {
    if (nodes.size() == 1) {
      return std::move(nodes[0]);
    }
    auto node = make_node(NODE::EXPR);
    node->words = std::move(nodes);
    return node;
  }

  std::vector<std::unique_ptr<CodeNode>> wrapnode(std::unique_ptr<CodeNode> node) {
    std::vector<std::unique_ptr<CodeNode>> out;
    out.push_back(std::move(node));
    return out;
  }

  std::vector<std::unique_ptr<CodeNode>> parseline() {
    if (check(TokenKind::NEWLINE)) {
      advance();
      return std::vector<std::unique_ptr<CodeNode>>();
    }
    if (atend()) {
      return std::vector<std::unique_ptr<CodeNode>>();
    }
    return parsestmt();
  }

  std::vector<std::unique_ptr<CodeNode>> parsestmt() {
    if (check(TokenKind::LABEL)) {
      Token t = advance();
      std::string name = tokenstr(t);
      if (!name.empty() && name[0] == ':') name = trim(name.substr(1));
      auto label = makelabelnode(name, true);
      label->loc = t.loc;
      return wrapnode(makelinenode1(std::move(label), &t.loc));
    }
    if (check(TokenKind::STAT)) {
      Token t = advance();
      std::string val = tokenstr(t);
      if (!val.empty() && val[0] == '@') val = val.substr(1);
      auto node = make_node(NODE::STAT);
      node->value = val;
      node->loc = t.loc;
      return wrapnode(makelinenode1(std::move(node), &t.loc));
    }
    if (check(TokenKind::TEXT)) {
      Token t = advance();
      auto node = make_node(NODE::TEXT);
      node->value = t.image;
      setloc(node.get());
      return wrapnode(makelinenode1(std::move(node)));
    }
    if (check(TokenKind::COMMENT)) {
      Token t = advance();
      std::string val = tokenstr(t);
      if (!val.empty() && val[0] == '\'') val = trim(val.substr(1));
      auto label = makelabelnode(val, false);
      label->loc = t.loc;
      return wrapnode(makelinenode1(std::move(label), &t.loc));
    }
    if (check(TokenKind::HYPERLINK)) {
      Token h = advance();
      Token ht = advance();
      std::string link = tokenstr(h);
      if (!link.empty() && link[0] == '!') link = link.substr(1);
      std::string text = tokenstr(ht);
      if (!text.empty() && text[0] == ';') text = text.substr(1);
      auto node = make_node(NODE::HYPERLINK);
      node->link = link;
      node->text = text;
      return wrapnode(makelinenode1(std::move(node)));
    }
    if (check(TokenKind::COMMAND)) {
      return parsestmtcommand();
    }
    if (check(TokenKind::DIVIDE)) {
      return parseshortgo();
    }
    if (check(TokenKind::QUERY)) {
      return parseshorttry();
    }
    if (check(TokenKind::NEWLINE)) {
      advance();
    }
    return std::vector<std::unique_ptr<CodeNode>>();
  }

  std::vector<std::unique_ptr<CodeNode>> parsestmtcommand() {
    Token hash = advance();  // #
    hasfirststmtloc_ = true;
    firststmtloc_ = hash.loc;
    if (isstructured()) {
      return parsestructured();
    }
    auto words = parsewords();
    auto node = make_node(NODE::COMMAND);
    node->words = std::move(words);
    node->loc = hash.loc;
    return wrapnode(makelinenode1(std::move(node), &hash.loc));
  }

  bool isstructured() const {
    TokenKind k = peek().kind;
    return k == TokenKind::COMMAND_IF || k == TokenKind::COMMAND_WHILE ||
           k == TokenKind::COMMAND_REPEAT || k == TokenKind::COMMAND_WAITFOR ||
           k == TokenKind::COMMAND_FOREACH || k == TokenKind::COMMAND_BREAK ||
           k == TokenKind::COMMAND_CONTINUE;
  }

  std::vector<std::unique_ptr<CodeNode>> single(std::unique_ptr<CodeNode> node) {
    std::vector<std::unique_ptr<CodeNode>> v;
    v.push_back(std::move(node));
    return v;
  }

  std::unique_ptr<CodeNode> parsebreaknode() {
    Token t = advance();
    auto node = make_node(NODE::BREAK);
    node->loc = t.loc;
    return node;
  }

  std::unique_ptr<CodeNode> parsecontinuenode() {
    Token t = advance();
    auto node = make_node(NODE::CONTINUE);
    node->loc = t.loc;
    return node;
  }

  std::vector<std::unique_ptr<CodeNode>> parsestructured() {
    TokenKind k = peek().kind;
    if (k == TokenKind::COMMAND_IF) return wrapnode(parsecommandif());
    if (k == TokenKind::COMMAND_WHILE) return wrapnode(parsecommandwhile());
    if (k == TokenKind::COMMAND_REPEAT) return wrapnode(parsecommandrepeat());
    if (k == TokenKind::COMMAND_WAITFOR) return wrapnode(parsecommandwaitfor());
    if (k == TokenKind::COMMAND_FOREACH) return wrapnode(parsecommandforeach());
    if (k == TokenKind::COMMAND_BREAK) {
      auto br = parsebreaknode();
      return wrapnode(makelinenode(single(std::move(br))));
    }
    if (k == TokenKind::COMMAND_CONTINUE) {
      auto co = parsecontinuenode();
      return wrapnode(makelinenode(single(std::move(co))));
    }
    return {};
  }

  std::vector<std::unique_ptr<CodeNode>> parseshortgo() {
    Token slash = advance();  // /
    Location loc = slash.loc;
    std::vector<std::unique_ptr<CodeNode>> words;
    if (check(TokenKind::STRINGLITERAL) || check(TokenKind::STRINGLITERALDOUBLE)) {
      words.push_back(parsestringtoken());
    } else {
      words = parsedir();
    }
    auto node = make_node(NODE::MOVE);
    node->wait = true;
    node->words = std::move(words);
    node->loc = loc;
    return wrapnode(makelinenode1(std::move(node), &loc));
  }

  std::vector<std::unique_ptr<CodeNode>> parseshorttry() {
    Token query = advance();  // ?
    Location loc = query.loc;
    std::vector<std::unique_ptr<CodeNode>> words;
    if (check(TokenKind::STRINGLITERAL) || check(TokenKind::STRINGLITERALDOUBLE)) {
      words.push_back(parsestringtoken());
    } else {
      words = parsedir();
    }
    auto node = make_node(NODE::MOVE);
    node->wait = false;
    node->words = std::move(words);
    node->loc = loc;
    return wrapnode(makelinenode1(std::move(node), &loc));
  }

  std::unique_ptr<CodeNode> parsecommandif() {
    Token iftok = advance();
    Location ifloc = iftok.loc;
    pushscopedloc(ifloc);
    auto checkwords = parsewords();
    popscopedloc();
    auto checkline = makelogicnode(namestr(tokenstr(iftok)), "", std::move(checkwords), &ifloc);
    auto block = parsecommandifblock();
    auto node = make_node(NODE::IF);
    node->loc = ifloc;
    node->check = std::move(checkline);
    if (block) node->block = std::move(block);
    return node;
  }

  void appendinlinetoblock(std::vector<std::unique_ptr<CodeNode>>& dest) {
    auto inlinestmts = parseinline();
    for (auto& item : inlinestmts) {
      if (item->type == NODE::LINE && item->stmts.size() == 1 &&
          (item->stmts[0]->type == NODE::BREAK || item->stmts[0]->type == NODE::CONTINUE)) {
        dest.push_back(std::move(item->stmts[0]));
      } else {
        dest.push_back(std::move(item));
      }
    }
  }

  std::unique_ptr<CodeNode> parsecommandifblock() {
    if (!isinlinestart() && !check(TokenKind::COMMAND_DO)) {
      return nullptr;
    }
    Location blockloc = curloc();
    std::string skip = createsid();
    std::string done = createsid();
    auto block = make_node(NODE::IF_BLOCK);
    block->skip = skip;
    block->done = done;
    block->loc = blockloc;

    if (isinlinestart()) {
      appendinlinetoblock(block->lines);
    } else if (check(TokenKind::COMMAND_DO)) {
      advance();
      while (!atend() && !check(TokenKind::COMMAND) && !check(TokenKind::NEWLINE)) {
        auto ln = parseline();
        for (auto& l : ln) block->lines.push_back(std::move(l));
      }
      while (check(TokenKind::NEWLINE)) advance();
      if (check(TokenKind::COMMAND)) advance();
      if (check(TokenKind::COMMAND_DONE)) advance();
    }

    block->lines.push_back(creategotonode(blockloc, done, "end of if"));
    block->lines.push_back(createmarknode(blockloc, skip, "alt logic"));

    while (check(TokenKind::COMMAND) && peek(1).kind == TokenKind::COMMAND_ELSE &&
           peek(2).kind == TokenKind::COMMAND_IF) {
      block->altlines.push_back(parsecommandelseif());
    }
    if (check(TokenKind::COMMAND) && peek(1).kind == TokenKind::COMMAND_ELSE) {
      block->altlines.push_back(parsecommandelse());
    }
    block->altlines.push_back(createmarknode(blockloc, done, "end of if"));
    return block;
  }

  std::unique_ptr<CodeNode> parsecommandelseif() {
    advance();  // #
    advance();  // else
    Token iftok = advance();  // if
    Location loc = iftok.loc;
    pushscopedloc(loc);
    auto words = parsewords();
    popscopedloc();
    std::string skip = createsid();
    std::string done = createsid();
    auto node = make_node(NODE::ELSE_IF);
    node->done = done;
    node->loc = loc;
    auto logic = makelogicnode("if", skip, std::move(words), &loc);
    node->lines.push_back(std::move(logic));
    Location blockloc = isinlinestart() ? curloc() : loc;
    if (isinlinestart() || check(TokenKind::COMMAND_DO)) {
      auto fork = parsecommandfork();
      for (auto& l : fork) node->lines.push_back(std::move(l));
    }
    node->lines.push_back(creategotonode(blockloc, done, "end of if"));
    node->lines.push_back(createmarknode(blockloc, skip, "skip"));
    return node;
  }

  std::unique_ptr<CodeNode> parsecommandelse() {
    advance();  // #
    advance();  // else
    auto node = make_node(NODE::ELSE);
    if (!check(TokenKind::NEWLINE) && !check(TokenKind::COMMAND_DONE) && !atend()) {
      auto words = parsewords();
      auto cmd = make_node(NODE::COMMAND);
      cmd->words = std::move(words);
      node->lines.push_back(makelinenode1(std::move(cmd)));
    }
    if (isinlinestart() || check(TokenKind::COMMAND_DO)) {
      auto fork = parsecommandfork();
      for (auto& l : fork) node->lines.push_back(std::move(l));
    }
    return node;
  }

  std::vector<std::unique_ptr<CodeNode>> parsecommandfork() {
    if (isinlinestart()) return parseinline();
    if (check(TokenKind::COMMAND_DO)) {
      advance();
      std::vector<std::unique_ptr<CodeNode>> lines;
      while (!atend() && !check(TokenKind::COMMAND) && !check(TokenKind::NEWLINE)) {
        auto ln = parseline();
        for (auto& l : ln) lines.push_back(std::move(l));
      }
      return lines;
    }
    return {};
  }

  std::unique_ptr<CodeNode> parsecommandblock() {
    if (isinlinestart()) {
      auto lines = parseinline();
      auto wrapper = make_node(NODE::LINE);
      for (auto& l : lines) {
        for (auto& s : l->stmts) wrapper->stmts.push_back(std::move(s));
      }
      return wrapper;
    }
    if (check(TokenKind::COMMAND_DO)) {
      advance();
      auto block = make_node(NODE::LINE);
      while (!atend() && !(check(TokenKind::COMMAND) && peek(1).kind == TokenKind::COMMAND_DONE)) {
        auto ln = parseline();
        for (auto& l : ln) {
          for (auto& s : l->stmts) block->stmts.push_back(std::move(s));
        }
      }
      if (check(TokenKind::COMMAND)) advance();
      if (check(TokenKind::COMMAND_DONE)) advance();
      return block;
    }
    return make_node(NODE::LINE);
  }

  void appendblocklines(std::vector<std::unique_ptr<CodeNode>>& dest) {
    if (isinlinestart()) {
      appendinlinetoblock(dest);
      return;
    }
    if (check(TokenKind::COMMAND_DO)) {
      advance();
      while (!atend() && !(check(TokenKind::COMMAND) && peek(1).kind == TokenKind::COMMAND_DONE)) {
        auto ln = parseline();
        for (auto& l : ln) dest.push_back(std::move(l));
      }
      if (check(TokenKind::COMMAND)) advance();
      if (check(TokenKind::COMMAND_DONE)) advance();
    }
  }

  std::unique_ptr<CodeNode> parsecommandwhile() {
    Token cmdtok = advance();
    Location loc = cmdtok.loc;
    pushscopedloc(loc);
    auto words = parsewords();
    popscopedloc();
    std::string loop = createsid();
    std::string done = createsid();
    auto node = make_node(NODE::WHILE);
    node->loop = loop;
    node->done = done;
    node->loc = loc;
    node->lines.push_back(createmarknode(loc, loop, "start of while"));
    auto logic = makelogicnode("if", done, std::move(words), &loc);
    node->lines.push_back(std::move(logic));
    appendblocklines(node->lines);
    node->lines.push_back(creategotonode(loc, loop, "loop of while"));
    node->lines.push_back(createmarknode(loc, done, "end of while"));
    return node;
  }

  std::unique_ptr<CodeNode> parsecommandrepeat() {
    Token cmdtok = advance();
    Location loc = cmdtok.loc;
    pushscopedloc(loc);
    auto words = parsewords();
    popscopedloc();
    std::string loop = createsid();
    std::string done = createsid();
    auto index = createcountnode(loc);
    std::vector<std::unique_ptr<CodeNode>> args;
    args.push_back(std::move(index));
    for (auto& w : words) args.push_back(std::move(w));
    auto node = make_node(NODE::REPEAT);
    node->loop = loop;
    node->done = done;
    node->loc = loc;
    node->lines.push_back(makeapinode(loc, "repeatstart", clone_nodes(args)));
    node->lines.push_back(createmarknode(loc, loop, "start of repeat"));
    node->lines.push_back(makelogicnode("repeat", done, clone_nodes(args), &loc));
    appendblocklines(node->lines);
    node->lines.push_back(creategotonode(loc, loop, "loop of repeat"));
    node->lines.push_back(createmarknode(loc, done, "end of repeat"));
    return node;
  }

  std::unique_ptr<CodeNode> parsecommandforeach() {
    Token cmdtok = advance();
    Location loc = cmdtok.loc;
    pushscopedloc(loc);
    auto words = parsewords();
    popscopedloc();
    std::string loop = createsid();
    std::string done = createsid();
    auto index = createcountnode(loc);
    std::vector<std::unique_ptr<CodeNode>> args;
    args.push_back(std::move(index));
    for (auto& w : words) args.push_back(std::move(w));
    auto node = make_node(NODE::FOREACH);
    node->loop = loop;
    node->done = done;
    node->loc = loc;
    node->lines.push_back(makeapinode(loc, "foreachstart", clone_nodes(args)));
    node->lines.push_back(createmarknode(loc, loop, "start of foreach"));
    node->lines.push_back(makelogicnode("foreach", done, clone_nodes(args), &loc));
    appendblocklines(node->lines);
    node->lines.push_back(creategotonode(loc, loop, "loop of foreach"));
    node->lines.push_back(createmarknode(loc, done, "end of foreach"));
    return node;
  }

  std::unique_ptr<CodeNode> parsecommandwaitfor() {
    Token cmdtok = advance();
    Location loc = cmdtok.loc;
    pushscopedloc(loc);
    auto words = parsewords();
    popscopedloc();
    std::string loop = createsid();
    auto node = make_node(NODE::WAITFOR);
    node->loop = loop;
    node->loc = loc;
    node->lines.push_back(createmarknode(loc, loop, "start of waitfor"));
    node->lines.push_back(makelogicnode("waitfor", loop, std::move(words), &loc));
    appendblocklines(node->lines);
    return node;
  }

  std::vector<std::unique_ptr<CodeNode>> clone_nodes(const std::vector<std::unique_ptr<CodeNode>>& src) {
    std::vector<std::unique_ptr<CodeNode>> out;
    for (const auto& n : src) {
      if (n) out.push_back(clone_node(n.get()));
    }
    return out;
  }

  std::unique_ptr<CodeNode> clone_node(const CodeNode* n) {
    auto c = make_node(n->type);
    c->literal_kind = n->literal_kind;
    c->value = n->value;
    c->number_value = n->number_value;
    c->index = n->index;
    c->operator_kind = n->operator_kind;
    c->compare_method = n->compare_method;
    c->loc = n->loc;
    return c;
  }

  bool isinlinestart() const {
    TokenKind k = peek().kind;
    return k == TokenKind::STAT || k == TokenKind::TEXT || k == TokenKind::COMMENT ||
           k == TokenKind::HYPERLINK || k == TokenKind::COMMAND || k == TokenKind::DIVIDE ||
           k == TokenKind::QUERY || isstructured();
  }

  std::vector<std::unique_ptr<CodeNode>> parseinline() {
    std::vector<std::unique_ptr<CodeNode>> result;
    while (isinlinestart()) {
      if (check(TokenKind::COMMAND_BREAK)) {
        result.push_back(parsebreaknode());
        continue;
      }
      if (check(TokenKind::COMMAND_CONTINUE)) {
        result.push_back(parsecontinuenode());
        continue;
      }
      if (isstructured()) {
        auto nodes = parsestructured();
        for (auto& n : nodes) result.push_back(std::move(n));
        continue;
      }
      auto stmts = parsestmt();
      for (auto& s : stmts) result.push_back(std::move(s));
    }
    return result;
  }

  bool iswordstop() const {
    if (atend() || check(TokenKind::NEWLINE)) return true;
    if (check(TokenKind::COMMAND_DO)) return true;
    if (check(TokenKind::COMMAND) && peek(1).kind == TokenKind::COMMAND_DONE) return true;
    TokenKind k = peek().kind;
    return k == TokenKind::COMMAND_BREAK || k == TokenKind::COMMAND_CONTINUE ||
           k == TokenKind::COMMAND_ELSE || k == TokenKind::COMMAND_DONE;
  }

  std::vector<std::unique_ptr<CodeNode>> parsewords() {
    std::vector<std::unique_ptr<CodeNode>> result;
    while (!iswordstop()) {
      auto multi = trytokenexprmulti();
      if (!multi.empty()) {
        for (auto& n : multi) result.push_back(std::move(n));
      } else {
        result.push_back(parseexpr());
      }
    }
    return result;
  }

  std::vector<std::unique_ptr<CodeNode>> trytokenexprmulti() {
    if (!check(TokenKind::WORD)) return {};
    std::string w = namestr(peek().image);
    if (w == "pick" || w == "min" || w == "max") {
      advance();
      std::vector<std::unique_ptr<CodeNode>> nodes;
      nodes.push_back(createstringnode(w));
      while (!atend() && !check(TokenKind::NEWLINE) && !iscompop(peek().kind) &&
             !check(TokenKind::OR) && !check(TokenKind::AND) && !check(TokenKind::RPAREN)) {
        nodes.push_back(parsesimpletoken());
      }
      return nodes;
    }
    return {};
  }

  std::unique_ptr<CodeNode> parseexpr() {
    auto lhs = parseandtest();
    std::vector<std::unique_ptr<CodeNode>> rhsitems;
    while (check(TokenKind::OR)) {
      advance();
      rhsitems.push_back(parseandtest());
    }
    if (rhsitems.empty()) return lhs;
    auto node = make_node(NODE::OR);
    node->items.push_back(std::move(lhs));
    for (auto& r : rhsitems) node->items.push_back(std::move(r));
    return node;
  }

  std::unique_ptr<CodeNode> parseandtest() {
    auto lhs = parsenottest();
    std::vector<std::unique_ptr<CodeNode>> rhsitems;
    while (check(TokenKind::AND)) {
      advance();
      rhsitems.push_back(parsenottest());
    }
    if (rhsitems.empty()) return lhs;
    auto node = make_node(NODE::AND);
    node->items.push_back(std::move(lhs));
    for (auto& r : rhsitems) node->items.push_back(std::move(r));
    return node;
  }

  std::unique_ptr<CodeNode> parsenottest() {
    if (check(TokenKind::NOT)) {
      advance();
      auto node = make_node(NODE::NOT);
      node->items.push_back(parsenottest());
      return node;
    }
    return parsecomparison();
  }

  std::unique_ptr<CodeNode> parsecomparison() { return parsecomparisonchain(); }

  bool iscompop(TokenKind k) const {
    return k == TokenKind::ISEQ || k == TokenKind::ISNOTEQ || k == TokenKind::ISLESSTHAN ||
           k == TokenKind::ISGREATERTHAN || k == TokenKind::ISLESSTHANOREQUAL ||
           k == TokenKind::ISGREATERTHANOREQUAL;
  }

  std::unique_ptr<CodeNode> parsecompop() {
    Token t = advance();
    auto node = make_node(NODE::COMPARE_ITEM);
    switch (t.kind) {
      case TokenKind::ISEQ: node->compare_method = COMPARE::IS_EQ; break;
      case TokenKind::ISNOTEQ: node->compare_method = COMPARE::IS_NOT_EQ; break;
      case TokenKind::ISLESSTHAN: node->compare_method = COMPARE::IS_LESS_THAN; break;
      case TokenKind::ISGREATERTHAN: node->compare_method = COMPARE::IS_GREATER_THAN; break;
      case TokenKind::ISLESSTHANOREQUAL: node->compare_method = COMPARE::IS_LESS_THAN_OR_EQ; break;
      case TokenKind::ISGREATERTHANOREQUAL: node->compare_method = COMPARE::IS_GREATER_THAN_OR_EQ; break;
      default: break;
    }
    return node;
  }

  std::unique_ptr<CodeNode> parsecomparisonchain() {
    auto lhsnode = parsearithexpr();
    if (!iscompop(peek().kind)) return lhsnode;
    Location comploc = lhsnode ? lhsnode->loc : curloc();
    std::vector<std::unique_ptr<CodeNode>> comparenodes;
    while (iscompop(peek().kind)) {
      auto cop = parsecompop();
      auto rhsnode = parsearithexpr();
      auto cmp = make_node(NODE::COMPARE);
      cmp->compare = std::move(cop);
      cmp->lhs = std::move(lhsnode);
      cmp->rhs = std::move(rhsnode);
      cmp->loc = comploc;
      comparenodes.push_back(std::move(cmp));
      lhsnode = clone_node(comparenodes.back()->rhs.get());
    }
    if (comparenodes.size() == 1) {
      comparenodes[0]->loc = comploc;
      return std::move(comparenodes[0]);
    }
    auto node = make_node(NODE::AND);
    for (auto& c : comparenodes) {
      c->loc = comploc;
      node->items.push_back(std::move(c));
    }
    node->loc = comploc;
    return node;
  }

  std::unique_ptr<CodeNode> parsearithexpr() {
    if (auto tok = trytokenexpr()) return tok;
    auto term = parseterm();
    std::vector<std::unique_ptr<CodeNode>> items;
    while (check(TokenKind::PLUS) || check(TokenKind::MINUS)) {
      Token t = advance();
      auto item = make_node(NODE::OPERATOR_ITEM);
      item->operator_kind = t.kind == TokenKind::PLUS ? OPERATOR::PLUS : OPERATOR::MINUS;
      item->rhs = parseterm();
      items.push_back(std::move(item));
    }
    if (items.empty()) return term;
    auto node = make_node(NODE::OPERATOR);
    node->lhs = std::move(term);
    node->items = std::move(items);
    return node;
  }

  std::unique_ptr<CodeNode> parseterm() {
    auto factor = parsefactor();
    std::vector<std::unique_ptr<CodeNode>> items;
    while (check(TokenKind::MULTIPLY) || check(TokenKind::DIVIDE) || check(TokenKind::MODDIVIDE) ||
           check(TokenKind::FLOORDIVIDE)) {
      Token t = advance();
      auto item = make_node(NODE::OPERATOR_ITEM);
      switch (t.kind) {
        case TokenKind::MULTIPLY: item->operator_kind = OPERATOR::MULTIPLY; break;
        case TokenKind::DIVIDE: item->operator_kind = OPERATOR::DIVIDE; break;
        case TokenKind::MODDIVIDE: item->operator_kind = OPERATOR::MOD_DIVIDE; break;
        case TokenKind::FLOORDIVIDE: item->operator_kind = OPERATOR::FLOOR_DIVIDE; break;
        default: break;
      }
      item->rhs = parsefactor();
      items.push_back(std::move(item));
    }
    if (items.empty()) return factor;
    auto node = make_node(NODE::OPERATOR);
    node->lhs = std::move(factor);
    node->items = std::move(items);
    return node;
  }

  std::unique_ptr<CodeNode> parsefactor() {
    if (check(TokenKind::PLUS) || check(TokenKind::MINUS)) {
      Token t = advance();
      auto item = make_node(NODE::OPERATOR_ITEM);
      item->operator_kind = t.kind == TokenKind::PLUS ? OPERATOR::UNI_PLUS : OPERATOR::UNI_MINUS;
      item->rhs = parsefactor();
      auto node = make_node(NODE::OPERATOR);
      node->items.push_back(std::move(item));
      return node;
    }
    return parsepower();
  }

  std::unique_ptr<CodeNode> parsepower() {
    auto tok = parsetoken();
    if (check(TokenKind::POWER)) {
      advance();
      auto item = make_node(NODE::OPERATOR_ITEM);
      item->operator_kind = OPERATOR::POWER;
      item->rhs = parsefactor();
      auto node = make_node(NODE::OPERATOR);
      node->lhs = std::move(tok);
      node->items.push_back(std::move(item));
      return node;
    }
    return tok;
  }

  std::unique_ptr<CodeNode> trytokenexpr() {
    if (check(TokenKind::WORD)) {
      std::string w = namestr(peek().image);
      if (w == "aligned" || w == "alligned" || w == "contact") {
        Token t = advance();
        return createstringnode(namestr(tokenstr(t)));
      }
      if (w == "any") {
        advance();
        return parseexprany("any");
      }
      if (w == "countof") {
        advance();
        return parseexprany("countof");
      }
      if (w == "blocked") {
        advance();
        auto result = createstringnode("blocked");
        auto dirnodes = parsedir();
        std::vector<std::unique_ptr<CodeNode>> nodes;
        nodes.push_back(std::move(result));
        for (auto& d : dirnodes) nodes.push_back(std::move(d));
        return createexprondemand(std::move(nodes));
      }
      if (w == "abs" || w == "intceil" || w == "intfloor" || w == "intround") {
        Token t = advance();
        auto result = createstringnode(namestr(tokenstr(t)));
        auto st = parsesimpletoken();
        std::vector<std::unique_ptr<CodeNode>> nodes;
        nodes.push_back(std::move(result));
        nodes.push_back(std::move(st));
        return createexprondemand(std::move(nodes));
      }
      if (w == "clamp") {
        advance();
        auto result = createstringnode("clamp");
        std::vector<std::unique_ptr<CodeNode>> nodes;
        nodes.push_back(std::move(result));
        nodes.push_back(parsesimpletoken());
        nodes.push_back(parsesimpletoken());
        nodes.push_back(parsesimpletoken());
        return createexprondemand(std::move(nodes));
      }
      if (w == "min" || w == "max" || w == "pick") {
        Token t = advance();
        auto result = createstringnode(namestr(tokenstr(t)));
        std::vector<std::unique_ptr<CodeNode>> nodes;
        nodes.push_back(std::move(result));
        while (!atend() && !check(TokenKind::NEWLINE) && !iscompop(peek().kind) &&
               !check(TokenKind::OR) && !check(TokenKind::AND) && !check(TokenKind::RPAREN)) {
          nodes.push_back(parsesimpletoken());
        }
        return createexprondemand(std::move(nodes));
      }
      if (w == "pickwith" || w == "randomwith" || w == "runwith") {
        Token t = advance();
        auto result = createstringnode(namestr(tokenstr(t)));
        std::vector<std::unique_ptr<CodeNode>> nodes;
        nodes.push_back(std::move(result));
        nodes.push_back(parsesimpletoken());
        while (!atend() && !check(TokenKind::NEWLINE) && !iscompop(peek().kind) &&
               !check(TokenKind::OR) && !check(TokenKind::AND) && !check(TokenKind::RPAREN)) {
          nodes.push_back(parsesimpletoken());
        }
        return createexprondemand(std::move(nodes));
      }
      if (w == "random") {
        advance();
        auto result = createstringnode("random");
        std::vector<std::unique_ptr<CodeNode>> nodes;
        nodes.push_back(std::move(result));
        nodes.push_back(parsesimpletoken());
        if (!atend() && !check(TokenKind::NEWLINE) && !iscompop(peek().kind)) {
          nodes.push_back(parsesimpletoken());
        }
        return createexprondemand(std::move(nodes));
      }
      if (w == "run") {
        advance();
        auto result = createstringnode("run");
        auto st = parsestringtoken();
        std::vector<std::unique_ptr<CodeNode>> nodes;
        nodes.push_back(std::move(result));
        nodes.push_back(std::move(st));
        return createexprondemand(std::move(nodes));
      }
    }
    return nullptr;
  }

  std::unique_ptr<CodeNode> parseexprany(const std::string& name) {
    std::vector<std::unique_ptr<CodeNode>> nodes;
    nodes.push_back(createstringnode(name));
    if (check(TokenKind::WORD) || check(TokenKind::STRINGLITERAL) || check(TokenKind::STRINGLITERALDOUBLE)) {
      auto dirnodes = parsedir();
      for (auto& d : dirnodes) nodes.push_back(std::move(d));
    }
    return createexprondemand(std::move(nodes));
  }

  std::unique_ptr<CodeNode> parsestringtoken() {
    if (check(TokenKind::STRINGLITERALDOUBLE)) {
      Token t = advance();
      return createtemplatenode(tokenstr(t));
    }
    if (check(TokenKind::STRINGLITERAL)) {
      Token t = advance();
      return createstringnode(tokenstr(t));
    }
    return createstringnode("");
  }

  std::unique_ptr<CodeNode> parsesimpletoken() {
    if (check(TokenKind::STRINGLITERALDOUBLE)) return createtemplatenode(tokenstr(advance()));
    if (check(TokenKind::STRINGLITERAL)) return createstringnode(tokenstr(advance()));
    if (check(TokenKind::NUMBERLITERAL)) {
      Token t = advance();
      return createnumbernode(std::stod(tokenstr(t)));
    }
    if (check(TokenKind::WORD)) return createstringnode(colormap(tokenstr(advance())));
    return createstringnode("");
  }

  std::string colormap(const std::string& word) {
    std::string w = namestr(word);
    if (w == "bldkblue") return "blblue";
    return w;
  }

  std::unique_ptr<CodeNode> parsetoken() {
    if (auto expr = trytokenexpr()) return expr;
    if (check(TokenKind::LPAREN)) {
      advance();
      auto e = parseexpr();
      if (check(TokenKind::RPAREN)) advance();
      return e;
    }
    if (check(TokenKind::NUMBERLITERAL)) {
      Token t = advance();
      return createnumbernode(std::stod(tokenstr(t)));
    }
    if (check(TokenKind::STRINGLITERALDOUBLE)) return createtemplatenode(tokenstr(advance()));
    if (check(TokenKind::STRINGLITERAL)) return createstringnode(tokenstr(advance()));
    if (check(TokenKind::STOP)) {
      Token t = advance();
      return createstringnode(tokenstr(t));
    }
    if (check(TokenKind::LABEL)) return createstringnode(tokenstr(advance()));
    if (check(TokenKind::COMMAND_PLAY)) return parsecommandplay();
    if (check(TokenKind::COMMAND_TOAST)) return parsecommandtoast();
    if (check(TokenKind::COMMAND_TICKER)) return parsecommandticker();
    if (check(TokenKind::WORD)) {
      auto dirnodes = parsedir();
      if (dirnodes.size() == 1) return std::move(dirnodes[0]);
      return createexprondemand(std::move(dirnodes));
    }
    return createstringnode("");
  }

  std::unique_ptr<CodeNode> parsecommandplay() {
    Token t = advance();
    std::string playstr = trim(tokenstr(t));
    size_t sp = playstr.find(' ');
    std::string cmd = sp == std::string::npos ? playstr : playstr.substr(0, sp);
    std::string rest = sp == std::string::npos ? "" : trim(playstr.substr(sp + 1));
    std::vector<std::unique_ptr<CodeNode>> nodes;
    nodes.push_back(createstringnode(namestr(cmd)));
    nodes.push_back(createstringnode(rest));
    return createexprondemand(std::move(nodes));
  }

  std::unique_ptr<CodeNode> parsecommandtoast() {
    Token t = advance();
    std::string s = tokenstr(t);
    size_t p = s.find("toast");
    std::string content = p != std::string::npos ? trim(s.substr(p + 5)) : "";
    std::vector<std::unique_ptr<CodeNode>> nodes;
    nodes.push_back(createstringnode("toast"));
    nodes.push_back(createtemplatenode(content));
    return createexprondemand(std::move(nodes));
  }

  std::unique_ptr<CodeNode> parsecommandticker() {
    Token t = advance();
    std::string s = tokenstr(t);
    size_t p = s.find("ticker");
    std::string content = p != std::string::npos ? trim(s.substr(p + 6)) : "";
    std::vector<std::unique_ptr<CodeNode>> nodes;
    nodes.push_back(createstringnode("ticker"));
    nodes.push_back(createtemplatenode(content));
    return createexprondemand(std::move(nodes));
  }

  std::vector<std::unique_ptr<CodeNode>> parsedir() {
    std::vector<std::unique_ptr<CodeNode>> values;
    while (check(TokenKind::WORD)) {
      std::string w = namestr(peek().image);
      if (w == "cw" || w == "ccw" || w == "opp" || w == "rndp" || w == "over" || w == "under" ||
          w == "ground" || w == "elements" || w == "within" || w == "awayby") {
        values.push_back(createstringnode(w));
        advance();
        if (w == "within" || w == "awayby") {
          values.push_back(parsesimpletoken());
        }
        continue;
      }
      break;
    }
    if (check(TokenKind::WORD)) {
      std::string w = namestr(peek().image);
      static const char* dirs[] = {
          "idle", "up", "down", "left", "right", "by", "at", "away", "toward", "flow", "seek",
          "rndns", "rndne", "rnd", "find", "flee", "to", "select", "flood", "beam",
          "i", "u", "north", "n", "d", "south", "s", "l", "west", "w", "r", "east", "e", nullptr};
      for (int i = 0; dirs[i]; ++i) {
        if (w == dirs[i]) {
          if (w == "by" || w == "at" || w == "away" || w == "toward") {
            advance();
            values.push_back(createstringnode(w));
            values.push_back(parsesimpletoken());
            values.push_back(parsesimpletoken());
            return values;
          }
          if (w == "find" || w == "flee") {
            advance();
            values.push_back(createstringnode(w));
            if (check(TokenKind::NUMBERLITERAL)) {
              values.push_back(createnumbernode(std::stod(tokenstr(advance()))));
            } else {
              if (check(TokenKind::WORD)) values.push_back(createstringnode(colormap(tokenstr(advance()))));
              if (check(TokenKind::STRINGLITERAL) || check(TokenKind::STRINGLITERALDOUBLE))
                values.push_back(parsestringtoken());
            }
            return values;
          }
          if (w == "to") {
            advance();
            values.push_back(createstringnode("to"));
            auto d1 = parsedir();
            auto d2 = parsedir();
            for (auto& d : d1) values.push_back(std::move(d));
            for (auto& d : d2) values.push_back(std::move(d));
            return values;
          }
          if (w == "select") {
            advance();
            values.push_back(createstringnode("select"));
            values.push_back(parsesimpletoken());
            if (check(TokenKind::WORD) && iscolor(namestr(peek().image)))
              values.push_back(createstringnode(colormap(tokenstr(advance()))));
            values.push_back(parsestringtoken());
            return values;
          }
          if (w == "flood") {
            advance();
            values.push_back(createstringnode("flood"));
            auto d = parsedir();
            for (auto& x : d) values.push_back(std::move(x));
            return values;
          }
          if (w == "beam") {
            advance();
            values.push_back(createstringnode("beam"));
            values.push_back(parsesimpletoken());
            auto d = parsedir();
            for (auto& x : d) values.push_back(std::move(x));
            return values;
          }
          advance();
          values.push_back(createstringnode(w));
          return values;
        }
      }
    }
    return values;
  }

  bool iscolor(const std::string& w) const {
    static const char* colors[] = {"black", "red", "blue", "green", nullptr};
    for (int i = 0; colors[i]; ++i) {
      if (w == colors[i]) return true;
    }
    return w.find("on") == 0 || w.find("bl") == 0 || w.find("dk") == 0;
  }
};

inline std::unique_ptr<CodeNode> parseast(const std::vector<Token>& tokens) {
  Parser parser(tokens);
  return parser.parseprogram();
}

}  // namespace zss_lang

#endif
