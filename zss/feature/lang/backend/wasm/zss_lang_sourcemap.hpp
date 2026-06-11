#ifndef ZSS_LANG_SOURCEMAP_HPP
#define ZSS_LANG_SOURCEMAP_HPP

#include <memory>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

namespace zss_lang {

static const char GENERATED_FILENAME[] = "zss.js";

struct SourceOutput {
  std::string code;
  std::string source_map_json;
};

class SourceNode;

struct SourceChild {
  enum class Kind { STRING, NODE };
  Kind kind = Kind::STRING;
  std::string str;
  std::unique_ptr<SourceNode> node;
};

struct SourceMapping {
  int gen_line = 1;
  int gen_col = 0;
  bool has_source = false;
  int src_line = 0;
  int src_col = 0;
};

class SourceNode {
public:
  SourceNode() = default;

  SourceNode(int line, int column, const std::string& source)
      : line_(line), column_(column), source_(source) {}

  SourceNode(const SourceNode& other)
      : line_(other.line_), column_(other.column_), source_(other.source_) {
    for (const auto& child : other.children_) {
      if (child.kind == SourceChild::Kind::STRING) {
        add(child.str);
      } else if (child.node) {
        add(*child.node);
      }
    }
  }

  SourceNode& operator=(const SourceNode& other) {
    if (this != &other) {
      line_ = other.line_;
      column_ = other.column_;
      source_ = other.source_;
      children_.clear();
      for (const auto& child : other.children_) {
        if (child.kind == SourceChild::Kind::STRING) {
          add(child.str);
        } else if (child.node) {
          add(*child.node);
        }
      }
    }
    return *this;
  }

  SourceNode(SourceNode&&) = default;
  SourceNode& operator=(SourceNode&&) = default;

  void add(const std::string& chunk) {
    if (chunk.empty())
      return;
    SourceChild child;
    child.kind = SourceChild::Kind::STRING;
    child.str = chunk;
    children_.push_back(std::move(child));
  }

  void add(SourceNode node) {
    SourceChild child;
    child.kind = SourceChild::Kind::NODE;
    child.node = std::make_unique<SourceNode>(std::move(node));
    children_.push_back(std::move(child));
  }

  void prepend(const std::string& chunk) {
    if (chunk.empty())
      return;
    SourceChild child;
    child.kind = SourceChild::Kind::STRING;
    child.str = chunk;
    children_.insert(children_.begin(), std::move(child));
  }

  void prepend(SourceNode node) {
    SourceChild child;
    child.kind = SourceChild::Kind::NODE;
    child.node = std::make_unique<SourceNode>(std::move(node));
    children_.insert(children_.begin(), std::move(child));
  }

  SourceOutput to_string_with_source_map() const {
    std::string code;
    int gen_line = 1;
    int gen_col = 0;
    std::vector<SourceMapping> mappings;

    bool source_active = false;
    std::string last_source;
    int last_line = 0;
    int last_col = 0;

    WalkState state{&code,          &gen_line,    &gen_col,   &mappings,
                    &source_active, &last_source, &last_line, &last_col};

    walk(*this, Original{}, state);

    int codelines = 1;
    for (char c : code) {
      if (c == '\n')
        ++codelines;
    }

    std::ostringstream oss;
    oss << "{\"version\":3,\"sources\":[\"" << GENERATED_FILENAME
        << "\"],\"names\":[],\"mappings\":\"";
    oss << serializemappings(mappings, codelines);
    oss << "\",\"file\":\"zss.js.map\"}";

    SourceOutput out;
    out.code = code;
    out.source_map_json = oss.str();
    return out;
  }

private:
  int line_ = 0;
  int column_ = 0;
  std::string source_;
  std::vector<SourceChild> children_;

  struct Original {
    bool valid = false;
    std::string source;
    int line = 0;
    int column = 0;
  };

  struct WalkState {
    std::string* code;
    int* gen_line;
    int* gen_col;
    std::vector<SourceMapping>* mappings;
    bool* source_active;
    std::string* last_source;
    int* last_line;
    int* last_col;
  };

