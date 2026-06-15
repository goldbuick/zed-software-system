#!/bin/sh
set -eu

MODE=${1:-}
SCOPE=${2:-all}

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CLANG_FORMAT=${CLANG_FORMAT:-clang-format}

DAISY_DIR="$ROOT/zss/feature/synth/backend/daisy/native/zss"
DAISY_WRAPPER="$ROOT/zss/feature/synth/backend/daisy/native/zss_daisy_synth.cpp"
LANG_DIR="$ROOT/zss/feature/lang/backend/wasm"
IGNORE_FILE="$ROOT/.clang-format-ignore"

usage() {
  echo "usage: $0 check|fix [daisy|lang|all]" >&2
  exit 2
}

if [ "$MODE" != check ] && [ "$MODE" != fix ]; then
  usage
fi

if [ "$SCOPE" != daisy ] && [ "$SCOPE" != lang ] && [ "$SCOPE" != all ]; then
  usage
fi

if ! command -v "$CLANG_FORMAT" >/dev/null 2>&1; then
  echo "clang-format not found: $CLANG_FORMAT" >&2
  echo "install LLVM clang-format 18+ (e.g. brew install llvm, apt install clang-format-18)" >&2
  exit 2
fi

loadignore() {
  if [ ! -f "$IGNORE_FILE" ]; then
    return
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      '' | \#*) continue ;;
    esac
    printf '%s\n' "$line"
  done <"$IGNORE_FILE"
}

matchesignore() {
  filepath=$1
  relpath=${filepath#"$ROOT"/}
  while IFS= read -r pattern; do
    segment=${pattern#**/}
    segment=${segment%%/**}
    case "$relpath" in
      */"$segment"/*) return 0 ;;
    esac
  done <<EOF
$(loadignore)
EOF
  return 1
}

collectfiles() {
  scope=$1
  if [ "$scope" = daisy ] || [ "$scope" = all ]; then
    find "$DAISY_DIR" -type f \( \
      -name '*.cpp' -o -name '*.h' -o -name '*.hpp' -o -name '*.cc' \
    \)
    if [ -f "$DAISY_WRAPPER" ]; then
      printf '%s\n' "$DAISY_WRAPPER"
    fi
  fi
  if [ "$scope" = lang ] || [ "$scope" = all ]; then
    find "$LANG_DIR" -type f \( \
      -name '*.cpp' -o -name '*.h' -o -name '*.hpp' -o -name '*.cc' \
    \)
  fi
}

failed=0
filecount=0

for file in $(collectfiles "$SCOPE" | sort -u); do
  if matchesignore "$file"; then
    continue
  fi
  filecount=$((filecount + 1))
  if [ "$MODE" = check ]; then
    if ! "$CLANG_FORMAT" --dry-run --Werror "$file" >/dev/null 2>&1; then
      echo "clang-format check failed: $file" >&2
      failed=1
    fi
  else
    "$CLANG_FORMAT" -i "$file"
  fi
done

if [ "$filecount" -eq 0 ]; then
  echo "no C++ files found for scope: $SCOPE" >&2
  exit 2
fi

if [ "$failed" -ne 0 ]; then
  echo "run 'yarn task run native:lint:fix' to apply formatting" >&2
  exit 1
fi

echo "clang-format $MODE ok ($filecount files, scope=$SCOPE)"
