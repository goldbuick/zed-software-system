#!/bin/sh
# VM bind-on-drop example: read input/*.png, write zedcafe board terrain.
set -e
if [ -n "$1" ]; then
  BASE=$(basename "$1")
  STAMP="input/$BASE"
else
  STAMP=$(ls input/*.png 2>/dev/null | head -1 || true)
fi
if [ -z "$STAMP" ] || [ ! -f "$STAMP" ]; then
  echo "png2terrain: no .png under input/ (drop stamp-red/green/blue.png while attached)"
  exit 1
fi
BYTES=$(wc -c < "$STAMP" | tr -d ' ')
BASE=$(basename "$STAMP")
TERRAIN=$(find zedcafe -type f -path '*/board/terrain.json' 2>/dev/null | head -1)
if [ -z "$TERRAIN" ]; then
  echo "png2terrain: no board/terrain.json under zedcafe/"
  exit 1
fi
N=$((BYTES % 40 + 1))
I=0
printf '[' > "$TERRAIN"
while [ "$I" -lt "$N" ]; do
  if [ "$I" -gt 0 ]; then
    printf ',' >> "$TERRAIN"
  fi
  printf '{"kind":"solid"}' >> "$TERRAIN"
  I=$((I + 1))
done
printf ']\n' >> "$TERRAIN"
echo "png2terrain: wrote $TERRAIN ($N cells from $BASE, $BYTES bytes)"