  static void add_mapping(WalkState& st, const Original& orig) {
    SourceMapping m;
    m.gen_line = *st.gen_line;
    m.gen_col = *st.gen_col;
    if (orig.valid) {
      m.has_source = true;
      m.src_line = orig.line;
      m.src_col = orig.column;
    }
    st.mappings->push_back(m);
  }

  static void walk(const SourceNode& node, Original inherited, WalkState st) {
    Original ctx = inherited;
    if (node.line_ != 0 && node.column_ != 0 && !node.source_.empty()) {
      ctx.valid = true;
      ctx.source = node.source_;
      ctx.line = node.line_;
      ctx.column = node.column_;
    }

    for (const auto& child : node.children_) {
      if (child.kind == SourceChild::Kind::NODE && child.node) {
        walk(*child.node, ctx, st);
      } else if (child.kind == SourceChild::Kind::STRING &&
                 !child.str.empty()) {
        if (ctx.valid) {
          if (!*st.source_active || *st.last_source != ctx.source ||
              *st.last_line != ctx.line || *st.last_col != ctx.column) {
            add_mapping(st, ctx);
            *st.last_source = ctx.source;
            *st.last_line = ctx.line;
            *st.last_col = ctx.column;
            *st.source_active = true;
          }
        } else if (*st.source_active) {
          add_mapping(st, Original{});
          st.last_source->clear();
          *st.source_active = false;
        }

        const std::string& chunk = child.str;
        for (size_t idx = 0; idx < chunk.size(); ++idx) {
          st.code->push_back(chunk[idx]);
          if (chunk[idx] == '\n') {
            (*st.gen_line)++;
            *st.gen_col = 0;
            if (idx + 1 == chunk.size()) {
              st.last_source->clear();
              *st.source_active = false;
            } else if (*st.source_active && ctx.valid) {
              add_mapping(st, ctx);
            }
          } else {
            (*st.gen_col)++;
          }
        }
      }
    }
  }

  static void encodevlq(int value, std::string& out) {
    int vlq = value < 0 ? ((-value) << 1) | 1 : (value << 1);
    do {
      int digit = vlq & 31;
      vlq >>= 5;
      if (vlq > 0)
        digit |= 32;
      static const char* digits =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      out.push_back(digits[digit]);
    } while (vlq > 0);
  }

  static bool samegenerated(const SourceMapping& a, const SourceMapping& b) {
    return a.gen_line == b.gen_line && a.gen_col == b.gen_col;
  }

  static std::string
  serializemappings(const std::vector<SourceMapping>& mappings, int codelines) {
    std::string result;
    int previous_generated_column = 0;
    int previous_generated_line = 1;
    int previous_original_column = 0;
    int previous_original_line = 0;
    int previous_source = 0;

    for (size_t i = 0; i < mappings.size(); ++i) {
      const SourceMapping& mapping = mappings[i];
      if (i > 0 && samegenerated(mapping, mappings[i - 1])) {
        continue;
      }

      std::string next;
      if (mapping.gen_line != previous_generated_line) {
        previous_generated_column = 0;
        while (mapping.gen_line != previous_generated_line) {
          result += ";";
          previous_generated_line++;
        }
      } else if (i > 0) {
        next += ",";
      }

      encodevlq(mapping.gen_col - previous_generated_column, next);
      previous_generated_column = mapping.gen_col;
      previous_generated_line = mapping.gen_line;

      if (mapping.has_source) {
        encodevlq(0 - previous_source, next);
        previous_source = 0;
        encodevlq((mapping.src_line - 1) - previous_original_line, next);
        previous_original_line = mapping.src_line - 1;
        encodevlq(mapping.src_col - previous_original_column, next);
        previous_original_column = mapping.src_col;
      }

      result += next;
    }

    while (previous_generated_line < codelines) {
      result += ";";
      previous_generated_line++;
    }

    return result;
  }
};

} // namespace zss_lang

#endif
