#ifndef ZSS_LANG_TEXTFORMAT_HPP
#define ZSS_LANG_TEXTFORMAT_HPP

#include <string>
#include <vector>

#include "zss_lang_util.hpp"

namespace zss_lang {

/** Minimal $name template tokenizer (parity with zss/words/textformat.ts). */
inline std::string writetemplatestring(const std::string& value) {
  if (value.find('$') == std::string::npos) {
    return writestring(value);
  }
  std::string template_body;
  for (size_t i = 0; i < value.size(); ++i) {
    if (value[i] == '$' && i + 1 < value.size()) {
      size_t j = i + 1;
      while (j < value.size() &&
             (std::isalnum(static_cast<unsigned char>(value[j])) ||
              value[j] == '_')) {
        ++j;
      }
      if (j > i + 1) {
        std::string flag = value.substr(i + 1, j - i - 1);
        std::string lflag = namestr(flag);
        if (lflag == "center") {
          template_body += "$CENTER";
        } else {
          template_body +=
              "', api.print(api.get('" + escapestring(lflag) + "')), '";
        }
        i = j - 1;
        continue;
      }
    }
    template_body += escapestring(std::string(1, value[i]));
  }
  return "['" + template_body + "'].join('')";
}

} // namespace zss_lang

#endif
