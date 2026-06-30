#!/bin/sh
# Download and stage wasi-sdk for /opt/wasi-sdk (macOS).
# Does not use rm -rf — aborts if extract or install targets already exist.

set -e

WASI_VERSION=33
WASI_VERSION_FULL=33.0
DOWNLOADS="${HOME}/Downloads"

detect_arch() {
  case "$(uname -m)" in
    arm64) echo arm64 ;;
    x86_64) echo x86_64 ;;
    *)
      echo "unsupported arch: $(uname -m)" >&2
      exit 1
      ;;
  esac
}

ARCH="$(detect_arch)"
TARBALL="wasi-sdk-${WASI_VERSION_FULL}-${ARCH}-macos.tar.gz"
URL="https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${WASI_VERSION}/${TARBALL}"
EXTRACT="${DOWNLOADS}/wasi-sdk-${WASI_VERSION_FULL}-${ARCH}-macos"
INSTALL="/opt/wasi-sdk"

echo "wasi-sdk ${WASI_VERSION_FULL} (${ARCH}-macos)"
echo ""

if [ -e "$INSTALL" ]; then
  echo "abort: $INSTALL already exists — relocate manually before installing" >&2
  exit 1
fi

if [ -e "$EXTRACT" ]; then
  echo "abort: $EXTRACT already exists — rename or move aside manually, then re-run" >&2
  exit 1
fi

mkdir -p "$DOWNLOADS"
cd "$DOWNLOADS"

if [ ! -f "$TARBALL" ]; then
  echo "Downloading $URL ..."
  curl -fL --progress-bar -o "$TARBALL" "$URL"
else
  echo "Using existing tarball: $TARBALL"
fi

echo "Extracting to $EXTRACT ..."
tar xzf "$TARBALL"

if [ ! -f "$EXTRACT/bin/clang-22" ]; then
  echo "abort: $EXTRACT/bin/clang-22 missing after extract" >&2
  echo "Try re-downloading the tarball, or extract the binary only:" >&2
  echo "  tar xzf $TARBALL ${EXTRACT#$DOWNLOADS/}/bin/clang-22" >&2
  exit 1
fi

if command -v xattr >/dev/null 2>&1; then
  xattr -dr com.apple.quarantine "$EXTRACT" 2>/dev/null || true
fi

if ! "$EXTRACT/bin/clang" --version >/dev/null 2>&1; then
  echo "abort: $EXTRACT/bin/clang does not run" >&2
  exit 1
fi

echo ""
echo "Extract verified. Install to $INSTALL (run in your terminal):"
echo ""
echo "  sudo mv \"$EXTRACT\" \"$INSTALL\""
echo ""
echo "If sudo mv from Downloads fails with Operation not permitted, run that command"
echo "in Terminal.app (macOS privacy may block admin access to ~/Downloads)."
echo ""
echo "Then verify:"
echo "  $INSTALL/bin/clang --version"
echo "  yarn task run wanix:wasm:build:c"
