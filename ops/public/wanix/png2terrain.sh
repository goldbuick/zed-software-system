#!/bin/sh
# VM bind-on-drop example: read input/stamp.png, write zedcafe board terrain.
set -e
STAMP="input/stamp.png"
if [ ! -f "$STAMP" ]; then
  echo "png2terrain: missing $STAMP"
  exit 1
fi
BYTES=$(wc -c < "$STAMP")
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
echo "png2terrain: wrote $TERRAIN ($N cells from $BYTES byte png)"
