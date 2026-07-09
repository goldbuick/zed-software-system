#!/bin/sh
# Shared helpers for zedcafe-* CLI tools (Alpine busybox sh).

ZEDCAFE_ROOT=/zedcafe
ZEDCAFE_READY_TIMEOUT_SEC=30
ZEDCAFE_READY_POLL_SEC=0.25

zedcafe_usage() {
  echo "usage: $1 [-r|--root PATH] ..." >&2
}

zedcafe_statsfile() {
  echo "$ZEDCAFE_ROOT/stats.json"
}

zedcafe_requirestats() {
  stats=$(zedcafe_statsfile)
  if [ ! -s "$stats" ] || ! grep -q '"exportedAt"' "$stats" 2>/dev/null; then
    echo "$0: missing or empty $stats (try: zedcafe-ready)" >&2
    return 1
  fi
  return 0
}
